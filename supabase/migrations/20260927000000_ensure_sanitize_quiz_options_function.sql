-- Migration: ensure _sanitize_quiz_options helper exists and has correct permissions
-- Needed by public.get_quiz_for_attempt to strip isCorrect answers before returning quiz questions to students

CREATE OR REPLACE FUNCTION public._sanitize_quiz_options(opts jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', o->>'id',
        'text', o->>'text',
        'textEn', o->>'textEn'
      )
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(COALESCE(opts, '[]'::jsonb)) o;
$$;

GRANT EXECUTE ON FUNCTION public._sanitize_quiz_options(jsonb) TO anon, authenticated, service_role;
