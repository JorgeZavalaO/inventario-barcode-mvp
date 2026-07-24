const CACHE = "stockscan-v3";
const API_CACHE = "stockscan-api-v3";
const STATIC_CACHE = "stockscan-static-v3";

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

const PRECACHE_URLS = [
  "/",
  "/sessions",
  "/sessions/v1",
  "/sessions/v3",
  "/sessions/v3/new",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  if (!isMobileDevice()) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  if (!isMobileDevice()) {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names
        .filter((name) => name.startsWith("stockscan-"))
        .map((name) => caches.delete(name)))
      ).then(() => self.registration.unregister()).then(() => clients.claim())
    );
    return;
  }
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE && n !== API_CACHE && n !== STATIC_CACHE).map((n) => caches.delete(n))
      )
    ).then(() => clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (!isMobileDevice()) return;
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(cacheFirst(request, CACHE));
  } else {
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

function offlineFallback(request) {
  const url = new URL(request.url);
  if (request.destination === "document" || url.pathname.startsWith("/sessions")) {
    if (url.pathname.startsWith("/sessions/v3")) {
      return caches.match("/sessions/v3");
    }
    if (url.pathname.startsWith("/sessions/v1")) {
      return caches.match("/sessions/v1");
    }
    if (url.pathname.startsWith("/sessions")) {
      return caches.match("/sessions");
    }
    return caches.match("/");
  }
  return new Response(JSON.stringify({ error: "offline", queued: true }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}
