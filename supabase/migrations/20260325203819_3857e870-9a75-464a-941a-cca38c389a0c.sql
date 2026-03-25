
-- 1. PROFILES: Restrict SELECT to own profile only (edge function uses service_role for avatar lookups)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. EVENTS: Remove permissive INSERT and UPDATE (edge function uses service_role)
DROP POLICY IF EXISTS "Events insertable by anyone" ON public.events;
DROP POLICY IF EXISTS "Events updatable by anyone" ON public.events;

-- 3. RSVPS: Remove permissive INSERT and UPDATE (edge function uses service_role)
DROP POLICY IF EXISTS "RSVPs insertable" ON public.rsvps;
DROP POLICY IF EXISTS "RSVPs updatable" ON public.rsvps;

-- 4. UPDATES: Remove permissive INSERT and UPDATE (edge function uses service_role)
DROP POLICY IF EXISTS "Updates insertable" ON public.updates;
DROP POLICY IF EXISTS "Updates updatable" ON public.updates;

-- 5. EVENT_ADMIN_TOKENS: Remove all permissive policies (edge function uses service_role)
DROP POLICY IF EXISTS "Admin tokens insertable" ON public.event_admin_tokens;
DROP POLICY IF EXISTS "Admin tokens updatable" ON public.event_admin_tokens;
DROP POLICY IF EXISTS "Admin tokens deletable" ON public.event_admin_tokens;
DROP POLICY IF EXISTS "Admin tokens readable" ON public.event_admin_tokens;
