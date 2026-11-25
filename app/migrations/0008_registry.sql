-- 0008: education office registry (students, teachers, supporters) managed by admins. Additive and idempotent.
CREATE TABLE IF NOT EXISTS registry_people (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK (kind IN ('student','teacher','supporter')),
 full_name TEXT NOT NULL,
 code TEXT,
 class_name TEXT,
 teacher_name TEXT,
 class_day TEXT,
 class_time TEXT,
 level TEXT,
 education TEXT,
 hifz_amount TEXT,
 tadabbur_amount TEXT,
 phone TEXT,
 bale_number TEXT,
 bale_id TEXT,
 email TEXT,
 resume TEXT,
 notes TEXT,
 status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
 extra TEXT,
 created_by TEXT REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS registry_people_kind_idx ON registry_people (kind, status);
CREATE UNIQUE INDEX IF NOT EXISTS registry_people_code_uidx ON registry_people (kind, code) WHERE code IS NOT NULL AND code <> '';
