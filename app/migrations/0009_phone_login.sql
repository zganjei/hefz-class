-- 0009: phone-number (SMS code) sign-in. Additive and idempotent.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_uidx ON users (phone) WHERE phone IS NOT NULL;
CREATE TABLE IF NOT EXISTS phone_otps (
 id TEXT PRIMARY KEY,
 phone TEXT NOT NULL,
 code_hash TEXT NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 used_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS phone_otps_phone_idx ON phone_otps (phone, created_at);
