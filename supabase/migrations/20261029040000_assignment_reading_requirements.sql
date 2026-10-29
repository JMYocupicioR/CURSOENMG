-- Lectura dirigida dentro de una tarea.
-- La lectura se cierra sola cuando el alumno ya tiene esos temas en
-- student_completed_topics. La entrega, si la hay, sigue en status
-- hasta que el profesor la califica.

ALTER TABLE public.student_assignments
  ADD COLUMN IF NOT EXISTS batch_id uuid,
  ADD COLUMN IF NOT EXISTS reading_topic_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reading_done_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reading_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS requires_delivery boolean;

COMMENT ON COLUMN public.student_assignments.batch_id IS
  'Agrupa la misma publicación para varios alumnos, para cambiar la fecha o quitarla en lote.';
COMMENT ON COLUMN public.student_assignments.reading_topic_ids IS
  'Temas que el alumno debe leer. Vacío si la tarea no pide lectura.';
COMMENT ON COLUMN public.student_assignments.reading_done_ids IS
  'Subconjunto de reading_topic_ids que ya está en student_completed_topics.';
COMMENT ON COLUMN public.student_assignments.reading_completed_at IS
  'Momento en que quedaron leídos todos los temas pedidos. Se conserva la primera vez.';
COMMENT ON COLUMN public.student_assignments.requires_delivery IS
  'True si el alumno debe entregar algo para que el profesor lo revise. Null en tareas viejas: se infiere del tipo.';

CREATE INDEX IF NOT EXISTS idx_student_assignments_batch
  ON public.student_assignments(batch_id)
  WHERE batch_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.refresh_reading_assignment_progress(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.student_assignments%ROWTYPE;
  v_done text[];
  v_total integer;
  v_complete boolean;
  v_delivery boolean;
  v_auto boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  -- El cierre lo hace el sistema, no el alumno escribiendo la fila.
  PERFORM set_config('neurosafe.allow_assignment_grade', 'true', true);

  FOR v_row IN
    SELECT *
    FROM public.student_assignments
    WHERE student_id = p_user_id
      AND cardinality(reading_topic_ids) > 0
  LOOP
    SELECT COALESCE(array_agg(t.topic_id ORDER BY t.ord), '{}')
    INTO v_done
    FROM unnest(v_row.reading_topic_ids) WITH ORDINALITY AS t(topic_id, ord)
    WHERE EXISTS (
      SELECT 1
      FROM public.student_completed_topics AS sct
      WHERE sct.user_id = p_user_id
        AND sct.topic_id = t.topic_id
    );

    v_total := cardinality(v_row.reading_topic_ids);
    v_complete := cardinality(v_done) = v_total AND v_total > 0;
    v_delivery := COALESCE(v_row.requires_delivery, v_row.type IN ('practical_task', 'emg_report'));
    v_auto := v_row.type = 'reading'
      AND NOT v_delivery
      AND v_row.grade IS NULL
      AND v_row.reviewed_by IS NULL;

    UPDATE public.student_assignments
    SET
      reading_done_ids = v_done,
      reading_completed_at = CASE
        WHEN v_complete THEN COALESCE(reading_completed_at, now())
        ELSE NULL
      END,
      status = CASE
        WHEN v_auto AND v_complete THEN 'approved'
        WHEN v_auto AND NOT v_complete AND status = 'approved' THEN 'pending'
        ELSE status
      END,
      submitted_at = CASE
        WHEN v_auto AND v_complete THEN COALESCE(submitted_at, now())
        WHEN v_auto AND NOT v_complete THEN NULL
        ELSE submitted_at
      END,
      updated_at = now()
    WHERE id = v_row.id
      AND (
        reading_done_ids IS DISTINCT FROM v_done
        OR (v_complete AND reading_completed_at IS NULL)
        OR (NOT v_complete AND reading_completed_at IS NOT NULL)
        OR (v_auto AND v_complete AND status IS DISTINCT FROM 'approved')
        OR (v_auto AND NOT v_complete AND status = 'approved')
      );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_reading_assignment_progress(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.sync_my_reading_assignments()
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
  PERFORM public.refresh_reading_assignment_progress(v_uid);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_my_reading_assignments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_my_reading_assignments() TO authenticated;

COMMENT ON FUNCTION public.sync_my_reading_assignments() IS
  'Recalcula la lectura de las tareas del alumno autenticado a partir de los temas ya leídos.';

CREATE OR REPLACE FUNCTION public.trg_refresh_reading_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reading_topic_ids IS NOT NULL AND cardinality(NEW.reading_topic_ids) > 0 THEN
    PERFORM public.refresh_reading_assignment_progress(NEW.student_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_reading_assignment ON public.student_assignments;
CREATE TRIGGER trg_refresh_reading_assignment
  AFTER INSERT ON public.student_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_refresh_reading_assignment();

-- Al guardar o quitar un tema leído, se actualiza la parte de lectura de las tareas.
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

  PERFORM public.refresh_reading_assignment_progress(v_uid);
END;
$$;

-- El alumno no puede marcarse la lectura ni cambiar el lote a mano.
CREATE OR REPLACE FUNCTION public.protect_assignment_student_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('neurosafe.allow_assignment_grade', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() OR public.is_editor() THEN
    RETURN NEW;
  END IF;

  IF NEW.student_id IS DISTINCT FROM OLD.student_id
    OR NEW.grade IS DISTINCT FROM OLD.grade
    OR NEW.feedback IS DISTINCT FROM OLD.feedback
    OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
    OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
    OR NEW.min_score IS DISTINCT FROM OLD.min_score
    OR NEW.due_date IS DISTINCT FROM OLD.due_date
    OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by
    OR NEW.target_exam_config IS DISTINCT FROM OLD.target_exam_config
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.type IS DISTINCT FROM OLD.type
    OR NEW.plan_id IS DISTINCT FROM OLD.plan_id
    OR NEW.batch_id IS DISTINCT FROM OLD.batch_id
    OR NEW.reading_topic_ids IS DISTINCT FROM OLD.reading_topic_ids
    OR NEW.reading_done_ids IS DISTINCT FROM OLD.reading_done_ids
    OR NEW.reading_completed_at IS DISTINCT FROM OLD.reading_completed_at
    OR NEW.requires_delivery IS DISTINCT FROM OLD.requires_delivery
  THEN
    RAISE EXCEPTION 'No autorizado a modificar campos académicos de la asignación';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('submitted')
     AND OLD.status NOT IN ('pending', 'needs_revision') THEN
    RAISE EXCEPTION 'Transición de estado no permitida';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'submitted' THEN
    RAISE EXCEPTION 'El alumno solo puede marcar una asignación como entregada';
  END IF;

  RETURN NEW;
END;
$$;
