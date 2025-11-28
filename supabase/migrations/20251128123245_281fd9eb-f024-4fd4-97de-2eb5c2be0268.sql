-- Force dev server rebuild to clear React cache issue
-- This is a dummy migration to trigger Lovable's rebuild mechanism

ALTER TABLE practices ADD COLUMN IF NOT EXISTS force_rebuild_v7 BOOLEAN DEFAULT false;
ALTER TABLE practices DROP COLUMN IF EXISTS force_rebuild_v7;