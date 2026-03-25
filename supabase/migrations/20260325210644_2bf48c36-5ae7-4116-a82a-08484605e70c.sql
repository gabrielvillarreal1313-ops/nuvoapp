-- user_events: add UPDATE policy scoped to owner
CREATE POLICY "Users can update own events"
ON public.user_events
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);