-- 0006: public registration applications, approved by the admin. Additive and idempotent.
CREATE TABLE IF NOT EXISTS applications (
 id TEXT PRIMARY KEY,
 first_name TEXT NOT NULL,
 last_name TEXT NOT NULL,
 national_id TEXT NOT NULL,
 age INTEGER NOT NULL,
 education TEXT NOT NULL,
 email TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 ip_hash TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 decided_by TEXT REFERENCES users(id),
 decided_at TIMESTAMPTZ,
 used_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS applications_email_uidx ON applications (lower(email));
CREATE INDEX IF NOT EXISTS applications_status_idx ON applications (status, created_at);
CREATE INDEX IF NOT EXISTS applications_ip_idx ON applications (ip_hash, created_at);
