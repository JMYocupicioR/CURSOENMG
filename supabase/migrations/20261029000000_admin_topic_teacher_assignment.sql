-- ==============================================================================
-- Asignación directa de temas a profesores adjuntos (colaboradores docentes)
-- y eliminación/archivado administrativo de temas desde el Organizador del Temario
-- ==============================================================================

-- 1. Políticas de escritura directa para administradores y editores en topic_teaching_commitments
DROP POLICY IF EXISTS topic_teaching_commitments_staff_write ON public.topic_teaching_commitments;
CREATE POLICY topic_teaching_commitments_staff_write
  ON public.topic_teaching_commitments
  FOR ALL
  TO authenticated
  USING (public.is_admin() OR public.is_editor())
  WITH CHECK (public.is_admin() OR public.is_editor());

DROP POLICY IF EXISTS workshop_instructors_staff_write ON public.workshop_instructors;
CREATE POLICY workshop_instructors_staff_write
  ON public.workshop_instructors
  FOR ALL
  TO authenticated
  USING (public.is_admin() OR public.is_editor())
  WITH CHECK (public.is_admin() OR public.is_editor());

GRANT INSERT, UPDATE, DELETE ON public.topic_teaching_commitments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.workshop_instructors TO authenticated;

-- 2. RPC para que el administrador asigne 1 o varios temas directamente a cualquier profesor adjunto
CREATE OR REPLACE FUNCTION public.admin_assign_topic_teacher(
  p_topic_ids TEXT[],
  p_module_id TEXT,
  p_teacher_id UUID,
  p_milestone_id TEXT DEFAULT NULL,
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
  v_milestone TEXT := NULLIF(trim(COALESCE(p_milestone_id, '')), '');
  v_ids TEXT[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión';
  END IF;

  IF NOT (public.is_admin() OR public.is_editor()) THEN
    RAISE EXCEPTION 'Solo administradores o editores pueden asignar temas a profesores';
  END IF;

  IF p_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Indica el profesor a asignar';
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
    cohort_id,
    module_id,
    topic_id,
    teacher_id,
    status,
    milestone_id,
    proposed_at,
    confirmed_at,
    confirmed_by
  )
  SELECT
    v_cohort,
    v_module,
    item,
    p_teacher_id,
    'confirmed',
    v_milestone,
    now(),
    now(),
    v_uid
  FROM unnest(v_ids) AS t(item)
  ON CONFLICT (cohort_id, topic_id, teacher_id)
  DO UPDATE SET
    status = 'confirmed',
    module_id = EXCLUDED.module_id,
    milestone_id = COALESCE(EXCLUDED.milestone_id, public.topic_teaching_commitments.milestone_id),
    confirmed_at = COALESCE(public.topic_teaching_commitments.confirmed_at, now()),
    confirmed_by = v_uid
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_topic_teacher(TEXT[], TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_topic_teacher(TEXT[], TEXT, UUID, TEXT, TEXT) TO authenticated;

-- 3. RPC para eliminar un tema o subtema desde la administración del temario
CREATE OR REPLACE FUNCTION public.admin_delete_syllabus_topic(
  p_module_id TEXT,
  p_topic_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_editor()) THEN
    RAISE EXCEPTION 'Solo administradores o editores pueden eliminar temas';
  END IF;

  -- Eliminar subtemas hijos y el tema en published_topics si fueron creados/editados dinámicamente
  DELETE FROM public.published_topics
  WHERE module_id = p_module_id
    AND (id = p_topic_id OR parent_id = p_topic_id);

  -- Marcar como oculto/archivado (-999) en syllabus_topic_overrides por si es un tema base del catálogo estático
  INSERT INTO public.syllabus_topic_overrides (module_id, topic_id, sort_order, is_visible)
  VALUES (p_module_id, p_topic_id, -999, false)
  ON CONFLICT (module_id, topic_id)
  DO UPDATE SET
    sort_order = -999,
    is_visible = false,
    updated_at = now(),
    updated_by = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_syllabus_topic(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_syllabus_topic(TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

