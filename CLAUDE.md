# Citizen Science App

Field tool for scouting valuable tree genetics and public harvestable trees. The real-world data spine for Buberry's ecosystem.

## Quick Start

```bash
# Install
npm install

# DB lives on buberry-db LXC (192.168.1.251), shared buberry database
# Schema was created via: psql -d buberry -f scripts/002-schema-migration.sql
cp .env.example .env  # DATABASE_URL=postgresql://buberry_app:...@192.168.1.251/buberry

# Dev
npm run dev
```

## Stack
- Next.js 15 + TypeScript
- PostgreSQL 15 + PostGIS 3 on Proxmox LXC 110 (buberry-db)
- Shared `buberry` DB with schema separation (citizen.*, lms.*, public.*)
- Leaflet + OpenStreetMap (no API keys)
- IndexedDB (`idb`) for offline storage
- PWA (manifest + service worker)

## Database Architecture
Single `buberry` database, schema-separated:
- `public` — shared auth tables (`user`, `account`, `session`, `roles`)
- `lms` — courses, lessons, enrollments
- `citizen` — trees, observations, photos, projects

Connection sets `search_path = citizen, public` so queries resolve without prefixes.
User references point to `public."user"`.

## App Architecture
- Trees are persistent entities with observation timelines
- API returns `{ success, data?, error? }` consistently
- Offline-first: IndexedDB queue → background sync → `/api/sync` (idempotent via `local_id`)
- Photos: MinIO/S3-compatible (presigned URLs)

## Key Files
- `src/lib/db/connection.ts` — PG pool (same pattern as terra-agraria)
- `src/lib/db/trees.ts` — TreeManager + ObservationManager
- `src/lib/offline/store.ts` — IndexedDB pending queues
- `src/components/TreeMap.tsx` — Leaflet map (client-only, dynamic import)
- `src/components/TagTreeForm.tsx` — Tree tagging form
- `scripts/001-schema.sql` — Database schema

## Phases
- [x] Phase 1: Walking skeleton (tag tree, see on map)
- [x] Phase 2: Offline sync + return visits
- [x] Phase 3: Search, filters, export (auth deferred — uses existing NextAuth in public.user)
- [x] Phase 4: Projects CRUD + add trees to projects
