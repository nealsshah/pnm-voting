-- Add sample events for testing
-- Only run this in development environments

INSERT INTO events (name, starts_at, created_by)
VALUES
  ('Meet the Brothers', CURRENT_TIMESTAMP - INTERVAL '1 day', (SELECT id FROM auth.users LIMIT 1)),
  ('Speed Networking', CURRENT_TIMESTAMP + INTERVAL '2 days', (SELECT id FROM auth.users LIMIT 1)), 
  ('Formal Interviews', CURRENT_TIMESTAMP + INTERVAL '5 days', (SELECT id FROM auth.users LIMIT 1)),
  ('Final Selection', CURRENT_TIMESTAMP + INTERVAL '8 days', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;

-- Make sure the first event round is open for testing
UPDATE rounds SET 
  status = 'open',
  opened_at = CURRENT_TIMESTAMP - INTERVAL '1 day'
WHERE id IN (
  SELECT r.id FROM rounds r
  JOIN events e ON e.id = r.event_id
  ORDER BY e.starts_at ASC
  LIMIT 1
)
AND status = 'pending'; 