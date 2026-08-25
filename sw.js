const CACHE = "gearup-v21";
const PRECACHE = [
  "/",
  "/index.html",
  "/css/app.css",
  "/js/app.js",
  "/js/sun.js",
  "/js/hl.js",
  "/fonts/AtkinsonHyperlegible-Regular.woff2",
  "/fonts/AtkinsonHyperlegible-Bold.woff2",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  const dest = event.request.destination;
  if (dest === "audio" || dest === "video") return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((hit) => {
          if (hit) return hit;
          if (event.request.mode === "navigate") return caches.match("/index.html");
          return Response.error();
        })
      )
  );
});
