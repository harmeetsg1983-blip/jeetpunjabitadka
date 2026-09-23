/* JPT Sponsor Outlet Context V1
   Supplies reliable outlet context to sponsor sliders without changing existing app flows.
*/
(function(){
'use strict';
if(window.__JPT_SPONSOR_OUTLET_CONTEXT_V1__) return;
window.__JPT_SPONSOR_OUTLET_CONTEXT_V1__=true;
function save(id){if(!id)return;try{localStorage.setItem('jpt_outlet_id',String(id));localStorage.setItem('jpt_delivery_outlet',String(id));}catch(e){} window.JPT_CUSTOMER_OUTLET_ID=String(id);window.JPT_DELIVERY_OUTLET_ID=String(id);window.JPT_OUTLET_ID=String(id);}
function bootCustomer(){try{if(window.outletId) save(window.outletId); else {const q=new URLSearchParams(location.search).get('outlet');if(q)save(q)}}catch(e){}}
async function bootDelivery(){try{const sb=window.sb||window.supabaseClient;if(!sb)return;const r=await sb.rpc('delivery_partner_assignment_snapshot');if(r.error)return;const rows=Array.isArray(r.data)?r.data:[r.data].filter(Boolean);const x=rows.find(a=>a&&a.outlet_id);if(x?.outlet_id)save(x.outlet_id)}catch(e){}}
function boot(){bootCustomer();bootDelivery();setTimeout(bootCustomer,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
