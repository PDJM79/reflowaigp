-- =============================================================================
-- ReflowAI GP — Phase 2: practices.metadata (UP)
-- =============================================================================
-- Adds a general-purpose jsonb metadata bag on practices. Phase 2 uses it for
-- the staged-rollout feature flag: metadata->>'scheduler_enabled' = 'true'.
-- Additive, idempotent, reversible. Existing rows default to '{}' => scheduler
-- OFF, so there is zero live impact.
-- =============================================================================

ALTER TABLE practices ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
