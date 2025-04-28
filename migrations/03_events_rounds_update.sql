-- Drop existing trigger (we'll create a new one)
DROP TRIGGER IF EXISTS event_insert_trigger ON events;
DROP FUNCTION IF EXISTS create_round_for_event();

-- Update the events table to include position as a regular column
ALTER TABLE events 
  DROP COLUMN IF EXISTS position;

ALTER TABLE events
  ADD COLUMN position INT;

-- Create a function to update event positions
CREATE OR REPLACE FUNCTION update_event_positions() 
RETURNS void AS $$
BEGIN
  WITH numbered_events AS (
    SELECT id, row_number() OVER(ORDER BY starts_at) as new_position
    FROM events
  )
  UPDATE events e
  SET position = ne.new_position
  FROM numbered_events ne
  WHERE e.id = ne.id;
END $$ LANGUAGE plpgsql;

-- Create or replace the trigger function to create a round when an event is inserted
CREATE OR REPLACE FUNCTION _after_event_insert() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO rounds(event_id) VALUES (NEW.id);
  -- Update positions after insert
  PERFORM update_event_positions();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_insert
AFTER INSERT ON events
FOR EACH ROW EXECUTE PROCEDURE _after_event_insert();

-- Create helper functions for the automatic round management
CREATE OR REPLACE FUNCTION open_due_rounds(now timestamptz) RETURNS void AS $$
  UPDATE rounds SET status='open', opened_at=now
  WHERE status='pending'
    AND EXISTS (SELECT 1 FROM events e
                WHERE e.id = event_id AND e.starts_at <= now);
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION close_previous_rounds(now timestamptz) RETURNS void AS $$
  UPDATE rounds r SET status='closed', closed_at=now
  WHERE status='open'
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = r.event_id
        AND e.starts_at < now
        AND now >= (
            SELECT min(e2.starts_at) FROM events e2
            WHERE e2.starts_at > e.starts_at
        )
    );
$$ LANGUAGE sql;

-- Update row-level security policies
DROP POLICY IF EXISTS events_read ON events;
DROP POLICY IF EXISTS events_write ON events;
DROP POLICY IF EXISTS rounds_read ON rounds;
DROP POLICY IF EXISTS rounds_admin_write ON rounds;

-- Events
CREATE POLICY events_read ON events 
  FOR SELECT USING (auth.role() IN ('brother','admin'));
  
CREATE POLICY events_write ON events 
  FOR ALL USING (auth.role() = 'admin' AND starts_at > now());

-- Rounds
CREATE POLICY rounds_read ON rounds 
  FOR SELECT USING (auth.role() IN ('brother','admin'));
  
CREATE POLICY rounds_admin_write ON rounds
  FOR UPDATE USING (auth.role() = 'admin');

-- Initialize positions for existing events
SELECT update_event_positions(); 