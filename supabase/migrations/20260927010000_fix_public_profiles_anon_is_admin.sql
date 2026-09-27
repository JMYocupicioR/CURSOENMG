-- Corrección de error 42501 (permission denied for function is_admin)
-- cuando un usuario no autenticado (anon) consulta el directorio de especialistas (/especialistas).
--
-- Causa:
-- La vista public.public_specialist_profiles utiliza security_invoker = true.
-- Al consultar profiles, PostgreSQL evalúa todas las políticas permisivas para el rol 'anon'.
-- La política "profiles_self_or_staff_read" no tenía la cláusula 'TO authenticated',
-- por lo que aplicaba a PUBLIC (incluyendo 'anon') e intentaba ejecutar public.is_admin(),
-- el cual tiene REVOKE de EXECUTE para 'anon'.
--
-- Solución:
-- 1. Restringir "profiles_self_or_staff_read" explícitamente a 'authenticated'.
-- 2. Asegurar que "profiles_public_directory_read" esté habilitada para 'anon' y 'authenticated'
--    sin invocar funciones administrativas.
-- 3. Asegurar permisos de SELECT en public.profiles y public.public_specialist_profiles para anon y authenticated.

-- 1. Limpiar políticas existentes
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_or_staff_read" ON public.profiles;

-- 2. Política para auto-lectura o lectura completa de staff (solo usuarios autenticados)
CREATE POLICY "profiles_self_or_staff_read" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
    OR public.is_editor()
  );

-- 3. Política para directorio público (médicos aprobados y visibles públicamente o en comité)
DROP POLICY IF EXISTS "profiles_public_directory_read" ON public.profiles;

CREATE POLICY "profiles_public_directory_read" ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    enrollment_status = 'approved'
    AND (is_public = true OR show_in_editorial_committee = true)
  );

-- 4. Garantizar permisos de lectura
GRANT SELECT ON public.profiles TO anon, authenticated;

-- 5. Recrear la vista con security_invoker = true
DROP VIEW IF EXISTS public.public_specialist_profiles;

CREATE VIEW public.public_specialist_profiles
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

COMMENT ON VIEW public.public_specialist_profiles IS
  'Directorio público con security_invoker = true. Compatible con visitantes anónimos y RLS de profiles.';

GRANT SELECT ON public.public_specialist_profiles TO anon, authenticated;
