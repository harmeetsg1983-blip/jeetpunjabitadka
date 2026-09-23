/* JPT Partner Settings Navigation V1
   Additive navigation helper. Does not replace existing settings logic.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_SETTINGS_NAVIGATION_V1__) return;
  window.__JPT_PARTNER_SETTINGS_NAVIGATION_V1__=true;

  function boot(){
    const settings=document.getElementById('settings');
    if(!settings) return;

    let box=document.getElementById('jptSettingsQuickNav');
    if(box) return;

    box=document.createElement('div');
    box.id='jptSettingsQuickNav';
    box.className='notice';
    box.style.cssText='margin-bottom:10px;border-color:#604d1c;background:#171207';
    box.innerHTML='<b style="color:#d8ae42">Partner Settings</b><div style="margin-top:6px;color:#aaa;font-size:11px">Outlet Branding, partner access and onboarding controls remain in this panel. Existing controls are unchanged.</div>';
    settings.prepend(box);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1000));
  else setTimeout(boot,1000);
})();
