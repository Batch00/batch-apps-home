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
- Backend is Vercel serverless functions in `api/` only (shared helpers in `api/_lib/`). No other server.
  - `api/request-access.js`, `approve-request.js`, `deny-request.js`: access requests (Resend email, Supabase admin invite).
  - `api/ytd.js`: `GET /api/ytd?year=YYYY`, read-only from BatchBrain's `brain.public_ytd` as `site_reader` via `YTD_DATABASE_URL`. Every payload passes the allowlist in `api/_lib/ytd-payload.js`.
- Auth: Supabase is used only for the invite password-setup overlay in `App.jsx`. No other sign-in yet.
- Public data rule: no dollar amounts, trip names, notes, journal text, or dates finer than a month may reach a public payload or page.
- Never use the Supabase service role key for YTD data; `YTD_DATABASE_URL` connects as `site_reader`, which can read `brain.public_ytd` only.

## Design System
- Background: #0a0a0a
- Surface: #111111
- Accent: #3b82f6 (electric blue)
- Text: #f5f5f5 | Muted: #888888
- Font: Inter (Google Fonts)
- Smooth scroll + Intersection Observer fade-ins via `useFadeIn` hook
- Mobile-first responsive; consistent `py-24` on all content sections

## YTD section
- `src/components/YtdSection.jsx` sits between Apps and About: six tiles and a freshness stamp, hidden on any error.
- `src/wrap/fixtures/2026.json` is a sample payload. `npm run dev` has no `/api`, so the section falls back to it in development only.

## BatchWrap page (/2026)
- `main.jsx` checks the path (no router): `/<year>` for 2025 through the current year renders `src/WrapRoute.jsx`, which lazy-loads `src/wrap/WrapApp.jsx`. The home page must never import from `src/wrap/` (check `dist/` after a build).
- `src/wrap/` has its own Tailwind build: `src/wrap/wrap.css` loads `tailwind.wrap.config.js` (type scale `text-mega`, `display`, `headline`, `title`, `lede`, `eyebrow`, `caption`), and the home config excludes `src/wrap/**`.
- Chapters live in `src/wrap/chapters/` and are listed in order in `chapters/index.js` (`length` in screens, `isEligible`). Build them from `Chapter`, `Frame`, `Beats` (`components/Chapter.jsx`) and the motion primitives `Reveal`, `Scrub`, `Grow`, `CountUp` (`components/motion.jsx`).
- Scroll triggers, time animates: `Reveal`, `Grow` and `CountUp` fire when progress crosses `at`, then run to completion on a timer, so a paused page always shows true values and only one beat is visible at a time. `Scrub` follows the scroll exactly and is for decorative motion only, never data.
- Travel globe: `components/Globe.jsx` lazy-loads `globe/renderer.js` (d3-geo orthographic on a 2D canvas, world-atlas 110m and us-atlas states) as its own chunk. `globe/route.js` holds the arc schedule and camera keyframes shared with the chapter text; `globe/codes.js` maps payload codes (ISO alpha-2, USPS) to atlas ids. The camera follows scroll; arcs are triggered and finish on a timer.
- Narrative lines come from `src/wrap/insights.js`: each rule has a chapter, an eligibility check and a line, and `CHAPTER_GATES` there decides when a chapter is too thin to show. Add or change copy there, never inline in a chapter. `npm test` (vitest) pins every line against the fixture.
- Film posters: `components/Poster.jsx` loads `https://image.tmdb.org/t/p/w342` plus the payload's `poster_path` (the allowlist only passes a bare TMDB image path), lazily, with a plain title card when it is null or fails. Closing carries the TMDB attribution; keep it while posters show.
- Each chapter has its own visual rhythm (opening count-up and ledger, travel sentence and chips over the globe, fitness bars and week strip, film poster wall and spotlight, patterns grid and numbered list). Keep one big count-up, in the opening.
- One scroll engine (`engine/scrollEngine.js`) writes `--p` and `--e` on each chapter. For canvas or JS motion use `useChapterProgress` (`engine/progress.js`). Reduced motion pins progress to 1 and flattens the page; `?motion=reduce` forces it, and `?state=final` previews the frozen-year copy in development.

## Deployment
- Push to `main` triggers auto-deploy on Vercel
- Domain: batch-apps.com
- Env vars live in Vercel (see `.env.example` for names). `YTD_DATABASE_URL` is set for Production and Preview.
