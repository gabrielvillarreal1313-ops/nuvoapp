
-- 1) Remove overly-broad rsvps SELECT policy (all access is via edge functions / service_role)
DROP POLICY IF EXISTS "Event hosts can read rsvps" ON public.rsvps;

-- 2) Add SELECT policy on event_admin_tokens so only authenticated event hosts can read their tokens
CREATE POLICY "Hosts can read own event tokens"
ON public.event_admin_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_events ue
    WHERE ue.user_id = auth.uid()
      AND ue.event_key = (
        SELECT e.event_key FROM public.events e WHERE e.id = event_admin_tokens.event_id
      )
  )
);

-- 3) Fix event-covers storage: drop public write policies, restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can upload event covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update event covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete event covers" ON storage.objects;

CREATE POLICY "Authenticated users can upload event covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-covers');

CREATE POLICY "Authenticated users can update event covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-covers');

CREATE POLICY "Authenticated users can delete event covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-covers');
