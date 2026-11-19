# batch-apps.com

A personal portfolio and app showcase landing page for the Batch Apps brand, built to grow as new apps are added. Each app card links to a live tool, displays its tech stack tags, and shows its current status (Live, Beta, or Coming Soon). The site is a single-page scroll experience with no routing. A few Vercel serverless functions in `api/` handle access requests and serve the public year-to-date stats.

## Tech Stack

- **React** - component-based UI, structured as a single-page scroll app
- **Vite** - fast dev server and optimized production builds
- **Tailwind CSS** - utility-first styling with a custom dark design system (background #0a0a0a, accent #3b82f6)
- **Vercel** - zero-config hosting with automatic deployments on every push to `main`, plus serverless functions in `api/`

## Backend

- `api/request-access.js`, `api/approve-request.js`, `api/deny-request.js` - access requests, emailed through Resend, approved users invited through Supabase
- `api/ytd.js` - `GET /api/ytd?year=YYYY`, the public year-to-date stats for the YTD section, read-only from BatchBrain's `brain.public_ytd` view

Environment variable names are listed in `.env.example`; the values live in Vercel.

## Run Locally

```bash
npm install
npm run dev
```

`npm run dev` does not serve `api/`, so the YTD section uses the sample payload in `src/wrap/fixtures/2026.json` locally.

## Add a New App

Edit `src/data/apps.js` and add an object to the `apps` array:

```js
{
  name: "AppName",
  description: "What it does.",
  icon: "🔧",
  status: "Live",          // "Live" | "Beta" | "Coming Soon"
  url: "https://...",
  tags: ["React", "Supabase"],
}
```

## Deployment

Pushing to `main` triggers an automatic deploy on Vercel. The live site is at [batch-apps.com](https://batch-apps.com).
