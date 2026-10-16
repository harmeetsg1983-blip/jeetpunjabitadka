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
const actionBusy=new Set();
let channel=null;
let audio=null;
let activeRingtoneOrderId=null;
const ringtoneAlertedOrderIds=new Set();
let audioGeneration=0;
let timerHandle=null;
let selectedQueue='preparing';
let managedSignature='';
let fallbackPollBusy=false;
let initialLoadSequence=0;
const outletRealtimeState={};
let lastRealtimeInsert=null;
const outletSelect=document.getElementById('outletSelect');
function updateVisibleDiagnostics(extra){
  /* Keep technical multi-outlet diagnostics in the console, not in the partner UI.
     The visible notice area is reserved for actionable errors and order feedback. */
  const n=document.getElementById('ordersNotice');
  if(n && /^JPT LIVE DIAGNOSTICS/.test(String(n.textContent||''))) n.textContent='';
  console.debug('[JPT LIVE DIAGNOSTICS]', {
    outlets: managedOutlets(),
    channels: Object.assign({}, outletRealtimeState),
    lastInsert: lastRealtimeInsert,
    event: extra || null
  });
}
/* MULTI-OUTLET CORE FREEZE CONTRACT:
   - outletDisplayName() resolves names only from authorized partner outlet data.
   - every managed outlet gets its own INSERT/UPDATE realtime subscription.
   - every NEW order enters the same ringtone owner regardless of outlet.
   - no customer/order transition logic is changed here.
*/

async function primeOrderAudio(){
  try{
    if(!audio){
      audio=new Audio('./ringtones/1000449491.mp4');
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
  const access=window.JPTPartnerAccess;
  const list=access?.getOutlets?.()||window.JPT_PARTNER_OUTLETS||[];
  const codes=list.map(x=>String(x?.outlet_id||x?.code||x?.id||'')).filter(Boolean);
  /* When the access bridge exists, only its authorized list is trusted.
     An empty list is a loading/error state, never permission to use JPT-001. */
  if(access && typeof access.getOutlets==='function')return [...new Set(codes)];
  const current=outlet();
  return [...new Set(codes.length?codes:[current])];
}
async function resolveManagedOutlets(){
  let codes=managedOutlets();
  if(codes.length)return codes;
  const access=window.JPTPartnerAccess;
  if(access && typeof access.reload==='function'){
    try{ await access.reload(); }catch(e){
      console.warn('[JPT Orders] outlet access reload failed',e);
    }
    codes=managedOutlets();
  }
  /* Give the bridge a short opportunity to finish if it was initialized late. */
  for(let i=0;!codes.length&&i<4;i++){
    await new Promise(resolve=>setTimeout(resolve,250));
    codes=managedOutlets();
  }
  return [...new Set(codes.map(String).filter(Boolean))];
}
function orderBelongsToManagedOutlet(o){ return managedOutlets().includes(String(o?.outlet_id||'')); }
function shouldShowOnBoard(o){
  /* Do not use a rollout timestamp to hide active orders: an older order may
     still genuinely be in progress. Queue membership follows persisted status.
     Completed/cancelled orders remain available in History. */
  return ['new','accepted','preparing','ready','out_for_delivery','delivered','cancelled']
    .includes(status(o?.status));
}
function esc(v){
  return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});}
function status(v){
  const s=String(v||'new').toLowerCase().trim();
  return s==='received'?'new':s==='canceled'?'cancelled':s;
}
/* Server keeps ACCEPTED as the persisted transition; the dashboard places that
   order in PREPARING while its server-backed countdown is running. */
function boardStatus(o){
  const st=status(o?.status);
  return st==='accepted'?'preparing':st;
}
function queueForStatus(value){
  const st=status(value);
  if(['new','accepted','preparing'].includes(st))return 'preparing';
  if(st==='ready')return 'ready';
  if(st==='out_for_delivery')return 'out_for_delivery';
  if(['delivered','cancelled'].includes(st))return 'history';
  return null;
}
/* Order lifecycle is monotonic: delayed Realtime/SELECT responses must not
   move a completed order back into NEW/ACCEPTED queues. */
