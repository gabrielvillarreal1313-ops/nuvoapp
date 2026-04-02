-- Align event lifecycle with explicit soft-delete semantics.
-- Strategy A: keep status in ('ACTIVE','CANCELLED') and represent deletion via deleted_at.

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Normalize any legacy rows that may have carried DELETED in status from older app logic.
UPDATE public.events
SET deleted_at = COALESCE(deleted_at, now()),
    status = 'CANCELLED'
WHERE status = 'DELETED';

-- Reassert status constraint to keep only ACTIVE/CANCELLED.
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE public.events
ADD CONSTRAINT events_status_check CHECK (status IN ('ACTIVE', 'CANCELLED'));

CREATE INDEX IF NOT EXISTS idx_events_deleted_at
ON public.events(deleted_at);
