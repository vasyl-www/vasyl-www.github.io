// Minimal service worker: enough to satisfy PWA installability criteria and
// let the app open (from cache) when there's no network. It does not try to
// cache/serve Google APIs — Drive sync always goes straight to the network.
const CACHE_NAME = "ord-kort-v3";
const CORE_ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./pdf-fonts.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Never intercept cross-origin requests (Google APIs, fonts, etc.) — network only.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;
  // Network-first: always try the server (bypassing the browser's HTTP cache, which GitHub Pages
  // sets to ~10 min) so a new deploy shows up on the next load. The cache is only the offline
  // fallback. (The earlier cache-first version kept serving the old page after updates.)
  event.respondWith(
    fetch(event.request, { cache: "no-cache" })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
