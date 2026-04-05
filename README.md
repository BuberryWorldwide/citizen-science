# Tree Scout — Buberry Citizen Science

A mobile-first field tool for mapping, identifying, and tracking trees in your community. Built for citizen scientists, foragers, and anyone who wants to know what's growing around them.

Part of the [Buberry Worldwide](https://buberryworldwide.com) ecosystem — gamified citizen science for regenerative agroforestry.

**Live at [citizen.buberryworldwide.com](https://citizen.buberryworldwide.com)**

## What It Does

- **Tag trees** with GPS, species, accessibility, health, phenology, trunk width, and use potential
- **AI species identification** — snap a leaf photo and PlantNet tells you what it is
- **Multi-photo observations** — categorized by organ type (leaf, bark, fruit, flower, full tree)
- **Community verification** — other users verify your tags, building trust in the data
- **Quests** — auto-generated tasks like "add a photo to this tree" or "verify this species"
- **Gamification** — XP, levels, streaks, 20+ achievements, weekly challenges
- **Species journal** — Pokedex-style collection of every species you've found
- **Community tree overlay** — browse [Falling Fruit](https://fallingfruit.org) data alongside native tags
- **4 map styles** — Clean, Dark, Standard, Satellite
- **Heat map, clustering, species color coding** — see density and diversity at a glance

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Map | Leaflet + react-leaflet, marker clustering, heat map |
| Auth | NextAuth v4 (Google OAuth + credentials) |
| Backend | Separate API server (not included in this repo) |
| Deploy | Vercel |

The frontend talks to a backend API via proxy routes in `src/app/api/`. It never touches the database directly.

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A running instance of the [backend API](#backend-api)

### Setup

```bash
git clone https://github.com/BuberryWorldwide/citizen-science.git
cd citizen-science
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Google OAuth (optional — credentials login works without it)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main map page + state management
│   └── api/                  # Proxy routes → backend API
├── components/
│   ├── TreeMap.tsx            # Leaflet map with overlays
│   ├── TagTreeForm.tsx        # Tree creation form
│   ├── ObservationForm.tsx    # Add observations to existing trees
│   ├── MultiPhotoCapture.tsx  # Multi-photo with organ type selection
│   ├── TreeDetail.tsx         # Tree info + observations
│   ├── SearchPanel.tsx        # Filters + tree list
│   ├── ProfilePanel.tsx       # Stats, journal, badges
│   ├── WorkOrderPanel.tsx     # Quest list
│   ├── VerificationForm.tsx   # Human verification
│   ├── BadgeModal.tsx         # Achievement earned popup
│   ├── Onboarding.tsx         # First-time walkthrough
│   └── ...
├── lib/
│   ├── api-client.ts          # backendFetch() helper
│   ├── map-config.ts          # Tile layers + overlay config
│   ├── image.ts               # Client-side photo compression
│   └── moderation.ts          # Content filter
└── types/
    └── tree.ts                # Tree, WorkOrder, Achievement types
```

## Backend API

This repo is the frontend only. The backend API is a separate Express server that handles:

- Tree CRUD + PostGIS spatial queries
- Photo storage (MinIO)
- PlantNet species identification
- Quest generation engine
- Gamification (XP, achievements, challenges, streaks)
- User auth adapter
- Falling Fruit data caching

To run locally, you'll need to set up the backend separately. See the API documentation for endpoint details. The frontend expects the API at whatever `NEXT_PUBLIC_API_URL` points to.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Data Philosophy

- **No ads. No data selling.** Ever.
- Tree data is for the commons — ecological data should be open and accessible
- User data stays private — we collect the minimum needed for the app to work
- Community verification builds trust without centralized gatekeeping
- Attribution matters — first discoverers get credit

## Third-Party Data

### Falling Fruit

The "Community Trees" map overlay displays data from [Falling Fruit](https://fallingfruit.org), a community foraging map. This data is **read-only** — we display it, we don't own it and we don't modify it. The integration is one-way: Falling Fruit data flows in as a reference layer for our users to discover and verify trees in their area. No Buberry data currently flows back to Falling Fruit. Any future two-way data sharing would be a formal partnership agreement with the Falling Fruit team.

## Acknowledgments

- [Falling Fruit](https://fallingfruit.org) — community foraging map data and API access
- [PlantNet](https://plantnet.org) — AI species identification API
- [Leaflet](https://leafletjs.com) — open source map library
- [OpenStreetMap](https://www.openstreetmap.org) — map tile data

## License

[AGPL-3.0](LICENSE) — you can use, modify, and share this code, but if you run a modified version as a web service, you must open source your changes too.
