-- 0015: values written as JSON *text* through `?::jsonb` were double-encoded by the DB driver into jsonb string scalars
-- (e.g. choices = "[\"a\",\"b\"]"). Unwrap them back to real arrays/objects. Idempotent: only touches rows whose jsonb_typeof is 'string'
-- and whose text parses as JSON (guarded so a genuine string cannot abort the migration).
CREATE OR REPLACE FUNCTION pg_temp.unwrap_json(v jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
  RETURN (v #>> '{}')::jsonb;
EXCEPTION WHEN others THEN
  RETURN v;
END $$;
UPDATE lesson_questions SET choices = pg_temp.unwrap_json(choices) WHERE jsonb_typeof(choices) = 'string';
UPDATE quiz_attempts SET answers = pg_temp.unwrap_json(answers) WHERE jsonb_typeof(answers) = 'string';
UPDATE class_exam_questions SET choices = pg_temp.unwrap_json(choices) WHERE jsonb_typeof(choices) = 'string';
UPDATE class_exam_attempts SET answers = pg_temp.unwrap_json(answers) WHERE jsonb_typeof(answers) = 'string';
