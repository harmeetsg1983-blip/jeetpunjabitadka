/* JPT Partner Onboarding Outlet Preview V1
   Shows a non-destructive preview of the restaurant name/contact details.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_ONBOARDING_OUTLET_PREVIEW_V1__) return;
  window.__JPT_PARTNER_ONBOARDING_OUTLET_PREVIEW_V1__=true;

  function boot(){
    const panel=document.getElementById('jptPartnerOnboardPanel')||
                document.getElementById('jptPartnerOnboard');
    if(!panel) return;

    const name=panel.querySelector('input[name="restaurant_name"]')||
               panel.querySelector('input[id*="Restaurant"],input[id*="restaurant"]');
    if(!name) return;

    let preview=document.getElementById('jptOnboardingPreview');
    if(!preview){
      preview=document.createElement('div');
      preview.id='jptOnboardingPreview';
      preview.style.cssText='margin-top:10px;padding:10px;border:1px solid #604d1c;border-radius:12px;background:#171207';
      name.parentElement?.after(preview);
    }

    const update=()=>{
      preview.innerHTML='<b style="color:#d8ae42">New Outlet Preview</b><div style="margin-top:5px;color:#fff">'+
        (name.value.trim()||'Restaurant name will appear here')+'</div>';
    };
    name.addEventListener('input',update);
    update();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1000));
  else setTimeout(boot,1000);
})();
