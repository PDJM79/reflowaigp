-- Make room_id nullable so logs can be created without a room
ALTER TABLE public.cleaning_logs ALTER COLUMN room_id DROP NOT NULL;

-- Add new columns to cleaning_logs
ALTER TABLE public.cleaning_logs ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.cleaning_zones(id);
ALTER TABLE public.cleaning_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.cleaning_logs ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.cleaning_logs ADD COLUMN IF NOT EXISTS has_issue BOOLEAN DEFAULT false;
ALTER TABLE public.cleaning_logs ADD COLUMN IF NOT EXISTS issue_description TEXT;

-- Add requires_photo to cleaning_tasks
ALTER TABLE public.cleaning_tasks ADD COLUMN IF NOT EXISTS requires_photo BOOLEAN DEFAULT false;

-- Create cleaning-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('cleaning-photos', 'cleaning-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "cleaning_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'cleaning-photos');
CREATE POLICY IF NOT EXISTS "cleaning_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'cleaning-photos');
