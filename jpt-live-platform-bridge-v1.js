/* JPT LIVE PLATFORM BRIDGE V1
   Purpose: one normalized live-event contract for Customer / Partner / Delivery.
   Safe additive layer: does not replace Supabase, order creation, RLS, media storage,
   existing service workers, or payment flow.

   Target live provider: Firebase Realtime Database + FCM.
   Provider configuration is intentionally external; no credentials are embedded here.

   Event envelope:
   {
     event_id, event_type, entity_type, entity_id,
     outlet_id, audience, occurred_at, payload
   }

   Rules:
   - event_id is the idempotency key.
   - consumers receive each event at most once per browser/app session.
   - provider delivery is transport; Supabase remains source of truth until migration is
     explicitly verified.
*/
(function(){
  'use strict';
  if(window.JPTLiveBridge) return;

  const SEEN_KEY='jpt_live_seen_v1';
  const MAX_SEEN=500;

  function readSeen(){
    try{return JSON.parse(sessionStorage.getItem(SEEN_KEY)||'[]')}catch(e){return []}
  }
  function remember(id){
    if(!id)return;
    const a=readSeen();
    if(a.indexOf(id)>=0)return false;
    a.push(id);
    while(a.length>MAX_SEEN)a.shift();
    try{sessionStorage.setItem(SEEN_KEY,JSON.stringify(a))}catch(e){}
    return true;
  }

  function normalize(raw){
    const x=raw||{};
    const p=x.payload&&typeof x.payload==='object'?x.payload:{};
    return {
      event_id:String(x.event_id||x.id||p.event_id||''),
      event_type:String(x.event_type||x.type||p.event_type||''),
      entity_type:String(x.entity_type||p.entity_type||''),
      entity_id:String(x.entity_id||x.order_id||p.entity_id||p.order_id||''),
      outlet_id:String(x.outlet_id||p.outlet_id||''),
      audience:String(x.audience||p.audience||''),
      occurred_at:x.occurred_at||x.created_at||p.occurred_at||new Date().toISOString(),
      payload:p
    };
  }

  function emit(raw,source){
    const e=normalize(raw);
    if(!e.event_id || !e.event_type)return {ok:false,reason:'invalid_event'};
    if(!remember(e.event_id))return {ok:false,reason:'duplicate'};
    e.source=source||'unknown';
    window.dispatchEvent(new CustomEvent('jpt:live-event',{detail:e}));
    return {ok:true,event:e};
  }

  /*
   * Location event contract.
   * GPS coordinates are event payload data, not secrets. Consumers must still
   * enforce role/outlet/order authorization server-side. Location sharing is
   * delivery-scoped: start after assignment acceptance/pickup, stop on delivered
   * or cancelled. The bridge transports location events; it does not invent GPS.
   *
   * Canonical event types:
   *   delivery.assignment.accepted
   *   delivery.location.updated
   *   delivery.status.updated
   *   delivery.location.stopped
   *
   * A location update should contain:
   *   {lat,lng,accuracy_m,heading,speed_mps,recorded_at,assignment_id,order_id}
   *
   * Provider adapter hook.
   * A deployed Firebase bridge can call JPTLiveBridge.receive(snapshot.val(),'firebase-rtdb').
   * No Firebase credentials or privileged send keys belong in client source.
   */
  function receive(raw,source){return emit(raw,source)}

  function config(){
    const c=window.JPT_LIVE_CONFIG;
    return c&&typeof c==='object'?c:{};
  }

  window.JPTLiveBridge={
    version:'1.0.0',
    receive,
    normalize,
    config,
    on:function(fn){
      const h=e=>{try{fn(e.detail)}catch(err){}};
      window.addEventListener('jpt:live-event',h);
      return function(){window.removeEventListener('jpt:live-event',h)};
    },
    capabilities:{
      orders:true,
      notifications:true,
      ringtones:true,
      campaigns:true,
      banners:true,
      images:true,
      videos:true,
      tracking:true,
      location:true,
      rider_location:true,
      restaurant_location:true,
      customer_location:true,
      outlets:true
    }
  };
})();