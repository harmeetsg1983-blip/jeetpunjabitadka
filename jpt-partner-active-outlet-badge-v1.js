/* JPT Partner Active Outlet Badge V1
   Shows the currently active outlet context without changing selection/security.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_ACTIVE_OUTLET_BADGE_V1__) return;
  window.__JPT_PARTNER_ACTIVE_OUTLET_BADGE_V1__=true;

  function render(){
    try{
      const sel=document.getElementById('outletSelect');
      const code=window.activeOutlet||sel?.value||localStorage.getItem('jpt_admin_outlet')||'';
      if(!code) return;

      let el=document.getElementById('jptActiveOutletBadge');
      if(!el){
        const host=document.querySelector('.controls')||document.querySelector('.top');
        if(!host) return;
        el=document.createElement('span');
        el.id='jptActiveOutletBadge';
        el.style.cssText='display:inline-flex;align-items:center;padding:8px 10px;border:1px solid #604d1c;border-radius:10px;background:#171207;color:#d8ae42;font-size:11px;font-weight:800';
        host.appendChild(el);
      }

      let name='';
      try{
        const rows=window.JPTPartnerAccess?.getOutlets?.()||[];
        const row=rows.find(r=>String(r.outlet_id||r.code)===String(code));
        name=row?.outlet_name||'';
      }catch(e){}
      el.textContent=(name?name+' • ':'')+code;
    }catch(e){}
  }

  function boot(){
    setTimeout(render,800);
    setInterval(render,5000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
