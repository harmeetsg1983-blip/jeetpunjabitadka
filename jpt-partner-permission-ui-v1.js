/* JPT Partner Permission UI V1
   Additive UI layer. Security remains Supabase/RLS controlled.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_PERMISSION_UI_V1__) return;
  window.__JPT_PARTNER_PERMISSION_UI_V1__=true;

  function getRole(){
    const rows=window.JPTPartnerAccess?.getOutlets?.()||[];
    const role=String(window.JPT_PARTNER_ROLE||window.jptPartnerRole||'').toLowerCase();
    if(role) return role;
    return String(window.JPT_IS_CENTRAL_OWNER?'central_owner':(rows.length===1?'outlet_partner':'')).toLowerCase();
  }
  function apply(){
    const role=getRole();
    document.documentElement.dataset.jptPartnerRole=role;
    document.querySelectorAll('[data-jpt-central-only]').forEach(el=>{
      el.style.display=role==='central_owner'?'':'none';
    });
  }
  function boot(){
    apply();
    let n=0;
    const t=setInterval(()=>{apply(); if(++n>=20)clearInterval(t)},500);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();