/* JPT Partner Orders Operations UI V1
   Controlled visual layer only.
   Preserves existing Supabase order flow and existing action functions.
*/
(function(){
  'use strict';
  if(window.JPTPartnerOrdersUI) return;

  const STYLE_ID='jpt-orders-ops-style-v1';
  const ROOT_ID='jptOrdersOpsV1';
  const TABS_ID='jptOrdersOpsTabsV1';
  let timer=null, selected='new', lastNewest='';

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
  const outlet=()=>localStorage.getItem('jpt_admin_outlet')||document.getElementById('outletSelect')?.value||'';

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent=`
      #${ROOT_ID}{margin-top:10px}
      .jpt-ops-tabs{display:flex;gap:7px;overflow:auto;padding:4px 0 10px;scrollbar-width:none}
      .jpt-ops-tabs::-webkit-scrollbar{display:none}
      .jpt-ops-tab{flex:0 0 auto;background:#151515;color:#ddd;border:1px solid #3a3a3a;border-radius:12px;padding:9px 12px;font-weight:850;cursor:pointer}
      .jpt-ops-tab.active{background:#d8ae42;color:#111;border-color:#d8ae42}
      .jpt-ops-list{display:grid;gap:10px}
      .jpt-ops-card{background:#101010;border:1px solid #39301d;border-radius:16px;padding:14px;box-shadow:0 8px 22px #0006}
      .jpt-ops-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .jpt-ops-no{font-size:18px;font-weight:950;color:#fff;word-break:break-word}
      .jpt-ops-status{font-size:10px;font-weight:950;border:1px solid #604d1c;border-radius:99px;padding:5px 9px;color:#d8ae42;white-space:nowrap}
      .jpt-ops-customer{margin-top:7px;font-weight:800}
      .jpt-ops-muted{color:#999;font-size:12px}
      .jpt-ops-items{margin:10px 0;padding:10px;border-radius:11px;background:#171717;border:1px solid #292929}
      .jpt-ops-total{font-size:18px;font-weight:950;color:#d8ae42}
      .jpt-ops-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}
      .jpt-ops-actions button,.jpt-ops-actions select{padding:9px 10px;border-radius:10px;border:1px solid #3a3a3a;background:#151515;color:#fff}
      .jpt-ops-actions .primary{background:#d8ae42;color:#111;border-color:#d8ae42;font-weight:950}
      .jpt-ops-empty{padding:24px 12px;text-align:center;border:1px dashed #3a3a3a;border-radius:14px;color:#999}
      @media(max-width:600px){.jpt-ops-no{font-size:16px}.jpt-ops-card{padding:12px}}
    `;document.head.appendChild(s);
  }

  function ensureRoot(){
    const panel=document.getElementById('orders'); if(!panel) return null;
    injectStyle();
    let tabs=document.getElementById(TABS_ID);
    let root=document.getElementById(ROOT_ID);
    const notice=document.getElementById('ordersNotice');
    const table=panel.querySelector('.tablewrap');
    if(table) table.style.display='none';
    if(!tabs){
      tabs=document.createElement('div');tabs.id=TABS_ID;tabs.className='jpt-ops-tabs';
      (notice?.parentNode||panel).insertBefore(tabs,notice?.nextSibling||null);
    }
    if(!root){
      root=document.createElement('div');root.id=ROOT_ID;
      (notice?.parentNode||panel).insertBefore(root,tabs.nextSibling);
    }
    return root;
  }

  const tabsDef=[
    ['new','NEW'],['accepted','ACCEPTED'],['preparing','PREPARING'],
    ['ready','READY'],['out_for_delivery','OUT FOR DELIVERY'],['completed','DELIVERED'],['cancelled','CANCELLED']
  ];

  function renderTabs(rows){
    const tabs=document.getElementById(TABS_ID);if(!tabs)return;
    const counts={};tabsDef.forEach(x=>counts[x[0]]=0);
    rows.forEach(x=>{const s=String(x.status||'new').toLowerCase();if(s in counts)counts[s]++});
    tabs.innerHTML=tabsDef.map(([k,label])=>`<button class="jpt-ops-tab ${selected===k?'active':''}" data-status="${k}">${label} <span>${counts[k]||0}</span></button>`).join('');
    tabs.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{selected=b.dataset.status;render(rowsCache)});
  }

  let rowsCache=[];
  function items(x){
    return (Array.isArray(x.items)?x.items:[]).map(i=>`${esc(i.name||i.item_name||'Item')} × ${Number(i.qty??i.quantity??1)}`).join('<br>')||'Items not available';
  }
  function actionHtml(x,status){
    const id=esc(x.id||'');
    if(status==='new') return `<select class="jpt-minutes"><option>30</option><option>40</option><option>50</option><option>60</option></select><button class="primary" data-act="accept" data-id="${id}">ACCEPT</button><button data-act="reject" data-id="${id}">REJECT</button>`;
    if(status==='accepted') return `<button class="primary" data-act="preparing" data-id="${id}">START PREPARING</button>`;
    if(status==='preparing') return `<button class="primary" data-act="ready" data-id="${id}">READY</button>`;
    if(status==='ready') return `<button class="primary" data-act="out" data-id="${id}">OUT FOR DELIVERY</button>`;
    if(status==='out_for_delivery') return `<button class="primary" data-act="done" data-id="${id}">DELIVERED / COMPLETED</button>`;
    return '';
  }

  function render(rows){
    rowsCache=rows||[];
    const root=ensureRoot();if(!root)return;
    renderTabs(rowsCache);
    const filtered=rowsCache.filter(x=>String(x.status||'new').toLowerCase()===selected);
    root.innerHTML=`<div class="jpt-ops-list">${filtered.length?filtered.map(x=>{
      const status=String(x.status||'new').toLowerCase();
      const total=x.total??x.grand_total??x.amount??0;
      const time=x.created_at?new Date(x.created_at).toLocaleString('en-IN'):'—';
      return `<article class="jpt-ops-card">
        <div class="jpt-ops-head"><div class="jpt-ops-no">${esc(x.order_no||x.order_number||x.id||'ORDER')}</div><div class="jpt-ops-status">${esc(status.replaceAll('_',' ').toUpperCase())}</div></div>
        <div class="jpt-ops-customer">${esc(x.customer_name||x.name||'Customer')}</div>
        <div class="jpt-ops-muted">${esc(x.customer_phone||x.phone||'')} · ${esc(time)}</div>
        <div class="jpt-ops-items">${items(x)}</div>
        <div class="jpt-ops-total">${money(total)}</div>
        <div class="jpt-ops-actions">${actionHtml(x,status)}</div>
      </article>`;
    }).join(''):`<div class="jpt-ops-empty">No ${esc(selected.replaceAll('_',' '))} orders right now.</div>`}</div>`;
    root.querySelectorAll('[data-act]').forEach(btn=>btn.onclick=()=>doAction(btn));
  }

  async function doAction(btn){
    const id=btn.dataset.id, act=btn.dataset.act;
    try{
      if(act==='accept'){
        const sel=btn.parentElement.querySelector('.jpt-minutes');
        if(typeof window.acceptOrder==='function') await window.acceptOrder(id,sel?.value||30);
      }else{
        const map={reject:'cancelled',preparing:'preparing',ready:'ready',out:'out_for_delivery',done:'completed'};
        if(act==='reject' && !confirm('Reject this customer order?')) return;
        if(typeof window.orderAction!=='function') throw new Error('Existing order action is unavailable');
        await window.orderAction(id,map[act],act==='reject'?{rejection_reason:'Rejected by restaurant'}:undefined);
      }
      if(typeof window.toast==='function') window.toast(act==='accept'?'Order accepted':act==='preparing'?'Order is PREPARING':act==='ready'?'Order marked READY':act==='out'?'Order moved to OUT FOR DELIVERY':act==='done'?'Order marked DELIVERED / COMPLETED':'Order rejected');
      await load();
    }catch(e){if(typeof window.toast==='function')window.toast('Order action failed: '+(e.message||e));}
  }

  async function load(){
    try{
      const id=outlet();if(!id||!window.sb)return;
      const r=await window.sb.from('orders').select('*').eq('outlet_id',id).order('created_at',{ascending:false}).limit(50);
      if(r.error) throw r.error;
      const rows=r.data||[];
      const newest=rows[0];
      if(newest){
        const stamp=String(newest.created_at||'')+'|'+String(newest.id||'');
        if(lastNewest && stamp!==lastNewest && String(newest.status||'').toLowerCase()==='new'){
          selected='new';
          try{window.showPanel?.('orders')}catch(e){}
        }
        lastNewest=stamp;
      }
      render(rows);
    }catch(e){console.warn('[JPT Orders UI] load failed',e);}
  }

  function wrapAlarm(){
    if(window.__jptOrdersUiAlarmWrapped)return;
    if(typeof window.showOrderAlarm!=='function')return;
    const old=window.showOrderAlarm;
    window.showOrderAlarm=function(order){
      selected='new';
      try{window.showPanel?.('orders')}catch(e){}
      const r=old.apply(this,arguments);
      load();
      return r;
    };
    window.__jptOrdersUiAlarmWrapped=true;
  }

  function start(){
    ensureRoot();wrapAlarm();load();
    clearInterval(timer);timer=setInterval(load,5000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load()});
    const sel=document.getElementById('outletSelect');
    if(sel) sel.addEventListener('change',()=>{lastNewest='';selected='new';setTimeout(load,300)});
  }

  window.JPTPartnerOrdersUI={version:'v1',reload:load,render};
  let n=0;const boot=setInterval(()=>{n++;if(document.getElementById('orders')&&window.sb){clearInterval(boot);start()}if(n>40)clearInterval(boot)},250);
})();