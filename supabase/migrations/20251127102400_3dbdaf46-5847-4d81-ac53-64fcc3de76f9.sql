-- Add DELETE policy for evidence storage bucket
-- Allows users to delete evidence files within their own practice

CREATE POLICY "Users can delete evidence files in their practice"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'evidence' AND
  name ~ '^[0-9a-f-]{36}/' AND
  substring(name, 1, 36) IN (
    SELECT practice_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
);