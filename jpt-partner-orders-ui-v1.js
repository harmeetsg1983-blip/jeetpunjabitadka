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
if(window.JPTPartnerOrdersUI?.version==='v2') return;

const STYLE_ID='jpt-orders-central-v2-style';
const ROOT_ID='jptOrdersCentralV2';
const TABS_ID='jptOrdersCentralV2Tabs';
const CENTRAL_RPC='partner_access_is_central_owner';
const OWNER_OUTLET_CODES=new Set(['JPT-001','SOP-002','NME-004','PFA-003','TOP-005']);
const STATUS_VIEWS=[['new','NEW'],['preparing','PREPARING'],['ready','READY'],['out_for_delivery','OUT FOR DELIVERY'],['delivered','DELIVERED'],['history','HISTORY']];
const statusView=s=>{s=status(s);if(s==='accepted'||s==='preparing')return 'preparing';if(s==='completed')return 'delivered';return s};
let timer=null,channel=null,rowsCache=[],outlets={},selected='new',central=false,lastNewest='';
let pendingNew=new Map();

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
 .jpt-cob-list{display:grid;gap:10px}.jpt-cob-card{background:#111;border:1px solid #302a1d;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px #0005}.jpt-cob-main{padding:14px}.jpt-cob-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.jpt-cob-no{font-size:17px;font-weight:950}.jpt-cob-outlet{margin-top:5px;font-weight:950;color:#f4d77a}.jpt-cob-code{font-size:10px;color:#777;margin-top:2px}.jpt-cob-status{font-size:9px;font-weight:950;border:1px solid #604d1c;border-radius:99px;padding:5px 9px;color:#f4d77a;white-space:nowrap}
 .jpt-cob-customer{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid #252525}.jpt-cob-customer-name{font-weight:900}.jpt-cob-muted{color:#888;font-size:10px;margin-top:3px}.jpt-cob-items{margin-top:11px;border:1px solid #292929;border-radius:13px;background:#171717;overflow:hidden}.jpt-cob-item{display:flex;justify-content:space-between;gap:10px;padding:10px 11px;border-bottom:1px solid #292929;font-size:12px}.jpt-cob-item:last-child{border-bottom:0}.jpt-cob-item-name{font-weight:800}.jpt-cob-item-price{color:#ddd;white-space:nowrap}
 .jpt-cob-summary{margin-top:10px;border-top:1px solid #252525;padding-top:9px}.jpt-cob-line{display:flex;justify-content:space-between;gap:12px;padding:3px 0;color:#aaa;font-size:11px}.jpt-cob-line.discount{color:#79d99a}.jpt-cob-line.total{color:#fff;font-size:16px;font-weight:950;padding-top:8px;margin-top:5px;border-top:1px solid #343434}.jpt-cob-payment{display:inline-flex;margin-top:8px;padding:6px 9px;border-radius:9px;background:#191919;border:1px solid #292929;color:#bbb;font-size:10px;font-weight:900}.jpt-cob-actions{display:flex;gap:7px;flex-wrap:wrap;padding:11px 14px;background:#0c0c0c;border-top:1px solid #292929}.jpt-cob-actions button,.jpt-cob-actions select{padding:9px 11px;border-radius:10px;border:1px solid #393939;background:#151515;color:#fff;font-weight:850}.jpt-cob-actions .primary{background:#f0c94a;color:#111;border-color:#f0c94a;font-weight:950}.jpt-cob-empty{padding:35px 12px;text-align:center;border:1px dashed #343434;border-radius:15px;color:#777}.jpt-cob-history{color:#aaa;font-size:11px}@media(max-width:600px){.jpt-cob-main{padding:12px}.jpt-cob-no{font-size:15px}.jpt-cob-item{font-size:11px}}
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
function ensureRoot(){
 const panel=document.getElementById('orders');if(!panel)return null;
 injectStyle();
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
 if(st==='new')return `<select class="jpt-cob-minutes"><option>15</option><option>20</option><option>25</option><option selected>30</option><option>35</option><option>40</option><option>50</option><option>60</option></select><button class="primary" data-act="accept" data-id="${id}">ACCEPT</button><button data-act="reject" data-id="${id}">REJECT</button>`;
 if(st==='accepted')return `<button class="primary" data-act="preparing" data-id="${id}">START PREPARING</button>`;
 if(st==='preparing')return `<button class="primary" data-act="ready" data-id="${id}">READY</button>`;
 if(st==='ready')return `<button class="primary" data-act="out_for_delivery" data-id="${id}">OUT FOR DELIVERY</button>`;
 if(st==='out_for_delivery')return `<button class="primary" data-act="completed" data-id="${id}">DELIVERED</button>`;
 return '';
}

function render(){
 const root=ensureRoot();if(!root)return;renderTabs();
 const filtered=rowsCache.filter(x=>selected==='history'?(x.__status==='completed'||x.__status==='cancelled'):statusView(x.__status)===selected);
 root.innerHTML=`
 <div class="jpt-cob-head"><div><div class="jpt-cob-title">Orders</div><div class="jpt-cob-sub">${central?'Central • All outlets':'Outlet partner • Selected outlet'} • ${rowsCache.length} recent orders</div></div><span class="jpt-cob-mode">${central?'CENTRAL OWNER':'OUTLET PARTNER'}</span></div>
 <div class="jpt-cob-list">${filtered.length?filtered.map(x=>{
  const st=x.__status,total=Number(x.total??x.total_amount??0),sub=Number(x.subtotal??0),disc=Number(x.discount??0),del=Number(x.delivery_charge??0),oid=String(x.outlet_id||'—'),oname=outlets[oid]||oid,time=x.created_at?new Date(x.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—',customer=x.customer_name||x.name||'Customer',phone=x.customer_phone||x.phone||'',payment=x.payment||'—',orderNo=x.order_no||x.order_number||x.order_id||x.id||'ORDER';
  return `<article class="jpt-cob-card"><div class="jpt-cob-main"><div class="jpt-cob-top"><div><div class="jpt-cob-no">#${esc(orderNo)}</div><div class="jpt-cob-outlet">${esc(oname)}</div><div class="jpt-cob-code">Outlet Code: ${esc(oid)} • ${esc(time)}</div></div><div class="jpt-cob-status">${esc(st.replaceAll('_',' ').toUpperCase())}</div></div>
  <div class="jpt-cob-customer"><div><div class="jpt-cob-customer-name">${esc(customer)}</div><div class="jpt-cob-muted">${esc(phone)}</div></div><div class="jpt-cob-payment">PAYMENT • ${esc(payment)}</div></div>
  <div class="jpt-cob-items">${itemsHtml(x)}</div><div class="jpt-cob-summary"><div class="jpt-cob-line"><span>Item subtotal</span><span>${money(sub)}</span></div>${del?`<div class="jpt-cob-line"><span>Delivery charge</span><span>${money(del)}</span></div>`:''}${disc?`<div class="jpt-cob-line discount"><span>Discount</span><span>−${money(disc)}</span></div>`:''}<div class="jpt-cob-line total"><span>Total</span><span>${money(total)}</span></div></div></div>${selected==='history'?'<div class="jpt-cob-actions"><span class="jpt-cob-history">'+(st==='cancelled'?'CANCELLED ORDER':'COMPLETED ORDER')+'</span></div>':'<div class="jpt-cob-actions">'+actionHtml(x)+'</div>'}</article>`
 }).join(''):'<div class="jpt-cob-empty">No '+esc(selected.replaceAll('_',' '))+' orders right now.</div>'}</div>`;
 root.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>doAction(b));
}
async function directAction(row,next,extra={}){
 const patch={status:next,updated_at:new Date().toISOString(),...extra};
 const q=await window.sb.from('orders').update(patch).eq('id',row.id).eq('outlet_id',row.outlet_id);
 if(q.error)throw q.error;
 return true;
}

async function doAction(btn){
 const row=rowsCache.find(x=>String(x.id)===String(btn.dataset.id));if(!row)return;
 const act=btn.dataset.act;btn.disabled=true;
 try{
  if(act==='reject'){
   if(!confirm('Reject this customer order?'))return;
   await directAction(row,'cancelled',{rejection_reason:'Rejected by restaurant'});
  }else if(act==='accept'){
   const m=Number(btn.parentElement.querySelector('.jpt-cob-minutes')?.value||30);
   const now=new Date(),deadline=new Date(now.getTime()+m*60000);
   await directAction(row,'accepted',{target_minutes:m,accepted_at:now.toISOString(),deadline_at:deadline.toISOString(),eta_minutes:m+20});
  }else{
   await directAction(row,act);
   if(act==='ready'){
    try{
     const rr=await window.sb.rpc('delivery_offer_next',{p_order_id:Number(row.id)});
     if(rr.error)throw rr.error;
     if(typeof window.toast==='function')window.toast(rr.data?.status==='offered'?'Delivery partner offer sent':rr.data?.status==='no_online_rider'?'READY — no online delivery partner available':'Delivery assignment checked');
    }catch(e){if(typeof window.toast==='function')window.toast('Delivery assignment check failed: '+(e?.message||e));}
   }
  }
  if(typeof window.toast==='function')window.toast(act==='accept'?'Order accepted':act==='reject'?'Order rejected':act==='preparing'?'Order is PREPARING':act==='ready'?'Order marked READY':act==='out_for_delivery'?'Order moved to OUT FOR DELIVERY':'Order marked DELIVERED');
  await load();
 }catch(e){if(typeof window.toast==='function')window.toast('Order update failed: '+(e?.message||e));}
 finally{btn.disabled=false}
}

async function load(){
 try{
  if(!window.sb)return;
  central=await isCentral();
  await loadOutlets();
  await loadRows();
  const newest=rowsCache[0];
  rowsCache.filter(x=>x.__status==='new'&&OWNER_OUTLET_CODES.has(String(x.outlet_id||''))).forEach(x=>pendingNew.set(String(x.id||x.order_no),x));
  syncCentralBell();
  if(newest){
   const stamp=String(newest.created_at||'')+'|'+String(newest.id||'')+'|'+String(newest.outlet_id||'');
   if(lastNewest && stamp!==lastNewest && newest.__status==='new'){
    selected='new';
    try{window.showPanel?.('orders')}catch(e){}
    if(typeof window.showOrderAlarm==='function')window.showOrderAlarm(newest);
   }
   lastNewest=stamp;
  }
  const notice=document.getElementById('ordersNotice');
  if(notice)notice.textContent=(central?'Central':'Selected outlet')+' board • '+rowsCache.length+' latest orders';
  const count=document.getElementById('ordersCount');if(count)count.textContent=String(rowsCache.filter(x=>x.__status===selected).length);
  render();
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
        pendingNew.set(String(o.id||o.order_no),o);selected='new';try{window.showPanel?.('orders')}catch(e){};
        if(typeof window.showOrderAlarm==='function')window.showOrderAlarm(o);
      }
      load().catch(()=>{});
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},p=>{
      const o=p?.new||{};
      if(OWNER_OUTLET_CODES.has(String(o.outlet_id||'')) && String(o.status||'').toLowerCase()!=='new')pendingNew.delete(String(o.id||o.order_no));
      load().catch(()=>{});
    }).subscribe();
 }catch(e){console.warn('[JPT Central Orders V2] realtime unavailable',e)}
}

function start(){
 ensureRoot();load();clearInterval(timer);timer=setInterval(load,5000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load()});
 const sel=document.getElementById('outletSelect');if(sel)sel.addEventListener('change',()=>{lastNewest='';selected='new';load()});
 bindRealtime();
}

window.JPTPartnerOrdersUI={version:'v2',reload:load,render};
let n=0;const boot=setInterval(()=>{n++;if(document.getElementById('orders')&&window.sb){clearInterval(boot);start()}if(n>60)clearInterval(boot)},250);
})();