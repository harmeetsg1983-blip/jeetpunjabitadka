/* JPT PRIVATE LIVE CONSUMER V1
   Additive Partner private-Broadcast consumer.
   Supabase remains source of truth; existing realtime/polling stays intact.
*/
(function(){
  'use strict';
  if(window.JPTPrivateLiveConsumer) return;
  var channel=null, boundTopic='', timer=null;

  function sb(){ return window.sb || null; }
  function outlet(){
    var el=document.getElementById('outletSelect');
    return el && String(el.value||'').trim();
  }
  function dispatch(ev){
    try{
      if(window.JPTLiveBridge && window.JPTLiveBridge.receive){
        window.JPTLiveBridge.receive({
          event_id:String(ev.event_id||ev.id||Date.now()),
          event_type:String(ev.event_type||ev.type||'live.broadcast'),
          entity_type:String(ev.entity_type||'unknown'),
          entity_id:String(ev.entity_id||''),
          outlet_id:String(ev.outlet_id||outlet()),
          audience:'partner',
          occurred_at:ev.occurred_at||new Date().toISOString(),
          payload:ev.payload||ev
        },'supabase-private-broadcast');
      }
    }catch(e){}
    try{
      if(typeof window.loadOrders==='function') window.loadOrders();
      else if(typeof window.reloadAll==='function') window.reloadAll();
    }catch(e){}
  }
  async function subscribe(){
    var client=sb(), code=outlet();
    if(!client || !code) return false;
    var topic='jpt:partner:outlet:'+code;
    if(topic===boundTopic && channel) return true;
    if(channel){try{await client.removeChannel(channel)}catch(e){} channel=null;}
    boundTopic=topic;
    channel=client.channel(topic,{config:{private:true}})
      .on('broadcast',{event:'order_insert'},function(p){dispatch(p.payload||p)})
      .on('broadcast',{event:'order_update'},function(p){dispatch(p.payload||p)})
      .on('broadcast',{event:'INSERT'},function(p){dispatch(p.payload||p)})
      .on('broadcast',{event:'UPDATE'},function(p){dispatch(p.payload||p)})
      .subscribe(function(status){ if(status==='CHANNEL_ERROR'||status==='TIMED_OUT') boundTopic=''; });
    return true;
  }
  function start(){
    if(timer) return;
    subscribe();
    timer=setInterval(subscribe,3000);
  }
  window.JPTPrivateLiveConsumer={version:'1.0.0',subscribe:start,stop:function(){
    if(timer){clearInterval(timer);timer=null;}
    var c=sb();if(c&&channel){c.removeChannel(channel).catch(function(){});}
    channel=null;boundTopic='';
  }};
  window.addEventListener('jpt:live-event',function(ev){
    var e=ev&&ev.detail||{};
    if(e.event_type==='order_INSERT'||e.event_type==='order_UPDATE'){}
  });
  function boot(){
    if(window.sb) start();
    else setTimeout(boot,500);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
