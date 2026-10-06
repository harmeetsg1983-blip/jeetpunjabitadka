/* JPT Partner Delivery Tracking V2
 * Additive UI layer. Does not modify rider app or customer app.
 * Uses partner_delivery_tracking_snapshot() for least-privilege assignment data.
 */
(function(){
  'use strict';
  const VERSION='delivery-tracking-v2';
  let timer=null, assignmentChannel=null, locationChannel=null, booted=false, lastAccepted=new Set();
  const JPT_RESTAURANT_ASSIGNMENT_ACCEPTED_AUDIO='./ringtones/1000449572.mp4';
  /* Delivery-partner ORDER ACCEPTED audio belongs to delivery-partner-app.html.
     This admin/partner tracking layer must not play that locked rider-only asset. */
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

  function playRestaurantAssignmentAcceptedTone(){try{const a=new Audio(JPT_RESTAURANT_ASSIGNMENT_ACCEPTED_AUDIO);a.preload='auto';a.loop=false;a.volume=1;const p=a.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}}

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
      .jpt-dt-location-v2{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:6px;font-size:10px;color:#aaa}
      .jpt-dt-location-v2.live{color:#79e39b}
      .jpt-dt-location-v2.wait{color:#d8ae42}
      .jpt-dt-map-v2{display:inline-block;padding:4px 8px;border-radius:8px;border:1px solid #3c3018;color:#d8ae42;text-decoration:none;background:#151515;font-weight:850}
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

  function locationMarkup(x){
    const lat=Number(x.rider_lat),lng=Number(x.rider_lng);
    const valid=Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
    if(!valid)return '<div class="jpt-dt-location-v2 wait">📍 Rider GPS: waiting for next update</div>';
    const at=x.rider_location_at?new Date(x.rider_location_at):null;
    const age=at&&!Number.isNaN(at.getTime())?Math.max(0,Date.now()-at.getTime()):Infinity;
    const live=age<=60000;
    const map='https://www.openstreetmap.org/?mlat='+encodeURIComponent(lat)+'&mlon='+encodeURIComponent(lng)+'#map=16/'+encodeURIComponent(lat)+'/'+encodeURIComponent(lng);
    const stamp=at&&!Number.isNaN(at.getTime())?'Updated '+at.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'Location timestamp unavailable';
    return '<div class="jpt-dt-location-v2 '+(live?'live':'wait')+'">📍 '+(live?'LIVE RIDER LOCATION':'Rider location is stale')+' • '+esc(stamp)+' <a class="jpt-dt-map-v2" target="_blank" rel="noopener" href="'+esc(map)+'">VIEW MAP</a></div>';
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
        ${x.partner_name?`<span class="jpt-dt-partner-v2">Partner: ${esc(x.partner_name)}</span>`:''}${locationMarkup(x)}
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
      wrap.innerHTML=`<span class="jpt-dt-chip-v2 ${st.cls}">🚴 ${esc(st.label)}</span>${a.partner_name?`<span class="jpt-dt-partner-v2">Partner: ${esc(a.partner_name)}</span>`:''}${locationMarkup(a)}`;
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
      rows.forEach(x=>{const key=String(x.order_id||x.order_no||'');const st=String(x.delivery_status||'').toLowerCase();const assignmentKey=String(x.assignment_id||x.id||key);if(key&&st==='accepted'&&!lastAccepted.has(key)){lastAccepted.add(key);try{const lk='jpt_restaurant_assignment_accepted_'+assignmentKey;if(localStorage.getItem(lk)!=='1'){localStorage.setItem(lk,'1');playRestaurantAssignmentAcceptedTone();}}catch(e){playRestaurantAssignmentAcceptedTone();}}if(key&&st!=='accepted')lastAccepted.delete(key);});
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
      assignmentChannel=window.sb.channel('jpt-delivery-tracking-v2-'+Date.now())
        .on('postgres_changes',{event:'*',schema:'public',table:'delivery_assignments'},()=>load())
        .subscribe();
    }catch(e){}
    try{
      locationChannel=window.sb.channel('jpt-partner-delivery-live-'+Date.now())
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'delivery_location_updates'},p=>{
          if(window.JPTLiveBridge?.receive&&p?.new) window.JPTLiveBridge.receive({event_id:'delivery.location.updated:'+String(p.new.id),event_type:'delivery.location.updated',entity_type:'delivery_location',entity_id:p.new.id,outlet_id:outletId(),audience:'partner',occurred_at:p.new.recorded_at,payload:p.new},'supabase-realtime');
          load();
        })
        .on('postgres_changes',{event:'UPDATE',schema:'public',table:'delivery_assignments'},p=>{
          if(window.JPTLiveBridge?.receive&&p?.new) window.JPTLiveBridge.receive({event_id:'delivery.assignment.updated:'+String(p.new.id)+':'+String(p.new.updated_at||Date.now()),event_type:'delivery.assignment.updated',entity_type:'delivery_assignment',entity_id:p.new.id,outlet_id:p.new.outlet_id||outletId(),audience:'partner',occurred_at:p.new.updated_at||new Date().toISOString(),payload:p.new},'supabase-realtime');
          load();
        })
        .subscribe();
    }catch(e){}
    try{
      if(window.JPTLiveBridge?.on){
        window.JPTDeliveryTrackingBridgeOff=window.JPTLiveBridge.on(function(ev){
          if(ev?.event_type==='delivery.location.updated' || ev?.event_type==='delivery.assignment.updated' || ev?.event_type==='delivery.status.updated') load();
        });
      }
    }catch(e){}
  }

  window.JPTDeliveryTracking={version:VERSION,reload:load};
  boot();
})();
