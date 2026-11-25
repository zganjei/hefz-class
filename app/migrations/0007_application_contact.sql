-- 0007: registration form follows the class spreadsheet. Additive and idempotent.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS bale_number TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS bale_id TEXT;
ALTER TABLE applications ALTER COLUMN national_id DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN age DROP NOT NULL;
