-- Points system for BBC rewards
-- Run against buberry DB on LXC 110

SET search_path TO citizen, public;

-- Aggregate stats per user (fast reads)
CREATE TABLE IF NOT EXISTS citizen.user_stats (
  user_id UUID PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  trees_tagged INTEGER NOT NULL DEFAULT 0,
  observations_made INTEGER NOT NULL DEFAULT 0,
  photos_uploaded INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit trail of every point award (append-only)
CREATE TABLE IF NOT EXISTS citizen.points_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason VARCHAR(50) NOT NULL,  -- 'tree_tagged', 'observation', 'photo_uploaded', 'bonus'
  ref_id UUID,                   -- tree_id or observation_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON citizen.points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_points ON citizen.user_stats(total_points DESC);
