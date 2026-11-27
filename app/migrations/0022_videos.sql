-- 0022: video library + links from program weeks to videos + per-learner "watched" ticks. Additive and idempotent.
-- Weeks are referenced by (program_id, week_index), NOT by a weeks-row id, so a rebuilt/replaced set of
-- hefz_program_weeks rows for the same program keeps its video links. Deleting a program cascades its links; deleting a video cascades its links and views.
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'tadabbur' CHECK (kind IN ('tadabbur','lesson','other')),
  url TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'link' CHECK (provider IN ('youtube','aparat','drive','file','link')),
  description TEXT NOT NULL DEFAULT '',
  duration_text TEXT NOT NULL DEFAULT '',
  range_note TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS program_week_videos (
  program_id TEXT NOT NULL REFERENCES hefz_programs(id) ON DELETE CASCADE,
  week_index INTEGER NOT NULL CHECK (week_index >= 1),
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (program_id, week_index, video_id)
);
CREATE INDEX IF NOT EXISTS program_week_videos_video_idx ON program_week_videos (video_id);
CREATE TABLE IF NOT EXISTS video_views (
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (video_id, user_id)
);
CREATE INDEX IF NOT EXISTS video_views_user_idx ON video_views (user_id);
