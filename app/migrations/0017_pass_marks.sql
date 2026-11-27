-- 0017: hand-entered pass/fail marks (قبول / رد) per class, group (surah / step / exam) and criterion. Additive and idempotent.
-- A group is a named block of a class sheet, e.g. «سوره فتح» or «آزمون گام اول». A criterion is one grade-book column (see CRITERIA in src/lib/pass-marks.ts).
-- The learner is a registry person and/or a site user, so no foreign keys on them (same as class_manual_scores). "Not entered" = no row.
CREATE TABLE IF NOT EXISTS class_pass_groups (
 id TEXT PRIMARY KEY,
 class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS class_pass_groups_title_idx ON class_pass_groups(class_id, title);
CREATE TABLE IF NOT EXISTS class_pass_marks (
 id TEXT PRIMARY KEY,
 class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
 group_id TEXT NOT NULL REFERENCES class_pass_groups(id) ON DELETE CASCADE,
 criterion TEXT NOT NULL,
 person_key TEXT NOT NULL,
 registry_id TEXT,
 user_id TEXT,
 person_name TEXT NOT NULL,
 status TEXT NOT NULL CHECK (status IN ('pass','fail')),
 note TEXT,
 source TEXT NOT NULL DEFAULT 'manual',
 updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS class_pass_marks_uniq_idx ON class_pass_marks(group_id, criterion, person_key);
CREATE INDEX IF NOT EXISTS class_pass_marks_class_idx ON class_pass_marks(class_id);
