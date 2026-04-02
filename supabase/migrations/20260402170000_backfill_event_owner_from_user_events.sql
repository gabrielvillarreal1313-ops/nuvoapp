-- Backfill owner_user_id from legacy user_events when host ownership is unambiguous.
-- This keeps user_events as legacy compatibility data, not as a primary source of truth.
WITH normalized_hosts AS (
  SELECT
    ue.event_key,
    ue.user_id,
    ue.created_at
  FROM public.user_events ue
  WHERE upper(trim(ue.role)) = 'HOST'
),
unambiguous_hosts AS (
  SELECT
    event_key,
    min(user_id) AS owner_user_id
  FROM normalized_hosts
  GROUP BY event_key
  HAVING count(DISTINCT user_id) = 1
)
UPDATE public.events e
SET owner_user_id = uh.owner_user_id
FROM unambiguous_hosts uh
WHERE e.event_key = uh.event_key
  AND e.owner_user_id IS NULL;
