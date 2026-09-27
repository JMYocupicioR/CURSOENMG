-- Reparar objetos que academic_integrity.sql marca en false.
-- Pegar y ejecutar en el SQL Editor, luego volver a correr supabase/tests/academic_integrity.sql.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ─── 1. Vista pública de especialistas (sin cédula ni notas admin) ───────────

CREATE OR REPLACE VIEW public.public_specialist_profiles
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.display_name,
  p.credentials,
  p.institution,
  p.academic_institution,
  p.specialty,
  p.residency_year,
  p.avatar_url,
  p.bio,
  p.is_public,
  p.show_in_editorial_committee,
  COALESCE(p.cedula_verified, false) AS cedula_verified,
  p.created_at
FROM public.profiles p
WHERE p.enrollment_status = 'approved'
  AND (p.is_public = true OR p.show_in_editorial_committee = true);

GRANT SELECT ON public.public_specialist_profiles TO anon, authenticated;

DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_or_staff_read" ON public.profiles;
CREATE POLICY "profiles_self_or_staff_read" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
    OR public.is_editor()
  );

DROP POLICY IF EXISTS "profiles_public_directory_read" ON public.profiles;
CREATE POLICY "profiles_public_directory_read" ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    enrollment_status = 'approved'
    AND (is_public = true OR show_in_editorial_committee = true)
  );

GRANT SELECT ON public.profiles TO anon, authenticated;

-- ─── 2. quiz_questions: anon sin SELECT; solo staff lee la tabla ─────────────

REVOKE SELECT ON public.quiz_questions FROM PUBLIC;
REVOKE SELECT ON public.quiz_questions FROM anon;
GRANT SELECT ON public.quiz_questions TO authenticated;

DROP POLICY IF EXISTS "quiz_questions_authenticated_read" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_staff_read" ON public.quiz_questions;
CREATE POLICY "quiz_questions_staff_read" ON public.quiz_questions
  FOR SELECT USING (public.is_admin() OR public.is_editor());

-- ─── 3. RPC update_my_profile(jsonb) ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_my_profile(p_updates jsonb)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.profiles;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión';
  END IF;

  UPDATE public.profiles SET
    display_name = COALESCE(p_updates->>'display_name', display_name),
    credentials = COALESCE(p_updates->>'credentials', credentials),
    institution = COALESCE(p_updates->>'institution', institution),
    academic_institution = COALESCE(p_updates->>'academic_institution', academic_institution),
    specialty = COALESCE(p_updates->>'specialty', specialty),
    residency_year = COALESCE(p_updates->>'residency_year', residency_year),
    cedula_profesional = COALESCE(p_updates->>'cedula_profesional', cedula_profesional),
    comefyr_member_id = COALESCE(p_updates->>'comefyr_member_id', comefyr_member_id),
    avatar_url = CASE WHEN p_updates ? 'avatar_url' THEN p_updates->>'avatar_url' ELSE avatar_url END,
    bio = COALESCE(p_updates->>'bio', bio),
    is_public = CASE
      WHEN p_updates ? 'is_public' THEN COALESCE((p_updates->>'is_public')::boolean, is_public)
      ELSE is_public
    END,
    subspecialty = COALESCE(p_updates->>'subspecialty', subspecialty),
    specialty_cedula = COALESCE(p_updates->>'specialty_cedula', specialty_cedula),
    cmmr_certified = COALESCE((p_updates->>'cmmr_certified')::boolean, cmmr_certified),
    cmmr_number = COALESCE(p_updates->>'cmmr_number', cmmr_number),
    phone = COALESCE(p_updates->>'phone', phone),
    linkedin_url = COALESCE(p_updates->>'linkedin_url', linkedin_url),
    orcid_id = COALESCE(p_updates->>'orcid_id', orcid_id),
    clinical_interests = CASE
      WHEN p_updates ? 'clinical_interests' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'clinical_interests'))
      ELSE clinical_interests
    END,
    updated_at = now()
  WHERE id = v_uid
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(jsonb) TO authenticated;

-- ─── 4. RPC submit_my_assignment(uuid, text, text) ───────────────────────────

CREATE OR REPLACE FUNCTION public.submit_my_assignment(
  p_assignment_id uuid,
  p_notes text DEFAULT NULL,
  p_submission_url text DEFAULT NULL
)
RETURNS public.student_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.student_assignments;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión';
  END IF;

  UPDATE public.student_assignments
  SET
    student_notes = COALESCE(p_notes, student_notes),
    submission_url = COALESCE(p_submission_url, submission_url),
    submitted_at = now(),
    status = 'submitted',
    updated_at = now()
  WHERE id = p_assignment_id
    AND student_id = v_uid
    AND status IN ('pending', 'needs_revision')
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asignación no encontrada o no disponible para entrega';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_my_assignment(uuid, text, text) TO authenticated;

-- ─── 5. RPC issue_my_certificate() ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.academic_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folio text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  overall_progress_pct int NOT NULL,
  average_score int NOT NULL,
  verification_code text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(12), 'hex'),
  revoked_at timestamptz
);

ALTER TABLE public.academic_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS certs_own_read ON public.academic_certificates;
CREATE POLICY certs_own_read ON public.academic_certificates
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin() OR public.is_editor());

GRANT SELECT ON public.academic_certificates TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_my_certificate()
RETURNS public.academic_certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_avg int;
  v_progress int;
  v_passed int;
  v_available int;
  v_row public.academic_certificates;
  v_folio text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF v_profile.cedula_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'Requiere cédula profesional verificada';
  END IF;

  SELECT COALESCE(round(avg(best)), 0)::int, count(*) FILTER (WHERE best >= 80), count(*)
  INTO v_avg, v_passed, v_available
  FROM (
    SELECT topic_id, max(score) AS best
    FROM public.quiz_attempts
    WHERE user_id = v_uid
    GROUP BY topic_id
  ) s;

  SELECT COUNT(*)::int INTO v_progress
  FROM public.student_completed_topics
  WHERE user_id = v_uid;

  IF v_avg < 80 OR v_available < 8 THEN
    RAISE EXCEPTION 'Promedio o cobertura de evaluaciones insuficiente para emitir constancia';
  END IF;

  SELECT folio INTO v_folio FROM public.academic_certificates
  WHERE user_id = v_uid AND revoked_at IS NULL
  LIMIT 1;

  IF v_folio IS NOT NULL THEN
    SELECT * INTO v_row FROM public.academic_certificates WHERE folio = v_folio;
    RETURN v_row;
  END IF;

  v_folio := 'EDX-' || to_char(now(), 'YYYY') || '-' || upper(encode(gen_random_bytes(6), 'hex'));

  INSERT INTO public.academic_certificates (user_id, folio, overall_progress_pct, average_score)
  VALUES (v_uid, v_folio, LEAST(100, v_progress), v_avg)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_my_certificate() TO authenticated;

-- ─── 6. RPC verify_certificate(text) ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.verify_certificate(p_folio text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN c.id IS NULL THEN jsonb_build_object('valid', false)
    ELSE jsonb_build_object(
      'valid', c.revoked_at IS NULL,
      'folio', c.folio,
      'issued_at', c.issued_at,
      'display_name', p.display_name,
      'revoked', c.revoked_at IS NOT NULL
    )
  END
  FROM (SELECT p_folio AS folio) q
  LEFT JOIN public.academic_certificates c ON c.folio = q.folio
  LEFT JOIN public.profiles p ON p.id = c.user_id;
$$;

GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;
