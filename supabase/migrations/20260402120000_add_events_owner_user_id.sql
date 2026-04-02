alter table public.events
  add column if not exists owner_user_id uuid null references auth.users(id) on delete set null;

create index if not exists idx_events_owner_user_id on public.events(owner_user_id);
