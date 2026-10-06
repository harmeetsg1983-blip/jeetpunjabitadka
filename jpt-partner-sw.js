const CACHE='jpt-partner-pwa-v22-orders-ready-one-tap';
const ASSETS=['./admin.html','./partner-manifest.webmanifest','./jpt-partner-icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('push',event=>{
  let data={}; try{data=event.data?.json()||{}}catch(e){try{data={body:event.data?.text()||''}}catch(_){}}
  const title=data.title||'Jeet Punjabi Tadka — New Order';
  const outlet=data.outlet_name||data.outlet||'Restaurant Partner';
  const order=data.order_no||data.order_id||'New order';
  const body=data.body||('New order '+order+' • '+outlet+' • ACCEPT / REJECT');
  const target=data.url||('./admin.html?push=order&section=orders&order_id='+encodeURIComponent(data.order_id||'')+'&outlet_id='+encodeURIComponent(data.outlet_id||'')+'&order_no='+encodeURIComponent(data.order_no||''));
  event.waitUntil(self.registration.showNotification(title,{body,icon:'./jpt-partner-icon-512.png',badge:'./jpt-partner-icon-512.png',tag:data.tag||('jpt-new-order-'+String(data.order_id||order)),renotify:true,requireInteraction:true,silent:false,vibrate:[450,150,450,150,700],actions:[{action:'accept',title:'ACCEPT'},{action:'reject',title:'REJECT'}],data:{url:target,order_id:data.order_id||'',outlet_id:data.outlet_id||'',order_no:data.order_no||''}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const d=event.notification?.data||{};
  const action=event.action||'';
  const base=d.url||'./admin.html?push=order&section=orders';
  const u=new URL(base,self.registration.scope);
  if(d.order_id)u.searchParams.set('order_id',String(d.order_id));
  if(d.outlet_id)u.searchParams.set('outlet_id',String(d.outlet_id));
  if(action==='accept'||action==='reject')u.searchParams.set('action',action);
  event.waitUntil((async()=>{
    const absolute=u.href;
    const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of list){
      if('focus' in client){
        try{await client.navigate(absolute);return client.focus()}catch(e){}
      }
    }
    if(self.clients.openWindow)return self.clients.openWindow(absolute);
  })());
});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match('./admin.html'))))});