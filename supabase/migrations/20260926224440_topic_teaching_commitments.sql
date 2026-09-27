-- Adopción de temas: compromiso profesor-nodo, instructores de la clase.
-- No escribe academic_milestones.target_topic_ids (esa columna se sincroniza
-- con un upsert completo desde el calendario / localStorage).

-- ─── 1. Tablas ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.topic_teaching_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id TEXT NOT NULL DEFAULT '2026-general',
  module_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'confirmed', 'withdrawn')),
  milestone_id TEXT,
  workshop_id UUID REFERENCES public.live_workshops(id) ON DELETE SET NULL,
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  CONSTRAINT topic_teaching_commitments_unique_teacher
    UNIQUE (cohort_id, topic_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS public.workshop_instructors (
  workshop_id UUID NOT NULL REFERENCES public.live_workshops(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commitment_id UUID REFERENCES public.topic_teaching_commitments(id) ON DELETE SET NULL,
  PRIMARY KEY (workshop_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS topic_teaching_commitments_cohort_status_idx
  ON public.topic_teaching_commitments (cohort_id, status);

CREATE INDEX IF NOT EXISTS topic_teaching_commitments_topic_idx
  ON public.topic_teaching_commitments (cohort_id, topic_id);

CREATE INDEX IF NOT EXISTS topic_teaching_commitments_teacher_idx
  ON public.topic_teaching_commitments (teacher_id, status);

CREATE INDEX IF NOT EXISTS workshop_instructors_teacher_idx
  ON public.workshop_instructors (teacher_id);

COMMENT ON TABLE public.topic_teaching_commitments IS
  'Compromiso de un profesor con un nodo del temario. milestone_id es referencia blanda al corte.';
COMMENT ON COLUMN public.topic_teaching_commitments.milestone_id IS
  'Id de academic_milestones sin FK: los cortes pueden existir solo en el cliente.';

ALTER TABLE public.topic_teaching_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_instructors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS topic_teaching_commitments_staff_read ON public.topic_teaching_commitments;
CREATE POLICY topic_teaching_commitments_staff_read
  ON public.topic_teaching_commitments
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.is_editor());

DROP POLICY IF EXISTS workshop_instructors_staff_read ON public.workshop_instructors;
CREATE POLICY workshop_instructors_staff_read
  ON public.workshop_instructors
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.is_editor());

GRANT SELECT ON public.topic_teaching_commitments TO authenticated;
GRANT SELECT ON public.workshop_instructors TO authenticated;
GRANT INSERT, UPDATE ON public.live_workshops TO authenticated;

-- ─── 2. Proponer o reabrir ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.propose_topic_commitments(
  p_topic_ids TEXT[],
  p_module_id TEXT,
  p_cohort_id TEXT DEFAULT '2026-general'
)
RETURNS SETOF public.topic_teaching_commitments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cohort TEXT := COALESCE(NULLIF(trim(p_cohort_id), ''), '2026-general');
  v_module TEXT := trim(p_module_id);
  v_ids TEXT[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión';
  END IF;

  IF NOT (public.is_admin() OR public.is_editor()) THEN
    RAISE EXCEPTION 'Solo profesores o administradores pueden adoptar temas';
  END IF;

  IF v_module IS NULL OR length(v_module) = 0 THEN
    RAISE EXCEPTION 'Indica el módulo del tema';
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT trim(item)
    FROM unnest(COALESCE(p_topic_ids, '{}')) AS t(item)
    WHERE length(trim(item)) > 0
    LIMIT 150
  ) INTO v_ids;

  IF v_ids IS NULL OR coalesce(array_length(v_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Elige al menos un tema';
  END IF;

  RETURN QUERY
  INSERT INTO public.topic_teaching_commitments (
    cohort_id, module_id, topic_id, teacher_id, status, proposed_at
  )
  SELECT v_cohort, v_module, item, v_uid, 'proposed', now()
  FROM unnest(v_ids) AS t(item)
  ON CONFLICT (cohort_id, topic_id, teacher_id)
  DO UPDATE SET
    status = 'proposed',
    module_id = EXCLUDED.module_id,
    proposed_at = now()
  WHERE public.topic_teaching_commitments.status IS DISTINCT FROM 'confirmed'
  RETURNING *;
END;
$$;

-- ─── 3. Confirmar: clase nueva o co-docencia en la existente ─────────────────

CREATE OR REPLACE FUNCTION public.confirm_topic_commitment(
  p_commitment_id UUID,
  p_milestone_id TEXT,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  p_duration_minutes INT DEFAULT 90,
  p_title TEXT DEFAULT NULL
)
RETURNS public.topic_teaching_commitments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.topic_teaching_commitments;
  v_workshop_id UUID;
  v_title TEXT;
  v_duration INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede confirmar el tema';
  END IF;

  IF p_milestone_id IS NULL OR length(trim(p_milestone_id)) = 0 THEN
    RAISE EXCEPTION 'Elige el corte académico';
  END IF;

  SELECT *
  INTO v_row
  FROM public.topic_teaching_commitments
  WHERE id = p_commitment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La propuesta no existe';
  END IF;

  IF v_row.status = 'withdrawn' THEN
    RAISE EXCEPTION 'Esa propuesta ya fue retirada';
  END IF;

  PERFORM 1
  FROM public.topic_teaching_commitments
  WHERE cohort_id = v_row.cohort_id
    AND topic_id = v_row.topic_id
  FOR UPDATE;

  SELECT *
  INTO v_row
  FROM public.topic_teaching_commitments
  WHERE id = p_commitment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La propuesta no existe';
  END IF;

  IF v_row.status = 'withdrawn' THEN
    RAISE EXCEPTION 'Esa propuesta ya fue retirada';
  END IF;

  IF v_row.status = 'confirmed' AND v_row.workshop_id IS NOT NULL THEN
    RETURN v_row;
  END IF;

  SELECT c.workshop_id
  INTO v_workshop_id
  FROM public.topic_teaching_commitments c
  WHERE c.cohort_id = v_row.cohort_id
    AND c.topic_id = v_row.topic_id
    AND c.status = 'confirmed'
    AND c.workshop_id IS NOT NULL
    AND c.id IS DISTINCT FROM v_row.id
  ORDER BY c.confirmed_at ASC NULLS LAST
  LIMIT 1;

  IF v_workshop_id IS NULL THEN
    IF p_scheduled_at IS NULL THEN
      RAISE EXCEPTION 'Indica la fecha de la clase';
    END IF;

    v_duration := COALESCE(p_duration_minutes, 90);
    IF v_duration < 15 OR v_duration > 480 THEN
      RAISE EXCEPTION 'La duración debe estar entre 15 y 480 minutos';
    END IF;

    v_title := COALESCE(NULLIF(trim(p_title), ''), 'Clase: ' || v_row.topic_id);

    INSERT INTO public.live_workshops (
      module_id,
      topic_id,
      title,
      scheduled_at,
      duration_minutes,
      status,
      created_by
    ) VALUES (
      v_row.module_id,
      v_row.topic_id,
      v_title,
      p_scheduled_at,
      v_duration,
      'scheduled',
      v_row.teacher_id
    )
    RETURNING id INTO v_workshop_id;
  END IF;

  INSERT INTO public.workshop_instructors (workshop_id, teacher_id, commitment_id)
  VALUES (v_workshop_id, v_row.teacher_id, v_row.id)
  ON CONFLICT (workshop_id, teacher_id)
  DO UPDATE SET commitment_id = EXCLUDED.commitment_id;

  UPDATE public.topic_teaching_commitments
  SET
    status = 'confirmed',
    milestone_id = trim(p_milestone_id),
    workshop_id = v_workshop_id,
    confirmed_by = v_uid,
    confirmed_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- ─── 4. Retirar (la clase y la asistencia se quedan) ─────────────────────────

CREATE OR REPLACE FUNCTION public.withdraw_topic_commitment(p_commitment_id UUID)
RETURNS public.topic_teaching_commitments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.topic_teaching_commitments;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión';
  END IF;

  IF NOT (public.is_admin() OR public.is_editor()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT *
  INTO v_row
  FROM public.topic_teaching_commitments
  WHERE id = p_commitment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El compromiso no existe';
  END IF;

  IF v_row.teacher_id IS DISTINCT FROM v_uid AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo puedes retirar tus propios temas';
  END IF;

  UPDATE public.topic_teaching_commitments
  SET status = 'withdrawn'
  WHERE id = p_commitment_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.propose_topic_commitments(TEXT[], TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_topic_commitment(UUID, TEXT, TIMESTAMPTZ, INT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.withdraw_topic_commitment(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.propose_topic_commitments(TEXT[], TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_topic_commitment(UUID, TEXT, TIMESTAMPTZ, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_topic_commitment(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
