-- 0016: a teacher can take a learner out of her class (e.g. someone who never came). Additive and idempotent.
-- This only detaches membership: the account, scores, ticks and history are never touched. The row also stops the registry from silently re-adding
-- the person to this class at login or in the roster. Deleting the row (or adding the person to the class by hand/invite) brings them back.
CREATE TABLE IF NOT EXISTS class_removals (
 id TEXT PRIMARY KEY,
 class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
 registry_id TEXT,
 user_id TEXT,
 person_name TEXT NOT NULL,
 removed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS class_removals_class_idx ON class_removals(class_id);
