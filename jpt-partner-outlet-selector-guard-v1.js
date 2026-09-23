/* JPT Partner Outlet Selector Guard V1
   Presentation guard only. Backend RPC/RLS remains authoritative.
*/
(function(){
'use strict';
if(window.__JPT_PARTNER_OUTLET_SELECTOR_GUARD_V1__)return;
window.__JPT_PARTNER_OUTLET_SELECTOR_GUARD_V1__=true;
function sync(){
 const sel=document.getElementById('outletSelect'),rows=window.JPTPartnerAccess?.getOutlets?.()||[];
 if(!sel)return;
 if(rows.length===1){
  const id=String(rows[0].outlet_id||'');if(id)sel.value=id;
  sel.style.display='none';
 }else if(rows.length>1){sel.style.display='';}
}
function boot(){sync();setInterval(sync,2000)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();