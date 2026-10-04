-- El alumno puede guardar y quitar los temas que ya leyó.
-- La función corre como dueña de la tabla para que el guardado no dependa
-- de un GRANT suelto ni de un upsert bloqueado por RLS.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_completed_topics TO authenticated;

DROP POLICY IF EXISTS "student_completed_topics_update" ON public.student_completed_topics;
CREATE POLICY "student_completed_topics_update" ON public.student_completed_topics
  FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.set_my_topic_progress(
  p_items jsonb,
  p_completed boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN;
  END IF;

  IF jsonb_array_length(p_items) > 400 THEN
    RAISE EXCEPTION 'Demasiados temas en una sola actualización';
  END IF;

  IF p_completed THEN
    INSERT INTO public.student_completed_topics (user_id, topic_id, module_id, completed_at)
    SELECT
      v_uid,
      left(btrim(item->>'topic_id'), 128),
      NULLIF(left(btrim(COALESCE(item->>'module_id', '')), 128), ''),
      now()
    FROM jsonb_array_elements(p_items) AS item
    WHERE btrim(COALESCE(item->>'topic_id', '')) <> ''
    ON CONFLICT (user_id, topic_id) DO UPDATE
      SET module_id = COALESCE(EXCLUDED.module_id, public.student_completed_topics.module_id),
          completed_at = EXCLUDED.completed_at;
  ELSE
    DELETE FROM public.student_completed_topics AS saved
    USING jsonb_array_elements(p_items) AS item
    WHERE saved.user_id = v_uid
      AND saved.topic_id = left(btrim(COALESCE(item->>'topic_id', '')), 128)
      AND btrim(COALESCE(item->>'topic_id', '')) <> '';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_topic_progress(jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_topic_progress(jsonb, boolean) TO authenticated;

COMMENT ON FUNCTION public.set_my_topic_progress(jsonb, boolean) IS
  'Guarda o quita los temas leídos del alumno autenticado, con el módulo de cada tema.';
