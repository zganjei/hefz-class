-- 0020: class day and time («روز و ساعت کلاس») live on the class itself, editable in «اطلاعات کلاس» by admin / the class's teacher.
-- Additive and idempotent; both stay NULL until set (the registry's per-learner روز/ساعت is only offered as a suggestion).
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_day TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_time TEXT;
