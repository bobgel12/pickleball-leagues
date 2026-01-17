-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  master_key_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament data table
CREATE TABLE IF NOT EXISTS tournament_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(club_id)
);

-- League data table
CREATE TABLE IF NOT EXISTS league_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(club_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clubs_slug ON clubs(slug);
CREATE INDEX IF NOT EXISTS idx_tournament_data_club_id ON tournament_data(club_id);
CREATE INDEX IF NOT EXISTS idx_league_data_club_id ON league_data(club_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_data_updated_at BEFORE UPDATE ON tournament_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_league_data_updated_at BEFORE UPDATE ON league_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clubs table
-- Allow anyone to read club metadata (for club lookup by slug)
CREATE POLICY "Allow public read access to clubs" ON clubs
  FOR SELECT USING (true);

-- Only allow service role to insert/update clubs (via API routes)
CREATE POLICY "Allow service role to manage clubs" ON clubs
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for tournament_data table
-- Allow public read/write access (will be restricted by API routes using club_id)
-- In production, you might want to add more restrictive policies
CREATE POLICY "Allow public access to tournament_data" ON tournament_data
  FOR ALL USING (true);

-- RLS Policies for league_data table
-- Allow public read/write access (will be restricted by API routes using club_id)
CREATE POLICY "Allow public access to league_data" ON league_data
  FOR ALL USING (true);
