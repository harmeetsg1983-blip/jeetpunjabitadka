const CACHE='jpt-delivery-v10-screen-refresh';
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
    keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim())
));

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?.json()||{}}
  catch(e){
    try{data={body:event.data?.text()||''}}
    catch(_){}
  }
  const order=data.order_no||data.order_id||'New delivery';
  const title=data.title||'Jeet Punjabi Tadka — Delivery Offer';
  const body=data.body||('New delivery offer • '+order);
  const target=data.url||('./delivery-partner-app.html?push=offer&assignment_id='+
    encodeURIComponent(data.assignment_id||''));
  event.waitUntil(
    self.registration.showNotification(title,{
      body,
      icon:'./jpt-delivery-icon-192.png',
      badge:'./jpt-delivery-icon-192.png',
      tag:data.tag||('jpt-delivery-'+(data.assignment_id||order)),
      renotify:true,
      requireInteraction:true,
      data:{url:target,assignment_id:data.assignment_id||null,order_id:data.order_id||null}
    })
  );
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'./delivery-partner-app.html';
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const client of list){
        if('focus' in client){
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});

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
