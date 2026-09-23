/* JPT Partner Outlet Context V1
   Keeps a single-outlet partner's selected outlet stable after login/refresh.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_OUTLET_CONTEXT_V1__) return;
  window.__JPT_PARTNER_OUTLET_CONTEXT_V1__=true;

  function sync(){
    try{
      const rows=window.JPTPartnerAccess?.getOutlets?.()||[];
      const sel=document.getElementById('outletSelect');
      if(rows.length===1){
        const id=String(rows[0].outlet_id||'');
        if(id){
          window.JPT_OUTLET_ID=id;
          window.activeOutlet=id;
          localStorage.setItem('jpt_admin_outlet',id);
          if(sel) sel.value=id;
        }
      }
    }catch(e){}
  }

  function boot(){
    sync();
    setTimeout(sync,1200);
    setTimeout(sync,3000);
    setInterval(sync,10000);
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();
