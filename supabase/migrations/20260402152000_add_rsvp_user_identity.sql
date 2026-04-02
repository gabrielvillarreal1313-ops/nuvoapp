ALTER TABLE public.rsvps
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rsvps_user_id ON public.rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_event_user_active ON public.rsvps(event_id, user_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvps_event_user_unique_active
  ON public.rsvps(event_id, user_id)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;
