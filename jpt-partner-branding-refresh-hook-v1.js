/* JPT Partner Branding Refresh Hook V1
   Emits a safe internal event after branding controls are used.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_BRANDING_REFRESH_HOOK_V1__)return;
  window.__JPT_PARTNER_BRANDING_REFRESH_HOOK_V1__=true;

  function emit(){
    try{
      window.dispatchEvent(new CustomEvent('jpt:branding-updated',{
        detail:{outletId:window.activeOutlet||document.getElementById('outletSelect')?.value||'',timestamp:Date.now()}
      }));
    }catch(e){}
  }

  function boot(){
    document.addEventListener('click',e=>{
      const id=e.target?.id||'';
      if(/jptBrandLogoUpload|jptBrandBannerUpload|saveBranding/i.test(id))setTimeout(emit,1200);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
