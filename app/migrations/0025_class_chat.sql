-- 0025: in-class group chat (text only). One chat per class; membership is derived from class_members / class_teachers / admin role at request time, not stored here.
-- Additive and idempotent. Deleting a class or a user cascades their messages.
CREATE TABLE IF NOT EXISTS class_messages (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS class_messages_class_idx ON class_messages (class_id, created_at DESC);
