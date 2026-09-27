-- Migration: Auto-confirm topic teaching commitments and support co-teaching
-- Created at: 2026-09-27

-- 1. Actualizar la función propose_topic_commitments para que confirme automáticamente al adoptar
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

  -- Se inserta directamente con status = 'confirmed' para auto-confirmar sin trabas
  RETURN QUERY
  INSERT INTO public.topic_teaching_commitments (
    cohort_id, module_id, topic_id, teacher_id, status, proposed_at, confirmed_at, confirmed_by
  )
  SELECT v_cohort, v_module, item, v_uid, 'confirmed', now(), now(), v_uid
  FROM unnest(v_ids) AS t(item)
  ON CONFLICT (cohort_id, topic_id, teacher_id)
  DO UPDATE SET
    status = 'confirmed',
    module_id = EXCLUDED.module_id,
    confirmed_at = COALESCE(public.topic_teaching_commitments.confirmed_at, now()),
    confirmed_by = COALESCE(public.topic_teaching_commitments.confirmed_by, v_uid)
  RETURNING *;
END;
$$;

-- 2. Actualizar confirm_topic_commitment para no exigir fecha inmediata si solo se confirma el tema
CREATE OR REPLACE FUNCTION public.confirm_topic_commitment(
  p_commitment_id UUID,
  p_milestone_id TEXT DEFAULT 'corte-1',
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
  v_milestone TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión';
  END IF;

  IF NOT (public.is_admin() OR public.is_editor()) THEN
    RAISE EXCEPTION 'Solo un profesor o administrador puede confirmar el tema';
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

  v_milestone := COALESCE(NULLIF(trim(p_milestone_id), ''), v_row.milestone_id, 'corte-1');

  -- Si se proporcionó una fecha, vincular o crear taller
  IF p_scheduled_at IS NOT NULL THEN
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
      v_duration := COALESCE(p_duration_minutes, 90);
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
  END IF;

  UPDATE public.topic_teaching_commitments
  SET
    status = 'confirmed',
    milestone_id = v_milestone,
    workshop_id = COALESCE(v_workshop_id, public.topic_teaching_commitments.workshop_id),
    confirmed_by = COALESCE(public.topic_teaching_commitments.confirmed_by, v_uid),
    confirmed_at = COALESCE(public.topic_teaching_commitments.confirmed_at, now())
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- 3. Función RPC para auto-confirmar en lote todas las propuestas pendientes
CREATE OR REPLACE FUNCTION public.auto_confirm_all_pending_commitments()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión';
  END IF;

  UPDATE public.topic_teaching_commitments
  SET
    status = 'confirmed',
    confirmed_at = COALESCE(confirmed_at, now()),
    confirmed_by = COALESCE(confirmed_by, v_uid)
  WHERE status = 'proposed';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_confirm_all_pending_commitments() TO authenticated;

-- 4. Actualización directa de registros existentes
UPDATE public.topic_teaching_commitments
SET status = 'confirmed',
    confirmed_at = COALESCE(confirmed_at, now()),
    confirmed_by = COALESCE(confirmed_by, teacher_id)
WHERE status = 'proposed';
