const CACHE="jpt-customer-shell-v5";
const ASSETS=[
  "./customer-app.html",
  "./customer-manifest.webmanifest",
  "./index.html",
  "./jpt-customer-icon-192.png",
  "./jpt-customer-icon-512.png"
];

self.addEventListener("install",e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys.filter(k=>k.startsWith("jpt-customer-shell-")&&k!==CACHE)
          .map(k=>caches.delete(k))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;

  const url=new URL(e.request.url);
  const isHtml=e.request.mode==="navigate" ||
    e.request.destination==="document" ||
    /\\.html$/i.test(url.pathname);

  if(isHtml){
    // Always prefer the current deployed HTML. Fall back to cache only offline.
    e.respondWith(
      fetch(e.request,{cache:"no-store"})
        .then(r=>{
          const copy=r.clone();
          caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
          return r;
        })
        .catch(()=>caches.match(e.request).then(c=>c||caches.match("./index.html")))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request)
      .then(cached=>cached||fetch(e.request).then(r=>{
        const copy=r.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
        return r;
      }))
  );
});