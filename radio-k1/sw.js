const PREFIX = "radio-k1-usb:" + self.registration.scope + ":";
const CACHE = PREFIX + "9ec59384e9c16f9c";
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
  const url = new URL(event.request.url);
  url.search = ""; url.hash = "";
  if (event.request.mode === "navigate" && [absolute("./"), absolute("./index.html")].includes(url.href)) {
    // Anche le icone installate con il vecchio start_url aggiornano la pagina
    // online. Tutte le viste e i link di assistenza condividono la copia offline.
    event.respondWith((async()=>{
      try {
        const live=await fetch(event.request,{cache:"no-store"});
        if(live.ok) return live;
        return await caches.match(absolute("./index.html"),{cacheName:CACHE}) || live;
      } catch {
        return await caches.match(absolute("./index.html"),{cacheName:CACHE}) || Response.error();
      }
    })());
    return;
  }
  if (!allowed.has(event.request.url)) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
});
