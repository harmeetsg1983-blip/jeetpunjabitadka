/* JPT Partner Menu Permission Guard V1
   Presentation-only guard. Existing RLS remains the security boundary.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_MENU_PERMISSION_GUARD_V1__) return;
  window.__JPT_PARTNER_MENU_PERMISSION_GUARD_V1__=true;

  function apply(){
    try{
      const rows=window.JPTPartnerAccess?.getOutlets?.()||[];
      const code=window.activeOutlet||document.getElementById('outletSelect')?.value||'';
      const row=rows.find(r=>String(r.outlet_id||r.code)===String(code));
      const level=String(row?.access_level||'').toLowerCase();
      const manage=level==='manage'||!level;

      document.querySelectorAll('[data-jpt-menu-manage]').forEach(el=>{
        el.style.display=manage?'':'none';
      });
    }catch(e){}
  }

  function boot(){
    apply();
    setInterval(apply,8000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
