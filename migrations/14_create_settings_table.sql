-- Create a simple key-value settings table to store application-wide configuration flags.
-- This migration adds support for toggling whether voting statistics are published.

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the stats_published flag to FALSE if it doesn't already exist
INSERT INTO settings (key, value)
SELECT 'stats_published', 'false'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'stats_published'); 