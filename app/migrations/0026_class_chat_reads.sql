-- 0026: per-user per-class "last read" marker for class chat unread counts (syncs across devices).
-- Additive and idempotent. A user with no row has read nothing (all others' messages count as unread, capped).
CREATE TABLE IF NOT EXISTS class_chat_reads (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, class_id)
);
