/* JPT — UNIFIED PARTNER ORDER RUNTIME
   One owner for partner order realtime, rendering, actions, timer and ringtone.
   Customer app untouched. Supabase remains source of truth.
*/
(function(){
'use strict';

if(window.__JPT_UNIFIED_ORDER_RUNTIME__) return;
window.__JPT_UNIFIED_ORDER_RUNTIME__=true;
window.__JPTOrdersV3Active=true;

const LIVE_STATUSES=new Set(['new','accepted','preparing','ready','out_for_delivery']);
const rows=new Map();
let channel=null;
let audio=null;
let activeRingtoneOrderId=null;
let audioGeneration=0;
let timerHandle=null;
let selectedQueue='all';
let managedSignature='';
const outletSelect=document.getElementById('outletSelect');
/* MULTI-OUTLET CORE FREEZE CONTRACT:
   - outletDisplayName() resolves names only from authorized partner outlet data.
   - every managed outlet gets its own INSERT/UPDATE realtime subscription.
   - every NEW order enters the same ringtone owner regardless of outlet.
   - no customer/order transition logic is changed here.
*/

async function primeOrderAudio(){
  try{
    if(!audio){
      audio=new Audio('./ringtones/1000449570.mp4');
      audio.preload='auto';
      audio.loop=true;
      audio.playsInline=true;
      audio.volume=1;
    }
    audio.muted=true;
    audio.currentTime=0;
    const p=audio.play();
    if(p?.then) await p.catch(()=>{});
    try{audio.pause();audio.currentTime=0;}catch(e){}
    audio.muted=false;
    if(window.AudioContext||window.webkitAudioContext){
      const C=window.AudioContext||window.webkitAudioContext;
      const ctx=window.__JPT_AUDIO_CTX__||new C();
      window.__JPT_AUDIO_CTX__=ctx;
      if(ctx.state==='suspended') await ctx.resume();
    }
    window.__JPT_ORDER_AUDIO_PRIMED__=true;
    return true;
  }catch(e){
    window.__JPT_ORDER_AUDIO_PRIMED__=false;
    return false;
  }
}
async function enableBackgroundAlerts(){
  try{
    if('Notification' in window && Notification.permission==='default') await Notification.requestPermission();
  }catch(e){}
  const primed=await primeOrderAudio();
  toast(primed
    ? 'Order sound enabled. New orders will ring automatically while this dashboard is open.'
    : 'Order sound could not be enabled. Check phone media volume and browser sound permission.');
}
function bindOrderAudioGesture(){
  if(window.__JPT_ORDER_AUDIO_GESTURE_BOUND__) return;
  window.__JPT_ORDER_AUDIO_GESTURE_BOUND__=true;
  const prime=()=>{ if(!window.__JPT_ORDER_AUDIO_PRIMED__) primeOrderAudio().catch(()=>{}); };
  ['pointerdown','touchstart','click'].forEach(ev=>document.addEventListener(ev,prime,{passive:true,capture:true}));
}
function outlet(){
  return String(localStorage.getItem('jpt_admin_outlet')||outletSelect?.value||'JPT-001');
}
function outletDisplayName(id){
  const key=String(id||'');
  const list=window.JPTPartnerAccess?.getOutlets?.()||window.JPT_PARTNER_OUTLETS||[];
  const hit=list.find(x=>String(x?.outlet_id||x?.code||x?.id||'')===key);
  const name=String(hit?.outlet_name||hit?.name||'');
  return name ? name+' ('+key+')' : (key||'—');
}
function managedOutlets(){
  const list=window.JPTPartnerAccess?.getOutlets?.()||window.JPT_PARTNER_OUTLETS||[];
  const codes=list.map(x=>String(x?.outlet_id||x?.code||x?.id||'')).filter(Boolean);
  const current=outlet();
  return [...new Set(codes.length?codes:[current])];
}
function orderBelongsToManagedOutlet(o){ return managedOutlets().includes(String(o?.outlet_id||'')); }
function esc(v){
  return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});}
