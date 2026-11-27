-- 0011: study programs defined separately from classes; each class uses at most one. Additive and idempotent.
-- A class's week N starts on classes.program_start + 7*(N-1) days (Saturday-first weeks). Without a program the class keeps the global plan (hefz_plan_weeks).
CREATE TABLE IF NOT EXISTS hefz_programs (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS hefz_program_weeks (
 program_id TEXT NOT NULL REFERENCES hefz_programs(id) ON DELETE CASCADE,
 week_index INTEGER NOT NULL CHECK (week_index >= 1),
 title TEXT NOT NULL,
 days JSONB NOT NULL,
 PRIMARY KEY (program_id, week_index)
);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS program_id TEXT REFERENCES hefz_programs(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS program_start DATE;
CREATE TABLE IF NOT EXISTS hefz_program_ticks (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 program_id TEXT NOT NULL REFERENCES hefz_programs(id) ON DELETE CASCADE,
 week_index INTEGER NOT NULL,
 day_index INTEGER NOT NULL CHECK (day_index BETWEEN 0 AND 6),
 item TEXT NOT NULL CHECK (item IN ('listen','memorize','translate','tadabbur','review10','reviewAll')),
 done_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (user_id, program_id, week_index, day_index, item)
);
CREATE INDEX IF NOT EXISTS hefz_program_ticks_week_idx ON hefz_program_ticks(program_id, week_index, user_id);
