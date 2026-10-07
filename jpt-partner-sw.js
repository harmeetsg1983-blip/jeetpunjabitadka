const CACHE='jpt-partner-pwa-v20-multioutlet-orders';
const ASSETS=['./partner-app.html','./partner-v107.html','./admin.html','./partner-manifest.webmanifest','./jpt-partner-icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('push',event=>{
  let data={}; try{data=event.data?.json()||{}}catch(e){try{data={body:event.data?.text()||''}}catch(_){}}
  const title=data.title||'Jeet Punjabi Tadka — New Order';
  const outlet=data.outlet_name||data.outlet||'Restaurant Partner';
  const order=data.order_no||data.order_id||'New order';
  const body=data.body||('New order '+order+' • '+outlet+' • ACCEPT / REJECT');
  const target=data.url||('./partner-v107.html?push=order&order_id='+encodeURIComponent(data.order_id||'')+'&outlet_id='+encodeURIComponent(data.outlet_id||'')+'&order_no='+encodeURIComponent(data.order_no||''));
  event.waitUntil(self.registration.showNotification(title,{body,icon:'./jpt-partner-icon-512.png',badge:'./jpt-partner-icon-512.png',tag:data.tag||('jpt-new-order-'+String(data.order_id||order)),renotify:true,requireInteraction:true,silent:false,vibrate:[1000,500,1000,500,1000],actions:[{action:'open-order',title:'OPEN ORDER'},{action:'dismiss',title:'DISMISS'}],data:{url:target,order_id:data.order_id||'',outlet_id:data.outlet_id||'',order_no:data.order_no||''}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification?.data?.url||'./partner-v107.html?push=order';
  event.waitUntil((async()=>{const absolute=new URL(url,self.registration.scope).href;const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of list){if('focus' in client){try{await client.navigate(absolute);return client.focus()}catch(e){}}}if(self.clients.openWindow)return self.clients.openWindow(absolute)})());
});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const req=event.request;const networkFirst=req.mode==='navigate'||req.destination==='script'||req.destination==='style';event.respondWith((networkFirst?fetch(req).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));return response}).catch(()=>caches.match(req)):caches.match(req).then(cached=>cached||fetch(req).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));return response}))).catch(()=>caches.match('./partner-v107.html')))});