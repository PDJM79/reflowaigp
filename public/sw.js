const CACHE_VERSION = "v3";
const CACHE_NAME = `fitforaudit-${CACHE_VERSION}`;
const RUNTIME_CACHE = `fitforaudit-runtime-${CACHE_VERSION}`;

// Assets to pre-cache on install
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== RUNTIME_CACHE)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Network-first for HTML navigations (prevents stale index.html)
  const isNavigation =
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", clone));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Network-first for API calls (Express + Supabase REST)
  const isApi =
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/rest/v1/") ||
    url.pathname.includes("/functions/v1/");

  if (isApi) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response(JSON.stringify({ error: "Offline", offline: true }), {
                status: 503,
                headers: { "Content-Type": "application/json" },
              })
          )
        )
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
    )
  );
});

// Background sync — notify page to retry queued operations
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-data") {
    event.waitUntil(
      self.clients.matchAll().then((clients) =>
        clients.forEach((c) =>
          c.postMessage({ type: "SYNC_REQUESTED", timestamp: Date.now() })
        )
      )
    );
  }
});

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data.type === "CLEAR_CACHES") {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
    );
  }
});
