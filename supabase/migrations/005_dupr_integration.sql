-- Migration: DUPR integration fields
-- Adds DUPR identifiers and sync preferences

-- Players: DUPR identifier and rating refresh timestamp
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS dupr_id TEXT,
  ADD COLUMN IF NOT EXISTS dupr_rating_updated_at TIMESTAMP WITH TIME ZONE;

-- Ensure DUPR IDs are unique when present
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_dupr_id_unique
  ON players(dupr_id)
  WHERE dupr_id IS NOT NULL;

-- Clubs: DUPR club id and support contact
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS dupr_club_id TEXT,
  ADD COLUMN IF NOT EXISTS support_email TEXT;

CREATE INDEX IF NOT EXISTS idx_clubs_dupr_club_id ON clubs(dupr_club_id);

-- League data: sync preference (default: never)
ALTER TABLE league_data
  ADD COLUMN IF NOT EXISTS sync_matches_to_dupr TEXT DEFAULT 'never';

-- Tournament data: sync preference (default: never)
ALTER TABLE tournament_data
  ADD COLUMN IF NOT EXISTS sync_matches_to_dupr TEXT DEFAULT 'never';
