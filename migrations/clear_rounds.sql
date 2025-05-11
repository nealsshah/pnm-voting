-- Clear all rounds from the rounds table
-- This will delete all rows but keep the table structure intact
TRUNCATE TABLE rounds CASCADE;

-- Reset the sequence if you have one (optional, but good practice)
ALTER SEQUENCE IF EXISTS rounds_id_seq RESTART WITH 1; 