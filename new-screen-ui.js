/* JPT — ISOLATED DELIVERY TRACKING UI V2
   Read-only presentation layer.
   It does not own realtime, audio, Supabase writes, order transitions, or geolocation.
*/
(function(){
'use strict';

const bridge=window.JPTNewScreenBridge;
if(!bridge) throw new Error('JPTNewScreenBridge is required before new-screen-ui.js');

const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));

const text=value=>String(value??'').trim();

function orderNumber(order){
  return text(order?.order_no||order?.order_number||order?.orderNumber||order?.id||'—');
}

function coordinateState(a){
  return !!a?.assigned && bridge.isValidCoordinatePair(Number(a.latitude),Number(a.longitude));
}

function neutralRider(){
  return '<svg viewBox="0 0 96 96" role="img" aria-label="Delivery partner placeholder">'+
    '<circle cx="48" cy="48" r="46" fill="#111"/>'+
    '<circle cx="48" cy="34" r="13" fill="#d8a56b"/>'+
    '<path d="M25 78c3-17 13-26 23-26s20 9 23 26" fill="#d99b2b"/>'+
    '<path d="M27 34c2-13 11-21 22-21 12 0 21 8 22 21-6-5-13-8-22-8-8 0-15 3-22 8Z" fill="#222"/>'+
  '</svg>';
}

function orderStatus(order){
  const s=text(order?.status||order?.order_status||order?.state).toLowerCase();
  if(['delivered','completed'].includes(s)) return ['Delivered','complete'];
  if(['ready','prepared'].includes(s)) return ['Ready','active'];
  if(['accepted','confirmed'].includes(s)) return ['Accepted','active'];
  if(['picked_up','pickedup','out_for_delivery','on_the_way'].includes(s)) return ['On the way','active'];
  if(['cancelled','canceled','rejected'].includes(s)) return ['Cancelled','cancel'];
  return [s ? s.replace(/_/g,' ') : 'Order received','active'];
}

function safeCallHref(phone){
  const raw=text(phone);
  if(!raw) return '';
  const clean=raw.replace(/[^d+]/g,'');
  return clean ? 'tel:'+encodeURIComponent(clean) : '';
}

function mapsEmbed(lat,lng){
  const q=encodeURIComponent(String(lat)+','+String(lng));
  return 'https://www.google.com/maps?q='+q+'&z=15&output=embed';
}

function buildOrderOptions(orders,selected){
  return orders.map(o=>{
    const id=String(o.id??o.order_id??o.orderNo??o.order_number??'');
    return '<option value="'+esc(id)+'" '+(String(selected)===id?'selected':'')+'>#'+esc(orderNumber(o))+'</option>';
  }).join('');
}

