-- 0010: per-day checklist ticks (six items per day) for the weekly plan. Additive and idempotent.
-- `track` keeps the model open for a later offline track; today only 'online' is written.
CREATE TABLE IF NOT EXISTS hefz_daily_ticks (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 track TEXT NOT NULL DEFAULT 'online',
 week_number INTEGER NOT NULL REFERENCES hefz_plan_weeks(week_number) ON DELETE CASCADE,
 day_index INTEGER NOT NULL CHECK (day_index BETWEEN 0 AND 6),
 item TEXT NOT NULL CHECK (item IN ('listen','memorize','translate','tadabbur','review10','reviewAll')),
 done_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (user_id, track, week_number, day_index, item)
);
CREATE INDEX IF NOT EXISTS hefz_daily_ticks_week_idx ON hefz_daily_ticks(week_number, user_id);
