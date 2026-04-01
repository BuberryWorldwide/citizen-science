-- Gamification: achievements, streaks, challenges, species journal
-- Run against buberry DB on LXC 110

SET search_path TO citizen, public;

-- Achievements earned by users
CREATE TABLE IF NOT EXISTS citizen.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  achievement_key VARCHAR(50) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON citizen.achievements(user_id);

-- Daily activity streaks
CREATE TABLE IF NOT EXISTS citizen.streaks (
  user_id UUID PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active challenges (rotated weekly)
CREATE TABLE IF NOT EXISTS citizen.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_key VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description VARCHAR(200) NOT NULL,
  target INTEGER NOT NULL,
  reward_points INTEGER NOT NULL DEFAULT 25,
  active_from DATE NOT NULL DEFAULT CURRENT_DATE,
  active_until DATE NOT NULL,
  challenge_type VARCHAR(20) NOT NULL DEFAULT 'weekly'  -- 'daily' or 'weekly'
);

-- User progress on challenges
CREATE TABLE IF NOT EXISTS citizen.challenge_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES citizen.challenges(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, challenge_id)
);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_user ON citizen.challenge_progress(user_id);

-- Add streak and species count columns to user_stats
ALTER TABLE citizen.user_stats ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE citizen.user_stats ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE citizen.user_stats ADD COLUMN IF NOT EXISTS last_active_date DATE;
ALTER TABLE citizen.user_stats ADD COLUMN IF NOT EXISTS species_found INTEGER NOT NULL DEFAULT 0;
