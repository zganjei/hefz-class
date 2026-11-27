-- 0023: keep the Google account link in its own column so it coexists with a phone/email password.
-- Before this, users.password_hash held the marker 'google:<sub>' and setting a password overwrote the link.
-- Additive and idempotent. password_hash is not changed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_uidx ON users (google_sub) WHERE google_sub IS NOT NULL;
-- Backfill from the legacy marker; skip any sub that appears on more than one row so the unique index can never abort the deploy.
UPDATE users SET google_sub = SUBSTRING(password_hash FROM 8)
 WHERE google_sub IS NULL AND password_hash LIKE 'google:%' AND LENGTH(password_hash) > 7
   AND SUBSTRING(password_hash FROM 8) IN (
     SELECT SUBSTRING(password_hash FROM 8) FROM users WHERE password_hash LIKE 'google:%'
     GROUP BY 1 HAVING COUNT(*) = 1);
