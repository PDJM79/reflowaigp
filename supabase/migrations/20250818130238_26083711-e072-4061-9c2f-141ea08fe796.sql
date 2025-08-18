-- Insert missing organization_setup record to mark setup as complete
-- This fixes the endless setup loop

INSERT INTO public.organization_setup (practice_id, setup_completed)
VALUES ('13857f81-3bef-4fbe-9f75-3704ac1a4ff6', true)
ON CONFLICT (practice_id) DO UPDATE SET 
  setup_completed = true,
  updated_at = now();