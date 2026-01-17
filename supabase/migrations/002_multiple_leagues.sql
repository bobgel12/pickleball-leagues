-- Migration: Support Multiple Leagues Per Club
-- This migration updates the league_data table to support multiple leagues per club

-- Step 1: Drop the UNIQUE constraint on club_id to allow multiple leagues per club
ALTER TABLE league_data DROP CONSTRAINT IF EXISTS league_data_club_id_key;

-- Step 2: Add new columns for league identification and metadata
ALTER TABLE league_data ADD COLUMN IF NOT EXISTS league_name TEXT;
ALTER TABLE league_data ADD COLUMN IF NOT EXISTS league_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE league_data ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE league_data ADD COLUMN IF NOT EXISTS description TEXT;

-- Step 3: Migrate existing data
-- For existing rows that don't have league_name, set a default value
-- Try to use club name if available, otherwise use "Default League"
UPDATE league_data 
SET league_name = COALESCE(
  (SELECT name FROM clubs WHERE clubs.id = league_data.club_id),
  'Default League'
)
WHERE league_name IS NULL;

-- Step 4: Set NOT NULL constraint on league_name after migration
ALTER TABLE league_data ALTER COLUMN league_name SET NOT NULL;

-- Step 5: Ensure all rows have a league_id (should be set by default, but ensure it)
UPDATE league_data 
SET league_id = uuid_generate_v4() 
WHERE league_id IS NULL;

-- Step 6: Create unique index on (club_id, league_name) to enforce uniqueness per club
CREATE UNIQUE INDEX IF NOT EXISTS idx_league_data_club_league_name 
ON league_data(club_id, league_name);

-- Step 7: Create index on league_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_league_data_league_id ON league_data(league_id);

-- Step 8: Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_league_data_status ON league_data(status);
