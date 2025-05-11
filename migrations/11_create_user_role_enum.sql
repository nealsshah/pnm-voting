-- Ensure the user_role enum type exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM('admin', 'brother', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$; 