function status(v){
  const s=String(v||'new').toLowerCase().trim();
  return s==='received'?'new':s==='canceled'?'cancelled':s;
}
function items(x){
  let a=x?.items;
  if(typeof a==='string'){try{a=JSON.parse(a)}catch(e){a=[]}}
  return Array.isArray(a)?a:[];
}
function toast(msg){
  try{window.toast?.(msg)}catch(e){}
  const n=document.getElementById('ordersNotice');
  if(n)n.textContent=String(msg||'');
}
function stopRingtone(){
  const id=activeRingtoneOrderId||'';
  try{window.AndroidOrderAlarm?.stopAlarm?.(id)}catch(e){}
  /* ONLY ACCEPT/REJECT call this function. */
  audioGeneration++;
  activeRingtoneOrderId=null;
  if(audio){
    try{
      audio.pause();
      audio.currentTime=0;
    }catch(e){}
  }
}
function handleNewIncomingOrder(orderData){
  console.log("New order received in background/open state:", orderData?.id);
  startRingtone(orderData);
}

function startRingtone(order){
  const id=String(order?.id||'');
  if(!id || status(order?.status)!=='new') return;
  if(activeRingtoneOrderId===id && audio) return;

  audioGeneration++;
  const generation=audioGeneration;
  activeRingtoneOrderId=id;

  if(!audio){
    audio=new Audio('./ringtones/1000449570.mp4');
    audio.preload='auto';
    audio.loop=true;
    audio.playsInline=true;
    audio.volume=1;
  }

  /* Keep ONE reusable audio owner. Never create a second ringtone system. */
  audio.loop=true;
  audio.playsInline=true;
  audio.muted=false;

  /* Jamini minimum-merge: keep the existing audio/path/instance.
     Visible dashboard -> existing HTML audio.
     Background/hidden WebView -> existing native Android alarm bridge. */
  if(document.visibilityState!=='visible'){
    try{
      if(window.AndroidOrderAlarm && typeof window.AndroidOrderAlarm.startAlarm==='function'){
        window.AndroidOrderAlarm.startAlarm(
          String(order?.id||''),
          String(order?.outlet_id||''),
          String(order?.order_no||order?.id||'')
        );
        return;
      }
    }catch(e){}
  }

  try{
    audio.pause();
    audio.currentTime=0;
    audio.load();
    const playResult=audio.play();

    if(playResult?.catch){
      playResult.catch(()=>{
        if(generation===audioGeneration){
          const msg=document.getElementById('ordersNotice');
          if(msg)msg.textContent='NEW ORDER received — browser audio could not start. Use the native alarm/notification path or tap the dashboard.';
        }
      });
    }
  }catch(e){
    if(generation===audioGeneration){
      const msg=document.getElementById('ordersNotice');
      if(msg)msg.textContent='NEW ORDER received — ringtone playback failed: '+(e?.message||e);
    }
  }

  try{
    if('Notification' in window && Notification.permission==='granted'){
      new Notification('NEW JPT ORDER',{
        body:'Order #'+String(order.order_no||order.id)+' received. Open Partner Dashboard to accept or reject.',
        tag:'jpt-order-'+id,
        renotify:true
      });
    }
  }catch(e){}
}
function localDeadline(minutes){
  return new Date(Date.now()+Number(minutes)*60000).toISOString();
}
function remaining(deadline){
  const ms=Math.max(0,new Date(deadline||0).getTime()-Date.now());
  const s=Math.floor(ms/1000);
  return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
}
if(!document.getElementById('jptUnifiedPartnerOrderStyle')){
  const st=document.createElement('style');st.id='jptUnifiedPartnerOrderStyle';
  st.textContent='.jpt-ready-countdown{display:inline-flex;align-items:center;justify-content:center;min-width:150px;margin:4px 0;padding:12px 16px;border-radius:12px;background:#111;color:#f4d77a;font-size:18px;font-weight:900;letter-spacing:.2px;box-shadow:0 3px 10px #0002}.jpt-rider-box{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px;padding:8px;border:1px solid #eee;border-radius:10px;background:#fff}.jpt-rider-box .btn{display:inline-flex;text-decoration:none;align-items:center;justify-content:center}';
  document.head.appendChild(st);
}
function riderInfo(o){
  const name=o?.rider_name||o?.delivery_partner_name||o?.delivery_executive_name||o?.rider?.name||o?.delivery_partner?.name||'';
  const phone=o?.rider_phone||o?.delivery_partner_phone||o?.delivery_executive_phone||o?.rider?.phone||o?.delivery_partner?.phone||'';
  if(!name&&!phone)return '';
  const safePhone=String(phone||'').replace(/[^0-9+]/g,'');
  return '<div class="jpt-rider-box"><div><b>Rider</b><div class="muted">'+esc(name||'Assigned rider')+'</div></div>'+
    (safePhone?'<a class="btn green" href="tel:'+esc(safePhone)+'">CALL</a>':'')+'</div>';
}
function actionHtml(o){
  const st=status(o.status),id=esc(o.id);
  if(st==='new'){
    const m=Math.max(15,Math.min(40,Number(o.__draftMinutes||o.target_minutes||15)));
    return '<div class="jpt-unified-actions" data-id="'+id+'">'+
      '<button type="button" class="btn" data-minus="'+id+'" aria-label="Decrease preparation time">LESS 1 MIN</button>'+
      '<b class="jpt-unified-minutes" aria-label="Preparation time">'+m+' MIN</b>'+
      '<button type="button" class="btn" data-plus="'+id+'" aria-label="Increase preparation time">ADD 1 MIN</button>'+
      '<button type="button" class="btn gold" data-accept="'+id+'">ACCEPT ORDER</button>'+
      '<button type="button" class="btn red" data-reject="'+id+'">REJECT ORDER</button></div>';
  }
  if(st==='accepted'||st==='preparing')
    return '<button class="btn gold" data-ready="'+id+'">MARK READY</button>';
  if(st==='ready')
    return '<button class="btn gold" data-delivery="'+id+'">OUT FOR DELIVERY</button>';
  if(st==='out_for_delivery')
    return '<button class="btn green" data-delivered="'+id+'">DELIVERED</button>';
  return '';
}
function render(){
  const body=document.getElementById('ordersBody');
  if(!body)return;
  const all=[...rows.values()].filter(orderBelongsToManagedOutlet).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  const filtered=selectedQueue==='all'?all:all.filter(o=>status(o.status)===selectedQueue);
  body.innerHTML=filtered.map(o=>{
    const st=status(o.status);
    const target=Math.max(15,Math.min(40,Number(o.target_minutes||o.__draftMinutes||15)));
    const deadline=o.deadline_at||o.__localDeadline;
    const timer=st==='accepted'||st==='preparing'?remaining(deadline):'—';
    const timerButton=(st==='accepted'||st==='preparing')?
      '<div class="jpt-ready-countdown" data-timer="'+esc(o.id)+'">ORDER READY ('+timer+')</div>':'';
    const rider=riderInfo(o);
    const its=items(o);
    const newClass=st==='new'&&o.__liveNew?' jpt-new-order':'';
    const itemHtml=its.length?its.map(i=>
      '<div class="jpt-item-line"><span>'+esc(i.name||i.item_name||'Item')+'</span><b>× '+Number(i.qty??i.quantity??1)+'</b></div>'
    ).join(''):'<div class="muted">No item details available</div>';
    const action=actionHtml(o)
      .replace(/>\s*<\/button>/g,'>ACTION</button>')
      .replace(/>\s*<\/b>/g,'>TIME</b>');
    return '<article class="jpt-order-card'+newClass+'" data-order-card="'+esc(o.id)+'">'+
      '<div class="jpt-order-head"><div><div class="jpt-label">ORDER ID</div><div class="jpt-order-id">#'+esc(o.order_no||o.id)+'</div></div>'+
      '<span class="tag jpt-status">'+esc(st.replaceAll('_',' ').toUpperCase())+'</span></div>'+
      '<div class="muted" style="margin:6px 0;font-weight:800">OUTLET: '+esc(outletDisplayName(o.outlet_id))+'</div>'+
      '<div class="jpt-customer"><div class="jpt-label">CUSTOMER</div><div class="jpt-customer-name">'+esc(o.customer_name||'Customer')+'</div>'+
      (o.customer_phone?'<div class="muted">'+esc(o.customer_phone)+'</div>':'')+'</div>'+
      '<div class="jpt-items"><div class="jpt-label">ITEMS</div>'+itemHtml+'</div>'+
      '<div class="jpt-order-meta"><div><span class="jpt-label">ORDER VALUE</span><b>'+money(o.total??o.grand_total??0)+'</b></div>'+
      '<div><span class="jpt-label">ORDER TIME</span><span>'+esc(o.created_at?new Date(o.created_at).toLocaleString('en-IN'):'—')+'</span></div></div>'+
      '<div class="jpt-prep">'+timerButton+rider+'</div>'+
      '<div class="jpt-actions"><div class="jpt-label">ACTIONS</div>'+action+'</div>'+
      '</article>';
  }).join('')||'<div class="jpt-no-orders">No orders in this queue.</div>';

  document.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>{
    const o=rows.get(String(b.dataset.minus)); if(!o)return;
    o.__draftMinutes=Math.max(15,Number(o.__draftMinutes||o.target_minutes||15)-1); render();
  });
  document.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>{
    const o=rows.get(String(b.dataset.plus)); if(!o)return;
    o.__draftMinutes=Math.min(40,Number(o.__draftMinutes||o.target_minutes||15)+1); render();
  });
  document.querySelectorAll('[data-accept]').forEach(b=>b.textContent='ACCEPT ORDER');
  document.querySelectorAll('[data-reject]').forEach(b=>b.textContent='REJECT ORDER');
  document.querySelectorAll('[data-ready]').forEach(b=>b.textContent='ORDER READY');
  document.querySelectorAll('[data-delivery]').forEach(b=>b.textContent='OUT FOR DELIVERY');
  document.querySelectorAll('[data-delivered]').forEach(b=>b.textContent='MARK DELIVERED');
  document.querySelectorAll('.jpt-rider-box .btn').forEach(b=>b.textContent='CALL RIDER');
  document.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>accept(b.dataset.accept));
  document.querySelectorAll('[data-reject]').forEach(b=>b.onclick=()=>reject(b.dataset.reject));
  document.querySelectorAll('[data-ready]').forEach(b=>b.onclick=()=>markReady(b.dataset.ready));
  document.querySelectorAll('[data-delivery]').forEach(b=>b.onclick=()=>transition(b.dataset.delivery,'out_for_delivery'));
  document.querySelectorAll('[data-delivered]').forEach(b=>b.onclick=()=>transition(b.dataset.delivered,'delivered'));
  updateCounts(all);
}
function updateCounts(all){
  const c=document.getElementById('ordersCount'); if(c)c.textContent=String(all.length);
}
async function read(id,outletId){
  const code=String(outletId||rows.get(String(id))?.outlet_id||'');
  const r=await window.sb.from('orders').select('*').eq('id',id).eq('outlet_id',code).maybeSingle();
  if(r.error)throw r.error;
  return r.data;
}
async function accept(id){
  const o=rows.get(String(id)); if(!o)return;
  const minutes=Math.max(15,Math.min(40,Number(o.__draftMinutes||o.target_minutes||15)));
  const local=localDeadline(minutes);

  /* Explicit ACCEPT click: this is the ONLY place the ringtone is stopped. */
  stopRingtone();

  o.__localDeadline=local;
  o.__optimisticStatus='accepted';
  o.status='accepted';
  o.target_minutes=minutes;
  o.deadline_at=local;
  render();

  try{
    const r=await window.sb.rpc('jpt_partner_transition_order',{
      p_order_id:Number(id),
      p_next_status:'accepted',
      p_target_minutes:minutes,
      p_rejection_reason:null
    });
    if(r.error)throw r.error;
    const server=Array.isArray(r.data)?r.data[0]:r.data;
    if(server)rows.set(String(id),Object.assign(rows.get(String(id))||{},server));
    toast('Order accepted — '+minutes+' minute preparation timer started.');
    render();
  }catch(e){
    const fresh=await read(id,o?.outlet_id).catch(()=>null);
    if(fresh)rows.set(String(id),fresh);
    render();
    toast('ACCEPT failed: '+(e.message||e));
  }
}
async function reject(id){
  /* Explicit REJECT click: this is the ONLY place the ringtone is stopped. */
  stopRingtone();
  const o=rows.get(String(id)); if(!o)return;
  try{
    const r=await window.sb.rpc('jpt_partner_transition_order',{
      p_order_id:Number(id),
      p_next_status:'cancelled',
      p_target_minutes:15,
      p_rejection_reason:'Rejected by restaurant'
    });
    if(r.error)throw r.error;
    const server=Array.isArray(r.data)?r.data[0]:r.data;
    if(server)rows.set(String(id),Object.assign(o,server));
    else o.status='cancelled';
    toast('Order rejected.');
    render();
  }catch(e){
    const fresh=await read(id,o?.outlet_id).catch(()=>null); if(fresh)rows.set(String(id),fresh);
    render(); toast('REJECT failed: '+(e.message||e));
  }
}
const markReadyInFlight=new Set();
async function markReady(id){
  const key=String(id);
  if(markReadyInFlight.has(key))return;
  const o=rows.get(key); if(!o)return;

  /* UI lock: prevent double-click/race while the server transition is in flight. */
  markReadyInFlight.add(key);
  const clicked=document.querySelector('[data-ready="'+CSS.escape(key)+'"]');
  if(clicked){
    clicked.disabled=true;
    clicked.setAttribute('aria-busy','true');
    clicked.textContent='UPDATING…';
  }

  try{
    const fresh=await read(id,o.outlet_id).catch(()=>null);
    if(fresh)Object.assign(o,fresh);
    const now=status(o.status);

    /* Idempotent success: if another listener/action already made it READY
       (or moved it beyond READY), sync server truth and do not show an error. */
    if(now==='ready'||now==='out_for_delivery'||now==='delivered'){
      rows.set(key,o);
      toast(now==='ready'?'Order marked READY.':'Order already advanced — syncing current server state.');
      render();
      return;
    }

    if(now!=='accepted'&&now!=='preparing'){
      toast('MARK READY blocked: server order is '+now.toUpperCase()+'.');
      render();
      return;
    }

    const r=await window.sb.rpc('jpt_partner_transition_order',{
      p_order_id:Number(id),
      p_next_status:'ready',
      p_target_minutes:Number(o.target_minutes||15),
      p_rejection_reason:null
    });
    if(r.error)throw r.error;

    const server=Array.isArray(r.data)?r.data[0]:r.data;
    if(server)rows.set(key,Object.assign(o,server));
    else{
      const verify=await read(id,o.outlet_id).catch(()=>null);
      if(verify)rows.set(key,verify);
    }

    toast('Order marked READY.');
    render();
    try{await window.sb.rpc('delivery_offer_next',{p_order_id:Number(id)})}catch(e){}
  }catch(e){
    const fresh=await read(id,o?.outlet_id).catch(()=>null);
    if(fresh)rows.set(key,fresh);
    render();
    toast('MARK READY failed: '+(e.message||e));
  }finally{
    markReadyInFlight.delete(key);
  }
}
async function transition(id,next){
  const o=rows.get(String(id));if(!o)return;
  try{
    const r=await window.sb.rpc('jpt_partner_transition_order',{
      p_order_id:Number(id),p_next_status:next,p_target_minutes:Number(o.target_minutes||15),p_rejection_reason:null
    });
    if(r.error)throw r.error;
    const server=Array.isArray(r.data)?r.data[0]:r.data;
    if(server)rows.set(String(id),server);
    render();
  }catch(e){toast('Order update failed: '+(e.message||e));}
}
async function initialLoad(){
  const codes=managedOutlets();
  const r=codes.length===1
    ? await window.sb.from('orders').select('*').eq('outlet_id',codes[0]).order('created_at',{ascending:false}).limit(100)
    : await window.sb.from('orders').select('*').in('outlet_id',codes).order('created_at',{ascending:false}).limit(500);
  if(r.error){toast('Orders load failed: '+r.error.message);return;}
  rows.clear();
  (r.data||[]).forEach(o=>rows.set(String(o.id),o));
  render();
}
let channels=[];
async function subscribe(){
  for(const ch of channels){try{await window.sb.removeChannel(ch)}catch(e){}}
  channels=[];
  channel=null;
  const codes=managedOutlets();
  if(!codes.length)return;
  const liveCodes=[...new Set(codes.map(String).filter(Boolean))];
  for(const code of liveCodes){
    const ch=window.sb.channel('jpt-unified-orders-'+code+'-'+Date.now());
    ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'orders',filter:'outlet_id=eq.'+code},payload=>{
      const o=payload?.new;
      if(!o || String(o.outlet_id)!==code || !liveCodes.includes(String(o.outlet_id)))return;
      rows.set(String(o.id),Object.assign({},o,{__liveNew:true}));
      render();
      if(status(o.status)==='new')startRingtone(o);
    });
    ch.on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders',filter:'outlet_id=eq.'+code},payload=>{
      const o=payload?.new;
      if(!o || String(o.outlet_id)!==code || !liveCodes.includes(String(o.outlet_id)))return;
      const old=rows.get(String(o.id))||{};
      rows.set(String(o.id),Object.assign({},old,o));
      render();
    });
    ch.subscribe((s,e)=>{
      const n=document.getElementById('ordersNotice');
      if(s==='SUBSCRIBED')n&&(n.textContent='LIVE • Supabase Realtime connected • '+code);
      if(s==='CHANNEL_ERROR'||s==='TIMED_OUT')n&&(n.textContent='Realtime reconnecting • '+code+'…');
      if(e)console.warn('[JPT Unified Orders '+code+']',s,e);
    });
    channels.push(ch);
  }
  channel=channels[0]||null;
}
function updateTimers(){
  document.querySelectorAll('[data-timer]').forEach(el=>{
    const o=rows.get(String(el.dataset.timer));if(!o)return;
    const st=status(o.status);
    if(st!=='accepted'&&st!=='preparing')return;
    el.textContent='Order Ready ('+remaining(o.deadline_at||o.__localDeadline)+')';
  });
}
function bindQueue(){
  document.querySelectorAll('.orderQueueBtn').forEach(b=>{
    b.onclick=()=>{selectedQueue=b.dataset.queue||'all';document.querySelectorAll('.orderQueueBtn').forEach(x=>x.classList.toggle('gold',x===b));render()};
  });
}
async function boot(){
  if(!window.sb){setTimeout(boot,500);return;}
  bindQueue();
  bindOrderAudioGesture();
  const refresh=document.getElementById('ordersRefresh');
  if(refresh)refresh.onclick=async()=>{await initialLoad();await subscribe()};
  if(outletSelect)outletSelect.addEventListener('change',async()=>{
    const code=String(outletSelect.value||'');
    if(code)localStorage.setItem('jpt_admin_outlet',code);
    await initialLoad();
    await subscribe();
  });
  const alarm=document.getElementById('stopAlarm');
  if(alarm)alarm.onclick=()=>{};
  const enable=document.getElementById('enableAlarm');
  if(enable)enable.onclick=enableBackgroundAlerts;
  await initialLoad();
  await subscribe();
  managedSignature=managedOutlets().join('|');
  clearInterval(window.__JPTManagedOutletSync);
  window.__JPTManagedOutletSync=setInterval(async()=>{
    const sig=managedOutlets().join('|');
    const current=outlet();
    if(sig!==managedSignature){
      managedSignature=sig;
      await initialLoad();
      await subscribe();
    }else if(!rows.size && window.JPTPartnerAccess?.getOutlets?.()?.length){
      await initialLoad();
      await subscribe();
    }
    const select=document.getElementById('outletSelect');
    if(select && select.value!==current){
      localStorage.setItem('jpt_admin_outlet',select.value);
      await initialLoad();
      await subscribe();
    }
  },1500);
  clearInterval(timerHandle);
  timerHandle=setInterval(updateTimers,1000);
}
boot();
})();