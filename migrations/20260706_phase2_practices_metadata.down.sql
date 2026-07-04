-- =============================================================================
-- ReflowAI GP — Phase 2: practices.metadata (DOWN)
-- =============================================================================
-- Reverses 20260706_phase2_practices_metadata.up.sql. Idempotent.
-- =============================================================================

ALTER TABLE practices DROP COLUMN IF EXISTS metadata;
