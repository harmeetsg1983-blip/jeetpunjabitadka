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
  if(status(o.status)!=='new'){
    render();
    toast('Order already '+status(o.status).toUpperCase()+'. Queue refreshed; duplicate accept blocked.');
    return;
  }
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
    let fresh=await read(id,o?.outlet_id).catch(()=>null);
    const serverStatus=message.match(/Current status:\s*([A-Z_]+)/i)?.[1]?.toLowerCase();
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
    }else if(serverStatus && serverStatus!=='new'){
      o.status=serverStatus;
      delete o.__optimisticStatus;
      if(serverStatus!=='accepted'){
        if(previous.__localDeadline===undefined)delete o.__localDeadline;
        else o.__localDeadline=previous.__localDeadline;
      }
      rows.set(key,o);
      focusQueueForStatus(serverStatus);
      toast('Server status synced: '+serverStatus.toUpperCase()+'. Duplicate accept stopped.');
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
    render();
  }finally{
    actionBusy.delete(key);
    render();
  }
}
async function reject(id){
  const key=String(id);
  /* ACCEPT, REJECT and lifecycle actions share one synchronous per-order lock. */
  if(actionBusy.has(key)||transitionBusy.has(key))return;
  const o=rows.get(key); if(!o)return;
  if(status(o.status)!=='new'){
    await initialLoad().catch(()=>{});
    render();
    toast('REJECT blocked: order is no longer NEW.');
    return;
  }
  actionBusy.add(key);
  render();
  try{
    /* Fail closed: do not REJECT from a stale local NEW card if the server
       cannot confirm that this order still exists and is still NEW. */
    const freshBefore=await read(id,o.outlet_id).catch(()=>null);
    if(!freshBefore){
      await initialLoad().catch(()=>{});
      toast('REJECT paused: current server state could not be verified. Refresh orders and retry.');
      return;
    }
    if(status(freshBefore.status)!=='new'){
      rows.set(key,Object.assign({},o,freshBefore));
      focusQueueForStatus(freshBefore.status);
      render();
      toast('REJECT blocked: server status is '+status(freshBefore.status).toUpperCase()+'.');
      return;
    }
    rows.set(key,Object.assign({},o,freshBefore));
    stopRingtone();
    render();
    const r=await window.sb.rpc('jpt_partner_transition_order',{
      p_order_id:Number(id),
      p_next_status:'cancelled',
      p_target_minutes:15,
      p_rejection_reason:'Rejected by restaurant'
    });
    if(r.error)throw r.error;
    const responseRow=Array.isArray(r.data)?r.data[0]:r.data;
    /* Prefer a fresh authoritative row; only use RPC row if verification read fails. */
    const fresh=await read(id,o.outlet_id).catch(()=>null);
    const server=fresh||responseRow;
    if(!server)throw new Error('Server did not confirm REJECT status.');
    rows.set(key,Object.assign({},o,server));
    focusQueueForStatus(server.status||'cancelled');
    toast('Order rejected — server status '+status(server.status).toUpperCase()+'.');
    render();
  }catch(e){
    const fresh=await read(id,o.outlet_id).catch(()=>null);
    if(fresh){
      rows.set(key,Object.assign({},o,fresh));
      focusQueueForStatus(fresh.status);
    }
    render();
    toast('REJECT failed; server state refreshed: '+(e?.message||e));
  }finally{
    actionBusy.delete(key);
    render();
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
  /* Shared lock blocks ACCEPT/REJECT/READY/delivery actions on this order. */
  actionBusy.add(key);
  transitionBusy.add(key);
  setActionBusyUi(key,true,label);
  /* Optimistic state mutation makes the card/status react immediately.
     Every path below reconciles against the authoritative database row. */
  o.status=next;
  delete o.__optimisticStatus;
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
      if(!allowed[next]?.includes(serverState)){
        rows.set(key,Object.assign({},o,fresh));
        toast('Order update blocked: server status is '+serverState.toUpperCase()+'.');
        render();
        return;
      }
      rows.set(key,Object.assign({},o,fresh));
      o.status=serverState;
    }else{
      /* Fail closed: a local card is not authority to advance lifecycle state.
         If the server read fails or the row is missing, do not call the transition RPC. */
      Object.assign(o,before);
      rows.set(key,o);
      render();
      toast('Order update paused: current server state could not be verified. Refresh orders and retry.');
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
      rows.set(key,Object.assign({},rows.get(key)||o,server));
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
      rows.set(key,Object.assign({},rows.get(key)||o,fresh));
      focusQueueForStatus(fresh.status);
      toast('Order state reconciled from server: '+status(fresh.status).toUpperCase()+'. '+(String(e?.message||e)));
    }else{
      Object.assign(o,before);
      rows.set(key,o);
      toast('Order update failed; previous state restored: '+(e?.message||e));
    }
    render();
  }finally{
    transitionBusy.delete(key);
    actionBusy.delete(key);
    setActionBusyUi(key,false);
    render();
  }
}
async function markReady(id){return lifecycleTransition(id,'ready')}
async function transition(id,next){return lifecycleTransition(id,next)}
async function initialLoad(){
  const codes=managedOutlets();
  const r=codes.length===1
    ? await window.sb.from('orders').select('*').eq('outlet_id',codes[0]).order('created_at',{ascending:false}).limit(100)
    : await window.sb.from('orders').select('*').in('outlet_id',codes).order('created_at',{ascending:false}).limit(500);
  if(r.error){
    /* A failed/unauthorized refresh must never leave old cards presented as current NEW orders. */
    rows.clear();
    stopRingtone();
    render();
    toast('Orders load failed: '+r.error.message+' — stale cards cleared; check partner session/outlet access.');
    return;
  }
  rows.clear();
  (r.data||[]).forEach(o=>rows.set(String(o.id),o));

  /* Reconcile cards against the same server lookup used by action recovery.
     Missing/unreadable rows are hidden from this in-memory queue only.
     Never delete or update database records during reconciliation. */
  const checks=[...rows.entries()];
  for(let i=0;i<checks.length;i+=8){
    await Promise.all(checks.slice(i,i+8).map(async([key,o])=>{
      const live=await read(o.id,o.outlet_id).catch(()=>null);
      if(live)rows.set(key,Object.assign(o,live));
      else rows.delete(key);
    }));
  }
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
      const oldStatus=status(old.status),nextStatus=status(o.status);
      rows.set(String(o.id),Object.assign({},old,o));
      /* If the active queue was showing this order's prior state, follow its
         server-confirmed lifecycle state immediately instead of leaving the
         operator on a stale NEW/ACCEPTED tab. */
      if(old.id && oldStatus!==nextStatus && selectedQueue===oldStatus){
        focusQueueForStatus(nextStatus);
      }
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
function focusQueueForStatus(value){
  const st=status(value);
  const target=st==='new'?'new':st==='accepted'?'accepted':st==='preparing'?'preparing':st==='ready'?'ready':st==='out_for_delivery'?'out_for_delivery':st==='delivered'?'delivered':null;
  if(!target)return;
  const btn=[...document.querySelectorAll('.orderQueueBtn')].find(b=>String(b.dataset.queue||'')===target);
  if(!btn)return;
  selectedQueue=target;
  document.querySelectorAll('.orderQueueBtn').forEach(x=>x.classList.toggle('gold',x===btn));
}
function bindQueue(){
  document.querySelectorAll('.orderQueueBtn').forEach(b=>{
    b.onclick=()=>{selectedQueue=b.dataset.queue||'all';document.querySelectorAll('.orderQueueBtn').forEach(x=>x.classList.toggle('gold',x===b));render()};
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