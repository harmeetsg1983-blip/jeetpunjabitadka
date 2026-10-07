const CACHE='jpt-royal-shell-v3-unified-live';
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(!u.pathname.endsWith('/index.html')){
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith((async()=>{
    try{
      const r=await fetch(e.request,{cache:'no-store'});
      const h=new Headers(r.headers);
      h.set('Cache-Control','no-store');
      return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h});
    }catch(err){
      return caches.match(e.request);
    }
  })());
});
