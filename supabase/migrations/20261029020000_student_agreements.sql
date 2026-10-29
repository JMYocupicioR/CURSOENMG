-- Firma de acuerdos del alumno: expediente, candado y consulta pública por folio.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agreements_signed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreement_bundle_version text;

COMMENT ON COLUMN public.profiles.agreements_signed IS
  'True cuando el alumno firmó los tres instrumentos de la versión vigente.';
COMMENT ON COLUMN public.profiles.agreement_bundle_version IS
  'Versión del paquete firmado (ej. 1.0). Si no coincide con la vigente, hay que volver a firmar.';

CREATE TABLE IF NOT EXISTS public.student_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('contrato', 'reglamento', 'normas')),
  document_version text NOT NULL DEFAULT '1.0',
  document_sha256 text NOT NULL,
  full_name_typed text NOT NULL,
  professional_license text,
  signature_image_path text NOT NULL,
  pdf_signed_path text NOT NULL,
  verification_folio text NOT NULL,
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, document_type, document_version),
  UNIQUE (verification_folio)
);

CREATE INDEX IF NOT EXISTS idx_student_agreements_user
  ON public.student_agreements (user_id);
CREATE INDEX IF NOT EXISTS idx_student_agreements_type
  ON public.student_agreements (document_type);

ALTER TABLE public.student_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alumnos leen sus acuerdos" ON public.student_agreements;
CREATE POLICY "Alumnos leen sus acuerdos"
  ON public.student_agreements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff lee acuerdos de alumnos" ON public.student_agreements;
CREATE POLICY "Staff lee acuerdos de alumnos"
  ON public.student_agreements
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.is_editor());

GRANT SELECT ON public.student_agreements TO authenticated;

-- Solo service_role (o postgres) puede marcar el perfil como firmado.
CREATE OR REPLACE FUNCTION public.protect_agreement_signed_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  jwt_role text := '';
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  BEGIN
    jwt_role := coalesce(
      current_setting('request.jwt.claim.role', true),
      (current_setting('request.jwt.claims', true)::json ->> 'role'),
      ''
    );
  EXCEPTION WHEN others THEN
    jwt_role := '';
  END;

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.agreements_signed := OLD.agreements_signed;
  NEW.agreement_bundle_version := OLD.agreement_bundle_version;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_agreement_signed_columns ON public.profiles;
CREATE TRIGGER trg_protect_agreement_signed_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_agreement_signed_columns();

COMMENT ON FUNCTION public.protect_agreement_signed_columns() IS
  'Ni el alumno ni el staff pueden marcar agreements_signed. Solo el cliente de servicio.';

-- Bucket privado. El alumno lee lo suyo; admin y editor leen todo. Nadie sube desde el navegador.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-dossiers',
  'student-dossiers',
  false,
  10485760,
  ARRAY['application/pdf', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/png'];

DROP POLICY IF EXISTS "dossiers_owner_or_staff_read" ON storage.objects;
CREATE POLICY "dossiers_owner_or_staff_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-dossiers'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.is_admin()
      OR public.is_editor()
    )
  );

-- Consulta pública: folio, tipo, versión, nombre y fecha. Sin IP ni archivo.
CREATE OR REPLACE FUNCTION public.verify_student_agreement(p_folio text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN a.id IS NULL THEN jsonb_build_object('valid', false)
    ELSE jsonb_build_object(
      'valid', true,
      'folio', a.verification_folio,
      'document_type', a.document_type,
      'document_version', a.document_version,
      'full_name', a.full_name_typed,
      'signed_at', a.signed_at
    )
  END
  FROM (SELECT nullif(btrim(p_folio), '') AS folio) q
  LEFT JOIN public.student_agreements a ON a.verification_folio = q.folio;
$$;

GRANT EXECUTE ON FUNCTION public.verify_student_agreement(text) TO anon, authenticated;

COMMENT ON FUNCTION public.verify_student_agreement(text) IS
  'Verificación pública de un acuerdo firmado. No expone IP, hash ni rutas de archivo.';

-- Marca de firma en el listado de alumnos del admin.
DROP FUNCTION IF EXISTS public.admin_list_profiles(boolean, text);

CREATE FUNCTION public.admin_list_profiles(
  pending_only BOOLEAN DEFAULT false,
  enrollment_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  credentials TEXT,
  institution TEXT,
  academic_institution TEXT,
  specialty TEXT,
  residency_year TEXT,
  cedula_profesional TEXT,
  comefyr_member_id TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_public BOOLEAN,
  show_in_editorial_committee BOOLEAN,
  verified_at TIMESTAMPTZ,
  enrollment_status public.enrollment_status,
  enrollment_verified_at TIMESTAMPTZ,
  enrollment_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  roles TEXT[],
  is_verified_contributor BOOLEAN,
  cedula_verified BOOLEAN,
  cedula_data JSONB,
  has_premium BOOLEAN,
  agreements_signed BOOLEAN,
  agreement_bundle_version TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    COALESCE(au.email::text, '') AS email,
    p.display_name,
    p.credentials,
    p.institution,
    p.academic_institution,
    p.specialty,
    p.residency_year,
    p.cedula_profesional,
    p.comefyr_member_id,
    p.avatar_url,
    p.bio,
    COALESCE(p.is_public, true) AS is_public,
    COALESCE(p.show_in_editorial_committee, false) AS show_in_editorial_committee,
    p.verified_at,
    p.enrollment_status,
    p.enrollment_verified_at,
    p.enrollment_requested_at,
    p.created_at,
    p.updated_at,
    COALESCE(
      ARRAY(SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.id),
      '{}'
    ) AS roles,
    (p.verified_at IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'contributor'
    )) AS is_verified_contributor,
    COALESCE(p.cedula_verified, false) AS cedula_verified,
    p.cedula_data,
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = p.id AND s.tier = 'premium' AND s.is_active = true AND (s.expires_at IS NULL OR s.expires_at > now())
    ) AS has_premium,
    COALESCE(p.agreements_signed, false) AS agreements_signed,
    p.agreement_bundle_version
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE
    public.is_admin()
    AND (
      NOT pending_only
      OR p.enrollment_status IN ('pending', 'none')
      OR (p.verified_at IS NULL AND EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'contributor'
      ))
    )
    AND (
      enrollment_filter IS NULL
      OR enrollment_filter = 'all'
      OR (enrollment_filter = 'enrollment_pending' AND p.enrollment_status IN ('pending', 'none'))
      OR (enrollment_filter = 'enrolled' AND p.enrollment_status = 'approved')
      OR (enrollment_filter = 'comite' AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role IN ('editor', 'admin')
        )
        OR p.show_in_editorial_committee = true
        OR p.is_public = true
      ))
      OR (enrollment_filter = 'contributors' AND EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role IN ('contributor', 'editor', 'admin')
      ))
      OR (enrollment_filter = 'premium' AND EXISTS (
        SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id AND s.tier = 'premium' AND s.is_active = true AND (s.expires_at IS NULL OR s.expires_at > now())
      ))
    )
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_profiles(boolean, text) TO authenticated;
