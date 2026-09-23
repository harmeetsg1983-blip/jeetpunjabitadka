/* JPT Partner Outlet Switch Event V1
   Emits a small internal event after outlet context changes.
   Existing outlet reload logic remains untouched.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_OUTLET_SWITCH_EVENT_V1__) return;
  window.__JPT_PARTNER_OUTLET_SWITCH_EVENT_V1__=true;

  function emit(){
    try{
      window.dispatchEvent(new CustomEvent('jpt:outlet-changed',{
        detail:{
          outletId:window.activeOutlet||document.getElementById('outletSelect')?.value||'',
          timestamp:Date.now()
        }
      }));
    }catch(e){}
  }

  function boot(){
    const sel=document.getElementById('outletSelect');
    if(sel) sel.addEventListener('change',()=>setTimeout(emit,250));
    window.addEventListener('storage',e=>{
      if(e.key==='jpt_admin_outlet') setTimeout(emit,250);
    });
    setTimeout(emit,1000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
