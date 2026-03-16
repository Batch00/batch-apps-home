# CLAUDE.md

## Project
batch-apps.com home page: personal brand and app showcase portfolio.

## Tech Stack
- React + Vite (no router, single-page scroll)
- Tailwind CSS 3 (utility-first styling)
- lucide-react for all icons
- Deployed on Vercel; domain batch-apps.com (GoDaddy DNS)

## Hard Rules
- Icons: lucide-react only. No other icon libraries.
- Styling: Tailwind only. No external component libraries.
- App card data lives in `src/data/apps.js` - add new apps there only.
- No backend, no auth, no database.

## Design System
- Background: #0a0a0a
- Surface: #111111
- Accent: #3b82f6 (electric blue)
- Text: #f5f5f5 | Muted: #888888
- Font: Inter (Google Fonts)
- Smooth scroll + Intersection Observer fade-ins via `useFadeIn` hook
- Mobile-first responsive; consistent `py-24` on all content sections

## Deployment
- Push to `main` triggers auto-deploy on Vercel
- Domain: batch-apps.com
