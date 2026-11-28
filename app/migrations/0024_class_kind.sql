-- 0024: class type («نوع کلاس»): 'online' (آنلاین) or 'onsite' (حضوری). NULL = تعیین‌نشده, so every existing class stays unset.
-- Additive and idempotent; the API only writes 'online' / 'onsite' / NULL.
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_kind TEXT;
