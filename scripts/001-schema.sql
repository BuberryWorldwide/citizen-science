-- Citizen Science App Schema
-- Run: psql $DATABASE_URL -f scripts/001-schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users (Supabase Auth handles login, this is app profile)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  display_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'scout',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A tree is a persistent real-world entity
CREATE TABLE IF NOT EXISTS trees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  species VARCHAR(100),
  species_variety VARCHAR(100),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  accessibility VARCHAR(20) DEFAULT 'unknown',
  status VARCHAR(20) DEFAULT 'active',
  use_potential TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  ushahidi_post_id INTEGER,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_trees_location ON trees USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_trees_species ON trees(species);

-- Each visit builds the tree's timeline
CREATE TABLE IF NOT EXISTS observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  observer_id UUID REFERENCES users(id),
  observed_at TIMESTAMPTZ DEFAULT NOW(),
  health VARCHAR(30),
  trunk_width VARCHAR(30),
  phenology VARCHAR(30),
  fruit_size VARCHAR(20),
  fruit_sweetness VARCHAR(20),
  fruit_color VARCHAR(30),
  yield VARCHAR(20),
  fruit_quality VARCHAR(20),
  fruiting_month_start INTEGER,
  fruiting_month_end INTEGER,
  reliability VARCHAR(20),
  notes TEXT,
  synced BOOLEAN DEFAULT TRUE,
  local_id VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_observations_tree ON observations(tree_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_observations_local_id ON observations(local_id) WHERE local_id IS NOT NULL;

-- Photos per observation
CREATE TABLE IF NOT EXISTS observation_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
  storage_key VARCHAR(500) NOT NULL,
  url VARCHAR(1000),
  caption VARCHAR(200),
  synced BOOLEAN DEFAULT TRUE,
  local_id VARCHAR(50)
);

-- Group trees under named projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_trees (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  tree_id UUID REFERENCES trees(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tree_id)
);
