-- Complete updated_at coverage. schema.ts declares updated_at with defaultNow()
-- (insert-only) and no $onUpdate, so updated_at only maintains via a DB trigger.
-- The historical restore covered only a subset of tables; this creates
-- update_<table>_updated_at (using update_updated_at_column()) on every current
-- public table with an updated_at column that lacks it. Idempotent.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND a.attname = 'updated_at' AND a.attnum > 0 AND NOT a.attisdropped
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class tc ON tc.oid = t.tgrelid
      JOIN pg_namespace tn ON tn.oid = tc.relnamespace
      WHERE tn.nspname = 'public' AND tc.relname = r.tbl
        AND t.tgname = 'update_' || r.tbl || '_updated_at'
        AND NOT t.tgisinternal
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
        'update_' || r.tbl || '_updated_at', r.tbl
      );
    END IF;
  END LOOP;
END $$;
