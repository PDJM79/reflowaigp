-- Phase 5, Step 3 — fridge integration (additive, reversible).
--
-- Opt-in per practice (practices.metadata.fridge_scheduling_enabled = true): each
-- active fridge_unit generates a "Record temperature — {fridge}" occurrence
-- (tasks.source_type = 'fridge') on its reading_frequency. POST /fridge-readings
-- closes the matching occurrence in the same transaction; an out-of-range reading
-- auto-creates a high-importance adhoc remedial task (estates_lead, unassigned
-- fallback). Occurrences carry the fridge_unit id in tasks.metadata->>'fridgeUnitId'
-- and are de-duplicated in-app by the single-run scheduler cron (same rationale
-- as cleaning: tasks.selection_id is FK-bound to logbook selections).

-- reading_frequency: how often a fridge is checked. base_cadence so the same
-- cadence engine applies; defaults to 'daily' (existing fridges unaffected).
ALTER TABLE public.fridge_units
  ADD COLUMN IF NOT EXISTS reading_frequency public.base_cadence NOT NULL DEFAULT 'daily';
