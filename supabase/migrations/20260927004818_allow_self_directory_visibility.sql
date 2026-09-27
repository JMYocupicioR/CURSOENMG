-- El alumno puede mostrar u ocultar su propio perfil en el directorio de especialistas.
-- Sigue bloqueado si la inscripción no está aprobada, y el comité editorial sigue siendo solo staff.

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR public.is_editor() THEN
    RETURN NEW;
  END IF;

  NEW.enrollment_status := OLD.enrollment_status;
  NEW.enrollment_verified_at := OLD.enrollment_verified_at;
  NEW.enrollment_verified_by := OLD.enrollment_verified_by;
  NEW.enrollment_requested_at := OLD.enrollment_requested_at;
  NEW.verified_at := OLD.verified_at;
  NEW.cedula_verified := OLD.cedula_verified;
  NEW.cedula_data := OLD.cedula_data;
  NEW.admin_notes := OLD.admin_notes;
  NEW.show_in_editorial_committee := OLD.show_in_editorial_committee;
  NEW.completed_topics := OLD.completed_topics;

  IF OLD.enrollment_status IS DISTINCT FROM 'approved' THEN
    NEW.is_public := false;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.protect_profile_privileged_columns() IS
  'Impide que el alumno altere inscripción, cédula verificada, notas administrativas y visibilidad del comité. Puede mostrar u ocultar su perfil en el directorio solo si su inscripción está aprobada.';

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

REVOKE ALL ON FUNCTION public.update_my_profile(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_profile(jsonb) TO authenticated;
