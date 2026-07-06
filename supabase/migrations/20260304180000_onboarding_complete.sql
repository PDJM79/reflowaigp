-- ── Onboarding Complete: Practice Columns, Module Timestamps & Session FK ────
-- Adds fields needed by the wizard completion transaction and module management.
-- Rollback: see bottom of file.

-- ── practices: add address/contact/regulator fields ──────────────────────────
ALTER TABLE public.practices
  ADD COLUMN IF NOT EXISTS address         TEXT,
  ADD COLUMN IF NOT EXISTS postcode        VARCHAR(10),
  ADD COLUMN IF NOT EXISTS regulator       VARCHAR(10) DEFAULT 'cqc',
  ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS contact_email   TEXT,
  ADD COLUMN IF NOT EXISTS contact_name    TEXT;

-- ── practice_modules: add enabled/disabled audit timestamps ──────────────────
ALTER TABLE public.practice_modules
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS enabled_at  TIMESTAMP WITH TIME ZONE;

-- ── onboarding_sessions: link to created practice after wizard completion ─────
ALTER TABLE public.onboarding_sessions
  ADD COLUMN IF NOT EXISTS practice_id UUID REFERENCES public.practices(id) ON DELETE SET NULL;

-- ── Rollback ──────────────────────────────────────────────────────────────────
-- ALTER TABLE public.practices
--   DROP COLUMN IF EXISTS address, DROP COLUMN IF EXISTS postcode,
--   DROP COLUMN IF EXISTS regulator, DROP COLUMN IF EXISTS registration_number,
--   DROP COLUMN IF EXISTS contact_email, DROP COLUMN IF EXISTS contact_name;
-- ALTER TABLE public.practice_modules
--   DROP COLUMN IF EXISTS disabled_at, DROP COLUMN IF EXISTS enabled_at;
-- ALTER TABLE public.onboarding_sessions DROP COLUMN IF EXISTS practice_id;
