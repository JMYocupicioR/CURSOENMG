-- Material que el profesor adjunta al publicar una tarea.
-- Plan Free de Supabase: máximo global 50 MB por archivo y 1 GB de almacenamiento.
-- El archivo se sube una sola vez. Cada asignación del lote guarda la misma URL en materials.
-- El bucket es público para que el alumno abra el archivo con esa URL, sin poder listar el bucket.

ALTER TABLE public.student_assignments
  ADD COLUMN IF NOT EXISTS materials JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.student_assignments.materials IS
  'Archivos y enlaces que el profesor adjunta a la tarea. kind=file|link, url https, y para archivos file_name, mime_type, byte_size y storage_path.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-materials',
  'assignment-materials',
  true,
  52428800,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "assignment_materials_staff_read" ON storage.objects;
CREATE POLICY "assignment_materials_staff_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'assignment-materials'
    AND public.is_verified_contributor()
  );

DROP POLICY IF EXISTS "assignment_materials_staff_insert" ON storage.objects;
CREATE POLICY "assignment_materials_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assignment-materials'
    AND public.is_verified_contributor()
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "assignment_materials_staff_update" ON storage.objects;
CREATE POLICY "assignment_materials_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'assignment-materials'
    AND (
      public.is_editor()
      OR (
        public.is_verified_contributor()
        AND split_part(name, '/', 1) = auth.uid()::text
      )
    )
  )
  WITH CHECK (
    bucket_id = 'assignment-materials'
    AND (
      public.is_editor()
      OR (
        public.is_verified_contributor()
        AND split_part(name, '/', 1) = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "assignment_materials_staff_delete" ON storage.objects;
CREATE POLICY "assignment_materials_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'assignment-materials'
    AND (
      public.is_editor()
      OR (
        public.is_verified_contributor()
        AND split_part(name, '/', 1) = auth.uid()::text
      )
    )
  );
