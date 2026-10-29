-- Texto publicado de los acuerdos. El alumno firma esta edición, no el archivo del repositorio.

CREATE TABLE IF NOT EXISTS public.student_agreement_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('draft', 'published')),
  bundle_version text NOT NULL,
  party jsonb NOT NULL DEFAULT '{}'::jsonb,
  contrato_markdown text NOT NULL,
  reglamento_markdown text NOT NULL,
  normas_markdown text NOT NULL,
  aviso_markdown text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS student_agreement_editions_one_draft
  ON public.student_agreement_editions (status)
  WHERE status = 'draft';

CREATE UNIQUE INDEX IF NOT EXISTS student_agreement_editions_one_published
  ON public.student_agreement_editions (status)
  WHERE status = 'published';

ALTER TABLE public.student_agreement_editions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alumnos leen la edición publicada" ON public.student_agreement_editions;
CREATE POLICY "Alumnos leen la edición publicada"
  ON public.student_agreement_editions
  FOR SELECT
  TO authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Staff edita las ediciones de acuerdos" ON public.student_agreement_editions;
CREATE POLICY "Staff edita las ediciones de acuerdos"
  ON public.student_agreement_editions
  FOR ALL
  TO authenticated
  USING (public.is_admin() OR public.is_editor())
  WITH CHECK (public.is_admin() OR public.is_editor());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_agreement_editions TO authenticated;
