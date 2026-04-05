# Contributing to Tree Scout

Thanks for your interest in contributing to the Buberry citizen science app. This guide will help you get started.

## Before You Start

- Read the [README](README.md) to understand the project
- Check [open issues](https://github.com/BuberryWorldwide/citizen-science/issues) for something that interests you
- For big changes, open an issue first to discuss your approach

## Development Setup

1. Fork the repo
2. Clone your fork
3. Install dependencies: `npm install`
4. Create `.env.local` (see README for required vars)
5. Run `npm run dev`

You'll need a running backend API to test most features. If you're working on UI-only changes, you can mock API responses.

## Code Style

- **TypeScript** — all new code must be typed
- **Tailwind CSS** — no separate CSS files unless absolutely necessary
- **Components** — one component per file in `src/components/`
- **API routes** — thin proxies only, no business logic in the frontend
- **No direct database access** — everything goes through `backendFetch()` in `src/lib/api-client.ts`

### Naming

- Components: `PascalCase.tsx`
- Utilities: `kebab-case.ts`
- Types: `PascalCase` for interfaces, `camelCase` for type aliases
- API routes: match the backend endpoint path

### Conventions

- Mobile-first — design for phone screens, then scale up
- Keep components focused — if it's doing too much, split it
- Prefer CSS over JS for animations
- Don't add dependencies without a good reason
- No console.log in committed code (use it for debugging, remove before PR)

## Making Changes

1. Create a branch from `main`: `git checkout -b your-feature`
2. Make your changes
3. Test on mobile viewport (Chrome DevTools → responsive mode)
4. Run `npm run build` to catch TypeScript errors
5. Commit with a clear message describing what and why
6. Push and open a PR

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Describe what changed and why in the PR description
- Include screenshots for UI changes (mobile + desktop)
- Link related issues
- Be ready for feedback — we review for correctness, style, and mobile UX

## What We Need Help With

- **Species data** — adding new species, improving identification mappings
- **Accessibility** — screen readers, color contrast, keyboard navigation
- **Localization** — translations for non-English speakers
- **Map UX** — better clustering, marker styles, performance on large datasets
- **Offline support** — improving the IndexedDB sync experience
- **Documentation** — improving setup guides, adding examples
- **Testing** — we don't have automated tests yet (contributions welcome)

## What We Won't Merge

- Changes that add tracking, analytics, or data collection beyond what's needed for the app
- Closed-source dependencies or services that create vendor lock-in
- Features that require users to pay to participate in citizen science
- Code that bypasses content moderation

## Bug Reports

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Device/browser info (this is a mobile-first app — include screen size)
- Screenshots if it's a visual bug

## Questions?

Open an issue or reach out at [buberryworldwide.com](https://buberryworldwide.com).

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0](LICENSE).
