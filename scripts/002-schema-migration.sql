-- Migration: Reorganize buberry DB into schemas
-- Run: psql -d buberry -f scripts/002-schema-migration.sql
--
-- Before: everything in public schema
-- After:
--   public  → shared auth tables (user, account, session, roles, etc.)
--   lms     → courses, lessons, enrollments, lesson_progress
--   citizen → trees, observations, photos, projects (new)

BEGIN;

-- ============================================
-- 1. Create schemas
-- ============================================
CREATE SCHEMA IF NOT EXISTS lms;
CREATE SCHEMA IF NOT EXISTS citizen;

-- ============================================
-- 2. Move LMS tables to lms schema
-- ============================================

-- Move courses first (referenced by lessons and enrollments)
ALTER TABLE public.courses SET SCHEMA lms;
ALTER TABLE public.lessons SET SCHEMA lms;
ALTER TABLE public.enrollments SET SCHEMA lms;
ALTER TABLE public.lesson_progress SET SCHEMA lms;

-- Move sequences too
ALTER SEQUENCE IF EXISTS public.courses_id_seq SET SCHEMA lms;
ALTER SEQUENCE IF EXISTS public.lessons_id_seq SET SCHEMA lms;

-- ============================================
-- 3. Enable extensions for citizen schema
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- 4. Create citizen science tables
-- ============================================

CREATE TABLE IF NOT EXISTS citizen.trees (
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
  created_by UUID REFERENCES public."user"(id),
  ushahidi_post_id INTEGER,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_trees_location ON citizen.trees USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_trees_species ON citizen.trees(species);

CREATE TABLE IF NOT EXISTS citizen.observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id UUID NOT NULL REFERENCES citizen.trees(id) ON DELETE CASCADE,
  observer_id UUID REFERENCES public."user"(id),
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
CREATE INDEX IF NOT EXISTS idx_observations_tree ON citizen.observations(tree_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_observations_local_id ON citizen.observations(local_id) WHERE local_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS citizen.observation_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observation_id UUID NOT NULL REFERENCES citizen.observations(id) ON DELETE CASCADE,
  storage_key VARCHAR(500) NOT NULL,
  url VARCHAR(1000),
  caption VARCHAR(200),
  synced BOOLEAN DEFAULT TRUE,
  local_id VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS citizen.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public."user"(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS citizen.project_trees (
  project_id UUID REFERENCES citizen.projects(id) ON DELETE CASCADE,
  tree_id UUID REFERENCES citizen.trees(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tree_id)
);

-- ============================================
-- 5. Grant buberry_app access to new schemas
-- ============================================
GRANT USAGE ON SCHEMA lms TO buberry_app;
GRANT USAGE ON SCHEMA citizen TO buberry_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA lms TO buberry_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA citizen TO buberry_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA lms TO buberry_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA citizen TO buberry_app;

-- Future tables in these schemas also get permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA lms GRANT ALL ON TABLES TO buberry_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA citizen GRANT ALL ON TABLES TO buberry_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA lms GRANT ALL ON SEQUENCES TO buberry_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA citizen GRANT ALL ON SEQUENCES TO buberry_app;

COMMIT;
