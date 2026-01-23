-- Migration: Create matches table for league match history

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES league_data(id) ON DELETE CASCADE,
  event_day_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  court_index INTEGER,
  round_number INTEGER,
  team_a JSONB NOT NULL DEFAULT '[]'::jsonb,
  team_b JSONB NOT NULL DEFAULT '[]'::jsonb,
  score_a INTEGER,
  score_b INTEGER,
  winner TEXT CHECK (winner IN ('A', 'B') OR winner IS NULL),
  status TEXT NOT NULL DEFAULT 'pending',
  is_money_round BOOLEAN NOT NULL DEFAULT FALSE,
  sitting_out JSONB,
  played_with_partner BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT,
  UNIQUE (league_id, event_day_id, match_id)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_matches_league_id ON matches(league_id);
CREATE INDEX IF NOT EXISTS idx_matches_event_day_id ON matches(event_day_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_completed_at ON matches(completed_at);

-- Trigger to update updated_at
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
