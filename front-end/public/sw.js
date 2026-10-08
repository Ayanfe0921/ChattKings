const CACHE = "chattkings-shell-v2";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/hero.png"];
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    Promise.all([self.clients.claim(), caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("chattkings-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )]),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && !response.bodyUsed) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put("/index.html", copy)).catch(() => {}));
          }
          return response;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }
  if (
    url.origin === self.location.origin ||
    /imagekit|cloudinary|imgix/i.test(url.hostname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fresh = fetch(request)
          .then((response) => {
            if ((response.ok || response.type === "opaque") && !response.bodyUsed) {
              const copy = response.clone();
              event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {}));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fresh;
      }),
    );
  }
});
