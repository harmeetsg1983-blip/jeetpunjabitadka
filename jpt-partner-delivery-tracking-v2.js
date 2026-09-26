/* JPT Partner Delivery Tracking V2
 * Additive UI layer. Does not modify rider app or customer app.
 * Uses partner_delivery_tracking_snapshot() for least-privilege assignment data.
 */
(function(){
  'use strict';
  const VERSION='delivery-tracking-v2';
  let timer=null, channel=null, booted=false;

  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const outletId=()=>String(
    window.activeOutlet ||
    document.getElementById('outletSelect')?.value ||
    localStorage.getItem('jpt_admin_outlet') ||
    ''
  );

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
    if(document.getElementById('jptDeliveryTrackingStyleV2'))return;
    const s=document.createElement('style');
    s.id='jptDeliveryTrackingStyleV2';
    s.textContent=`
      #jptDeliveryTrackingV2{margin:12px 0;padding:13px;border:1px solid #3c3018;border-radius:14px;background:#0e0e0e}
      #jptDeliveryTrackingV2 h4{margin:0 0 6px;color:#d8ae42;font-size:17px}
      #jptDeliveryTrackingV2 .jpt-dt-note{font-size:11px;color:#999;margin-bottom:7px}
      .jpt-dt-chip-v2{display:inline-flex;align-items:center;gap:5px;margin:4px 5px 0 0;padding:4px 8px;border-radius:99px;border:1px solid #444;background:#151515;color:#ddd;font-size:10px;font-weight:850}
      .jpt-dt-chip-v2.search{border-color:#6d5a27;color:#d8ae42}
      .jpt-dt-chip-v2.accepted{border-color:#80651f;color:#f0c75b}
      .jpt-dt-chip-v2.picked,.jpt-dt-chip-v2.out{border-color:#2c7145;color:#79e39b}
      .jpt-dt-chip-v2.done{border-color:#27733e;color:#79e39b}
      .jpt-dt-chip-v2.reject{border-color:#7b2828;color:#ff9292}
      .jpt-dt-row-v2{padding:9px 0;border-bottom:1px solid #252525}
      .jpt-dt-row-v2:last-child{border-bottom:0}
      .jpt-dt-partner-v2{display:block;color:#aaa;font-size:10px;margin-top:3px}
    `;
    document.head.appendChild(s);
  }

  function ensurePanel(){
    const panel=document.getElementById('orders');
    if(!panel)return null;

    let box=document.getElementById('jptDeliveryTrackingV2');
    if(box)return box;

    box=document.createElement('div');
    box.id='jptDeliveryTrackingV2';
    box.innerHTML='<h4>🚴 Delivery Partner Tracking</h4><div class="jpt-dt-note">Live assignment status for this outlet.</div><div id="jptDeliveryTrackingListV2"></div>';

    // Put it inside the visible V1 Orders UI card, immediately after its tabs/list.
    const root=document.getElementById('jptOrdersOpsV1');
    if(root && root.parentNode){
      root.parentNode.insertBefore(box,root.nextSibling);
      return box;
    }

    // Safe fallback: attach to the Orders panel itself.
    panel.appendChild(box);
    return box;
  }

  function render(rows){
    const list=$('jptDeliveryTrackingListV2');
    if(!list)return;
    if(!rows.length){
      list.innerHTML='<div class="jpt-dt-note">No active delivery assignments for this outlet.</div>';
      return;
    }
    list.innerHTML=rows.map(x=>{
      const st=statusMap[String(x.delivery_status||'').toLowerCase()]||{label:String(x.delivery_status||'').toUpperCase(),cls:''};
      return `<div class="jpt-dt-row-v2">
        <div><b>${esc(x.order_no||x.order_id)}</b>
          <span class="jpt-dt-chip-v2 ${st.cls}">🚴 ${esc(st.label)}</span>
        </div>
        ${x.partner_name?`<span class="jpt-dt-partner-v2">Partner: ${esc(x.partner_name)}</span>`:''}
      </div>`;
    }).join('');
  }

  function decorateVisibleCards(assignments){
    const cards=[...document.querySelectorAll('#jptOrdersOpsV1 .jpt-ops-card')];
    cards.forEach(card=>{
      const orderNo=card.querySelector('.jpt-ops-no')?.textContent?.trim()||'';
      const a=assignments.find(x=>String(x.order_no)===String(orderNo));
      const old=card.querySelector('.jpt-dt-card-status-v2');
      if(old)old.remove();
      if(!a)return;
      const st=statusMap[String(a.delivery_status||'').toLowerCase()];
      if(!st)return;
      const wrap=document.createElement('div');
      wrap.className='jpt-dt-card-status-v2';
      wrap.innerHTML=`<span class="jpt-dt-chip-v2 ${st.cls}">🚴 ${esc(st.label)}</span>${a.partner_name?`<span class="jpt-dt-partner-v2">Partner: ${esc(a.partner_name)}</span>`:''}`;
      const actions=card.querySelector('.jpt-ops-actions');
      if(actions) card.insertBefore(wrap,actions); else card.appendChild(wrap);
    });
  }

  async function load(){
    try{
      if(!window.sb)return;
      ensurePanel();
      const id=outletId();
      if(!id){
        render([]);
        return;
      }
      const r=await window.sb.rpc('partner_delivery_tracking_snapshot',{p_outlet_id:id});
      if(r.error){
        console.warn('[JPT Delivery Tracking V2]',r.error.message);
        render([]);
        return;
      }
      const rows=Array.isArray(r.data)?r.data:[];
      render(rows);
      decorateVisibleCards(rows);
    }catch(e){
      console.warn('[JPT Delivery Tracking V2] load failed safely',e);
    }
  }

  function boot(){
    if(booted)return;
    if(!window.sb || !document.getElementById('orders')){setTimeout(boot,400);return;}
    booted=true;
    injectStyle();
    ensurePanel();
    load();
    clearInterval(timer);
    timer=setInterval(load,10000);
    try{
      channel=window.sb.channel('jpt-delivery-tracking-v2-'+Date.now())
        .on('postgres_changes',{event:'*',schema:'public',table:'delivery_assignments'},()=>load())
        .subscribe();
    }catch(e){}
  }

  window.JPTDeliveryTracking={version:VERSION,reload:load};
  boot();
})();
