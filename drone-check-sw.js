'use strict';
const CACHE='dronecheck-shell-v3.0.0';
const SHELL=['./drone-check.html','./drone-check-manifest.json','./drone-check-icon.svg','./drone-check-icon-192.png','./drone-check-icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('dronecheck-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET')return;
  if(url.pathname.endsWith('/notam-proxy.php')){
    event.respondWith(fetch(req).catch(()=>new Response(JSON.stringify({ok:false,available:false,error:'Offline: dati live non disponibili'}),{status:503,headers:{'Content-Type':'application/json'}})));
    return;
  }
  if(url.origin===location.origin){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res}).catch(()=>caches.match(req).then(r=>r||caches.match('./drone-check.html'))));
  }
});
