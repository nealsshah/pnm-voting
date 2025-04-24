-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM('admin', 'brother', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE round_status AS ENUM('pending', 'open', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the pnms table
CREATE TABLE IF NOT EXISTS pnms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  first_name  TEXT,
  last_name   TEXT,
  major       TEXT,
  year        TEXT,
  gpa         NUMERIC(3,2),
  photo_url   TEXT,          -- Supabase Storage public URL
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Create the events table
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  starts_at   TIMESTAMPTZ NOT NULL,          -- EST input, store UTC
  created_by  UUID REFERENCES auth.users(id),
  position    INT,                           -- Regular column for position
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Create the rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
  status      round_status DEFAULT 'pending',
  opened_at   TIMESTAMPTZ,
  closed_at   TIMESTAMPTZ
);

-- Create the votes table
CREATE TABLE IF NOT EXISTS votes (
  brother_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pnm_id      UUID REFERENCES pnms(id) ON DELETE CASCADE,
  round_id    UUID REFERENCES rounds(id) ON DELETE CASCADE,
  score       SMALLINT CHECK (score BETWEEN 1 AND 5),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (brother_id, pnm_id, round_id)
);

-- Create the comments table
CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brother_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pnm_id      UUID REFERENCES pnms(id) ON DELETE CASCADE,
  round_id    UUID REFERENCES rounds(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_anon     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS votes_pnm_round_idx ON votes (pnm_id, round_id);
CREATE INDEX IF NOT EXISTS comments_pnm_round_created_idx ON comments (pnm_id, round_id, created_at DESC);

-- Create a table for user metadata
CREATE TABLE IF NOT EXISTS users_metadata (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Create a trigger to create a round when an event is inserted
CREATE OR REPLACE FUNCTION create_round_for_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO rounds (event_id, status)
  VALUES (NEW.id, 'pending');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_insert_trigger ON events;
CREATE TRIGGER event_insert_trigger
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION create_round_for_event();

-- Create a trigger to create users_metadata when a new user is created
CREATE OR REPLACE FUNCTION create_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users_metadata (id, role)
  VALUES (NEW.id, 'pending'::user_role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_created_trigger ON auth.users;
CREATE TRIGGER user_created_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_metadata(); 