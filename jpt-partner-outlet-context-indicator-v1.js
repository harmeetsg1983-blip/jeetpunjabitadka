/* JPT Partner Outlet Context Indicator V1
   Adds a compact context line near branding tools.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_OUTLET_CONTEXT_INDICATOR_V1__)return;
  window.__JPT_PARTNER_OUTLET_CONTEXT_INDICATOR_V1__=true;

  function render(){
    try{
      const panel=document.getElementById('jptOutletBrandingPanel')||document.getElementById('jptOutletBranding');
      if(!panel)return;
      const code=window.activeOutlet||document.getElementById('outletSelect')?.value||localStorage.getItem('jpt_admin_outlet')||'';
      if(!code)return;
      let el=document.getElementById('jptBrandingOutletContext');
      if(!el){
        el=document.createElement('div');
        el.id='jptBrandingOutletContext';
        el.style.cssText='margin-bottom:8px;padding:8px 10px;border:1px solid #604d1c;border-radius:10px;background:#171207;color:#d8ae42;font-size:11px;font-weight:800';
        panel.prepend(el);
      }
      el.textContent='Editing outlet: '+code;
    }catch(e){}
  }
  function boot(){setTimeout(render,1000);setInterval(render,7000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
