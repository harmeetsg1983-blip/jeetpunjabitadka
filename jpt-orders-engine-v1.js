/* JPT ORDERS ENGINE V1 — clean replacement for the Partner Orders module.
   Scope: Orders UI, state transitions, realtime, notifications and timer.
   No schema changes. Customer ordering is untouched.
*/
(function(){
'use strict';
if(window.__JPT_CLEAN_ORDERS_ENGINE_V1__)return;
window.__JPT_CLEAN_ORDERS_ENGINE_V1__=true;
window.__JPTOrdersV3Active=true;
window.__JPTDisableLegacyOrderRuntime=()=>true;

const V='orders-engine-v1.0.8';
const JPT_RESTAURANT_NEW_ORDER_AUDIO='./ringtones/1000449570.mp4';
const STATES={new:'NEW ORDER',preparing:'PREPARING',accepted:'PREPARING',ready:'READY',out_for_delivery:'OUT FOR DELIVERY',delivered:'HISTORY',completed:'HISTORY',cancelled:'HISTORY'};
const HISTORY=new Set(['delivered','completed','cancelled']);
let rows=[],outlets=[],selectedView='new',selectedOutlet='ALL',central=false,channel=null,refreshing=false,queued=false,seenNew=new Set(),baseline=false,alertId=null,pushOrderId=null,pushOutletId=null,pushHandled=false,alertQueue=[];
const activeNotifications=new Map();
let activeRingtoneAudio=null,activeRingtoneUrl=null;
async function playSavedRingtone(){
  try{
    if(activeRingtoneAudio){try{activeRingtoneAudio.pause()}catch(e){}activeRingtoneAudio=null}
    if(activeRingtoneUrl){try{URL.revokeObjectURL(activeRingtoneUrl)}catch(e){}activeRingtoneUrl=null}
    let volume=1;
    try{const prefs=await window.JPTPartnerNotificationCenterV1?.getPrefs?.();volume=Math.max(0,Math.min(1,Number(prefs?.ringVolume??100)/100))}catch(e){}
    try{
      const exact=new Audio(JPT_RESTAURANT_NEW_ORDER_AUDIO);
      exact.loop=true; exact.volume=volume; exact.preload='auto';
      activeRingtoneAudio=exact;
      await exact.play();
      return true;
    }catch(e){
      activeRingtoneAudio=null;
    }
    const db=await new Promise((resolve,reject)=>{
      const q=indexedDB.open('jptPartnerAlertDB',1);
      q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
    });
    const file=await new Promise((resolve,reject)=>{
      const tx=db.transaction('settings','readonly'),req=tx.objectStore('settings').get('ringtone');
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    try{db.close()}catch(e){}
    if(!file)return false;
    activeRingtoneUrl=URL.createObjectURL(file);
    const a=new Audio(activeRingtoneUrl);
    a.loop=true;a.volume=volume;activeRingtoneAudio=a;
    await a.play();
    return true;
  }catch(e){console.warn('[JPT Orders] saved/fixed ringtone playback unavailable',e);return false}
}
function stopRingtone(){
  if(activeRingtoneAudio){try{activeRingtoneAudio.pause();activeRingtoneAudio.currentTime=0}catch(e){}activeRingtoneAudio=null}
  if(activeRingtoneUrl){try{URL.revokeObjectURL(activeRingtoneUrl)}catch(e){}activeRingtoneUrl=null}
}
const busy=new Set();
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const norm=s=>{s=String(s||'new').toLowerCase().trim();return s==='canceled'?'cancelled':s};
const id=x=>String(x?.id||'');
const outlet=x=>String(x?.outlet_id||'');
const outletName=c=>outlets.find(x=>x.code===String(c))?.name||c||'Outlet';
const view=s=>{s=norm(s);return s==='accepted'?'preparing':HISTORY.has(s)?'history':s};

function style(){
 if(document.getElementById('jptOrdersEngineStyleV1'))return;
 const s=document.createElement('style');s.id='jptOrdersEngineStyleV1';
 s.textContent=`
 #jptOrdersOpsV1{margin:0;background:#080808;color:#fff;border:1px solid #302718;border-radius:18px;overflow:hidden}
 #jptOrdersOpsV1 *{box-sizing:border-box}.jpt-oe-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:16px;border-bottom:1px solid #2b2b2b;background:linear-gradient(135deg,#1b1408,#0d0d0d)}
 .jpt-oe-k{font-size:9px;letter-spacing:1.5px;color:#a98532;font-weight:950}.jpt-oe-head h2{margin:2px 0;color:#e0b84d;font-size:25px}.jpt-oe-muted{color:#8e8e8e;font-size:11px}
 .jpt-oe-actions-head{display:flex;gap:7px}.jpt-oe-timepick{display:flex;align-items:center;gap:6px;margin-right:2px}.jpt-oe-timepick label{font-size:9px;color:#aaa;font-weight:900}.jpt-oe-timepick select{background:#151515;color:#fff;border:1px solid #6a5220;border-radius:8px;padding:7px 8px;font-size:11px;font-weight:900}.jpt-oe-btn,.jpt-oe-bell,.jpt-oe-chip,.jpt-oe-tab,.jpt-oe-act{border:1px solid #444;background:#151515;color:#fff;border-radius:10px;padding:9px 11px;font-weight:900;cursor:pointer;touch-action:manipulation}
 .jpt-oe-bell{border-color:#8b6a25;color:#f2ca63}.jpt-oe-bell span{display:inline-grid;place-items:center;min-width:20px;height:20px;border-radius:99px;background:#d8ae42;color:#111;margin-left:4px}
 .jpt-oe-outlets,.jpt-oe-tabs{display:flex;gap:7px;overflow:auto;padding:10px 12px;border-bottom:1px solid #252525}.jpt-oe-chip,.jpt-oe-tab{white-space:nowrap;font-size:10px;color:#bbb}.jpt-oe-chip.active,.jpt-oe-tab.active{background:#d8ae42;color:#111;border-color:#d8ae42}.jpt-oe-tab b{margin-left:5px}
 .jpt-oe-list{display:grid;gap:10px;padding:12px}.jpt-oe-card{border:1px solid #303030;border-radius:16px;background:#111;overflow:hidden}.jpt-oe-card.new{border-color:#8d6c25;box-shadow:0 0 0 1px #8d6c2522}
 .jpt-oe-main{padding:14px}.jpt-oe-top{display:flex;justify-content:space-between;gap:10px}.jpt-oe-order{font-size:13px;font-weight:950}.jpt-oe-outlet{font-size:10px;color:#d8ae42;margin-top:3px}.jpt-oe-time{font-size:9px;color:#777;margin-top:2px}.jpt-oe-status{font-size:9px;font-weight:950;border:1px solid #55441e;color:#e6c66e;border-radius:99px;padding:5px 8px;white-space:nowrap;height:max-content}
 .jpt-oe-items{margin-top:10px;border-top:1px solid #292929;padding-top:8px}.jpt-oe-item{display:flex;justify-content:space-between;gap:10px;padding:4px 0;color:#bbb;font-size:11px}.jpt-oe-summary{margin-top:9px;padding-top:8px;border-top:1px solid #292929;display:flex;justify-content:space-between;color:#aaa;font-size:11px}.jpt-oe-total{font-size:17px;font-weight:950;color:#fff}
 .jpt-oe-timer{margin-top:10px;padding:9px 10px;border-radius:10px;background:#17140d;border:1px solid #493919;color:#d8ae42;font-size:11px;font-weight:900}.jpt-oe-timer.late{background:#250e0e;border-color:#702727;color:#ff9292}
 .jpt-oe-card-actions{display:flex;gap:7px;flex-wrap:wrap;padding:11px 14px;background:#0d0d0d;border-top:1px solid #292929}.jpt-oe-card-actions button{border:1px solid #444;background:#171717;color:#fff;border-radius:10px;padding:12px 14px;font-weight:950;cursor:pointer;pointer-events:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none}.jpt-oe-card-actions .primary{background:#d8ae42;color:#111;border-color:#d8ae42}.jpt-oe-card-actions .ready{background:#173c26;color:#8de6aa;border-color:#327449}.jpt-oe-card-actions button:disabled{opacity:.45;cursor:not-allowed}
 .jpt-oe-empty{padding:35px 15px;text-align:center;color:#777;font-size:12px}.jpt-oe-alert{margin:12px;padding:12px;border:1px solid #9a7729;border-radius:13px;background:#211707;color:#f2d57e}.jpt-oe-alert b{display:block;font-size:13px}.jpt-oe-alert button{margin-top:8px;border:1px solid #d8ae42;background:#d8ae42;color:#111;border-radius:9px;padding:8px 10px;font-weight:950}
 .jpt-oe-detail{position:fixed;inset:0;z-index:10000;background:#000b;padding:4vh 12px;display:grid;place-items:center}.jpt-oe-detail[hidden]{display:none}.jpt-oe-box{width:min(620px,100%);max-height:90vh;overflow:auto;background:#111;border:1px solid #3d321c;border-radius:18px;padding:16px}.jpt-oe-close{border:1px solid #444;background:#181818;color:#fff;border-radius:9px;padding:8px 10px}.jpt-oe-detail-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.jpt-oe-detail-actions button{border:1px solid #444;background:#171717;color:#fff;border-radius:10px;padding:10px 12px;font-weight:950}.jpt-oe-detail-actions .primary{background:#d8ae42;color:#111;border-color:#d8ae42}
 @media(max-width:700px){.jpt-oe-head{align-items:flex-start}.jpt-oe-actions-head{flex-direction:column}}
 `;document.head.appendChild(s);
}

function mount(){
 const p=document.getElementById('orders');if(!p)return false;
 p.innerHTML=`<div id="jptOrdersOpsV1">
 <div class="jpt-oe-head"><div><div class="jpt-oe-k">RESTAURANT PARTNER</div><h2>Orders</h2><div id="jptOeNotice" class="jpt-oe-muted">Connecting…</div></div>
 <div class="jpt-oe-actions-head"><button id="jptOeRefresh" class="jpt-oe-btn">↻ Refresh</button><button id="jptOeBell" class="jpt-oe-bell">🔔 <span id="jptOeBellCount">0</span></button></div></div>
 <div id="jptOeOutlets" class="jpt-oe-outlets"></div><div id="jptOeTabs" class="jpt-oe-tabs"></div><div id="jptOeList" class="jpt-oe-list"></div><div id="jptOeDetail" class="jpt-oe-detail" hidden></div></div>`;
 style();
 document.getElementById('jptOeRefresh').onclick=()=>load(true);document.getElementById('jptOeBell').onclick=openNew;
 return true;
}

async function loadOutlets(){
 let r=await window.sb.rpc('partner_my_outlets');if(r.error)throw r.error;
 outlets=(Array.isArray(r.data)?r.data:[]).map(x=>({code:String(x.outlet_id||x.code||''),name:String(x.outlet_name||x.name||x.code||x.outlet_id||'Outlet'),access:String(x.access_level||'view')})).filter(x=>x.code);
 try{const c=await window.sb.rpc('partner_access_is_central_owner');if(!c.error)central=!!c.data}catch(e){central=false}
 if(central){const a=await window.sb.from('outlets').select('code,name,is_active').eq('is_active',true).order('code');if(!a.error)outlets=(a.data||[]).map(x=>({code:String(x.code),name:String(x.name||x.code),access:'manage'}))}
 if(!outlets.length)throw new Error('No authorized outlets found.');
 if((central||outlets.length>1)&&selectedOutlet!=='ALL'&&!outlets.some(x=>x.code===selectedOutlet))selectedOutlet='ALL';
 if(!central&&outlets.length===1&&selectedOutlet!=='ALL'&&!outlets.some(x=>x.code===selectedOutlet))selectedOutlet=outlets[0].code;
 renderOutlets();
}
function renderOutlets(){const h=document.getElementById('jptOeOutlets');if(!h)return;h.innerHTML=((central||outlets.length>1)?'<button class="jpt-oe-chip '+(selectedOutlet==='ALL'?'active':'')+'" data-o="ALL">ALL OUTLETS</button>':'')+outlets.map(x=>'<button class="jpt-oe-chip '+(selectedOutlet===x.code?'active':'')+'" data-o="'+esc(x.code)+'">'+esc(x.name)+'</button>').join('');h.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{selectedOutlet=b.dataset.o;selectedView='new';load(false)})}

function renderTabs(){
 const h=document.getElementById('jptOeTabs');if(!h)return;const scoped=rows.filter(x=>selectedOutlet==='ALL'||outlet(x)===selectedOutlet),c={new:0,preparing:0,ready:0,out_for_delivery:0,history:0};
 scoped.forEach(x=>{const v=view(x.status);if(v==='history')c.history++;else if(c[v]!=null)c[v]++});
 h.innerHTML=[['new','NEW ORDER'],['preparing','PREPARING'],['ready','READY'],['out_for_delivery','OUT FOR DELIVERY'],['history','HISTORY']].map(a=>'<button class="jpt-oe-tab '+(selectedView===a[0]?'active':'')+'" data-v="'+a[0]+'">'+a[1]+' <b>'+c[a[0]]+'</b></button>').join('');
 h.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{selectedView=b.dataset.v;render()});
}
function parseItems(x){let a=x?.items;if(typeof a==='string'){try{a=JSON.parse(a)}catch(e){a=[]}}return Array.isArray(a)?a:[]}
function items(x){const a=parseItems(x);return a.length?a.map(i=>'<div class="jpt-oe-item"><span>'+esc(i.name||i.item_name||'Item')+' × '+Number(i.qty??i.quantity??1)+'</span><span>'+(i.price!=null?money(Number(i.price)*Number(i.qty??i.quantity??1)):'')+'</span></div>').join(''):'<div class="jpt-oe-item"><span>Order items</span><span>—</span></div>'}
function deadline(x){if(x.deadline_at)return new Date(x.deadline_at);if(x.accepted_at&&Number(x.target_minutes)>0)return new Date(new Date(x.accepted_at).getTime()+Number(x.target_minutes)*60000);return null}
function fmt(ms){const q=Math.floor(Math.abs(ms)/1000),m=Math.floor(q/60),s=q%60;return ms<0?'LATE +'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'):String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function timer(x){const d=deadline(x);if(!d||!['preparing','accepted'].includes(norm(x.status)))return '';return '<div class="jpt-oe-timer '+(d-Date.now()<0?'late':'')+'" data-d="'+esc(d.toISOString())+'">PREPARATION TIME <b data-c="1">'+fmt(d-Date.now())+'</b></div>'}
function acts(x){const s=norm(x.status),i=esc(id(x)),mins=Math.max(5,Math.min(120,Number(x.target_minutes||30)));if(s==='new')return '<div class="jpt-oe-timepick"><label>PREP TIME</label><select data-target-minutes="'+i+'"><option value="15" '+(mins===15?'selected':'')+'>15 min</option><option value="20" '+(mins===20?'selected':'')+'>20 min</option><option value="30" '+(mins===30?'selected':'')+'>30 min</option><option value="45" '+(mins===45?'selected':'')+'>45 min</option><option value="60" '+(mins===60?'selected':'')+'>60 min</option></select></div><button type="button" class="primary" data-a="accept" data-i="'+i+'">ACCEPT</button><button type="button" data-a="reject" data-i="'+i+'">REJECT</button>';if(s==='accepted')return '<button type="button" class="ready" data-a="legacy_ready" data-i="'+i+'">MARK READY</button>';if(s==='preparing')return '<button type="button" class="ready" data-a="ready" data-i="'+i+'">MARK READY</button>';if(s==='ready')return '<button type="button" class="primary" data-a="out_for_delivery" data-i="'+i+'">OUT FOR DELIVERY</button>';if(s==='out_for_delivery')return '<button type="button" class="ready" data-a="delivered" data-i="'+i+'">DELIVERED</button>';return '<span class="jpt-oe-muted">No further restaurant action.</span>'}
function render(){
 renderTabs();const h=document.getElementById('jptOeList');if(!h)return;
 const data=rows.filter(x=>(selectedOutlet==='ALL'||outlet(x)===selectedOutlet)&&(selectedView==='history'?HISTORY.has(norm(x.status)):view(x.status)===selectedView));
 const n=rows.filter(x=>norm(x.status)==='new'&&(selectedOutlet==='ALL'||outlet(x)===selectedOutlet)).length;const b=document.getElementById('jptOeBellCount');if(b)b.textContent=String(n);
 if(!data.length){h.innerHTML='<div class="jpt-oe-empty">No orders in this stage.</div>';return}
 h.innerHTML=data.map(x=>{const s=norm(x.status),o=x.order_no||x.order_id||x.id,t=x.created_at?new Date(x.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—',total=Number(x.total??x.total_amount??0);return '<article class="jpt-oe-card '+(s==='new'?'new':'')+'"><div class="jpt-oe-main"><div class="jpt-oe-top"><div><div class="jpt-oe-order">#'+esc(o)+'</div><div class="jpt-oe-outlet">'+esc(outletName(outlet(x)))+'</div><div class="jpt-oe-time">'+esc(t)+' • '+esc(x.customer_name||'Customer')+'</div></div><div class="jpt-oe-status">'+esc(STATES[view(s)]||s.toUpperCase())+'</div></div><div class="jpt-oe-items">'+items(x)+'</div><div class="jpt-oe-summary"><span>'+esc(x.payment||'Payment')+'</span><span class="jpt-oe-total">'+money(total)+'</span></div>'+timer(x)+'</div><div class="jpt-oe-card-actions">'+acts(x)+'<button data-open="'+esc(id(x))+'">VIEW</button></div></article>'}).join('');
 if(!h.dataset.jptOrderActionBound){h.addEventListener('click',function(e){const b=e.target.closest('button[data-a]');if(!b||!h.contains(b))return;e.preventDefault();e.stopPropagation();action(b.dataset.i,b.dataset.a,b)},true);h.dataset.jptOrderActionBound='1'}h.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>detail(b.dataset.open));
}
function tick(){document.querySelectorAll('#jptOrdersOpsV1 [data-d]').forEach(x=>{const left=new Date(x.dataset.d)-Date.now();x.classList.toggle('late',left<0);const b=x.querySelector('[data-c]');if(b)b.textContent=fmt(left)})}

async function read(idv,oc){const r=await window.sb.from('orders').select('*').eq('id',idv).eq('outlet_id',oc).maybeSingle();if(r.error)throw r.error;if(!r.data)throw new Error('Order not found or access denied.');return r.data}
async function transition(row,next,extra={}){ 
 const idv=id(row),to=norm(next),key=idv+'|'+to;if(busy.has(key))return false;busy.add(key);
 try{
  const oc=outlet(row);
  let session=null;
  try{
    const sr=await window.sb.auth.getSession();
    session=sr?.data?.session||null;
    if(sr?.error)throw sr.error;
  }catch(e){throw new Error('Partner session check failed: '+(e?.message||e))}
  if(!session)throw new Error('Partner session expired. Please sign in again.');
  const access=outlets.find(x=>x.code===oc);
  if(!central&&(!access||access.access!=='manage')){
    throw new Error('Order access denied: this outlet is not in MANAGE access for the signed-in partner.');
  }
  const payload={
    p_order_id:Number(idv),
    p_next_status:to,
    p_target_minutes:Math.max(5,Math.min(120,Number(extra.target_minutes||30))),
    p_rejection_reason:extra.rejection_reason||null
  };
  const q=await window.sb.rpc('jpt_partner_transition_order',payload);
  if(q.error){
    const code=q.error.code?(' ['+q.error.code+']'):'';
    throw new Error((q.error.message||q.error.details||'Server order transition failed.')+code);
  }
  if(!q.data)throw new Error('Server did not return the updated order.');
  const v=Array.isArray(q.data)?q.data[0]:q.data;
  if(!v||norm(v.status)!==to)throw new Error('Server status verification failed: expected '+to+'.');
  if(alertId===idv)stopAlert(idv);
  return v;
 }finally{busy.delete(key)}
}
async function action(idv,a,b){
 if(b)b.disabled=true;const row=rows.find(x=>id(x)===String(idv));if(!row){if(b)b.disabled=false;return}
 try{let v;if(a==='accept'){const sel=document.querySelector('[data-target-minutes="'+idv+'"]');const target=Number(sel?.value||30);v=await transition(row,'preparing',{target_minutes:target});selectedView='preparing'}else if(a==='reject'){if(!confirm('Reject this customer order?'))return;v=await transition(row,'cancelled',{rejection_reason:'Rejected by restaurant'});selectedView='history'}else if(a==='legacy_ready'){v=await transition(row,'preparing',{target_minutes:Number(row.target_minutes||30)});v=await transition(v,'ready');selectedView='ready'}else{v=await transition(row,a);selectedView=a==='delivered'?'history':view(a);if(a==='ready'){try{const r=await window.sb.rpc('delivery_offer_next',{p_order_id:Number(row.id)});if(r.error)console.warn('[JPT Orders] delivery offer',r.error.message)}catch(e){console.warn('[JPT Orders] delivery offer check',e)}}}
 const i=rows.findIndex(x=>id(x)===idv);if(i>=0)rows[i]=v;render();await load(false);toast('Order updated successfully.')}catch(e){toast('Order update failed: '+(e?.message||e))}finally{if(b)b.disabled=false}
}
function toast(m){if(typeof window.toast==='function')window.toast(m);else{const n=document.getElementById('jptOeNotice');if(n)n.textContent=m}}
function stopAlert(i){const key=String(i||'');const n=activeNotifications.get(key);if(n){try{n.close()}catch(e){}activeNotifications.delete(key)}alertQueue=alertQueue.filter(q=>id(q)!==key);if(alertId!==null&&String(alertId)===key){stopRingtone();alertId=null;document.getElementById('jptOeAlert')?.remove();const next=alertQueue.shift();if(next&&norm(next.status)==='new'){showAlert(next)}}}
function showAlert(x){
 const aid=id(x);if(!aid)return;if(alertId&&alertId!==aid){if(!alertQueue.some(q=>id(q)===aid))alertQueue.push(x);return}if(alertId===aid)return;alertId=aid;try{navigator.vibrate?.([450,150,450,150,700])}catch(e){}
 playSavedRingtone();
 try{if('Notification' in window&&Notification.permission==='granted'){const n=new Notification('JPT — NEW ORDER',{body:'Order '+(x.order_no||x.id)+' received. Tap to open Orders.',tag:'jpt-clean-'+id(x),requireInteraction:true,vibrate:[450,150,450],data:{order_id:id(x),outlet_id:outlet(x)}});const key=id(x);activeNotifications.set(key,n);n.onclose=()=>{if(activeNotifications.get(key)===n)activeNotifications.delete(key)};n.onclick=()=>{window.focus();selectedView='new';render();detail(key);n.close()}}}catch(e){}
 const root=document.getElementById('jptOrdersOpsV1');if(root){const a=document.createElement('div');a.id='jptOeAlert';a.className='jpt-oe-alert';a.innerHTML='<b>🔔 NEW ORDER — '+esc(x.order_no||x.id)+'</b><span>Accept or Reject to stop the alert.</span><br><button>OPEN ORDER</button>';root.prepend(a);a.querySelector('button').onclick=()=>detail(id(x))}
}
function openNew(){const x=rows.find(r=>norm(r.status)==='new');if(x)detail(id(x));else{selectedView='new';render()}}
function detail(i){
 const x=rows.find(r=>id(r)===String(i));if(!x)return;const h=document.getElementById('jptOeDetail');if(!h)return;const total=Number(x.total??x.total_amount??0);
 h.hidden=false;h.innerHTML='<div class="jpt-oe-box"><div style="display:flex;justify-content:space-between"><div><b>#'+esc(x.order_no||x.id)+'</b><div class="jpt-oe-outlet">'+esc(outletName(outlet(x)))+'</div></div><button id="jptOeClose" class="jpt-oe-close">✕</button></div><div style="margin-top:12px;color:#bbb;font-size:12px">Customer: '+esc(x.customer_name||'Customer')+'<br>Phone: '+esc(x.customer_phone||x.phone||'—')+'<br>Address: '+esc(x.customer_address||x.address||'—')+'<br>Payment: '+esc(x.payment||'—')+'<br>Total: <b style="color:#fff">'+money(total)+'</b></div><div class="jpt-oe-items">'+items(x)+'</div><div class="jpt-oe-detail-actions">'+acts(x)+'</div></div>';
 h.querySelector('#jptOeClose').onclick=()=>h.hidden=true;h.querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{await action(b.dataset.i,b.dataset.a,b);h.hidden=true})
}
async function load(manual){
 if(refreshing){queued=true;return}refreshing=true;
 try{
  await loadOutlets();if(pushOutletId&&outlets.some(o=>o.code===pushOutletId))selectedOutlet=pushOutletId;let q=window.sb.from('orders').select('id,customer_name,customer_phone,customer_address,items,subtotal,discount,delivery_charge,total,total_amount,status,eta_minutes,notes,created_at,updated_at,order_no,order_id,payment,outlet_id,target_minutes,accepted_at,deadline_at,rejection_reason,preparing_at,ready_at,out_for_delivery_at,delivered_at').order('created_at',{ascending:false}).limit(150);
  if(selectedOutlet!=='ALL')q=q.eq('outlet_id',selectedOutlet);const r=await q;if(r.error)throw r.error;
  const fresh=(r.data||[]).map(x=>({...x,status:norm(x.status)})).filter(x=>outlets.some(o=>o.code===outlet(x))).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  const freshNew=new Set(fresh.filter(x=>norm(x.status)==='new').map(id));
  alertQueue=alertQueue.filter(x=>freshNew.has(id(x)));
  const active=alertId&&fresh.find(x=>id(x)===String(alertId));if(alertId&&(!active||norm(active.status)!=='new'))stopAlert(alertId);
  if(baseline){for(const x of fresh){if(norm(x.status)==='new'&&!seenNew.has(id(x))){seenNew.add(id(x));selectedView='new';showAlert(x)}}}else freshNew.forEach(x=>seenNew.add(x));
  for(const old of [...seenNew])if(!freshNew.has(old))seenNew.delete(old);baseline=true;rows=fresh;render();if(pushOrderId&&!pushHandled){pushHandled=true;selectedView='new';render();setTimeout(()=>detail(pushOrderId),0)}
  const n=document.getElementById('jptOeNotice');if(n)n.textContent=(central?'Central':'Partner')+' Orders • '+rows.length+' latest records';if(manual)toast('Orders refreshed.');
 }catch(e){toast('Orders load failed: '+(e?.message||e))}finally{refreshing=false;if(queued){queued=false;load(false)}}
}
function realtime(){
 try{if(channel)window.sb.removeChannel(channel);channel=window.sb.channel('jpt-clean-orders-'+Date.now()).on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},p=>{const x=p?.new;if(!x||!outlets.some(o=>o.code===String(x.outlet_id)))return;const row={...x,status:norm(x.status)};rows=[row,...rows.filter(r=>id(r)!==id(row))];render();if(norm(row.status)==='new'&&!seenNew.has(id(row))){seenNew.add(id(row));selectedView='new';render();showAlert(row)}}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},p=>{const x=p?.new;if(!x||!outlets.some(o=>o.code===String(x.outlet_id)))return;rows=rows.map(r=>id(r)===id(x)?{...x,status:norm(x.status)}:r);if(norm(x.status)!=='new')stopAlert(id(x));render()}).subscribe((st)=>{if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'||st==='CLOSED')setTimeout(()=>load(false),1200)})}catch(e){console.warn('[JPT Orders] realtime unavailable',e)}
}
function readPushUrl(){try{const u=new URLSearchParams(location.search);if(u.get('push')!=='order')return false;const oi=u.get('order_id')||null,oo=u.get('outlet_id')||null;if(!oi)return false;pushOrderId=oi;pushOutletId=oo;pushHandled=false;return true}catch(e){return false}}
async function handlePushUrl(){if(!readPushUrl())return;try{if(window.showPanel)window.showPanel('orders')}catch(e){}selectedView='new';render();setTimeout(()=>detail(pushOrderId),150)}
async function boot(){if(!document.getElementById('orders')||!window.sb){setTimeout(boot,300);return}if(!mount())return;readPushUrl();window.addEventListener('pageshow',()=>handlePushUrl());window.addEventListener('popstate',()=>handlePushUrl());await load(false);try{const sr=await window.sb.auth.getSession();const n=document.getElementById('jptOeNotice');if(n&&!sr?.data?.session)n.textContent='Partner session required for order actions.';else if(n)n.textContent=(central?'Central':'Partner')+' Orders • Clean Engine v1.0.8 • Server RPC actions';}catch(e){}realtime();clearInterval(window.__JPTCleanOrdersRefresh);window.__JPTCleanOrdersRefresh=setInterval(()=>load(false),20000);clearInterval(window.__JPTCleanOrdersCountdown);window.__JPTCleanOrdersCountdown=setInterval(tick,1000)}
window.JPTCleanOrdersEngineV1={version:V,reload:()=>load(true),stopAlert,openOrder:detail,getRows:()=>rows.slice()};
boot();
})();