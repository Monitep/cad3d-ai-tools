const PREFIX = "radio-k1-usb:" + self.registration.scope + ":";
const CACHE = PREFIX + "93ba6b127969aca5";
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
  const page = event.request.url === self.registration.scope;
  const url = page ? absolute("./index.html") : event.request.url;
  if (!allowed.has(url)) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url)) || fetch(event.request)));
});
