-- 0021: one person can hold several roles (قرآن‌آموز / استاد / مدیر / پشتیبان). Additive and idempotent.
-- users.role stays as the legacy "primary" role (highest of admin > teacher > memorizer; supporter-only accounts keep 'memorizer'
-- because of the old CHECK) and is kept in sync by the app, so old code paths keep working.
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('memorizer','teacher','admin','supporter')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role)
);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles (role);
-- backfill from the legacy single role
INSERT INTO user_roles (user_id, role) SELECT id, role FROM users ON CONFLICT DO NOTHING;
-- any code path that still inserts a user with only users.role gets the matching user_roles row automatically
CREATE OR REPLACE FUNCTION user_roles_from_legacy() RETURNS trigger AS $$
BEGIN
  INSERT INTO user_roles (user_id, role) VALUES (NEW.id, NEW.role) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS users_roles_sync ON users;
CREATE TRIGGER users_roles_sync AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION user_roles_from_legacy();
