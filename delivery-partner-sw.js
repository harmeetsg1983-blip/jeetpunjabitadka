const CACHE='jpt-delivery-v2';
const SHELL=[
  './delivery-partner-app.html',
  './delivery-partner-manifest.webmanifest',
  './jpt-delivery-icon-192.png',
  './jpt-delivery-icon-512.png',
  './delivery-partner-v11.html'
];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(
    keys.filter(k=>k!=='jpt-delivery-v2').map(k=>caches.delete(k))
  )).then(()=>self.clients.claim())
));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;
  e.respondWith(
    caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return r;
    }).catch(()=>cached))
  );
});
