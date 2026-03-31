
-- Only event hosts (via user_events) can SELECT rsvps for their events.
-- Edge functions use service_role and bypass RLS, so public/guest access is unaffected.
CREATE POLICY "Event hosts can read rsvps"
ON public.rsvps
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_events ue
    WHERE ue.user_id = auth.uid()
      AND ue.event_key = (
        SELECT e.event_key FROM public.events e WHERE e.id = rsvps.event_id
      )
  )
);
