/* JPT Partner Onboarding Status Badge V1 */
(function(){
  'use strict';
  if(window.__JPT_PARTNER_ONBOARDING_STATUS_BADGE_V1__) return;
  window.__JPT_PARTNER_ONBOARDING_STATUS_BADGE_V1__=true;
  function boot(){
    const panel=document.getElementById('jptPartnerOnboardPanel');
    if(!panel)return;
    panel.querySelectorAll('.jpt-ob-row').forEach(row=>{
      const badge=row.querySelector('.jpt-ob-status');
      if(!badge)return;
      badge.title='Application status';
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1000));
  else setTimeout(boot,1000);
})();