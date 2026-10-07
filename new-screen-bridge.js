/* JPT — ISOLATED DELIVERY TRACKING BRIDGE V2
   Read-only adapter for the frozen Partner order runtime.
   NEVER writes to Supabase, never subscribes to realtime, never starts/stops audio,
   and never mutates order state.
*/
(function(){
'use strict';

if(window.JPTNewScreenBridge?.version==='2.0.0-readonly') return;

const VERSION='2.0.0-readonly';
const ORDER_RUNTIME_KEYS=['__JPTOrdersRuntime','JPTOrdersRuntime'];
const OUTLET_KEYS=['JPT_PARTNER_OUTLETS'];

function firstValue(obj, keys){
  if(!obj || typeof obj!=='object') return null;
  for(const key of keys){
    const value=obj[key];
    if(value!==undefined && value!==null && String(value).trim()!=='') return value;
  }
  return null;
}

function asBool(value){
  return value===true || value===1 || value==='1' || String(value).toLowerCase()==='true' || String(value).toLowerCase()==='yes';
}

function numberOrNull(value){
  const n=Number(value);
  return Number.isFinite(n) ? n : null;
}

function validCoordinatePair(lat,lng){
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat)<=90 && Math.abs(lng)<=180;
}

function runtime(){
  for(const key of ORDER_RUNTIME_KEYS){
    const value=window[key];
    if(value && typeof value==='object') return value;
  }
  return null;
}

function rawRows(){
  const r=runtime();
  if(!r) return [];
  if(Array.isArray(r.rows)) return r.rows;
  if(Array.isArray(r.orders)) return r.orders;
  return [];
}

function orderId(order){
  return firstValue(order,['id','order_id','orderNo','order_no','order_number','orderNumber']);
}

function deliveryAssignment(order){
  const partner=firstValue(order,[
    'delivery_partner','deliveryPartner','assigned_delivery_partner',
    'assignedDeliveryPartner','delivery_assignment','deliveryAssignment'
  ]);
  const assignedFlag=firstValue(order,[
    'delivery_partner_assigned','deliveryPartnerAssigned',
    'is_delivery_partner_assigned','isDeliveryPartnerAssigned'
  ]);

  const assigned=!!partner || asBool(assignedFlag);
  if(!assigned) return Object.freeze({
    assigned:false,name:null,phone:null,photoUrl:null,
    latitude:null,longitude:null,locationLabel:null,vehicle:null
  });

  const source=(partner && typeof partner==='object') ? partner : order;
  const latitude=numberOrNull(firstValue(source,['latitude','lat','location_latitude','locationLatitude']));
  const longitude=numberOrNull(firstValue(source,['longitude','lng','lon','location_longitude','locationLongitude']));

  return Object.freeze({
    assigned:true,
    name:firstValue(source,['name','full_name','fullName','partner_name','partnerName','delivery_partner_name','deliveryPartnerName']),
    phone:firstValue(source,['phone','phone_number','phoneNumber','mobile','mobile_number','mobileNumber']),
    photoUrl:firstValue(source,['photo_url','photoUrl','avatar_url','avatarUrl','image_url','imageUrl','photo']),
    latitude,
    longitude,
    gpsValid:validCoordinatePair(latitude,longitude),
    locationLabel:firstValue(source,['location_label','locationLabel','address','current_address','currentAddress','location']),
    vehicle:firstValue(source,['vehicle','vehicle_type','vehicleType','vehicle_number','vehicleNumber'])
  });
}

function normalizeOrder(order){
  if(!order || typeof order!=='object') return null;
  return Object.freeze(Object.assign({},order,{
    __deliveryAssignment:deliveryAssignment(order)
  }));
}

function getOrdersSnapshot(){
  try{
    return rawRows().map(normalizeOrder).filter(Boolean);
  }catch(_){
    return [];
  }
}

function getManagedOutlets(){
  try{
    const access=window.JPTPartnerAccess?.getOutlets?.();
    const source=Array.isArray(access) ? access : window.JPT_PARTNER_OUTLETS;
    if(!Array.isArray(source)) return [];
    return source.map(x=>Object.freeze(Object.assign({},x)));
  }catch(_){
    return [];
  }
}

function getOrder(id){
  const target=String(id??'');
  return getOrdersSnapshot().find(o=>String(orderId(o)??'')===target) || null;
}

function getSelectedOrder(options){
  const id=options?.orderId;
  if(id!==undefined && id!==null && String(id)!=='') return getOrder(id);
  return getOrdersSnapshot()[0] || null;
}

function getState(options={}){
  const orders=getOrdersSnapshot();
  const selected=getSelectedOrder(options);
  return Object.freeze({
    version:VERSION,
    orders,
    outlets:getManagedOutlets(),
    selectedOrder:selected
  });
}

window.JPTNewScreenBridge=Object.freeze({
  version:VERSION,
  getOrdersSnapshot,
  getManagedOutlets,
  getOrder,
  getSelectedOrder,
  getState,
  isValidCoordinatePair:validCoordinatePair
});
})();