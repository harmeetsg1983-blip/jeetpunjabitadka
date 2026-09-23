/* JPT Partner Central Owner Visibility V1
   Presentation-only guard for central-owner tools.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_CENTRAL_OWNER_VISIBILITY_V1__) return;
  window.__JPT_PARTNER_CENTRAL_OWNER_VISIBILITY_V1__=true;

  function apply(){
    try{
      const central=!!document.documentElement.classList.contains('jpt-central-owner');
      document.querySelectorAll('[data-jpt-central-only]').forEach(el=>{
        el.style.display=central?'':'none';
      });
    }catch(e){}
  }

  function boot(){
    apply();
    const mo=new MutationObserver(apply);
    mo.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    setInterval(apply,10000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
