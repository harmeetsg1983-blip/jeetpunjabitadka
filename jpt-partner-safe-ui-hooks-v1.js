/* JPT Partner Safe UI Hooks V1
   Adds internal hooks only; no replacement of existing functions.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_SAFE_UI_HOOKS_V1__) return;
  window.__JPT_PARTNER_SAFE_UI_HOOKS_V1__=true;

  function boot(){
    try{
      window.JPTPartnerUIHooks=window.JPTPartnerUIHooks||{};
      window.JPTPartnerUIHooks.getActiveOutlet=function(){
        return window.activeOutlet||
          document.getElementById('outletSelect')?.value||
          localStorage.getItem('jpt_admin_outlet')||'';
      };
      window.JPTPartnerUIHooks.getSessionEmail=function(){
        return window.JPT_PARTNER_EMAIL||'';
      };
      window.JPTPartnerUIHooks.isCentral=function(){
        return document.documentElement.classList.contains('jpt-central-owner');
      };
    }catch(e){}
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
