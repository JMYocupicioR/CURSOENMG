-- ============================================================================
-- Migración: Eliminación administrativa de clases en vivo / talleres
-- 2026-10-04
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_delete_live_workshop(
  p_workshop_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_workshop_title TEXT;
  v_creator_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión para eliminar una clase.';
  END IF;

  SELECT title, created_by INTO v_workshop_title, v_creator_id
  FROM public.live_workshops
  WHERE id = p_workshop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'La clase ya no existe o ya fue eliminada.');
  END IF;

  -- Verificar si el usuario es admin, editor o el profesor creador
  IF NOT (public.is_admin() OR public.is_editor() OR v_creator_id = v_uid) THEN
    RAISE EXCEPTION 'No tiene permisos para eliminar esta clase.';
  END IF;

  -- Limpiar referencias explícitas
  UPDATE public.topic_teaching_commitments
  SET workshop_id = NULL
  WHERE workshop_id = p_workshop_id;

  DELETE FROM public.workshop_instructors
  WHERE workshop_id = p_workshop_id;

  DELETE FROM public.workshop_registrations
  WHERE workshop_id = p_workshop_id;

  UPDATE public.courses
  SET active_workshop_id = NULL
  WHERE active_workshop_id = p_workshop_id;

  UPDATE public.class_attendances
  SET workshop_id = NULL
  WHERE workshop_id = p_workshop_id;

  DELETE FROM public.live_workshops
  WHERE id = p_workshop_id;

  RETURN jsonb_build_object('success', true, 'deleted_id', p_workshop_id, 'title', v_workshop_title);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_live_workshop(UUID) TO authenticated;
GRANT DELETE ON public.live_workshops TO authenticated;
