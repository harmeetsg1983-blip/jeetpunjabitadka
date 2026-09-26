/* JPT Partner Delivery Tracking V1
 * Additive UI layer. Does not modify rider app or customer app.
 * Uses partner_delivery_tracking_snapshot() for least-privilege assignment data.
 */
(function(){
  'use strict';
  const VERSION='delivery-tracking-v1';
  let timer=null, channel=null, booted=false;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusMap={
    offered:{label:'SEARCHING FOR PARTNER', cls:'search'},
    pending:{label:'SEARCHING FOR PARTNER', cls:'search'},
    accepted:{label:'PARTNER ACCEPTED • COMING TO RESTAURANT', cls:'accepted'},
    picked_up:{label:'PICKED UP', cls:'picked'},
    out_for_delivery:{label:'OUT FOR DELIVERY', cls:'out'},
    delivered:{label:'DELIVERED', cls:'done'},
    rejected:{label:'PARTNER REJECTED', cls:'reject'},
    cancelled:{label:'ASSIGNMENT CANCELLED', cls:'reject'}
  };
  function injectStyle(){
    if(document.getElementById('jptDeliveryTrackingStyle'))return;
    const s=document.createElement('style');s.id='jptDeliveryTrackingStyle';
    s.textContent=`
      #jptDeliveryTracking{margin:10px 0;padding:12px;border:1px solid #3c3018;border-radius:14px;background:#0e0e0e}
      #jptDeliveryTracking h4{margin:0 0 8px;color:#d8ae42}
      #jptDeliveryTracking .jpt-dt-note{font-size:11px;color:#999}
      .jpt-dt-chip{display:inline-flex;align-items:center;gap:5px;margin-top:5px;padding:4px 8px;border-radius:99px;border:1px solid #444;background:#151515;color:#ddd;font-size:10px;font-weight:800}
      .jpt-dt-chip.search{border-color:#6d5a27;color:#d8ae42}
      .jpt-dt-chip.accepted{border-color:#80651f;color:#f0c75b}
      .jpt-dt-chip.picked,.jpt-dt-chip.out{border-color:#2c7145;color:#79e39b}
      .jpt-dt-chip.done{border-color:#27733e;color:#79e39b}
      .jpt-dt-chip.reject{border-color:#7b2828;color:#ff9292}
      .jpt-dt-partner{display:block;color:#aaa;font-size:10px;margin-top:3px}
    `;
    document.head.appendChild(s);
  }
  function ensurePanel(){
    const orders=document.getElementById('orders');
    if(!orders)return null;
    const card=orders.querySelector('.card');
    if(!card)return null;
    let panel=document.getElementById('jptDeliveryTracking');
    if(panel)return panel;
    panel=document.createElement('div');panel.id='jptDeliveryTracking';
    panel.innerHTML='<h4>🚴 Delivery Partner Tracking</h4><div class="jpt-dt-note">Live assignment status for this outlet.</div><div id="jptDeliveryTrackingList" class="jpt-dt-list"></div>';
    const table=card.querySelector('.tablewrap');
    if(table)card.insertBefore(panel,table);else card.appendChild(panel);
    return panel;
  }
  function currentOrders(){
    return Array.isArray(window.__JPT_LAST_ORDERS)?window.__JPT_LAST_ORDERS:[];
  }
  function statusForOrder(status, assignment){
    const s=String(assignment?.delivery_status||'').toLowerCase();
    if(s && statusMap[s])return statusMap[s];
    const o=String(status||'').toLowerCase();
    if(['accepted','preparing','ready'].includes(o))return statusMap.offered;
    if(o==='out_for_delivery')return statusMap.out_for_delivery;
    if(o==='completed')return statusMap.delivered;
    return null;
  }
  function renderPanel(rows){
    const list=$('jptDeliveryTrackingList');if(!list)return;
    if(!rows.length){list.innerHTML='<div class="jpt-dt-note">No active delivery tracking records.</div>';return;}
    list.innerHTML=rows.map(x=>{
      const st=statusMap[String(x.delivery_status||'').toLowerCase()]||{label:String(x.delivery_status||'').toUpperCase(),cls:''};
      return `<div class="itemrow" style="display:block;padding:8px 0">
        <div><b>${esc(x.order_no||x.order_id)}</b> <span class="jpt-dt-chip ${st.cls}">🚴 ${esc(st.label)}</span></div>
        ${x.partner_name?`<span class="jpt-dt-partner">Partner: ${esc(x.partner_name)}</span>`:''}
      </div>`;
    }).join('');
  }
  function decorateTable(assignments){
    const rows=[...document.querySelectorAll('#ordersBody tr')];
    rows.forEach(tr=>{
      const first=tr.querySelector('td');if(!first)return;
      const orderText=first.querySelector('b')?.textContent?.trim()||'';
      const a=assignments.find(x=>String(x.order_no)===String(orderText));
      let old=first.querySelector('.jpt-dt-row');
      if(old)old.remove();
      let statusCell=tr.querySelector('td:nth-child(3)');
      if(!statusCell)return;
      let chip=statusCell.querySelector('.jpt-dt-chip');
      if(chip)chip.remove();
      const raw=tr.querySelector('td:nth-child(3) .tag')?.textContent?.trim().toLowerCase()||'';
      const info=statusForOrder(raw,a);
      if(!info)return;
      chip=document.createElement('span');
      chip.className='jpt-dt-chip '+info.cls;
      chip.textContent='🚴 '+info.label;
      statusCell.appendChild(chip);
      if(a?.partner_name){
        const p=document.createElement('span');p.className='jpt-dt-partner';p.textContent='Partner: '+a.partner_name;statusCell.appendChild(p);
      }
    });
  }
  async function load(){
    try{
      if(!window.sb || !window.activeOutlet)return;
      ensurePanel();
      const r=await window.sb.rpc('partner_delivery_tracking_snapshot',{p_outlet_id:String(window.activeOutlet)});
      if(r.error){console.warn('[JPT Delivery Tracking]',r.error.message);return;}
      const rows=Array.isArray(r.data)?r.data:[];
      renderPanel(rows);decorateTable(rows);
    }catch(e){console.warn('[JPT Delivery Tracking] load failed safely',e);}
  }
  function patchOrderCapture(){
    if(window.__JPTDeliveryTrackingPatched)return;
    const original=window.loadOrders;
    if(typeof original!=='function')return;
    window.loadOrders=async function(){
      const result=await original.apply(this,arguments);
      setTimeout(load,80);
      return result;
    };
    window.__JPTDeliveryTrackingPatched=true;
  }
  function boot(){
    if(booted)return;
    if(!window.sb || !document.getElementById('orders')){setTimeout(boot,500);return;}
    booted=true;injectStyle();ensurePanel();patchOrderCapture();load();
    clearInterval(timer);timer=setInterval(load,10000);
    try{
      channel=window.sb.channel('jpt-delivery-tracking-'+Date.now())
        .on('postgres_changes',{event:'*',schema:'public',table:'delivery_assignments'},()=>load())
        .subscribe();
    }catch(e){}
  }
  window.JPTDeliveryTracking={version:VERSION,reload:load};
  boot();
})();
