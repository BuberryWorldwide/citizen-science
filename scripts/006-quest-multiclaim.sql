-- Multi-claim quest model
-- Replaces exclusive claims (work_orders.claimed_by) with a many-to-many
-- claim table. Multiple scouts can have the same quest in their queue;
-- first to complete wins the points. Others' claims auto-end with a
-- "completed by another scout" marker.
--
-- Run against buberry DB on LXC 110.

SET search_path TO citizen, public;

BEGIN;

-- ── 1. New claim table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS citizen.work_order_claims (
  work_order_id UUID NOT NULL REFERENCES citizen.work_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  removed_reason VARCHAR(20),
  PRIMARY KEY (work_order_id, user_id)
);

-- removed_reason values: 'user_abandoned' | 'completed_by_other' | 'self_completed' | 'order_expired'
-- (NULL while claim is active)

CREATE INDEX IF NOT EXISTS idx_woc_user_active
  ON citizen.work_order_claims(user_id) WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_woc_user_recent_removed
  ON citizen.work_order_claims(user_id, removed_at DESC) WHERE removed_at IS NOT NULL;

-- ── 2. Migrate existing exclusive claims ──────────────────────

INSERT INTO citizen.work_order_claims (work_order_id, user_id, claimed_at)
SELECT id, claimed_by, COALESCE(claimed_at, NOW())
FROM citizen.work_orders
WHERE claimed_by IS NOT NULL
  AND status = 'claimed'
ON CONFLICT (work_order_id, user_id) DO NOTHING;

-- Flip migrated rows back to 'open' (status no longer represents claim state)
UPDATE citizen.work_orders SET status = 'open'
WHERE status = 'claimed';

-- ── 3. Drop old claim columns ─────────────────────────────────

DROP INDEX IF EXISTS citizen.idx_work_orders_claimed;
ALTER TABLE citizen.work_orders DROP COLUMN IF EXISTS claimed_by;
ALTER TABLE citizen.work_orders DROP COLUMN IF EXISTS claimed_at;

-- ── 4. Status is now: open | completed | expired ──────────────
-- (No DB-level CHECK to keep it loose; engine + handlers enforce.)

COMMIT;
