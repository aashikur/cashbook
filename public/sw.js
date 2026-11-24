// CashBook Progressive Web App Service Worker
// Version: 1.0.1
const CACHE_NAME = "cashbook-pwa-v1";

// Core shell and static assets to pre-cache on install
const PRECACHE_ASSETS = [
  "/dashboard",
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon-32x32.png",
  "/favicon-16x16.png",
  "/favicon.ico",
  "/og-image.png",
];

// Install Event: pre-cache application shell for offline boot
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // Precache critical shell routes & assets, ignoring non-fatal single-item fails
        for (const url of PRECACHE_ASSETS) {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn(`[SW] Precache skipped for ${url}:`, err);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: purge stale caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[SW] Deleting stale cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event: intercept requests to allow offline access
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET requests with http/https schemes
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // 2. Bypass API requests: Dexie & syncQueue manage local data offline
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // 3. Navigation Requests (User opening PWA or tapping links)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
              // Also keep /dashboard updated as the primary shell fallback
              if (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/orgs/")) {
                cache.put("/dashboard", networkResponse.clone());
              }
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // OFFLINE: Return cached page or fallback to cached /dashboard shell
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          const dashboardShell = await caches.match("/dashboard");
          if (dashboardShell) return dashboardShell;

          const rootShell = await caches.match("/");
          if (rootShell) return rootShell;

          return new Response("Offline - CashBook PWA Shell", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
    return;
  }

  // 4. Next.js Static Chunks & Builds (/_next/static/*)
  // These are immutable content-hashed assets: Cache-First strategy
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. Static Assets (Icons, Images, Manifest, Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
