/* JPT Partner Branding Form Guard V1
   Prevents accidental empty branding submissions; does not upload or alter data itself.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_BRANDING_FORM_GUARD_V1__) return;
  window.__JPT_PARTNER_BRANDING_FORM_GUARD_V1__=true;
  function validate(){
    const panel=document.getElementById('jptOutletBrandingPanel')||document.getElementById('jptOutletBranding');
    if(!panel)return;
    const save=[...panel.querySelectorAll('button')].find(b=>/save branding/i.test(b.textContent||''));
    if(!save||save.dataset.jptGuard)return;
    save.dataset.jptGuard='1';
    save.addEventListener('click',e=>{
      const name=panel.querySelector('input[name="outlet_name"],#jptBrandName,#brandOutletName')?.value?.trim();
      if(!name){
        e.preventDefault();
        e.stopImmediatePropagation();
        if(window.toast) window.toast('Outlet Name is required before saving branding.');
        else alert('Outlet Name is required before saving branding.');
      }
    },true);
  }
  function boot(){validate();let n=0;const t=setInterval(()=>{validate();if(++n>=20)clearInterval(t)},500)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();