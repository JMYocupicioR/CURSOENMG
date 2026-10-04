-- ==============================================================================
-- Migración: Dashboard del Curso del Estudiante y Metadata Operativa
-- Fecha: 2026-10-04
-- ==============================================================================

-- 1. Metadata extendida en public.courses (manteniendo id TEXT compatible)
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS instructor_title TEXT,
  ADD COLUMN IF NOT EXISTS live_meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS live_schedule_notes TEXT,
  ADD COLUMN IF NOT EXISTS active_workshop_id UUID REFERENCES public.live_workshops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS syllabus_brochure_url TEXT,
  ADD COLUMN IF NOT EXISTS min_passing_grade INT DEFAULT 80;

-- 2. Asegurar columna is_required en public.course_modules
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT true;

-- Índice para optimizar consultas de módulos por curso
CREATE INDEX IF NOT EXISTS idx_course_modules_lookup 
  ON public.course_modules(course_id, sort_order) 
  WHERE is_visible = true;

-- 3. Vista optimizada para el Dashboard del Estudiante con Security Invoker
CREATE OR REPLACE VIEW public.student_course_overview
WITH (security_invoker = true)
AS
SELECT 
  c.id AS course_id,
  c.title AS course_title,
  c.description AS course_description,
  c.price_display,
  c.is_active,
  c.is_sellable,
  c.live_meeting_url,
  c.live_schedule_notes,
  c.active_workshop_id,
  c.syllabus_brochure_url,
  c.instructor_name,
  c.instructor_title,
  c.min_passing_grade,
  p.display_name AS instructor_profile_name,
  p.avatar_url AS instructor_avatar_url,
  w.title AS active_workshop_title,
  w.scheduled_at AS active_workshop_date,
  w.stream_url AS active_workshop_stream_url,
  w.duration_minutes AS active_workshop_duration_minutes,
  e.user_id,
  e.status AS enrollment_status,
  e.granted_at AS enrolled_at,
  e.expires_at AS enrollment_expires_at
FROM public.courses c
JOIN public.course_enrollments e ON e.course_id = c.id
LEFT JOIN public.profiles p ON p.id = c.instructor_id
LEFT JOIN public.live_workshops w ON w.id = c.active_workshop_id;

-- 4. Sembrado de valores por defecto para cursos existentes
UPDATE public.courses
SET 
  instructor_name = COALESCE(instructor_name, 'Dr. Juan Marcos Yocupicio Robles'),
  instructor_title = COALESCE(instructor_title, 'Médico Especialista en Medicina de Rehabilitación y Electrodiagnóstico'),
  live_schedule_notes = COALESCE(live_schedule_notes, 'Sesiones en vivo y talleres prácticos programados')
WHERE id IN ('principiante', 'intermedio', 'avanzado');

-- 5. Permisos
GRANT SELECT ON public.student_course_overview TO authenticated;
GRANT SELECT ON public.student_course_overview TO anon;
