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
const STATUSES=[
 ['new','NEW'],['accepted','ACCEPTED'],['preparing','PREPARING'],
 ['ready','READY'],['out_for_delivery','OUT FOR DELIVERY'],['completed','DELIVERED'],['cancelled','CANCELLED']
];
let timer=null,channel=null,rowsCache=[],outlets={},selected='new',central=false,lastNewest='';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const status=s=>{s=String(s||'new').toLowerCase();return s==='canceled'?'cancelled':s==='completed'?'completed':s};
const selectedOutlet=()=>localStorage.getItem('jpt_admin_outlet')||document.getElementById('outletSelect')?.value||'';
const isCentral=async()=>{try{const r=await window.sb?.rpc(CENTRAL_RPC);return !r?.error&&r.data===true}catch(e){return false}};

function injectStyle(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
 #${ROOT_ID}{margin-top:10px}
 .jpt-cob-head{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:8px 0}
 .jpt-cob-mode{padding:7px 10px;border:1px solid #5c4920;border-radius:99px;color:#f4d77a;background:#151515;font-size:11px;font-weight:900}
 .jpt-cob-tabs{display:flex;gap:7px;overflow:auto;padding:4px 0 10px;scrollbar-width:none}
 .jpt-cob-tabs::-webkit-scrollbar{display:none}
 .jpt-cob-tab{flex:0 0 auto;background:#151515;color:#ddd;border:1px solid #3a3a3a;border-radius:12px;padding:9px 12px;font-weight:900}
 .jpt-cob-tab.active{background:#d8ae42;color:#111;border-color:#d8ae42}
 .jpt-cob-list{display:grid;gap:10px}
 .jpt-cob-card{background:#101010;border:1px solid #39301d;border-radius:16px;padding:14px;box-shadow:0 8px 22px #0006}
 .jpt-cob-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
 .jpt-cob-no{font-size:18px;font-weight:950}
 .jpt-cob-status{font-size:10px;font-weight:950;border:1px solid #604d1c;border-radius:99px;padding:5px 9px;color:#d8ae42;white-space:nowrap}
 .jpt-cob-outlet{margin-top:5px;font-weight:950;color:#f4d77a}
 .jpt-cob-code{font-size:10px;color:#aaa}
 .jpt-cob-muted{color:#999;font-size:12px;margin-top:3px}
 .jpt-cob-items{margin:10px 0;padding:10px;border-radius:11px;background:#171717;border:1px solid #292929;line-height:1.55}
 .jpt-cob-total{font-size:18px;font-weight:950;color:#d8ae42}
 .jpt-cob-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}
 .jpt-cob-actions button,.jpt-cob-actions select{padding:9px 10px;border-radius:10px;border:1px solid #3a3a3a;background:#151515;color:#fff}
 .jpt-cob-actions .primary{background:#d8ae42;color:#111;border-color:#d8ae42;font-weight:950}
 .jpt-cob-empty{padding:24px 12px;text-align:center;border:1px dashed #3a3a3a;border-radius:14px;color:#999}
 .jpt-cob-note{font-size:11px;color:#999;margin:5px 0 10px}
 @media(max-width:600px){.jpt-cob-card{padding:12px}.jpt-cob-no{font-size:16px}}
 `;document.head.appendChild(s);
}

async function loadOutlets(){
 const r=await window.sb.from('outlets').select('code,name').order('name',{ascending:true});
 if(r.error)throw r.error;
 outlets=Object.fromEntries((r.data||[]).map(x=>[String(x.code),String(x.name||x.code)]));
}

function itemsHtml(x){
 let a=x?.items;
 if(typeof a==='string'){try{a=JSON.parse(a)}catch(e){a=[]}}
 if(!Array.isArray(a))a=[];
 return a.map(i=>`${esc(i.name||i.item_name||'Item')} × ${Number(i.qty??i.quantity??1)}`).join('<br>')||'Items not available';
}

async function loadRows(){
 const q=window.sb.from('orders').select('*').order('created_at',{ascending:false}).limit(200);
 const r=central?q:q.eq('outlet_id',selectedOutlet());
 if(r.error)throw r.error;
 let rows=r.data||[];
 if(!central)rows=rows.filter(x=>String(x.outlet_id||'')===String(selectedOutlet()));
 rows.forEach(x=>x.__status=status(x.status));
 rowsCache=rows;
 return rows;
}

function renderTabs(){
 const el=document.getElementById(TABS_ID);if(!el)return;
 const counts=Object.fromEntries(STATUSES.map(x=>[x[0],0]));
 rowsCache.forEach(x=>{if(counts[x.__status]!==undefined)counts[x.__status]++});
 el.innerHTML=STATUSES.map(([k,label])=>`<button class="jpt-cob-tab ${selected===k?'active':''}" data-status="${k}">${label} <span>${counts[k]||0}</span></button>`).join('');
 el.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{selected=b.dataset.status;render()});
}

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
 const root=ensureRoot();if(!root)return;
 renderTabs();
 const filtered=rowsCache.filter(x=>x.__status===selected);
 root.innerHTML=`
 <div class="jpt-cob-head"><div><b>Central Live Orders</b><div class="jpt-cob-note">${central?'ALL OUTLETS — outlet selection is not required':'SELECTED OUTLET — partner scope'}</div></div><span class="jpt-cob-mode">${central?'CENTRAL OWNER':'OUTLET PARTNER'}</span></div>
 <div class="jpt-cob-list">${filtered.length?filtered.map(x=>{
   const st=x.__status,total=x.total??x.total_amount??x.grand_total??x.amount??0;
   const outletId=String(x.outlet_id||'—'),outletName=outlets[outletId]||outletId;
   const time=x.created_at?new Date(x.created_at).toLocaleString('en-IN'):'—';
   const customer=x.customer_name||x.name||x.customer_phone||'Customer';
   return `<article class="jpt-cob-card">
    <div class="jpt-cob-top"><div><div class="jpt-cob-no">#${esc(x.order_no||x.order_number||x.order_id||x.id||'ORDER')}</div><div class="jpt-cob-outlet">${esc(outletName)}</div><div class="jpt-cob-code">Outlet Code: ${esc(outletId)}</div></div><div class="jpt-cob-status">${esc(st.replaceAll('_',' ').toUpperCase())}</div></div>
    <div class="jpt-cob-muted">${esc(customer)} · ${esc(x.customer_phone||x.phone||'')} · ${esc(time)}</div>
    <div class="jpt-cob-items">${itemsHtml(x)}</div>
    <div class="jpt-cob-total">${money(total)}</div>
    <div class="jpt-cob-actions">${actionHtml(x)}</div>
   </article>`;
 }).join(''):`<div class="jpt-cob-empty">No ${esc(selected.replaceAll('_',' '))} orders right now.</div>`}</div>`;
 root.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>doAction(b));
}

async function directAction(row,next,extra={}){
 const patch={status:next,updated_at:new Date().toISOString(),...extra};
 const q=window.sb.from('orders').update(patch).eq('id',row.id).eq('outlet_id',row.outlet_id);
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
  const name='jpt-central-orders-'+Date.now();
  channel=window.sb.channel(name).on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},()=>load()).on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},()=>load()).subscribe();
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