function lifecycleRank(v){
  return ({new:0,accepted:1,preparing:2,ready:3,out_for_delivery:4,delivered:5,cancelled:6})[status(v)]??-1;
}
function mergeOrderMonotonic(oldRow,incoming){
  const merged=Object.assign({},oldRow||{},incoming||{});
  const oldStatus=status(oldRow?.status), nextStatus=status(incoming?.status);
  if(oldRow?.status && lifecycleRank(oldStatus)>lifecycleRank(nextStatus)){
    merged.status=oldRow.status;
  }
  return merged;
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
  /* One audible alert per order ID per dashboard session. Replayed INSERT/Broadcast
     events or a refresh after an unsuccessful action must not restart an old alarm. */
  if(ringtoneAlertedOrderIds.has(id)) return;
  ringtoneAlertedOrderIds.add(id);

  audioGeneration++;
  const generation=audioGeneration;
  activeRingtoneOrderId=id;

  if(!audio){
    audio=new Audio('./ringtones/1000449491.mp4');
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
          /* Playback was rejected: allow a later user gesture or retry to attempt this order again. */
          ringtoneAlertedOrderIds.delete(id);
          if(activeRingtoneOrderId===id)activeRingtoneOrderId=null;
          const msg=document.getElementById('ordersNotice');
          if(msg)msg.textContent='NEW ORDER received — sound was blocked by the browser. Tap ENABLE SOUND and keep the dashboard open.';
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
  st.textContent='.jpt-history-date{margin:18px 0 8px;padding:9px 12px;border-radius:10px;background:#171717;color:#f4d77a;font-weight:900;letter-spacing:.2px}.jpt-ready-countdown{display:inline-flex;align-items:center;justify-content:center;min-width:150px;margin:4px 0;padding:12px 16px;border-radius:12px;background:#111;color:#f4d77a;font-size:18px;font-weight:900;letter-spacing:.2px;box-shadow:0 3px 10px #0002}.jpt-rider-box{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px;padding:8px;border:1px solid #eee;border-radius:10px;background:#fff}.jpt-rider-box .btn{display:inline-flex;text-decoration:none;align-items:center;justify-content:center}';
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
  if(st==='accepted'||st==='preparing'){
    /* Keep countdown visible while allowing an early ready action when food is ready. */
    return '<button class="btn gold" data-ready="'+id+'">MARK READY</button>';
  }
  if(st==='ready')
    return '<button class="btn gold" data-delivery="'+id+'">OUT FOR DELIVERY</button>';
  if(st==='out_for_delivery')
    return '<button class="btn green" data-delivered="'+id+'">DELIVERED</button>';
  return '';
}
function render(){
  const body=document.getElementById('ordersBody');
  if(!body)return;
  const all=[...rows.values()].filter(o=>orderBelongsToManagedOutlet(o)&&shouldShowOnBoard(o))
    .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  /* ALL is the active workboard only. Completed/cancelled records belong in history tabs
     and must never return to ALL or trigger active-order actions. */
  /* Four operator-facing queues: all NEW/ACCEPTED/PREPARING orders stay in
     Preparing; terminal delivered/cancelled orders are kept in History. */
  const filtered=selectedQueue==='history'
    ? all.filter(o=>['delivered','cancelled'].includes(status(o.status)))
    : all.filter(o=>queueForStatus(o.status)===selectedQueue);
  /* TEMP JPT diagnostics: report only recent NEW orders; no customer PII. */
  const diagCutoff=Date.now()-24*60*60*1000;
  const recentNew=[...rows.values()].filter(o=>status(o.status)==='new'&&new Date(o.created_at||0).getTime()>=diagCutoff);
  if(recentNew.length)console.info('[JPT-DIAG][render]',{
    selectedQueue,
    recentNew:recentNew.map(o=>({id:String(o.id),order_no:o.order_no,outlet_id:o.outlet_id,status:status(o.status),
      managed:orderBelongsToManagedOutlet(o),showOnBoard:shouldShowOnBoard(o),
      inAll:all.some(x=>String(x.id)===String(o.id)),inFiltered:filtered.some(x=>String(x.id)===String(o.id))})),
    rowIds:[...rows.keys()]
  });
  body.innerHTML=filtered.map((o,index)=>{
    const st=status(o.status);
    const currentDay=new Date(o.created_at||0);
    const previousDay=index>0?new Date(filtered[index-1].created_at||0):null;
    const dayHeader=selectedQueue==='history' && (!previousDay || currentDay.toDateString()!==previousDay.toDateString())
      ? '<h3 class="jpt-history-date">'+esc(currentDay.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}))+'</h3>' : '';
    const target=Math.max(15,Math.min(40,Number(o.target_minutes||o.__draftMinutes||15)));
    const deadline=o.deadline_at||o.__localDeadline;
    const timer=st==='accepted'||st==='preparing'?remaining(deadline):'—';
    const timerButton=(st==='accepted'||st==='preparing')?
      '<div class="jpt-ready-countdown" data-timer="'+esc(o.id)+'">ORDER READY ('+timer+')</div>':'';
    const rider=riderInfo(o);
    const its=items(o);
    const newClass=st==='new'&&o.__liveNew?' jpt-new-order':'';
    const paymentMethod=String(o.payment||o.payment_method||'').toUpperCase();
    const paymentUnverified=paymentMethod==='UPI' && o.payment_verified!==true;
    const paymentHtml='<div class="jpt-order-meta"><div><span class="jpt-label">PAYMENT</span><b>'+esc(paymentMethod||'—')+'</b></div><div><span class="jpt-label">PAYMENT STATUS</span><b>'+esc(paymentUnverified?'NOT VERIFIED':(o.payment_verified===true?'VERIFIED':(paymentMethod==='COD'?'PAY ON DELIVERY':'—')) )+'</b></div></div>'+
      (paymentUnverified?'<div class="muted" style="margin:8px 0;padding:10px;border:1px solid #9a6b24;border-radius:8px;color:#f3ce75">UPI payment is not verified. This order cannot be accepted or marked ready until payment confirmation is received.</div>':'');
    const itemHtml=its.length?its.map(i=>
      '<div class="jpt-item-line"><span>'+esc(i.name||i.item_name||'Item')+'</span><b>× '+Number(i.qty??i.quantity??1)+'</b></div>'
    ).join(''):'<div class="muted">No item details available</div>';
    const action=actionHtml(o);
    return dayHeader+'<article class="jpt-order-card'+newClass+'" data-order-card="'+esc(o.id)+'">'+
      '<div class="jpt-order-head"><div><div class="jpt-label">ORDER ID</div><div class="jpt-order-id">#'+esc(o.order_no||o.id)+'</div></div>'+
      '<span class="tag jpt-status">'+esc(boardStatus(o).replaceAll('_',' ').toUpperCase())+'</span></div>'+
      '<div class="muted" style="margin:6px 0;font-weight:800">OUTLET: '+esc(outletDisplayName(o.outlet_id))+'</div>'+
      '<div class="jpt-customer"><div class="jpt-label">CUSTOMER</div><div class="jpt-customer-name">'+esc(o.customer_name||'Customer')+'</div>'+
      (o.customer_phone?'<div class="muted">'+esc(o.customer_phone)+'</div>':'')+'</div>'+
      '<div class="jpt-items"><div class="jpt-label">ITEMS</div>'+itemHtml+'</div>'+
      '<div class="jpt-order-meta"><div><span class="jpt-label">ORDER VALUE</span><b>'+money(o.total??o.grand_total??0)+'</b></div>'+
      '<div><span class="jpt-label">ORDER TIME</span><span>'+esc(o.created_at?new Date(o.created_at).toLocaleString('en-IN'):'—')+'</span></div></div>'+
      paymentHtml+'<div class="jpt-prep">'+timerButton+rider+'</div>'+
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
  document.querySelectorAll('[data-ready]').forEach(b=>b.textContent='MARK READY');
  document.querySelectorAll('[data-delivery]').forEach(b=>b.textContent='OUT FOR DELIVERY');
  document.querySelectorAll('[data-delivered]').forEach(b=>b.textContent='MARK DELIVERED');
  document.querySelectorAll('[data-accept],[data-ready],[data-delivery],[data-delivered]').forEach(b=>{
    const key=String(b.dataset.accept||b.dataset.ready||b.dataset.delivery||b.dataset.delivered||'');
    const busy=actionBusy.has(key)||transitionBusy.has(key);
    b.disabled=busy;
    b.setAttribute('aria-busy',busy?'true':'false');
    if(busy)b.textContent=actionBusy.has(key)?'ACCEPTING…':'UPDATING…';
  });
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
  const key=String(id);
  if(actionBusy.has(key))return;
  const o=rows.get(key); if(!o)return;
  /* Stop the shared ringtone immediately on ACCEPT, before any server round-trip. */
  stopRingtone();
  /* A stale NEW card must not issue ACCEPT against an already-progressed order. */
  let canonical;
  try{canonical=await read(id,o.outlet_id);}catch(e){
    toast('ACCEPT paused: server status could not be verified. Refresh Orders before retrying.');
    await initialLoad().catch(()=>{});render();return;
  }
  if(!canonical){
    rows.delete(key);
    if(activeRingtoneOrderId===key)stopRingtone();
    await initialLoad().catch(()=>{});
    toast('Order is no longer in the live server queue; stale card removed.');
    render();return;
  }
  if(status(canonical.status)!=='new'){
    rows.set(key,mergeOrderMonotonic(o,canonical));
    if(activeRingtoneOrderId===key)stopRingtone();
    focusQueueForStatus(canonical.status);
    toast('Server confirms '+status(canonical.status).toUpperCase()+'. Duplicate ACCEPT blocked.');
    render();return;
  }
  rows.set(key,Object.assign({},o,canonical));
  actionBusy.add(key);
  const minutes=Math.max(15,Math.min(40,Number(o.__draftMinutes||o.target_minutes||15)));
  const local=localDeadline(minutes);
  const previous={status:o.status,target_minutes:o.target_minutes,deadline_at:o.deadline_at,__localDeadline:o.__localDeadline,__optimisticStatus:o.__optimisticStatus};
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
    if(!server)throw new Error('Server returned no order record; status was not confirmed.');
    rows.set(key,Object.assign(o,server));
    focusQueueForStatus(rows.get(key)?.status||'accepted');
    toast('Order accepted — '+minutes+' minute preparation timer started.');
    render();
  }catch(e){
    const message=String(e?.message||e);
    const serverStatus=message.match(/Current status:\s*([A-Z_]+)/i)?.[1]?.toLowerCase();
    /* The RPC's explicit Current status is authoritative. A follow-up SELECT can
       briefly return stale data; do not let it overwrite the server's conflict state. */
    if(serverStatus && serverStatus!=='new'){
      const fresh=await read(id,o?.outlet_id).catch(()=>null);
      Object.assign(o,fresh||{},{status:serverStatus});
      delete o.__optimisticStatus;
      if(serverStatus!=='accepted'){
        if(previous.__localDeadline===undefined)delete o.__localDeadline;
        else o.__localDeadline=previous.__localDeadline;
      }
      rows.set(key,o);
      focusQueueForStatus(serverStatus);
      toast('Server status synced: '+serverStatus.toUpperCase()+'. No duplicate action sent.');
    }else{
      let fresh=await read(id,o?.outlet_id).catch(()=>null);
      /* A state-conflict response means the displayed card may be stale. Requery the
         authoritative queue before restoring NEW or leaving the old action buttons. */
      if(!fresh && /order is not new|current status|order not found/i.test(message)){
        await initialLoad().catch(()=>{});
        fresh=rows.get(key)||null;
      }
      if(fresh){
        rows.set(key,Object.assign(o,fresh));
        const current=status(fresh.status);
        if(current!=='new'){
          focusQueueForStatus(current);
          toast('Server status synced: '+current.toUpperCase()+'. Duplicate accept stopped.');
        }else{
          Object.assign(o,previous); rows.set(key,o);
          focusQueueForStatus('new');
          toast('ACCEPT failed: '+message);
        }
      }else if(/order not found/i.test(message)){
      rows.delete(key);
      if(activeRingtoneOrderId===key)stopRingtone();
      toast('Order not present in refreshed server queue; stale UI card removed only.');
    }else{
      Object.assign(o,previous);
      if(previous.__localDeadline===undefined)delete o.__localDeadline;
      if(previous.__optimisticStatus===undefined)delete o.__optimisticStatus;
      rows.set(key,o);
      toast('ACCEPT failed: '+message);
      }
    }
    render();
  }finally{
    actionBusy.delete(key);
    render();
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
const transitionBusy=new Set();
function setActionBusyUi(key,busy,label){
  const safe=CSS.escape(String(key));
  document.querySelectorAll('[data-accept="'+safe+'"],[data-ready="'+safe+'"],[data-delivery="'+safe+'"],[data-delivered="'+safe+'"]').forEach(b=>{
    b.disabled=!!busy;
    b.setAttribute('aria-busy',busy?'true':'false');
    if(busy)b.textContent=label||'UPDATING…';
  });
}
async function lifecycleTransition(id,next){
  const key=String(id);
  if(transitionBusy.has(key)||actionBusy.has(key))return;
  const o=rows.get(key); if(!o)return;
  const before={...o};
  const allowed={
    ready:['accepted','preparing'],
    out_for_delivery:['ready'],
    delivered:['out_for_delivery']
  };
  const label={ready:'UPDATING…',out_for_delivery:'UPDATING…',delivered:'UPDATING…'}[next]||'UPDATING…';
  transitionBusy.add(key);
  setActionBusyUi(key,true,label);
  /* Optimistic state mutation makes the card/status react immediately.
     Every path below reconciles against the authoritative database row. */
  o.status=next;
  o.__optimisticStatus=next;
  rows.set(key,o);
  render();
  try{
    const fresh=await read(id,before.outlet_id).catch(()=>null);
    if(fresh){
      const serverState=status(fresh.status);
      if(serverState===next || (next==='ready'&&(serverState==='out_for_delivery'||serverState==='delivered')) ||
         (next==='out_for_delivery'&&serverState==='delivered')){
        rows.set(key,Object.assign({},o,fresh));
        toast('Order state synced: '+serverState.toUpperCase()+'.');
        render();
        return;
      }
      /* A read-after-write can briefly return the older NEW value even when the
         operator has just accepted the order. Do not block a valid UI lifecycle
         transition solely on that potentially stale SELECT; let the transition RPC
         validate the authoritative state and reconcile from its response/error. */
      const uiState=status(before.status);
      const readLooksStale=(serverState==='new' && ['accepted','preparing'].includes(uiState));
      if(!allowed[next]?.includes(serverState) && !readLooksStale){
        rows.set(key,Object.assign({},o,fresh));
        toast('Order update blocked: server status is '+serverState.toUpperCase()+'.');
        render();
        return;
      }
      if(!readLooksStale){
        rows.set(key,Object.assign({},o,fresh));
        o.status=serverState;
      }
    }else if(!allowed[next]?.includes(status(before.status))){
      Object.assign(o,before); rows.set(key,o); render();
      toast('Order update paused: current server state could not be verified.');
      return;
    }
    const r=await window.sb.rpc('jpt_partner_transition_order',{
      p_order_id:Number(id),
      p_next_status:next,
      p_target_minutes:Number(o.target_minutes||15),
      p_rejection_reason:null
    });
    if(r.error)throw r.error;
    const server=Array.isArray(r.data)?r.data[0]:r.data;
    if(server){
      rows.set(key,mergeOrderMonotonic(rows.get(key)||o,server));
    }else{
      const verify=await read(id,before.outlet_id);
      if(!verify || status(verify.status)!==next)throw new Error('Server did not confirm '+next.toUpperCase()+' status.');
      rows.set(key,Object.assign({},o,verify));
    }
    focusQueueForStatus(rows.get(key)?.status||next);
    toast('Order status updated: '+status(rows.get(key)?.status||next).toUpperCase()+'.');
    render();
    if(next==='ready'){
      try{await window.sb.rpc('delivery_offer_next',{p_order_id:Number(id)})}catch(e){}
    }
  }catch(e){
    let fresh=await read(id,before.outlet_id).catch(()=>null);
    if(!fresh && /order is not|current status|order not found/i.test(String(e?.message||e))){
      await initialLoad().catch(()=>{});
      fresh=rows.get(key)||null;
    }
    if(fresh){
      /* Reconciliation reads may briefly lag behind a confirmed transition.
         Preserve a later lifecycle state already observed by this runtime. */
      /* A direct server read resolves a failed transition. Prefer the server's
         current status here so a stale ACCEPTED card cannot survive a NEW response. */
      const prior=rows.get(key)||o;
      const reconciled=Object.assign({},prior,fresh);
      if(status(prior.status)!==status(fresh.status))delete reconciled.__optimisticStatus;
      if(prior.__draftMinutes!==undefined)reconciled.__draftMinutes=prior.__draftMinutes;
      rows.set(key,reconciled);
      focusQueueForStatus(reconciled.status);
      toast('Order state reconciled from server: '+status(reconciled.status).toUpperCase()+'. '+(String(e?.message||e)));
    }else{
      Object.assign(o,before);
      rows.set(key,o);
      toast('Order update failed; previous state restored: '+(e?.message||e));
    }
    render();
  }finally{
    transitionBusy.delete(key);
    setActionBusyUi(key,false);
    render();
  }
}
async function markReady(id){return lifecycleTransition(id,'ready')}
async function transition(id,next){return lifecycleTransition(id,next)}
async function initialLoad(options={}){
  const loadSequence=++initialLoadSequence;
  const verifyRows=options.verifyRows!==false;
  const codes=await resolveManagedOutlets();
  if(!codes.length){
    if(options.preserveOnError){
      console.warn('[JPT Orders] Fallback poll skipped: authorized outlet list temporarily unavailable; preserving current board.');
      return;
    }
    rows.clear();
    stopRingtone();
    render();
    toast('Partner outlet access is not ready. Orders were not queried under a fallback outlet. Retry login/access refresh.');
    return;
  }
  /* Active queues use a compact recent snapshot. History loads a 60-day
     date-ordered window so it is not limited to the active queue's 100/500-row cap.
     This query is read-only and does not alter order or payment records. */
  const historyMode=selectedQueue==='history';
  const historySince=new Date(Date.now()-90*24*60*60*1000).toISOString();
  let query=window.sb.from('orders').select('*');
  query=codes.length===1
    ? query.eq('outlet_id',codes[0])
    : query.in('outlet_id',codes);
  if(historyMode)query=query.gte('created_at',historySince);
  const r=await query.order('created_at',{ascending:false}).limit(historyMode?1000:(codes.length===1?100:500));
  /* Concurrent refreshes can finish out of order. Only the newest snapshot may reconcile the board. */
  if(loadSequence!==initialLoadSequence){
    console.info('[JPT Orders] Ignoring stale overlapping snapshot', {loadSequence,latestLoadSequence:initialLoadSequence});
    return;
  }
  if(r.error){
    /* Periodic safety-net polls must not blank the board or silence an alert on a transient read error. */
    if(options.preserveOnError){
      console.warn('[JPT Orders] Fallback poll read failed; preserving current board:',r.error.message);
      return;
    }
    /* An explicit/startup refresh failure must never leave old cards presented as current NEW orders. */
    rows.clear();
    stopRingtone();
    render();
    toast('Orders load failed: '+r.error.message+' — stale cards cleared; check partner session/outlet access.');
    return;
  }
  /* Server query is authoritative for the current board snapshot.
     Preserve local action drafts only where possible, but never preserve a stale
     lifecycle status over a successful fresh server response. */
  const incomingIds=new Set((r.data||[]).map(o=>String(o.id)));
  for(const [key,old] of [...rows.entries()]){
    /* A snapshot can have started before a just-arrived Realtime event.
       Do not let that older snapshot erase an order received during the query. */
    const recentlyRealtimeSeen=Number(old.__realtimeSeenAt||0)>Date.now()-30000;
    if(!incomingIds.has(key)&&!recentlyRealtimeSeen&&!actionBusy.has(key)&&!transitionBusy.has(key)){
      rows.delete(key);
      if(activeRingtoneOrderId===key)stopRingtone();
    }
  }
  (r.data||[]).forEach(o=>{
    const key=String(o.id);
    if(actionBusy.has(key)||transitionBusy.has(key))return;
    const prior=rows.get(key);
    /* SELECT results can lag a just-confirmed transition. Never regress a later
       lifecycle state already observed in this runtime from an older snapshot. */
    const merged=mergeOrderMonotonic(prior,o);
    if(prior?.__draftMinutes!==undefined)merged.__draftMinutes=prior.__draftMinutes;
    rows.set(key,merged);
  });

  /* Reconcile cards against the same server lookup used by action recovery.
     Missing/unreadable rows are hidden from this in-memory queue only.
     Never delete or update database records during reconciliation. */
  if(verifyRows){
    const checks=[...rows.entries()];
    for(let i=0;i<checks.length;i+=8){
      await Promise.all(checks.slice(i,i+8).map(async([key,o])=>{
        if(actionBusy.has(key)||transitionBusy.has(key))return;
        const live=await read(o.id,o.outlet_id).catch(()=>null);
        if(actionBusy.has(key)||transitionBusy.has(key))return;
        if(live){
          /* This is a direct SELECT by order id: its status replaces stale UI state.
             Do not retain __optimisticStatus when the server disagrees. */
          const prior=rows.get(key)||o;
          /* A lagging SELECT must not undo a later state already seen from the RPC
             or Realtime. A confirmed server transition is monotonic in this workflow. */
          const reconciled=mergeOrderMonotonic(prior,live);
          if(status(prior.status)===status(live.status))delete reconciled.__optimisticStatus;
          if(prior.__draftMinutes!==undefined)reconciled.__draftMinutes=prior.__draftMinutes;
          rows.set(key,reconciled);
        }else{
          /* The bulk outlet-scoped query already returned this order. A null or failed
             follow-up read is not proof that it disappeared; keep the bulk snapshot. */
          console.warn('[JPT Orders] Per-order verification unavailable; retaining loaded order',key);
        }
      }));
    }
  }
  render();
}
let channels=[];
async function subscribe(){
  for(const ch of channels){try{await window.sb.removeChannel(ch)}catch(e){}}
  channels=[];
  channel=null;
  const codes=await resolveManagedOutlets();
  if(!codes.length){
    const n=document.getElementById('ordersNotice');
    if(n)n.textContent='Partner outlet access is still unavailable. Re-login or refresh access; no fallback outlet was used.';
    console.warn('[JPT Orders] Realtime not started: authorized outlet list is empty.');
    return;
  }
  const liveCodes=[...new Set(codes.map(String).filter(Boolean))];
  for(const code of liveCodes){
    const ch=window.sb.channel('jpt-unified-orders-'+code+'-'+Date.now());
    ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'orders',filter:'outlet_id=eq.'+code},payload=>{
      const o=payload?.new;
      lastRealtimeInsert={id:o?.id,order_no:o?.order_no,outlet_id:o?.outlet_id,status:o?.status,receivedAt:new Date().toISOString()};
      updateVisibleDiagnostics('INSERT EVENT RECEIVED');
      console.info('[JPT-DIAG][INSERT received]',{
        channelOutlet:code,eventType:payload?.eventType,
        id:o?.id==null?null:String(o.id),order_no:o?.order_no,
        outlet_id:o?.outlet_id,status:o?.status,
        managedOutlets:managedOutlets(),
        outletMatches:!!o&&String(o.outlet_id)===code,
        outletIsSubscribed:!!o&&liveCodes.includes(String(o.outlet_id)),
        belongsToManagedOutlet:!!o&&orderBelongsToManagedOutlet(o),
        shouldShowOnBoard:!!o&&shouldShowOnBoard(o),
        rowIdsBefore:[...rows.keys()]
      });
      if(!o || String(o.outlet_id)!==code || !liveCodes.includes(String(o.outlet_id))){
        console.warn('[JPT-DIAG][INSERT rejected by outlet gate]',{channelOutlet:code,id:o?.id,outlet_id:o?.outlet_id,managedOutlets:managedOutlets()});
        return;
      }
      /* Enforce the board cutover on Realtime too; otherwise pre-cutover orders
         can reappear after initialLoad correctly hides them. */
      if(!shouldShowOnBoard(o)){
        rows.delete(String(o.id));
        if(activeRingtoneOrderId===String(o.id))stopRingtone();
        render();
        return;
      }
      const key=String(o.id);
      /* Never let a delayed INSERT payload roll an order backward or overwrite
         an action currently being committed. Replayed NEW events must not ring
         if the in-memory/server-confirmed lifecycle has already advanced. */
      if(actionBusy.has(key)||transitionBusy.has(key)){
        console.warn('[JPT-DIAG][INSERT skipped busy]',{id:key,actionBusy:actionBusy.has(key),transitionBusy:transitionBusy.has(key)});
        return;
      }
      const previous=rows.get(key);
      const merged=mergeOrderMonotonic(previous,o);
      const isNew=status(merged.status)==='new';
      rows.set(key,Object.assign({},merged,{__liveNew:isNew,__realtimeSeenAt:Date.now()}));
      console.info('[JPT-DIAG][INSERT stored]',{id:key,order_no:merged.order_no,outlet_id:merged.outlet_id,status:status(merged.status),isNew,rowIdsAfter:[...rows.keys()]});
      updateVisibleDiagnostics('STORED '+String(merged.order_no||key)+' • '+String(merged.outlet_id));
      render();
      console.info('[JPT-DIAG][INSERT rendered]',{id:key,cardExists:!!document.querySelector('[data-order-card="'+CSS.escape(key)+'"]'),queue:selectedQueue});
      if(isNew)startRingtone(merged);
    });
    ch.on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders',filter:'outlet_id=eq.'+code},payload=>{
      const o=payload?.new;
      if(!o || String(o.outlet_id)!==code || !liveCodes.includes(String(o.outlet_id)))return;
      /* Updates for historical orders must not reinsert them into the board. */
      if(!shouldShowOnBoard(o)){
        rows.delete(String(o.id));
        if(activeRingtoneOrderId===String(o.id))stopRingtone();
        render();
        return;
      }
      const old=rows.get(String(o.id))||{};
      const oldStatus=status(old.status);
      if(actionBusy.has(String(o.id))||transitionBusy.has(String(o.id)))return;
      const merged=mergeOrderMonotonic(old,o);
      const nextStatus=status(merged.status);
      rows.set(String(o.id),Object.assign({},merged,{__realtimeSeenAt:Date.now()}));
      /* A status change from another authorized session acknowledges the alert too. */
      if(activeRingtoneOrderId===String(o.id)&&nextStatus!=='new')stopRingtone();
      /* If the active queue was showing this order's prior state, follow its
         server-confirmed lifecycle state immediately instead of leaving the
         operator on a stale NEW/ACCEPTED tab. */
      if(old.id && oldStatus!==nextStatus && selectedQueue===queueForStatus(oldStatus)){
        focusQueueForStatus(nextStatus);
      }
      render();
    });
    ch.subscribe((s,e)=>{
      const n=document.getElementById('ordersNotice');
      outletRealtimeState[code]=s+(e?' / '+String(e.message||e):'');
      console.info('[JPT-DIAG][channel status]',{outlet:code,status:s,error:e||null,managedOutlets:managedOutlets()});
      updateVisibleDiagnostics('CHANNEL '+code+' '+s+(e?' • '+String(e.message||e):''));
      if(e)console.warn('[JPT Unified Orders '+code+']',s,e);
    });
    channels.push(ch);

    /* The database also emits private Realtime Broadcast events on
       jpt:partner:outlet:<outlet_id>. Keep the existing Postgres Changes
       listener above, and subscribe to the matching Broadcast topic as well.
       This closes the gap where the DB trigger sends order_insert/order_update
       but the dashboard listens only for postgres_changes. */
    const broadcastCh=window.sb.channel('jpt:partner:outlet:'+code,{config:{private:true}});
    const refreshFromBroadcast=(payload,eventName)=>{
      /* Supabase Broadcast wraps trigger data in an envelope. Depending on
         the trigger/client shape, the order may be data.record, data.payload,
         data.order, or the data object itself. Normalize only recognized order
         objects; never treat an arbitrary envelope as an order row. */
      const data=payload?.payload;
      const o=data?.record || data?.payload?.record || data?.payload?.order ||
        data?.payload || data?.order || (data?.id!=null?data:null) ||
        payload?.record || (payload?.id!=null?payload:null);
      if(!o || o.id==null || String(o.outlet_id||'')!==code || !liveCodes.includes(String(o.outlet_id))) {
        console.warn('[JPT-DIAG][broadcast payload rejected]',{outlet:code,event:eventName,hasPayload:!!payload,hasData:!!data,hasOrderId:o?.id??null,orderOutlet:o?.outlet_id??null});
        return;
      }
      lastRealtimeInsert={
        id:o.id,
        order_no:o.order_no,
        outlet_id:o.outlet_id,
        status:o.status,
        receivedAt:new Date().toISOString()
      };
      updateVisibleDiagnostics('BROADCAST '+eventName.toUpperCase()+' RECEIVED');
      console.info('[JPT-DIAG][broadcast order event]',{
        outlet:code,event:eventName,id:String(o.id),status:status(o.status)
      });
      const key=String(o.id);
      if(actionBusy.has(key)||transitionBusy.has(key))return;
      if(!shouldShowOnBoard(o)){
        rows.delete(key);
        if(activeRingtoneOrderId===key)stopRingtone();
        render();
        return;
      }
      const previous=rows.get(key);
      const oldStatus=status(previous?.status);
      const merged=mergeOrderMonotonic(previous,o);
      const nextStatus=status(merged.status);
      rows.set(key,Object.assign({},merged,{__liveNew:eventName==='order_insert'&&nextStatus==='new',__realtimeSeenAt:Date.now()}));
      /* Broadcast updates from another authorized session also acknowledge the alert. */
      if(eventName==='order_update'&&activeRingtoneOrderId===key&&nextStatus!=='new')stopRingtone();
      if(eventName==='order_update' && previous?.id && oldStatus!==nextStatus && selectedQueue===queueForStatus(oldStatus)){
        focusQueueForStatus(nextStatus);
      }
      render();
      console.info('[JPT-DIAG][broadcast order rendered]',{
        id:key,status:nextStatus,cardExists:!!document.querySelector('[data-order-card="'+CSS.escape(key)+'"]'),queue:selectedQueue
      });
      if(eventName==='order_insert'&&nextStatus==='new')startRingtone(merged);
    };
    broadcastCh.on('broadcast',{event:'order_insert'},payload=>refreshFromBroadcast(payload,'order_insert'));
    broadcastCh.on('broadcast',{event:'order_update'},payload=>refreshFromBroadcast(payload,'order_update'));
    broadcastCh.subscribe((s,e)=>{
      console.info('[JPT-DIAG][broadcast channel status]',{outlet:code,status:s,error:e||null});
      if(e)updateVisibleDiagnostics('BROADCAST '+code+' '+s+' • '+String(e.message||e));
    });
    channels.push(broadcastCh);
  }
  channel=channels[0]||null;
}
function updateTimers(){
  let shouldRender=false;
  document.querySelectorAll('[data-timer]').forEach(el=>{
    const o=rows.get(String(el.dataset.timer));if(!o)return;
    const st=status(o.status);
    if(st!=='accepted'&&st!=='preparing')return;
    const deadline=o.deadline_at||o.__localDeadline;
    el.textContent='Order Ready ('+remaining(deadline)+')';
    if(deadline && new Date(deadline).getTime()<=Date.now() && el.dataset.readyEnabled!=='1'){
      el.dataset.readyEnabled='1';shouldRender=true;
    }
  });
  if(shouldRender)render();
}
function focusQueueForStatus(value){
  const target=queueForStatus(value);
  if(!target)return;
  const btn=[...document.querySelectorAll('.orderQueueBtn')].find(b=>String(b.dataset.queue||'')===target);
  if(!btn)return;
  selectedQueue=target;
  document.querySelectorAll('.orderQueueBtn').forEach(x=>{x.classList.toggle('gold',x===btn);x.classList.toggle('is-active',x===btn);x.setAttribute('aria-selected',x===btn?'true':'false')});
}
function bindQueue(){
  document.querySelectorAll('.orderQueueBtn').forEach(b=>{
    b.onclick=async()=>{
      selectedQueue=b.dataset.queue||'all';
      document.querySelectorAll('.orderQueueBtn').forEach(x=>{x.classList.toggle('gold',x===b);x.classList.toggle('is-active',x===b);x.setAttribute('aria-selected',x===b?'true':'false')});
      /* Always reconcile queue cards against Supabase before rendering. */
      try{ await initialLoad(); await subscribe(); }
      catch(e){ console.error('[JPT queue refresh]',e); toast('Queue refresh failed. Please use Refresh Orders before taking another action.'); }
      render();
    };
  });
}
let runtimeStarted=false,runtimeStartBusy=false;
async function startAuthenticatedRuntime(){
  if(runtimeStarted||runtimeStartBusy||!window.sb?.auth)return;
  runtimeStartBusy=true;
  try{
    const sessionResult=await window.sb.auth.getSession();
    if(sessionResult.error)throw sessionResult.error;
    if(!sessionResult.data?.session?.user){
      const n=document.getElementById('ordersNotice');
      if(n)n.textContent='Partner login required before orders can be loaded.';
      return;
    }
    /* Access mapping must be ready before outlet-scoped orders queries start. */
    if(window.JPTPartnerAccess?.reload)await window.JPTPartnerAccess.reload();
    const authorized=await resolveManagedOutlets();
    console.info('[JPT-DIAG][authorized outlets ready]',{count:authorized.length,outlets:authorized});
    updateVisibleDiagnostics('AUTHORIZED OUTLETS READY');
    await initialLoad();
    await subscribe();
    runtimeStarted=true;
    managedSignature=managedOutlets().join('|');
  }catch(e){
    console.error('[JPT Orders] authenticated startup failed',e);
    const n=document.getElementById('ordersNotice');
    if(n)n.textContent='Orders startup failed: '+String(e?.message||e);
  }finally{
    runtimeStartBusy=false;
  }
}
async function boot(){
  if(!window.sb){setTimeout(boot,500);return;}
  /* SINGLE-OWNER CUTOVER: admin.html's legacy order channel/audio can start
     before this runtime loads. Remove that listener and silence its audio
     before this runtime begins loading orders or subscribing. Do not touch
     menu, offers, outlet access, payment guards, or customer checkout. */
  try{await window.__JPTDisableLegacyOrderRuntime?.();}catch(e){console.warn('[JPT Orders] legacy realtime shutdown failed',e);}
  try{window.stopOrderAlarm?.();}catch(e){}
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
  /* This script loads before the dashboard's login gate on some builds.
     Never query orders as anon during boot; resume after a valid partner session. */
  window.sb.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_IN'&&session?.user){
      setTimeout(()=>{startAuthenticatedRuntime().catch(()=>{});},0);
    }else if(event==='SIGNED_OUT'){
      runtimeStarted=false;
      rows.clear();
      stopRingtone();
      render();
    }
  });
  await startAuthenticatedRuntime();
  clearInterval(window.__JPTManagedOutletSync);
  window.__JPTManagedOutletSync=setInterval(async()=>{
    if(!runtimeStarted){
      await startAuthenticatedRuntime();
      return;
    }
    const sig=managedOutlets().join('|');
    if(sig!==managedSignature){
      managedSignature=sig;
      await initialLoad();
      await subscribe();
    }else if(!fallbackPollBusy){
      /* Safety-net poll discovers missed INSERTs without manual dashboard refresh. */
      fallbackPollBusy=true;
      try{ await initialLoad({verifyRows:false,preserveOnError:true}); }
      catch(e){ console.warn('[JPT Orders] fallback poll failed',e); }
      finally{ fallbackPollBusy=false; }
    }
    const select=document.getElementById('outletSelect');
    if(select&&select.value!==outlet()){
      localStorage.setItem('jpt_admin_outlet',select.value);
      await initialLoad();
      await subscribe();
    }
  },5000);
  clearInterval(timerHandle);
  timerHandle=setInterval(updateTimers,1000);
}
boot();
})();