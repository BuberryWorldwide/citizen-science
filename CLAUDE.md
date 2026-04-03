# Citizen Science App

Field tool for scouting valuable tree genetics and public harvestable trees. The real-world data spine for Buberry's ecosystem.

## Architecture

- **Frontend**: Next.js 15 on Vercel at citizen.buberryworldwide.com
- **Backend API**: Express server on buberry-db LXC 110 at api.buberryworldwide.com (separate repo: `~/projects/buberry/code/citizen-science-api/`)
- **Auth**: NextAuth v4 with JWT strategy, Google OAuth + Credentials. Adapter calls the backend API — no direct DB access from Vercel.
- **Map**: Leaflet with 4 base layers (Clean/Dark/Game/Satellite), marker clustering, heat map overlay
- **Photos**: MinIO on buberry-db, proxied through api.buberryworldwide.com/api/photos/
- **NO direct database connection from the frontend** — all API routes in `src/app/api/` are thin proxies that call the backend via `backendFetch()` from `src/lib/api-client.ts`

## Quick Start

```bash
npm install
npm run dev  # http://localhost:3000
```

Environment: `.env.local` needs `NEXT_PUBLIC_API_URL=https://api.buberryworldwide.com` and NextAuth secrets. No DATABASE_URL — the frontend never touches the DB.

## Features

- Tree tagging with GPS, species selection, accessibility, use potential, phenology
- Photo capture with organ selection (leaf/fruit/bark/flower/tree) and photo tips
- Instant PlantNet species identification for unknown species
- Tree verification system (unverified -> auto_verified -> verified -> rejected)
- Work orders (verify_species, add_photo, confirm_location) with proximity search
- First discoverer tracking
- Observations with health, phenology, fruit data, photos
- Offline sync (IndexedDB -> /api/sync)
- Projects (group trees)
- Gamification: points, achievements (20+), weekly challenges, streaks, XP levels
- Species journal (Pokedex-style)
- Leaderboard
- Search panel with filters + tree list + map flyTo
- 4 switchable map styles (Clean, Dark, Game, Satellite)
- Heat map + marker clustering + species color coding overlays
- Light/dark theme
- Onboarding walkthrough
- Auth gates for unauthenticated users
- Content moderation (server-side profanity filter)
- Privacy policy, terms, cookie policy on main site

## Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main map page with all state management |
| `src/components/TreeMap.tsx` | Leaflet map (forwardRef with flyTo) |
| `src/components/TagTreeForm.tsx` | Tree creation form |
| `src/components/ObservationForm.tsx` | Observation form |
| `src/components/PhotoCaptureGuide.tsx` | Photo capture with organ selection + PlantNet ID |
| `src/components/SearchPanel.tsx` | Search filters + tree list |
| `src/components/ProfilePanel.tsx` | User profile with tabs (stats/journal/badges) |
| `src/components/VerificationForm.tsx` | Human verification form |
| `src/components/WorkOrderPanel.tsx` | Work order list |
| `src/components/Icons.tsx` | Custom SVG icon system |
| `src/components/RewardToast.tsx` | Animated reward notifications |
| `src/lib/api-client.ts` | `backendFetch()` — proxies all requests to api.buberryworldwide.com |
| `src/lib/map-config.ts` | Tile layer definitions (separated from Leaflet for SSR) |
| `src/lib/moderation.ts` | Profanity filter |
| `src/types/tree.ts` | Tree, WorkOrder, VerificationStatus types |
| `scripts/001-schema.sql` | Original DB schema |
| `scripts/002-schema-migration.sql` | Schema migration |
| `scripts/003-points-system.sql` | Points + user_stats |
| `scripts/004-gamification.sql` | Achievements, challenges, streaks |
| `scripts/005-verification-workorders.sql` | Verification, work orders, first discovery |

## Deploy

```bash
git push origin main
vercel --prod
```

Frontend only. The API server deploys separately (build + tar + scp to LXC 110 + pm2 restart).
