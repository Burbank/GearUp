const CACHE = "gearup-v252";
const PRECACHE = [
  "/",
  "/index.html",
  "/css/app.css",
  "/js/theme.js",
  "/js/app.js",
  "/js/sun.js",
  "/js/tz.js",
  "/js/hl.js",
  "/js/worstwind.js",
  "/js/ehamrwy.js",
  "/js/rwycond.js",
  "/js/cdm.js",
  "/js/board.js",
  "/js/airports.js",
  "/fonts/AtkinsonHyperlegible-Regular.woff2",
  "/fonts/AtkinsonHyperlegible-Bold.woff2",
  "/icons/rightaway-flat.png",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-192-dark.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon.png",
  "/icons/favicon-dark.png",
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

function cacheCopy(request, res) {
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return res;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
      return undefined;
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  const dest = event.request.destination;
  if (dest === "audio" || dest === "video") return;

  const cacheFirst =
    dest === "font" ||
    dest === "image" ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/data/");

  if (cacheFirst) {
    event.respondWith(
      caches.match(event.request).then((hit) => {
        if (hit) return hit;
        return fetch(event.request)
          .then((res) => cacheCopy(event.request, res))
          .catch(() => Response.error());
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => cacheCopy(event.request, res))
      .catch(() =>
        caches.match(event.request).then((hit) => {
          if (hit) return hit;
          if (event.request.mode === "navigate") return caches.match("/index.html");
          return Response.error();
        })
      )
  );
});
