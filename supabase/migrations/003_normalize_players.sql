-- Migration: Normalize Players into Separate Tables
-- This migration creates normalized tables for players, league_players relationships, and player_stats

-- Step 1: Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dupr_rating DECIMAL(3, 2) DEFAULT 4.50,
  gender TEXT CHECK (gender IN ('male', 'female') OR gender IS NULL),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create league_players junction table
CREATE TABLE IF NOT EXISTS league_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES league_data(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_id, player_id)
);

-- Step 3: Create player_stats table for league-specific statistics
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES league_data(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  cumulative_points INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  points_scored INTEGER DEFAULT 0,
  points_allowed INTEGER DEFAULT 0,
  event_days_attended INTEGER DEFAULT 0,
  court_history JSONB DEFAULT '[]'::jsonb,
  ladder_position_history JSONB DEFAULT '[]'::jsonb,
  money_round_stats JSONB DEFAULT '{
    "totalWins": 0,
    "totalLosses": 0,
    "totalContributions": 0,
    "totalPaid": 0,
    "contributionHistory": []
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_id, player_id)
);

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_club_id ON players(club_id);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_players_dupr_rating ON players(dupr_rating);
CREATE INDEX IF NOT EXISTS idx_league_players_league_id ON league_players(league_id);
CREATE INDEX IF NOT EXISTS idx_league_players_player_id ON league_players(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_league_id ON player_stats(league_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player_id ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_cumulative_points ON player_stats(cumulative_points);

-- Step 5: Create triggers to automatically update updated_at
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_stats_updated_at BEFORE UPDATE ON player_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies
-- Allow public read/write access (restricted by API routes using club_id)
CREATE POLICY "Allow public access to players" ON players
  FOR ALL USING (true);

CREATE POLICY "Allow public access to league_players" ON league_players
  FOR ALL USING (true);

CREATE POLICY "Allow public access to player_stats" ON player_stats
  FOR ALL USING (true);

-- Step 8: Migrate existing player data from JSONB to normalized tables
-- This extracts players from league_data.data.registeredPlayers and creates normalized entries
DO $$
DECLARE
  league_record RECORD;
  player_record JSONB;
  existing_player_id UUID;
  league_player_id UUID;
  player_stats_id UUID;
  player_name TEXT;
  player_id_from_json INTEGER;
BEGIN
  -- Loop through all leagues
  FOR league_record IN SELECT id, league_id, club_id, data FROM league_data LOOP
    -- Check if data has registeredPlayers array
    IF league_record.data ? 'registeredPlayers' AND jsonb_typeof(league_record.data->'registeredPlayers') = 'array' THEN
      -- Loop through each player in registeredPlayers
      FOR player_record IN SELECT * FROM jsonb_array_elements(league_record.data->'registeredPlayers') LOOP
        -- Extract player data
        player_name := player_record->>'name';
        player_id_from_json := (player_record->>'id')::INTEGER;
        
        -- Skip if no name
        IF player_name IS NULL OR player_name = '' THEN
          CONTINUE;
        END IF;
        
        -- Try to find existing player by name and club_id
        SELECT id INTO existing_player_id
        FROM players
        WHERE name = player_name AND club_id = league_record.club_id
        LIMIT 1;
        
        -- Create player if doesn't exist
        IF existing_player_id IS NULL THEN
          INSERT INTO players (club_id, name, dupr_rating, gender, created_at, updated_at)
          VALUES (
            league_record.club_id,
            player_name,
            COALESCE((player_record->>'duprRating')::DECIMAL, 4.50),
            CASE 
              WHEN player_record->>'gender' = 'male' THEN 'male'
              WHEN player_record->>'gender' = 'female' THEN 'female'
              ELSE NULL
            END,
            COALESCE(to_timestamp((player_record->>'registeredAt')::BIGINT / 1000), NOW()),
            NOW()
          )
          RETURNING id INTO existing_player_id;
        END IF;
        
        -- Create league_players relationship if doesn't exist
        INSERT INTO league_players (league_id, player_id, registered_at)
        VALUES (
          league_record.id,
          existing_player_id,
          COALESCE(to_timestamp((player_record->>'registeredAt')::BIGINT / 1000), NOW())
        )
        ON CONFLICT (league_id, player_id) DO NOTHING
        RETURNING id INTO league_player_id;
        
        -- Create player_stats entry if doesn't exist
        INSERT INTO player_stats (
          league_id,
          player_id,
          cumulative_points,
          total_wins,
          total_losses,
          points_scored,
          points_allowed,
          event_days_attended,
          court_history,
          ladder_position_history,
          money_round_stats,
          created_at,
          updated_at
        )
        VALUES (
          league_record.id,
          existing_player_id,
          COALESCE((player_record->>'cumulativePoints')::INTEGER, 0),
          COALESCE((player_record->>'totalWins')::INTEGER, 0),
          COALESCE((player_record->>'totalLosses')::INTEGER, 0),
          COALESCE((player_record->>'pointsScored')::INTEGER, 0),
          COALESCE((player_record->>'pointsAllowed')::INTEGER, 0),
          COALESCE((player_record->>'eventDaysAttended')::INTEGER, 0),
          COALESCE(player_record->'courtHistory', '[]'::jsonb),
          COALESCE(player_record->'ladderPositionHistory', '[]'::jsonb),
          COALESCE(player_record->'moneyRoundStats', '{
            "totalWins": 0,
            "totalLosses": 0,
            "totalContributions": 0,
            "totalPaid": 0,
            "contributionHistory": []
          }'::jsonb),
          NOW(),
          NOW()
        )
        ON CONFLICT (league_id, player_id) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END $$;
