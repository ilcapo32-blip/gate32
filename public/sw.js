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

// Lo que llega desde «Compartir» de otra app (WhatsApp, Telegram, la
// grabadora, la galería) entra aquí como un formulario. Se guarda en una caché
// aparte —su nombre no empieza por "g32-", así que activar una versión nueva
// del service worker no la borra— y se redirige a la página, que lo recoge.
// Es la función que justifica tener app: de la nota de voz a Gate32 sin pasar
// por «Descargar» y «Elegir archivo».
const SHARED = "compartido-g32";

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method === "POST" && url.origin === self.location.origin && url.pathname.endsWith("/compartir")) {
    event.respondWith(
      (async () => {
        const base = url.pathname.startsWith("/en/") ? "/en/" : "/";
        try {
          const form = await req.formData();
          const files = form.getAll("audio").filter((f) => typeof f !== "string");
          await caches.delete(SHARED);
          const cache = await caches.open(SHARED);
          await Promise.all(
            files.map((f, i) =>
              cache.put(
                `/compartido/${i}`,
                new Response(f, {
                  headers: {
                    "content-type": f.type || "application/octet-stream",
                    "x-name": encodeURIComponent(f.name || `audio-${i + 1}`),
                  },
                }),
              ),
            ),
          );
          return Response.redirect(`${base}?compartido=${files.length}`, 303);
        } catch {
          return Response.redirect(`${base}?compartido=0`, 303);
        }
      })(),
    );
    return;
  }
  if (req.method !== "GET") return;
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
