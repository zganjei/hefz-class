CREATE TABLE IF NOT EXISTS courses (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 created_by TEXT NOT NULL REFERENCES users(id), class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
 active INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS course_weeks (
 id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
 week_number INTEGER NOT NULL, title TEXT NOT NULL, due_weekday INTEGER NOT NULL DEFAULT 5,
 UNIQUE(course_id,week_number)
);
CREATE TABLE IF NOT EXISTS course_lessons (
 id TEXT PRIMARY KEY, week_id TEXT NOT NULL REFERENCES course_weeks(id) ON DELETE CASCADE,
 lesson_order INTEGER NOT NULL, title TEXT NOT NULL, surah TEXT NOT NULL,
 from_ayah INTEGER NOT NULL, to_ayah INTEGER NOT NULL, video_url TEXT NOT NULL DEFAULT '',
 UNIQUE(week_id,lesson_order)
);
CREATE TABLE IF NOT EXISTS lesson_questions (
 id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
 question_type TEXT NOT NULL CHECK(question_type IN ('hifz','tadabbur','vocabulary','final')),
 prompt TEXT NOT NULL, choices JSONB NOT NULL DEFAULT '[]'::jsonb,
 answer_key TEXT NOT NULL, explanation TEXT NOT NULL DEFAULT '', points INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS course_enrollments (
 id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
 class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 due_weekday INTEGER NOT NULL DEFAULT 5, active INTEGER NOT NULL DEFAULT 1,
 enrolled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(course_id,user_id)
);
CREATE TABLE IF NOT EXISTS lesson_progress (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 lesson_id TEXT NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
 video_completed INTEGER NOT NULL DEFAULT 0, practice_completed INTEGER NOT NULL DEFAULT 0,
 final_exam_passed INTEGER NOT NULL DEFAULT 0, completed_at TIMESTAMPTZ,
 PRIMARY KEY(user_id,lesson_id)
);
CREATE TABLE IF NOT EXISTS quiz_attempts (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 lesson_id TEXT NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
 question_type TEXT NOT NULL, score INTEGER NOT NULL, max_score INTEGER NOT NULL,
 passed INTEGER NOT NULL, answers JSONB NOT NULL DEFAULT '{}'::jsonb,
 submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS weekly_submissions (
 id TEXT PRIMARY KEY, enrollment_id TEXT NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
 week_id TEXT NOT NULL REFERENCES course_weeks(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','needs_revision')),
 note TEXT NOT NULL DEFAULT '', feedback TEXT NOT NULL DEFAULT '',
 submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_by TEXT REFERENCES users(id), reviewed_at TIMESTAMPTZ,
 UNIQUE(enrollment_id,week_id)
);
CREATE INDEX IF NOT EXISTS course_enrollments_user_idx ON course_enrollments(user_id,active);
CREATE INDEX IF NOT EXISTS lesson_progress_user_idx ON lesson_progress(user_id,lesson_id);
CREATE INDEX IF NOT EXISTS weekly_submissions_enrollment_idx ON weekly_submissions(enrollment_id,submitted_at);
