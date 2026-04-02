-- Security hardening for direct client access.
-- Edge functions use service_role and will continue to work without relying on these client policies.

-- 1) Remove all client policies on sensitive tables so anon/authenticated cannot read/write directly.
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('events', 'event_admin_tokens', 'rsvps', 'updates')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END
$$;

-- Explicit drops for historically-open policy names (kept for migration readability/auditing).
DROP POLICY IF EXISTS "Events are publicly readable" ON public.events;
DROP POLICY IF EXISTS "Events insertable by anyone" ON public.events;
DROP POLICY IF EXISTS "Events updatable by anyone" ON public.events;

DROP POLICY IF EXISTS "Admin tokens readable" ON public.event_admin_tokens;
DROP POLICY IF EXISTS "Admin tokens insertable" ON public.event_admin_tokens;
DROP POLICY IF EXISTS "Admin tokens updatable" ON public.event_admin_tokens;
DROP POLICY IF EXISTS "Admin tokens deletable" ON public.event_admin_tokens;
DROP POLICY IF EXISTS "Hosts can read admin tokens for own events" ON public.event_admin_tokens;

DROP POLICY IF EXISTS "RSVPs readable" ON public.rsvps;
DROP POLICY IF EXISTS "RSVPs insertable" ON public.rsvps;
DROP POLICY IF EXISTS "RSVPs updatable" ON public.rsvps;
DROP POLICY IF EXISTS "Event hosts can read rsvps" ON public.rsvps;

DROP POLICY IF EXISTS "Updates readable" ON public.updates;
DROP POLICY IF EXISTS "Updates insertable" ON public.updates;
DROP POLICY IF EXISTS "Updates updatable" ON public.updates;

-- 2) event-covers bucket: public read, authenticated write limited to own folder (<auth.uid()>/...).
DROP POLICY IF EXISTS "Anyone can upload event covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update event covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete event covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update event covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete event covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload own event covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own event covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own event covers" ON storage.objects;

-- Keep public reads for event-covers to preserve existing event image rendering.
DROP POLICY IF EXISTS "Anyone can read event covers" ON storage.objects;
CREATE POLICY "Anyone can read event covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-covers');

-- Insert restricted to authenticated users and only into <uid>/... paths.
CREATE POLICY "Authenticated users can upload own event covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update restricted to objects currently owned by user and remaining in same user's folder.
CREATE POLICY "Authenticated users can update own event covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'event-covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete restricted to user's own folder.
CREATE POLICY "Authenticated users can delete own event covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
