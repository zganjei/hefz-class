-- 0004: explicit many-to-many mapping between classes and teachers (additive, idempotent).
-- Nothing is dropped or rewritten except the one clearly-scoped backfill below.
CREATE TABLE IF NOT EXISTS class_teachers (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by TEXT REFERENCES users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id, user_id)
);
CREATE INDEX IF NOT EXISTS class_teachers_user_idx ON class_teachers(user_id);

-- Existing owning teachers of classes become explicit class teachers (admins already have global access).
INSERT INTO class_teachers (class_id, user_id)
SELECT c.id, c.teacher_id FROM classes c JOIN users u ON u.id = c.teacher_id WHERE u.role = 'teacher'
ON CONFLICT DO NOTHING;

-- Pending teacher invitations that were issued without a class: when the database has exactly ONE class,
-- attach them to it, so the invited teachers get access when they register. With 0 or 2+ classes nothing changes
-- (the admin then assigns classes through POST /api/class-teachers).
UPDATE invitations
SET class_id = (SELECT id FROM classes LIMIT 1)
WHERE role = 'teacher' AND class_id IS NULL AND used_at IS NULL
  AND (SELECT COUNT(*) FROM classes) = 1;
