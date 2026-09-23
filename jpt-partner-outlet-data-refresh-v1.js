/* JPT Partner Outlet Data Refresh V1
   Refreshes outlet identity context after existing reload operations.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_OUTLET_DATA_REFRESH_V1__) return;
  window.__JPT_PARTNER_OUTLET_DATA_REFRESH_V1__=true;

  function emit(){
    try{
      window.dispatchEvent(new CustomEvent('jpt:outlet-data-refreshed',{
        detail:{outletId:window.activeOutlet||document.getElementById('outletSelect')?.value||'',timestamp:Date.now()}
      }));
    }catch(e){}
  }

  function boot(){
    document.getElementById('reloadBtn')?.addEventListener('click',()=>setTimeout(emit,800));
    document.getElementById('outletSelect')?.addEventListener('change',()=>setTimeout(emit,900));
    setTimeout(emit,1600);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
