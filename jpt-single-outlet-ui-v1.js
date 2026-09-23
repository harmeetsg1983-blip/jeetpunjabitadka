/* JPT Single-Outlet UI Sync V1
   UI-only access presentation layer.
   Security remains enforced by partner_my_outlets + RLS.
*/
(function(){
  'use strict';
  if(window.__JPT_SINGLE_OUTLET_UI_V1__) return;
  window.__JPT_SINGLE_OUTLET_UI_V1__=true;

  function sync(){
    const sel=document.getElementById('outletSelect');
    if(!sel) return;

    let count=0;
    try{
      const api=window.JPTPartnerAccess;
      const rows=api?.getOutlets?.()||[];
      if(rows.length) count=rows.length;
    }catch(e){}

    /* The live dashboard itself is the fallback source because loadAccess()
       fills this selector directly from partner_my_outlets(). */
    if(!count) count=sel.options?.length||0;

    document.documentElement.classList.toggle('jpt-single-outlet',count===1);
    sel.setAttribute('aria-hidden',count===1?'true':'false');
  }

  function boot(){
    sync();
    const sel=document.getElementById('outletSelect');
    if(sel) sel.addEventListener('change',()=>setTimeout(sync,100));
    let n=0;
    const timer=setInterval(()=>{
      sync();
      if(++n>=30) clearInterval(timer);
    },500);
  }

  document.readyState==='loading'
    ?document.addEventListener('DOMContentLoaded',boot)
    :boot();
})();
