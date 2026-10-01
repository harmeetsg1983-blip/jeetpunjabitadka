/* JPT PLATFORM SERVICE WORKER — SINGLE ROOT OWNER
   Shared PWA lifecycle + push notification delivery.
   Deliberately does NOT intercept normal page fetches/caching.
*/
const VERSION='jpt-platform-sw-v1';

self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{};}catch(_){data={body:event.data?event.data.text():''};}
  const title=data.title||'Jeet Punjabi Tadka';
  const options={
    body:data.body||'You have a new update.',
    icon:data.icon||'./jpt-customer-icon-192.png',
    badge:data.badge||data.icon||'./jpt-customer-icon-192.png',
    tag:data.tag||'jpt-notification',
    renotify:!!data.renotify,
    data:data.data||{}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'./index.html';
  event.waitUntil((async()=>{
    const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of list){
      if('focus' in c){try{await c.navigate(target);}catch(_){};return c.focus();}
    }
    if(self.clients.openWindow)return self.clients.openWindow(target);
  })());
});
