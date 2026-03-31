# Citizen Science App

Field tool for scouting valuable tree genetics and public harvestable trees. The real-world data spine for Buberry's ecosystem.

## Quick Start

```bash
# Install
npm install

# Set up DB (requires PostgreSQL + PostGIS)
cp .env.example .env  # edit DATABASE_URL
psql $DATABASE_URL -f scripts/001-schema.sql

# Dev
npm run dev
```

## Stack
- Next.js 15 + TypeScript
- PostgreSQL + PostGIS (raw `pg` driver, no ORM)
- Leaflet + OpenStreetMap (no API keys)
- IndexedDB (`idb`) for offline storage
- PWA (manifest + service worker)

## Architecture
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
- [ ] Phase 2: Offline sync + return visits
- [ ] Phase 3: Ushahidi import, search, export, auth
- [ ] Phase 4: Projects + polish
