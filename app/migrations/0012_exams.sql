-- 0012: class exams (digital, auto-scored). Exams belong directly to a class; independent of the legacy courses tables. Additive and idempotent.
CREATE TABLE IF NOT EXISTS class_exams (
 id TEXT PRIMARY KEY,
 class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 exam_date DATE,
 active INTEGER NOT NULL DEFAULT 1,
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS class_exams_class_idx ON class_exams(class_id, active);
CREATE TABLE IF NOT EXISTS class_exam_questions (
 id TEXT PRIMARY KEY,
 exam_id TEXT NOT NULL REFERENCES class_exams(id) ON DELETE CASCADE,
 kind TEXT NOT NULL DEFAULT 'final' CHECK (kind IN ('hifz','tadabbur','vocabulary','final')),
 prompt TEXT NOT NULL,
 choices JSONB NOT NULL DEFAULT '[]'::jsonb,
 answer_key TEXT NOT NULL,
 points INTEGER NOT NULL DEFAULT 1,
 position INTEGER NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS class_exam_questions_exam_idx ON class_exam_questions(exam_id, position);
-- One attempt per learner per exam; a teacher can reset it to allow a retake.
CREATE TABLE IF NOT EXISTS class_exam_attempts (
 exam_id TEXT NOT NULL REFERENCES class_exams(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 score INTEGER NOT NULL,
 max_score INTEGER NOT NULL,
 answers JSONB NOT NULL DEFAULT '{}'::jsonb,
 submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (exam_id, user_id)
);
