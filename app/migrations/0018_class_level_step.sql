-- 0018: every class has a current «سطح» (level) and «گام» (step). Free text with a suggested vocabulary taken from the class workbooks
-- (سطح اول; گام اول … گام پنجم; anything else is typed under «دیگر»). Additive and idempotent; both stay NULL until a teacher/admin sets them.
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level_name TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS step_name TEXT;
