// Batch Apps service worker. Its job is to make batch-apps.com installable, and it stays small
// on purpose: a stale page after a deploy, or an API answer from a cache, is worse than none.
//
//   1. Only same-origin GETs are ever looked at. Everything else (POSTs such as the approve and
//      deny forms, Supabase, TMDB posters, Google Fonts) goes straight to the network.
//   2. /api/* is never touched, so it is network only and never cached. That covers
//      /api/wrap-private (owner data) and /api/ytd.
//   3. Page loads (the HTML shell) are network first. A deploy shows on the next load; the
//      cached copy is only used when the network fails.
//   4. /assets/* is Vite build output with a content hash in every name, so it is cache first.
//      That is what lets the offline shell actually render.
//
// Bump VERSION to drop every cache on the next activation.

const VERSION = "v1";
const SHELL_CACHE = `batchapps-shell-${VERSION}`;
const ASSET_CACHE = `batchapps-assets-${VERSION}`;
const MAX_ASSETS = 120;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((name) => !keep.has(name)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

// Oldest first: Cache Storage keeps insertion order.
async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i += 1) await cache.delete(keys[i]);
}

// The shell is keyed by path alone, so query strings never multiply it.
async function page(request, url) {
  const cache = await caches.open(SHELL_CACHE);
  const key = new Request(url.origin + url.pathname);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") cache.put(key, response.clone());
    return response;
  } catch (error) {
    const hit = (await cache.match(key)) || (await cache.match(new Request(url.origin + "/")));
    if (hit) return hit;
    throw error;
  }
}

async function asset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
    trim(cache, MAX_ASSETS);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(page(request, url));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(asset(request));
  }
});
