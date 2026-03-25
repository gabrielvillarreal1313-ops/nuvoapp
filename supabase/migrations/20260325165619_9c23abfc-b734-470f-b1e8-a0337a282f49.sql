
-- Events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  host_name TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'America/Mexico_City',
  location_name TEXT,
  location_url TEXT,
  cover_image_url TEXT,
  privacy_mode TEXT NOT NULL DEFAULT 'OPEN' CHECK (privacy_mode IN ('OPEN', 'APPROVAL_REQUIRED')),
  show_attendees BOOLEAN NOT NULL DEFAULT true,
  rsvp_open BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin tokens
CREATE TABLE public.event_admin_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'HOST' CHECK (role IN ('HOST', 'COHOST')),
  label TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RSVPs
CREATE TABLE public.rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'GOING' CHECK (status IN ('GOING', 'MAYBE', 'NO')),
  party_size INTEGER NOT NULL DEFAULT 1 CHECK (party_size >= 1 AND party_size <= 2),
  comment TEXT,
  approval_status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (approval_status IN ('APPROVED', 'PENDING', 'REJECTED')),
  edit_token TEXT NOT NULL UNIQUE,
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Updates
CREATE TABLE public.updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL DEFAULT 'HOST' CHECK (author_role IN ('HOST', 'COHOST')),
  content TEXT NOT NULL,
  link_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User events table
CREATE TABLE public.user_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'HOST',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_key)
);

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_admin_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- Events: public access (auth handled in edge functions)
CREATE POLICY "Events are publicly readable" ON public.events FOR SELECT USING (true);
CREATE POLICY "Events insertable by anyone" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Events updatable by anyone" ON public.events FOR UPDATE USING (true);

-- Admin tokens: all ops open (auth handled in edge functions)
CREATE POLICY "Admin tokens readable" ON public.event_admin_tokens FOR SELECT USING (true);
CREATE POLICY "Admin tokens insertable" ON public.event_admin_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin tokens updatable" ON public.event_admin_tokens FOR UPDATE USING (true);
CREATE POLICY "Admin tokens deletable" ON public.event_admin_tokens FOR DELETE USING (true);

-- RSVPs: open (auth via edit tokens in edge functions)
CREATE POLICY "RSVPs readable" ON public.rsvps FOR SELECT USING (true);
CREATE POLICY "RSVPs insertable" ON public.rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY "RSVPs updatable" ON public.rsvps FOR UPDATE USING (true);

-- Updates: open (auth in edge functions)
CREATE POLICY "Updates readable" ON public.updates FOR SELECT USING (true);
CREATE POLICY "Updates insertable" ON public.updates FOR INSERT WITH CHECK (true);
CREATE POLICY "Updates updatable" ON public.updates FOR UPDATE USING (true);

-- Profiles: users can manage their own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User events: users can manage their own
CREATE POLICY "Users can view own events" ON public.user_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.user_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.user_events FOR DELETE USING (auth.uid() = user_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rsvps_updated_at BEFORE UPDATE ON public.rsvps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_events_event_key ON public.events(event_key);
CREATE INDEX idx_rsvps_event_id ON public.rsvps(event_id);
CREATE INDEX idx_rsvps_edit_token ON public.rsvps(edit_token);
CREATE INDEX idx_admin_tokens_event_id ON public.event_admin_tokens(event_id);
CREATE INDEX idx_admin_tokens_token ON public.event_admin_tokens(token);
CREATE INDEX idx_updates_event_id ON public.updates(event_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('event-covers', 'event-covers', true) ON CONFLICT (id) DO NOTHING;

-- Storage RLS for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS for event-covers
CREATE POLICY "Anyone can upload event covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-covers');
CREATE POLICY "Anyone can read event covers" ON storage.objects FOR SELECT USING (bucket_id = 'event-covers');
CREATE POLICY "Anyone can update event covers" ON storage.objects FOR UPDATE USING (bucket_id = 'event-covers');
CREATE POLICY "Anyone can delete event covers" ON storage.objects FOR DELETE USING (bucket_id = 'event-covers');
