-- 0014: learner history. An append-only log of leaving and returning, kept per person (registry person and/or site user), so a record survives years and does not depend on an account. Additive and idempotent.
-- The log is never updated or deleted by the app. class_id is cleared (not the row) if a class is ever deleted; class_name is a snapshot.
CREATE TABLE IF NOT EXISTS learner_history (
 id TEXT PRIMARY KEY,
 class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
 class_name TEXT,
 registry_id TEXT,
 user_id TEXT,
 person_name TEXT NOT NULL,
 event TEXT NOT NULL CHECK (event IN ('left','returned')),
 term TEXT,
 position_note TEXT,
 reason TEXT,
 event_date DATE NOT NULL DEFAULT CURRENT_DATE,
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS learner_history_class_idx ON learner_history(class_id, created_at);
CREATE INDEX IF NOT EXISTS learner_history_registry_idx ON learner_history(registry_id);
CREATE INDEX IF NOT EXISTS learner_history_user_idx ON learner_history(user_id);
