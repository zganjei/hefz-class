-- 0013: class sheets. Optional term label and a free-text "where the class is now" on classes; hand-entered scores per learner. Additive and idempotent.
ALTER TABLE classes ADD COLUMN IF NOT EXISTS term TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS position_note TEXT;
-- A hand-entered score. The learner is a registry person and/or a site user (a person without an account has only registry_id), so there are no foreign keys on them.
CREATE TABLE IF NOT EXISTS class_manual_scores (
 id TEXT PRIMARY KEY,
 class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
 registry_id TEXT,
 user_id TEXT,
 person_name TEXT NOT NULL,
 title TEXT NOT NULL,
 score NUMERIC NOT NULL,
 max_score NUMERIC,
 score_date DATE,
 note TEXT,
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS class_manual_scores_class_idx ON class_manual_scores(class_id);
