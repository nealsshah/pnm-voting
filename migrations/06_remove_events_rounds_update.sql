-- Remove events table and migrate event data into rounds table
-- ------------------------------------------------------------

-- 1. Add new columns to rounds for standalone management
ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 2. Copy existing event data (name and created_at) into the rounds table
--    This assumes that the `event_id` column is still present and that every
--    round currently points to a valid event record.
UPDATE rounds r
SET name       = e.name,
    created_at = COALESCE(e.created_at, r.created_at)
FROM events e
WHERE r.event_id = e.id
  AND r.name IS NULL;

-- 3. Make the new columns NOT NULL after back-filling data
ALTER TABLE rounds
  ALTER COLUMN name SET NOT NULL;

-- 4. Drop the foreign-key column and any dependent constraints
ALTER TABLE rounds
  DROP COLUMN IF EXISTS event_id;

-- 5. Remove triggers and helper functions that were tied to events
DROP FUNCTION IF EXISTS update_event_positions() CASCADE;
DROP FUNCTION IF EXISTS _after_event_insert()      CASCADE;
DROP FUNCTION IF EXISTS open_due_rounds(timestamptz)   CASCADE;
DROP FUNCTION IF EXISTS close_previous_rounds(timestamptz) CASCADE;
DROP FUNCTION IF EXISTS create_round_for_event()   CASCADE;
DROP TRIGGER IF EXISTS event_insert_trigger ON events;

-- 6. Finally, drop the events table itself
DROP TABLE IF EXISTS events CASCADE;

-- 7. Ensure RLS policies on rounds still make sense (re-create if needed)
--    Existing policies already grant read access to brothers/admins and
--    update access to admins, so we keep them as-is.

-- 8. (Optional) Revoke any unused privileges on the now-gone events table
--    and clean up leftover ENUMs, etc. (nothing to do here)

-- Migration complete 