const UI={
  version:'2.0.0-readonly',

  mount(target,options={}){
    const root=typeof target==='string'?document.querySelector(target):target;
    if(!root) return false;

    root.classList.add('jpt-new-screen');
    root.innerHTML='';
    this.render(root,options);
    return true;
  },

  render(root,options={}){
    if(!root) return false;

    const state=bridge.getState(options);
    const orders=state.orders;
    const selected=state.selectedOrder;
    const assignment=selected?.__deliveryAssignment||{assigned:false};
    const hasGps=coordinateState(assignment);
    const [statusLabel,statusClass]=orderStatus(selected);
    const selectedId=selected?.id??selected?.order_id??selected?.orderNo??selected?.order_number??'';

    root.innerHTML=
      '<div class="jpt-ns-shell">'+
        '<header class="jpt-ns-head">'+
          '<div class="jpt-ns-brand">'+
            '<small>JEET PUNJABI TADKA</small>'+
            '<h2>Delivery Tracking</h2>'+
            '<span>Order #'+esc(orderNumber(selected))+'</span>'+
          '</div>'+
          '<span class="jpt-ns-live-badge">READ-ONLY LIVE VIEW</span>'+
        '</header>'+

        (orders.length>1 ?
          '<div class="jpt-ns-selector-card">'+
            '<label for="jptNsOrderSelect">Order</label>'+
            '<select id="jptNsOrderSelect">'+buildOrderOptions(orders,selectedId)+'</select>'+
          '</div>' : '')+

        '<section class="jpt-ns-status-card">'+
          '<div><small>ORDER STATUS</small><strong class="'+esc(statusClass)+'">'+esc(statusLabel)+'</strong></div>'+
          '<div class="jpt-ns-order-id">#'+esc(orderNumber(selected))+'</div>'+
        '</section>'+

        '<section class="jpt-ns-partner-card">'+
          '<div class="jpt-ns-avatar">'+
            (assignment.assigned && text(assignment.photoUrl)
              ? '<img src="'+esc(assignment.photoUrl)+'" alt="Delivery partner">'
              : neutralRider())+
          '</div>'+
          '<div class="jpt-ns-copy">'+
            (assignment.assigned
              ? '<em>✓ Delivery Partner Assigned</em>'+
                '<strong>'+esc(assignment.name||'Delivery Partner')+'</strong>'+
                '<span>'+esc(assignment.vehicle||'Delivery partner details available')+'</span>'+
                (assignment.phone?'<span>'+esc(assignment.phone)+'</span>':'')
              : '<strong>Delivery Partner not assigned yet</strong>'+
                '<span>Partner name, contact and GPS appear only after a real assignment.</span>')+
          '</div>'+
          (assignment.assigned && assignment.phone
            ? '<a class="jpt-ns-call" href="'+esc(safeCallHref(assignment.phone))+'">Call</a>'
            : '')+
        '</section>'+

        '<section class="jpt-ns-map-card">'+
          '<div class="jpt-ns-map-title">'+
            '<div><strong>Google Maps</strong><span>Partner GPS location</span></div>'+
            '<b class="'+(hasGps?'live':'wait')+'">'+(hasGps?'GPS RECEIVED':'WAITING')+'</b>'+
          '</div>'+
          '<div class="jpt-ns-map">'+
            (hasGps
              ? '<iframe title="Google Maps delivery partner location" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="'+esc(mapsEmbed(assignment.latitude,assignment.longitude))+'"></iframe>'
              : '<div class="jpt-ns-map-empty">'+
                  '<div class="jpt-ns-map-pin">⌖</div>'+
                  '<strong>GPS location unavailable</strong>'+
                  '<span>Map will activate only when a real assigned partner coordinate is available.</span>'+
                '</div>')+
          '</div>'+
          '<p class="jpt-ns-map-note">'+
            (hasGps
              ? esc(assignment.locationLabel||('Coordinates: '+assignment.latitude+', '+assignment.longitude))
              : 'No estimated or fabricated partner location is shown.')+
          '</p>'+
        '</section>'+

        '<section class="jpt-ns-facts">'+
          '<div><small>OUTLET</small><strong>'+esc(selected?.outlet_id||selected?.outlet_code||'—')+'</strong></div>'+
          '<div><small>PARTNER</small><strong>'+esc(assignment.assigned?(assignment.name||'Assigned'):'Not assigned')+'</strong></div>'+
          '<div><small>CONTACT</small><strong>'+esc(assignment.assigned&&assignment.phone?assignment.phone:'Hidden until assigned')+'</strong></div>'+
        '</section>'+

        '<div class="jpt-ns-integrity">'+
          '<span>✓ Real assignment data only</span>'+
          '<span>✓ No fake GPS</span>'+
          '<span>✓ Read-only screen</span>'+
        '</div>'+
      '</div>';

    const selector=root.querySelector('#jptNsOrderSelect');
    if(selector){
      selector.addEventListener('change',()=>{
        const next=selector.value;
        this.render(root,Object.assign({},options,{orderId:next}));
      });
    }
    return true;
  },

  refresh(target,options={}){
    const root=typeof target==='string'?document.querySelector(target):target;
    if(!root) return false;
    return this.render(root,options);
  }
};

window.JPTNewScreenUI=Object.freeze(UI);
})();