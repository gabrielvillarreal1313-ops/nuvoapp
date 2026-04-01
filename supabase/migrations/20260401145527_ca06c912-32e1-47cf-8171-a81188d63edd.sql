-- Drop existing permissive storage policies for event-covers
DROP POLICY IF EXISTS "Authenticated users can upload event covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update event covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete event covers" ON storage.objects;

-- Recreate with ownership checks (user_id folder prefix)
CREATE POLICY "Authenticated users can upload own event covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can update own event covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can delete own event covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::text);