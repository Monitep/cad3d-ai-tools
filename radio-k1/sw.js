const PREFIX = "radio-k1-usb:" + self.registration.scope + ":";
const CACHE = PREFIX + "6cffa72b4d861920";
const files = ["./index.html", "./app.webmanifest", "./icon-192.png", "./icon-512.png"];
const absolute = path => new URL(path, self.registration.scope).href;
const allowed = new Set(files.map(absolute));

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(files.map(file => new Request(absolute(file), { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const views = ["?verifica=usb","?vista=schermo","?vista=canali","?vista=bozza","?vista=immagini"];
  if (event.request.mode === "navigate" && views.some(view => absolute("./"+view) === event.request.url)) {
    // Il link di assistenza carica la versione pubblicata anche se il Galaxy ha già la precedente.
    event.respondWith(fetch(event.request, { cache: "no-cache" }).catch(async () => {
      const cache = await caches.open(CACHE);
      return await cache.match(absolute("./index.html")) || Response.error();
    }));
    return;
  }
  const page = event.request.url === self.registration.scope;
  const url = page ? absolute("./index.html") : event.request.url;
  if (!allowed.has(url)) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url)) || fetch(event.request)));
});
