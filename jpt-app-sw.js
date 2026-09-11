const CACHE='jpt-royal-shell-v2';
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
      const r=await fetch(e.request);
      const t=await r.text();
      const marker='<script src="./jpt-v106-delivery-location-handover.js?v=delivery1"></script>';
      const inject='<script src="./customer-order-tracking-v106-v2.js?v=tracking-v3"></script>';
      const body=t.includes(marker)?t.replace(marker,inject+marker):t;
      const h=new Headers(r.headers);
      h.set('Cache-Control','no-store');
      return new Response(body,{status:r.status,statusText:r.statusText,headers:h});
    }catch(err){
      return caches.match(e.request);
    }
  })());
});
