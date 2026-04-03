-- Verification, Work Orders, and First Discovery System
-- Run against buberry DB on LXC 110

SET search_path TO citizen, public;

-- ── Extend trees table ─────────────────────────────────────────

ALTER TABLE citizen.trees ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified';
ALTER TABLE citizen.trees ADD COLUMN IF NOT EXISTS verification_confidence REAL;
ALTER TABLE citizen.trees ADD COLUMN IF NOT EXISTS plantnet_species VARCHAR(200);
ALTER TABLE citizen.trees ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE citizen.trees ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public."user"(id);
ALTER TABLE citizen.trees ADD COLUMN IF NOT EXISTS is_first_discovery BOOLEAN DEFAULT FALSE;
ALTER TABLE citizen.trees ADD COLUMN IF NOT EXISTS first_discoverer_id UUID REFERENCES public."user"(id);

CREATE INDEX IF NOT EXISTS idx_trees_verification ON citizen.trees(verification_status);
CREATE INDEX IF NOT EXISTS idx_trees_discoverer ON citizen.trees(first_discoverer_id) WHERE first_discoverer_id IS NOT NULL;

-- Backfill: existing trees are legacy-trusted
UPDATE citizen.trees SET verification_status = 'verified' WHERE verification_status IS NULL OR verification_status = 'unverified';

-- ── Photo verifications (PlantNet results) ─────────────────────

CREATE TABLE IF NOT EXISTS citizen.photo_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID NOT NULL REFERENCES citizen.observation_photos(id) ON DELETE CASCADE,
  tree_id UUID NOT NULL REFERENCES citizen.trees(id) ON DELETE CASCADE,
  plantnet_species VARCHAR(200),
  plantnet_score REAL,
  plantnet_raw JSONB,
  matches_tagged_species BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_photo_verifications_tree ON citizen.photo_verifications(tree_id);

-- ── Verification reviews (human audit trail) ───────────────────

CREATE TABLE IF NOT EXISTS citizen.verification_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id UUID NOT NULL REFERENCES citizen.trees(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public."user"(id),
  verdict VARCHAR(20) NOT NULL,
  corrected_species VARCHAR(100),
  confidence_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_verification_reviews_tree ON citizen.verification_reviews(tree_id);

-- ── Work orders ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS citizen.work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id UUID NOT NULL REFERENCES citizen.trees(id) ON DELETE CASCADE,
  order_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  priority INTEGER NOT NULL DEFAULT 0,
  reward_points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_by UUID REFERENCES public."user"(id),
  claimed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public."user"(id),
  completed_at TIMESTAMPTZ,
  result_data JSONB
);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON citizen.work_orders(status, order_type);
CREATE INDEX IF NOT EXISTS idx_work_orders_tree ON citizen.work_orders(tree_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_claimed ON citizen.work_orders(claimed_by) WHERE claimed_by IS NOT NULL;

-- ── Extend user_stats ──────────────────────────────────────────

ALTER TABLE citizen.user_stats ADD COLUMN IF NOT EXISTS verifications_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE citizen.user_stats ADD COLUMN IF NOT EXISTS work_orders_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE citizen.user_stats ADD COLUMN IF NOT EXISTS first_discoveries INTEGER NOT NULL DEFAULT 0;
