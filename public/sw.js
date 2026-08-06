// Gate32 service worker: hace real el "funciona sin conexión".
// - Navegaciones: red primero, caché como respaldo.
// - Assets con hash y estáticos propios: caché primero (inmutables).
// - Nunca toca orígenes externos: transformers.js gestiona su propia caché
//   de modelos (Cache API) y la analítica no debe interceptarse.

const CACHE = "g32-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("g32-") && k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_vercel/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(req);
          return cached ?? (await caches.match("/")) ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    /\.(svg|png|txt|xml|webmanifest)$/.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      })(),
    );
  }
});
