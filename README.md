# batch-apps.com

A personal portfolio and app showcase landing page for the Batch Apps brand, built to grow as new apps are added. Each app card links to a live tool, displays its tech stack tags, and shows its current status (Live, Beta, or Coming Soon). The site is designed as a single-page scroll experience with no routing, no backend, and no auth.

## Tech Stack

- **React** - component-based UI, structured as a single-page scroll app
- **Vite** - fast dev server and optimized production builds
- **Tailwind CSS** - utility-first styling with a custom dark design system (background #0a0a0a, accent #3b82f6)
- **Vercel** - zero-config hosting with automatic deployments on every push to `main`

## Run Locally

```bash
npm install
npm run dev
```

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
