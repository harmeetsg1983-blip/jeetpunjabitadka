/* JPT Partner Orders — Central All-Outlets Board V2
   Safe UI replacement only.
   - Central owner: ALL outlets are visible together.
   - Outlet partner: only the selected/authorized outlet is visible.
   - Every order shows outlet name + outlet code.
   - Status pipeline: NEW -> ACCEPTED -> PREPARING -> READY -> OUT FOR DELIVERY -> DELIVERED.
   - Uses existing orders table and existing RLS; no schema changes.
*/
(function(){
'use strict';
window.__JPTOrdersV3Active=true;
if(window.JPTPartnerOrdersUI?.version==='v3') return;

const STYLE_ID='jpt-orders-central-v3-style';
const ROOT_ID='jptOrdersCentralV2';
const TABS_ID='jptOrdersCentralV2Tabs';
const CENTRAL_RPC='partner_access_is_central_owner';
const OWNER_OUTLET_CODES=new Set(['JPT-001','SOP-002','NME-004','PFA-003','TOP-005']);
const STATUS_VIEWS=[['new','NEW'],['preparing','PREPARING'],['ready','READY'],['out_for_delivery','OUT FOR DELIVERY'],['history','COMPLETED']];
const statusView=s=>{s=status(s);if(s==='accepted'||s==='preparing')return 'preparing';if(s==='completed')return 'delivered';return s};
let timer=null,channel=null,rowsCache=[],outlets={},selected='preparing',central=false,lastNewest='',loadSeq=0,alertBaselineReady=false,alertedNewIds=new Set();
const prepDrafts=new Map();
let pendingNew=new Map();
const statusLocks=new Map();

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const status=s=>{s=String(s||'new').toLowerCase();return s==='canceled'?'cancelled':s==='completed'?'completed':s};
const selectedOutlet=()=>localStorage.getItem('jpt_admin_outlet')||document.getElementById('outletSelect')?.value||'';
const isCentral=async()=>{try{const r=await window.sb?.rpc(CENTRAL_RPC);return !r?.error&&r.data===true}catch(e){return false}};

function injectStyle(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
 #jptOrdersCentralV2{margin-top:12px}.jpt-cob-head{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:8px 0 12px}.jpt-cob-title{font-size:19px;font-weight:950}.jpt-cob-sub{color:#888;font-size:11px;margin-top:3px}.jpt-cob-mode{padding:7px 11px;border:1px solid #5c4920;border-radius:99px;color:#f4d77a;background:#151515;font-size:10px;font-weight:950}
 .jpt-cob-tabs{display:flex;gap:7px;overflow:auto;padding:3px 0 12px;scrollbar-width:none}.jpt-cob-tabs::-webkit-scrollbar{display:none}.jpt-cob-tab{flex:0 0 auto;background:#151515;color:#aaa;border:1px solid #343434;border-radius:13px;padding:10px 14px;font-weight:950;font-size:11px}.jpt-cob-tab.active{background:#f0c94a;color:#111;border-color:#f0c94a}
 .jpt-cob-list{display:grid;gap:10px}.jpt-cob-card{background:#111;border:1px solid #302a1d;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px #0005}.jpt-cob-main{padding:14px}.jpt-cob-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.jpt-cob-no{font-size:11px;font-weight:800;color:#999}.jpt-cob-outlet{margin-top:3px;font-size:10px;font-weight:800;color:#d8ae42}.jpt-cob-code{font-size:9px;color:#666;margin-top:2px}.jpt-cob-status{font-size:9px;font-weight:950;border:1px solid #604d1c;border-radius:99px;padding:5px 9px;color:#f4d77a;white-space:nowrap}
 .jpt-cob-customer{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid #252525}.jpt-cob-customer-name{font-size:11px;font-weight:800}.jpt-cob-muted{color:#888;font-size:9px;margin-top:2px}.jpt-cob-items{margin-top:11px;border:1px solid #292929;border-radius:13px;background:#171717;overflow:hidden}.jpt-cob-item{display:flex;justify-content:space-between;gap:10px;padding:10px 11px;border-bottom:1px solid #292929;font-size:12px}.jpt-cob-item:last-child{border-bottom:0}.jpt-cob-item-name{font-size:16px;line-height:1.25;font-weight:900;color:#fff}.jpt-cob-item-price{font-size:13px;color:#ddd;white-space:nowrap;font-weight:800}
 .jpt-cob-summary{margin-top:10px;border-top:1px solid #252525;padding-top:9px}.jpt-cob-line{display:flex;justify-content:space-between;gap:12px;padding:3px 0;color:#aaa;font-size:11px}.jpt-cob-line.discount{color:#79d99a}.jpt-cob-line.total{color:#fff;font-size:16px;font-weight:950;padding-top:8px;margin-top:5px;border-top:1px solid #343434}.jpt-cob-payment{display:inline-flex;margin-top:8px;padding:6px 9px;border-radius:9px;background:#191919;border:1px solid #292929;color:#bbb;font-size:10px;font-weight:900}.jpt-cob-actions{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;padding:11px 14px;background:#0c0c0c;border-top:1px solid #292929}.jpt-cob-actions button,.jpt-cob-actions select,.jpt-cob-actions input{padding:9px 11px;border-radius:10px;border:1px solid #393939;background:#151515;color:#fff;font-weight:850}.jpt-cob-actions .primary{background:#f0c94a;color:#111;border-color:#f0c94a;font-weight:950}.jpt-cob-decision{display:flex;align-items:center;gap:6px;flex:0 0 auto}.jpt-cob-decision button{white-space:nowrap}.jpt-cob-prep{margin-top:10px;padding:9px 11px;border:1px solid #4a3a1b;border-radius:11px;background:#17130a;color:#f4d77a;font-weight:900;font-size:12px}.jpt-cob-prep b{font-size:18px}.jpt-cob-prep.late{border-color:#8b2d2d;background:#210b0b;color:#ff8f8f}.jpt-cob-timepick{display:inline-flex;align-items:center;gap:5px}.jpt-cob-timepick button{min-width:42px;min-height:42px;font-size:22px;font-weight:950;padding:4px 10px}.jpt-cob-timepick input{width:58px;min-height:42px;text-align:center;font-weight:950;font-size:16px}.jpt-cob-empty{padding:35px 12px;text-align:center;border:1px dashed #343434;border-radius:15px;color:#777}.jpt-cob-history{color:#aaa;font-size:11px}.jpt-order-open-btn{margin-top:10px;width:100%;padding:11px 12px;border-radius:12px;border:1px solid #4b3a16;background:#19150b;color:#f4d77a;font-weight:950}.jpt-order-bellbar{position:fixed;left:10px;right:10px;top:64px;z-index:9998;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;margin:0;border-radius:14px;background:#f0c94a;color:#111;box-shadow:0 8px 24px #0005}.jpt-order-bellbar button{border:0;background:transparent;color:#111;font-weight:1000;font-size:13px}.jpt-order-bell{font-size:22px;line-height:1}.jpt-order-badge{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:99px;background:#111;color:#f0c94a;font-size:11px;margin-left:5px}.jpt-order-modal{position:fixed;inset:0;z-index:10000;background:#0b0b0b;display:none;overflow:auto;color:#fff}.jpt-order-modal.show{display:block}.jpt-order-modal-head{position:sticky;top:0;z-index:2;background:#111;border-bottom:1px solid #292929;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px}.jpt-order-modal-close{width:42px;height:42px;border-radius:50%;border:1px solid #444;background:#191919;color:#fff;font-size:20px}.jpt-order-modal-body{max-width:720px;margin:0 auto;padding:14px 14px 90px}.jpt-order-big-status{padding:13px;border-radius:14px;background:#171717;border:1px solid #332a18;margin-bottom:12px}.jpt-order-big-status b{color:#f4d77a;font-size:13px}.jpt-order-detail-card{background:#121212;border:1px solid #292929;border-radius:18px;padding:15px;margin-bottom:12px}.jpt-order-detail-items{border-top:1px solid #292929;margin-top:12px}.jpt-order-detail-item{display:flex;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid #292929}.jpt-order-detail-item:last-child{border-bottom:0}.jpt-order-detail-item b{font-size:17px}.jpt-order-detail-total{font-size:20px;font-weight:1000;display:flex;justify-content:space-between;border-top:1px solid #444;padding-top:12px;margin-top:8px}.jpt-order-detail-actions{position:sticky;bottom:0;background:#0b0b0b;border-top:1px solid #292929;padding:12px 0;display:flex;gap:8px;flex-wrap:wrap}.jpt-order-detail-actions>*{flex:1;min-width:120px}.jpt-order-detail-actions button{padding:13px;border-radius:12px;border:1px solid #444;background:#171717;color:#fff;font-weight:950}.jpt-order-detail-actions .primary{background:#f0c94a;color:#111;border-color:#f0c94a}@media(max-width:600px){.jpt-order-modal-body{padding:10px 10px 90px}.jpt-order-detail-item b{font-size:15px}}@media(max-width:600px){.jpt-cob-main{padding:12px}.jpt-cob-no{font-size:15px}.jpt-cob-item{font-size:11px}}
 `;document.head.appendChild(s);
}
async function loadOutlets(){
 const r=await window.sb.from('outlets').select('code,name').order('name',{ascending:true});
 if(r.error)throw r.error;
 outlets=Object.fromEntries((r.data||[]).filter(x=>OWNER_OUTLET_CODES.has(String(x.code))).map(x=>[String(x.code),String(x.name||x.code)]));
}

function parseItems(x){let a=x?.items;if(typeof a==='string'){try{a=JSON.parse(a)}catch(e){a=[]}}return Array.isArray(a)?a:[]}
function itemsHtml(x){return parseItems(x).map(i=>{const q=Number(i.qty??i.quantity??1),p=Number(i.price??i.unit_price??0);return `<div class="jpt-cob-item"><span class="jpt-cob-item-name">${esc(i.name||i.item_name||'Item')} <span class="jpt-cob-muted">× ${q}</span></span><span class="jpt-cob-item-price">${money(p*q)}</span></div>`}).join('')||'<div class="jpt-cob-item"><span class="jpt-cob-muted">Items not available</span></div>'}
async function loadRows(){
 const q=window.sb.from('orders').select('*').order('created_at',{ascending:false}).limit(200);
 const query=central?q:q.eq('outlet_id',selectedOutlet());
 const r=await query;
 if(r.error)throw r.error;
 let rows=r.data||[];
 rows=rows.filter(x=>OWNER_OUTLET_CODES.has(String(x.outlet_id||'')));
 if(!central)rows=rows.filter(x=>String(x.outlet_id||'')===String(selectedOutlet()));
 rows.forEach(x=>x.__status=status(x.status));
 rowsCache=rows;
 return rows;
}

function ensureCentralBell(){
 const b=document.getElementById('jptCentralOrderBell');
 const host=document.getElementById('jptOpenOrdersBell');
 if(!host)return null;
 if(b && b.parentElement===host)return b;
 if(b)b.remove();
 host.id='jptOpenOrdersBell';
 host.setAttribute('role','button');
 host.setAttribute('aria-label','Open new orders');
 host.onclick=()=>{selected='new';try{window.showPanel?.('orders')}catch(e){};document.getElementById(ROOT_ID)?.scrollIntoView({behavior:'smooth',block:'start'});};
 return host;
}
function syncCentralBell(){
 const b=ensureCentralBell(),count=rowsCache.filter(x=>x.__status==='new'&&OWNER_OUTLET_CODES.has(String(x.outlet_id||''))).length;
 if(!b)return;
 const badge=document.getElementById('jptOpenOrdersBadge');if(badge)badge.textContent=String(count);
 b.classList.toggle('has-orders',count>0);
 b.setAttribute('aria-label',count?('Open new orders: '+count):'Open orders');
 const hint=document.getElementById('jptOpenOrdersHint');if(hint)hint.textContent=count?(count+' NEW order'+(count===1?'':'s')+' • All 5 outlets'):'All 5 personal outlets • Live orders';
}

function renderTabs(){const el=document.getElementById(TABS_ID);if(!el)return;const counts=Object.fromEntries(STATUS_VIEWS.map(x=>[x[0],0]));rowsCache.forEach(x=>{const v=statusView(x.__status);if(v==='history'||x.__status==='completed'||x.__status==='cancelled'){counts.history++}else if(counts[v]!==undefined)counts[v]++});el.innerHTML=STATUS_VIEWS.map(([k,label])=>`<button class="jpt-cob-tab ${selected===k?'active':''}" data-status="${k}">${label} <span>${counts[k]||0}</span></button>`).join('');el.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{selected=b.dataset.status;render()})}
function ensureOrderBellBar(){
 const panel=document.getElementById('orders'); if(!panel)return null;
 let bar=document.getElementById('jptOrderBellBar');
 if(!bar){
   bar=document.createElement('div');bar.id='jptOrderBellBar';bar.className='jpt-order-bellbar';
   bar.innerHTML='<button type="button" id="jptOrderBellButton"><span class="jpt-order-bell">🔔</span> NEW ORDERS <span class="jpt-order-badge" id="jptOrderBellCount">0</span></button><span id="jptOrderBellHint">Tap to open the latest order</span>';
   document.body.appendChild(bar);
   document.getElementById('jptOrderBellButton').onclick=()=>{
     const n=rowsCache.find(x=>x.__status==='new');
     if(n)openOrderDetail(n.id); else {selected='new';render();}
   };
 }
 return bar;
}
function syncOrderBellBar(){
 const bar=ensureOrderBellBar();if(!bar)return;
 const n=rowsCache.filter(x=>x.__status==='new').length;
 const badge=document.getElementById('jptOrderBellCount');if(badge)badge.textContent=String(n);
 bar.style.display=n?'flex':'none';
 const hint=document.getElementById('jptOrderBellHint');if(hint)hint.textContent=n?'Tap the bell to open the complete order':'';
}
function ensureOrderDetailModal(){
 let m=document.getElementById('jptOrderDetailModal');if(m)return m;
 m=document.createElement('div');m.id='jptOrderDetailModal';m.className='jpt-order-modal';
 m.innerHTML='<div class="jpt-order-modal-head"><div><b id="jptOrderDetailTitle">ORDER</b><div id="jptOrderDetailOutlet" style="font-size:10px;color:#aaa;margin-top:3px"></div></div><button class="jpt-order-modal-close" id="jptOrderDetailClose">×</button></div><div class="jpt-order-modal-body" id="jptOrderDetailBody"></div>';
 document.body.appendChild(m);
 document.getElementById('jptOrderDetailClose').onclick=()=>m.classList.remove('show');
 m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')});
 return m;
}
function detailActionHtml(x){
 const id=esc(x.id||''),st=x.__status;
 if(st==='new')return actionHtml(x);
 if(st==='accepted')return '<button class="primary" data-act="preparing" data-id="'+id+'">START PREPARING</button>';
 if(st==='preparing')return '<button class="primary" data-act="ready" data-id="'+id+'">MARK READY</button>';
 if(st==='ready')return '<span class="jpt-cob-history">READY • DELIVERY OFFER IS CHECKED AUTOMATICALLY</span>';
 if(st==='out_for_delivery')return '<span class="jpt-cob-history">OUT FOR DELIVERY • DELIVERY FLOW ACTIVE</span>';
 return '<span class="jpt-cob-history">Delivery flow active.</span>';
}

function openOrderDetail(id){
 const row=rowsCache.find(x=>String(x.id)===String(id));if(!row)return;
 const m=ensureOrderDetailModal(),body=document.getElementById('jptOrderDetailBody');
 const st=row.__status,total=Number(row.total??0),sub=Number(row.subtotal??0),disc=Number(row.discount??0),del=Number(row.delivery_charge??0);
 const oid=String(row.outlet_id||'—'),oname=outlets[oid]||oid,customer=row.customer_name||'Customer',phone=row.customer_phone||'',address=row.customer_address||'Address not provided',payment=row.payment||'—';
 document.getElementById('jptOrderDetailTitle').textContent='#'+String(row.order_no||row.id||'ORDER');
 document.getElementById('jptOrderDetailOutlet').textContent=oname+' • '+oid;
 body.innerHTML='<div class="jpt-order-big-status"><b>'+esc(st.replaceAll('_',' ').toUpperCase())+'</b><div style="margin-top:5px;color:#aaa;font-size:12px">'+esc(row.created_at?new Date(row.created_at).toLocaleString('en-IN'):'')+'</div></div>'+
 '<div class="jpt-order-detail-card"><div style="font-size:12px;color:#aaa">CUSTOMER</div><div style="font-size:18px;font-weight:1000;margin-top:5px">'+esc(customer)+'</div><div style="margin-top:5px;color:#bbb">'+esc(phone)+'</div><div style="margin-top:8px;color:#bbb">'+esc(address)+'</div></div>'+
 '<div class="jpt-order-detail-card"><div style="font-size:12px;color:#aaa">ORDER ITEMS</div><div class="jpt-order-detail-items">'+parseItems(row).map(i=>{const q=Number(i.qty??i.quantity??1),p=Number(i.price??i.unit_price??0);return '<div class="jpt-order-detail-item"><div><b>'+esc(i.name||i.item_name||'Item')+'</b><div style="color:#aaa;margin-top:3px">Qty × '+q+'</div></div><strong>'+money(p*q)+'</strong></div>'}).join('')+'</div><div style="margin-top:12px;color:#bbb">Item subtotal <span style="float:right">'+money(sub)+'</span></div>'+(del?'<div style="margin-top:6px;color:#bbb">Delivery <span style="float:right">'+money(del)+'</span></div>':'')+(disc?'<div style="margin-top:6px;color:#7bd99a">Discount <span style="float:right">−'+money(disc)+'</span></div>':'')+'<div class="jpt-order-detail-total"><span>Total</span><span>'+money(total)+'</span></div><div style="margin-top:8px;color:#aaa;font-size:11px">Payment • '+esc(payment)+'</div></div>'+
 '<div class="jpt-order-detail-card"><div style="font-size:12px;color:#aaa">RESTAURANT ACTION</div><div class="jpt-order-detail-actions">'+detailActionHtml(row)+'</div></div>';
 body.querySelectorAll('[data-act]').forEach(b=>b.onclick=async()=>{await doAction(b);if(m.classList.contains('show')){const updated=rowsCache.find(x=>String(x.id)===String(id));if(updated&&updated.__status!=='new')m.classList.remove('show');}});
 body.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{const input=b.parentElement.querySelector('.jpt-cob-minutes');if(!input)return;let v=Number(input.value)||30;v=Math.max(5,Math.min(120,v+(b.dataset.time==='plus'?5:-5)));input.value=String(v);});
 m.classList.add('show');
}

function ensureRoot(){
 const panel=document.getElementById('orders');if(!panel)return null;
 injectStyle();
 const oldQueue=document.getElementById('orderQueueBar');if(oldQueue)oldQueue.style.display='none';
 const oldAlarm=document.getElementById('orderAlarm');if(oldAlarm)oldAlarm.style.display='none';
 ensureOrderBellBar();
 const table=panel.querySelector('.tablewrap');if(table)table.style.display='none';
 let tabs=document.getElementById(TABS_ID);
 let root=document.getElementById(ROOT_ID);
 const notice=document.getElementById('ordersNotice');
 if(!tabs){tabs=document.createElement('div');tabs.id=TABS_ID;tabs.className='jpt-cob-tabs';(notice?.parentNode||panel).insertBefore(tabs,notice?.nextSibling||null)}
 if(!root){root=document.createElement('div');root.id=ROOT_ID;(notice?.parentNode||panel).insertBefore(root,tabs.nextSibling)}
 return root;
}

function actionHtml(x){
 const id=esc(x.id||''),st=x.__status;
 if(st==='new')return `<div class="jpt-cob-timepick" aria-label="Preparation time"><button type="button" data-time="minus" data-id="${id}" aria-label="Decrease preparation time">−</button><input class="jpt-cob-minutes" data-id="${id}" type="number" min="5" max="120" step="5" value="${Number(prepDrafts.get(String(x.id))??x.target_minutes??30)}"><button type="button" data-time="plus" data-id="${id}" aria-label="Increase preparation time">+</button><span class="jpt-cob-muted">min</span></div><div class="jpt-cob-decision"><button class="primary" data-act="accept" data-id="${id}">ACCEPT</button><button data-act="reject" data-id="${id}">REJECT</button></div>`;
 if(st==='accepted')return `<button class="primary" data-act="preparing" data-id="${id}">START PREPARING</button>`;
 if(st==='preparing')return `<button class="primary" data-act="ready" data-id="${id}">MARK READY</button>`;
 if(st==='ready')return '<span class="jpt-cob-history">READY • DELIVERY OFFER IS CHECKED AUTOMATICALLY</span>';
 if(st==='out_for_delivery')return '<span class="jpt-cob-history">OUT FOR DELIVERY • DELIVERY FLOW ACTIVE</span>';
 return '';
}

function render(){
 const root=ensureRoot();if(!root)return;renderTabs();
 const filtered=rowsCache.filter(x=>selected==='history'?(x.__status==='completed'||x.__status==='cancelled'):statusView(x.__status)===selected);
 root.innerHTML=`
 <div class="jpt-cob-head"><div><div class="jpt-cob-title">Orders</div><div class="jpt-cob-sub">${central?'Central • All outlets':'Outlet partner • Selected outlet'} • ${rowsCache.length} recent orders</div></div><span class="jpt-cob-mode">${central?'CENTRAL OWNER':'OUTLET PARTNER'}</span></div>
 <div class="jpt-cob-list">${filtered.length?filtered.map(x=>{
  const st=x.__status,total=Number(x.total??x.total_amount??0),sub=Number(x.subtotal??0),disc=Number(x.discount??0),del=Number(x.delivery_charge??0),oid=String(x.outlet_id||'—'),oname=outlets[oid]||oid,time=x.created_at?new Date(x.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—',customer=x.customer_name||x.name||'Customer',phone=x.customer_phone||x.phone||'',payment=x.payment||'—',orderNo=x.order_no||x.order_number||x.order_id||x.id||'ORDER',deadlineAt=x.deadline_at||(x.accepted_at&&Number(x.target_minutes)>0?new Date(new Date(x.accepted_at).getTime()+Number(x.target_minutes)*60000).toISOString():'');
  return `<article class="jpt-cob-card" data-open-order="${esc(x.id||'')}"><div class="jpt-cob-main"><div class="jpt-cob-top"><div><div class="jpt-cob-no">#${esc(orderNo)}</div><div class="jpt-cob-outlet">${esc(oname)}</div><div class="jpt-cob-code">Outlet Code: ${esc(oid)} • ${esc(time)}</div></div><div class="jpt-cob-status">${esc(st.replaceAll('_',' ').toUpperCase())}</div></div>
  <div class="jpt-cob-customer"><div><div class="jpt-cob-customer-name">${esc(customer)}</div><div class="jpt-cob-muted">${esc(phone)}</div></div><div class="jpt-cob-payment">PAYMENT • ${esc(payment)}</div></div>
  ${(st==='accepted'||st==='preparing')&&deadlineAt?`<div class="jpt-cob-prep" data-deadline="${esc(deadlineAt)}">PREPARING • <b class="jpt-cob-countdown">--:--</b> remaining</div>`:''}
  <div class="jpt-cob-items">${itemsHtml(x)}</div><div class="jpt-cob-summary"><div class="jpt-cob-line"><span>Item subtotal</span><span>${money(sub)}</span></div>${del?`<div class="jpt-cob-line"><span>Delivery charge</span><span>${money(del)}</span></div>`:''}${disc?`<div class="jpt-cob-line discount"><span>Discount</span><span>−${money(disc)}</span></div>`:''}<div class="jpt-cob-line total"><span>Total</span><span>${money(total)}</span></div></div></div><button type="button" class="jpt-order-open-btn" data-open-order-btn="${esc(x.id||'')}">VIEW FULL ORDER</button></div>${selected==='history'?'<div class="jpt-cob-actions"><span class="jpt-cob-history">'+(st==='cancelled'?'CANCELLED ORDER':'COMPLETED ORDER')+'</span></div>':'<div class="jpt-cob-actions">'+actionHtml(x)+'</div>'}</article>`
 }).join(''):'<div class="jpt-cob-empty">No '+esc(selected.replaceAll('_',' '))+' orders right now.</div>'}</div>`;
 root.querySelectorAll('[data-act]').forEach(b=>b.onclick=(ev)=>{ev.stopPropagation();return doAction(b)});
 root.querySelectorAll('[data-open-order-btn]').forEach(b=>b.onclick=()=>openOrderDetail(b.dataset.openOrderBtn));
 root.querySelectorAll('.jpt-cob-minutes').forEach(input=>input.oninput=()=>{prepDrafts.set(String(input.dataset.id),Math.max(5,Math.min(120,Number(input.value)||30)));});
 root.querySelectorAll('[data-time]').forEach(b=>{
   const input=b.parentElement.querySelector('.jpt-cob-minutes'); if(!input)return;
   let v=Number(input.value)||30; v=Math.max(5,Math.min(120,v+(b.dataset.time==='plus'?5:-5))); input.value=String(v); prepDrafts.set(String(b.dataset.id),v);
 });
 if(window.__jptCountdownTimer)clearInterval(window.__jptCountdownTimer);
 const tickCountdowns=()=>{
   root.querySelectorAll('.jpt-cob-prep[data-deadline]').forEach(box=>{
     const el=box.querySelector('.jpt-cob-countdown'); if(!el)return;
     const ms=new Date(box.dataset.deadline).getTime()-Date.now(),s=Math.floor(Math.abs(ms)/1000),m=Math.floor(s/60),sec=s%60;
     if(ms>0){box.classList.remove('late');el.textContent=String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}
     else{box.classList.add('late');el.textContent='LATE +'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}
   });
 };
 tickCountdowns();window.__jptCountdownTimer=setInterval(tickCountdowns,1000);
}
async function directAction(row,next,extra={}){
 const target=String(next||'').toLowerCase();
 const patch={status:target,updated_at:new Date().toISOString(),...extra};
 const rank={new:0,accepted:1,preparing:2,ready:3,out_for_delivery:4,delivered:5,completed:5,cancelled:99};
 const transitionAllowed=(from,to)=>{
   if(to==='accepted')return from==='new';
   if(to==='preparing')return from==='accepted';
   if(to==='ready')return from==='accepted'||from==='preparing';
   if(to==='out_for_delivery')return from==='ready';
   if(to==='delivered'||to==='completed')return from==='out_for_delivery';
   if(to==='cancelled')return from==='new';
   return false;
 };
 const applyServerRow=(data)=>{
   Object.assign(row,data);
   row.__status=status(data.status);
   statusLocks.set(String(row.id),{
     status:row.__status,
     target_minutes:data.target_minutes,
     accepted_at:data.accepted_at,
     deadline_at:data.deadline_at,
     updatedAt:data.updated_at||new Date().toISOString(),
     updatedMs:Date.parse(data.updated_at||'')||Date.now(),
     at:Date.now()
   });
   return data;
 };
 const current=await window.sb.from('orders')
   .select('id,status,target_minutes,accepted_at,deadline_at,updated_at')
   .eq('id',row.id).eq('outlet_id',row.outlet_id).maybeSingle();
 if(current.error)throw current.error;
 if(!current.data)throw new Error('Order was not found on the server. Please refresh and try again.');
 let serverStatus=status(current.data.status);

 /* The UI row may be stale because realtime, polling and the action click can
    arrive in a different order. The SERVER is the authority. If the requested
    state is already present, or the server has already advanced beyond the
    requested state, reconcile locally instead of showing a false failure. */
 if(serverStatus===target || (rank[serverStatus]!==undefined && rank[target]!==undefined && rank[serverStatus]>rank[target] && serverStatus!=='cancelled')){
   applyServerRow(current.data);
   return current.data;
 }

 /* Rebase the guarded write on the state we just read from the server.
    This removes the old stale-card race where .eq(status, row.__status)
    rejected an otherwise valid READY transition. */
 if(!transitionAllowed(serverStatus,target)){
   await load().catch(()=>{});
   throw new Error('Order is currently '+serverStatus.toUpperCase()+'. Board refreshed; no invalid status change was made.');
 }

 /* Write first, then verify with a separate SELECT.
    Do not depend on UPDATE ... SELECT returning a row: under RLS/PostgREST
    that response can be empty even when the UPDATE has already committed. */
 let q=await window.sb.from('orders').update(patch)
   .eq('id',row.id).eq('outlet_id',row.outlet_id).eq('status',serverStatus);

 /* Supabase can occasionally complete the UPDATE while the response body
    is empty or the immediate read briefly shows the previous version.
    Recover the committed server state before declaring the action failed. */
 const isAtOrBeyond=(data)=>{
   if(!data)return false;
   const s=status(data.status);
   return s===target || (rank[s]!==undefined && rank[target]!==undefined && rank[s]>rank[target] && s!=='cancelled');
 };
 const readCurrent=async()=>{
   const r=await window.sb.from('orders')
     .select('id,status,target_minutes,accepted_at,deadline_at,updated_at')
     .eq('id',row.id).eq('outlet_id',row.outlet_id).maybeSingle();
   if(r.error)throw r.error;
   return r.data||null;
 };
 const waitForServerState=async(attempts=12,delayMs=500)=>{
   let latest=null;
   for(let i=0;i<attempts;i++){
     latest=await readCurrent();
     if(isAtOrBeyond(latest)){
       applyServerRow(latest);
       return latest;
     }
     if(i<attempts-1)await new Promise(resolve=>setTimeout(resolve,delayMs));
   }
   return null;
 };

 if(q.error){
   const recovered=await waitForServerState();
   if(recovered)return recovered;
   throw q.error;
 }

 /* If the write returned no row, first give the server a short bounded
    window to expose the committed state. This avoids a false failure toast
    when the database write already succeeded. */
 if(!q.data){
   const recovered=await waitForServerState();
   if(recovered)return recovered;

   const retry=await readCurrent();
   if(!retry)throw new Error('Order was not found on the server. Please refresh and try again.');
   const retryStatus=status(retry.status);
   if(retryStatus!==serverStatus){
     throw new Error('Order changed on the server to '+retryStatus.toUpperCase()+'. Board refreshed; please retry.');
   }

   /* Bounded optimistic-concurrency fallback:
      if the row is still exactly the version we just read, retry the write
      without the status predicate. The updated_at predicate prevents an
      older operator action from overwriting a newer status. */
   if(retry.updated_at===current.data.updated_at){
     const retryWrite=await window.sb.from('orders').update(patch)
       .eq('id',row.id).eq('outlet_id',row.outlet_id)
       .eq('updated_at',current.data.updated_at);
     if(retryWrite.error){
       const recoveredAfterError=await waitForServerState();
       if(recoveredAfterError)return recoveredAfterError;
       throw retryWrite.error;
     }

     const recoveredAfterRetry=await waitForServerState(6,250);
     if(recoveredAfterRetry)return recoveredAfterRetry;
   }

   throw new Error('Order status could not be confirmed by the server. Board refreshed; please retry.');
 }

 applyServerRow(q.data);
 if(target!=='new'){
   try{window.JPTPartnerOrderAlertV4?.stop?.();window.stopOrderAlarm?.();}catch(e){}
 }
 return q.data;
}

async function doAction(btn){
 const row=rowsCache.find(x=>String(x.id)===String(btn.dataset.id));if(!row)return;
 const act=btn.dataset.act;btn.disabled=true;
 try{
  if(act==='reject'){
   if(!confirm('Reject this customer order?'))return;
   await directAction(row,'cancelled',{rejection_reason:'Rejected by restaurant'});
  }else if(act==='accept'){
   const m=Math.max(5,Math.min(120,Number(prepDrafts.get(String(row.id))??btn.closest('.jpt-cob-actions')?.querySelector('.jpt-cob-minutes')?.value??row.target_minutes??30)));
   const now=new Date(),deadline=new Date(now.getTime()+m*60000);
   await directAction(row,'accepted',{target_minutes:m,accepted_at:now.toISOString(),deadline_at:deadline.toISOString(),eta_minutes:m+20});
   const verify=await window.sb.from('orders').select('status,target_minutes,accepted_at,deadline_at').eq('id',row.id).eq('outlet_id',row.outlet_id).maybeSingle();
   if(verify.error)throw verify.error;
   if(!verify.data || String(verify.data.status).toLowerCase()!=='accepted' || !verify.data.deadline_at)throw new Error('Server did not confirm order acceptance/timer');
   Object.assign(row,verify.data);
   prepDrafts.delete(String(row.id));
   selected='preparing';
  }else{
   await directAction(row,act);
   if(act==='preparing')selected='preparing';
   else if(act==='ready')selected='ready';
   else if(act==='out_for_delivery')selected='out_for_delivery';
   else if(act==='completed')selected='history';
   if(act==='ready'){
    try{
     const rr=await window.sb.rpc('delivery_offer_next',{p_order_id:Number(row.id)});
     if(rr.error)throw rr.error;
     if(typeof window.toast==='function')window.toast(rr.data?.status==='offered'?'Delivery partner offer sent':rr.data?.status==='no_online_rider'?'READY — no online delivery partner available':'Delivery assignment checked');
    }catch(e){if(typeof window.toast==='function')window.toast('Delivery assignment check failed: '+(e?.message||e));}
   }
  }
  if(typeof window.toast==='function')window.toast(act==='accept'?'Order accepted • timer started':act==='reject'?'Order rejected':act==='preparing'?'Order is PREPARING':act==='ready'?'Order marked READY':act==='out_for_delivery'?'Order moved to OUT FOR DELIVERY':'Order marked DELIVERED');
  render();
  await load();
 }catch(e){if(typeof window.toast==='function')window.toast('Order update failed: '+(e?.message||e));}
 finally{btn.disabled=false}
}

async function load(){
 const seq=++loadSeq;
 try{
  if(!window.sb)return;
  central=await isCentral();
  await loadOutlets();
  const freshRows=await loadRows();
  /* Ignore an older in-flight refresh. A READY/ACCEPT action can otherwise
     be overwritten visually by a slower request that started before the action. */
  if(seq!==loadSeq)return;
  const nowMs=Date.now();
  freshRows.forEach(r=>{
    const lock=statusLocks.get(String(r.id));
    if(!lock)return;
    if(nowMs-lock.at>120000){statusLocks.delete(String(r.id));return;}
    const serverMs=Date.parse(r.updated_at||r.created_at||0)||0;
    if(serverMs < lock.updatedMs){r.status=lock.status;r.__status=lock.status;r.target_minutes=lock.target_minutes;r.accepted_at=lock.accepted_at;r.deadline_at=lock.deadline_at;r.updated_at=lock.updatedAt;}
    else statusLocks.delete(String(r.id));
  });
  rowsCache=freshRows;
  const hasNew=rowsCache.some(x=>x.__status==='new'&&OWNER_OUTLET_CODES.has(String(x.outlet_id||'')));
  if(hasNew) selected='new';
  else if(selected==='new') selected='preparing';
  const currentNew=rowsCache.filter(x=>x.__status==='new'&&OWNER_OUTLET_CODES.has(String(x.outlet_id||'')));
  currentNew.forEach(x=>pendingNew.set(String(x.id||x.order_no),x));
  syncCentralBell();
  syncOrderBellBar();
  /* On the first load after app start/reopen, baseline existing NEW orders
     silently. They must remain visible, but must not be treated as freshly
     created just because the page was refreshed. */
  if(!alertBaselineReady){
   currentNew.forEach(x=>alertedNewIds.add(String(x.id||x.order_no)));
   alertBaselineReady=true;
  }else{
   const freshNew=currentNew.find(x=>!alertedNewIds.has(String(x.id||x.order_no)));
   if(freshNew){
    alertedNewIds.add(String(freshNew.id||freshNew.order_no));
    selected='new';
    try{window.showPanel?.('orders')}catch(e){}
    if(typeof window.showOrderAlarm==='function')window.showOrderAlarm(freshNew);
   }
  }
  alertedNewIds.forEach(id=>{if(!currentNew.some(x=>String(x.id||x.order_no)===id))alertedNewIds.delete(id)});
  const notice=document.getElementById('ordersNotice');
  if(notice)notice.textContent=(central?'Central':'Selected outlet')+' board • '+rowsCache.length+' latest orders';
  const count=document.getElementById('ordersCount');if(count)count.textContent=String(rowsCache.filter(x=>x.__status===selected).length);
  render();
  syncOrderBellBar();
 }catch(e){console.warn('[JPT Central Orders V2]',e);const n=document.getElementById('ordersNotice');if(n)n.innerHTML='<span class="danger">'+esc(e?.message||e)+'</span>'}
}

async function bindRealtime(){
 try{
  if(channel)await window.sb.removeChannel(channel);
  const name='jpt-central-orders-five-'+Date.now();
  channel=window.sb.channel(name)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},p=>{
      const o=p?.new||{};
      if(OWNER_OUTLET_CODES.has(String(o.outlet_id||'')) && String(o.status||'').toLowerCase()==='new'){
        pendingNew.set(String(o.id||o.order_no),o);alertedNewIds.add(String(o.id||o.order_no));selected='new';try{window.showPanel?.('orders')}catch(e){};
        if(typeof window.showOrderAlarm==='function')window.showOrderAlarm(o);
        setTimeout(()=>{try{openOrderDetail(o.id)}catch(e){}},180);
      }
      load().catch(()=>{});
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},p=>{
      const o=p?.new||{};
      if(OWNER_OUTLET_CODES.has(String(o.outlet_id||'')) && String(o.status||'').toLowerCase()!=='new')pendingNew.delete(String(o.id||o.order_no));
      load().catch(()=>{});
    }).subscribe((status,err)=>{
      console.log('[JPT Central Orders V2] realtime status',status,err||'');
      if(status==='SUBSCRIBED') load().catch(()=>{});
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED') setTimeout(()=>load().catch(()=>{}),1000);
    });
 }catch(e){console.warn('[JPT Central Orders V2] realtime unavailable',e)}
}

function start(){
 try{window.__JPTDisableLegacyOrderRuntime?.()}catch(e){}
 ensureRoot();load();clearInterval(timer);timer=setInterval(load,15000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load()});
 const sel=document.getElementById('outletSelect');if(sel)sel.addEventListener('change',()=>{lastNewest='';selected='new';load()});
 bindRealtime();
}

window.JPTPartnerOrdersUI={version:'v3',reload:load,render,openOrderDetail};
let n=0;const boot=setInterval(()=>{n++;if(document.getElementById('orders')&&window.sb){clearInterval(boot);start()}if(n>60)clearInterval(boot)},250);
})();