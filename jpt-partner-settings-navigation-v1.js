/* JPT Partner Settings Navigation V1
   Additive navigation helper. Does not replace existing settings logic.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_SETTINGS_NAVIGATION_V1__) return;
  window.__JPT_PARTNER_SETTINGS_NAVIGATION_V1__=true;

  function jump(id){
    const el=document.getElementById(id);
    if(el){el.scrollIntoView({behavior:'smooth',block:'start'});return;}
    const n=document.getElementById('jptSettingsNavNotice');
    if(n)n.textContent='This control is still loading. Please wait a moment and try again.';
  }

  function boot(){
    const settings=document.getElementById('settings');
    if(!settings) return;

    let box=document.getElementById('jptSettingsQuickNav');
    if(box) return;

    box=document.createElement('div');
    box.id='jptSettingsQuickNav';
    box.className='notice';
    box.style.cssText='margin-bottom:10px;border-color:#604d1c;background:#171207';
    box.innerHTML='<b style="color:#d8ae42">Partner Settings</b>'+
      '<div style="margin-top:6px;color:#aaa;font-size:11px">Central navigation for existing settings controls. Existing managers and their data ownership are unchanged.</div>'+
      '<div id="jptSettingsNav" style="display:flex;gap:7px;flex-wrap:wrap;margin-top:9px">'+
      [['Branding','jptOutletBrandingManagerV1'],['Partner Access','jptPartnerAccessManager'],['Onboarding','jptPartnerOnboardPanel'],['Timing','jptTimingManagerV1'],['Outlet Banners','jptBannerControlV3'],['Delivery Sponsors','jptSponsorManager'],['Customer Sponsors','jptSponsorMediaManagerV4']].map(x=>'<button type="button" data-jpt-settings-target="'+x[1]+'" style="border:1px solid #604d1c;background:#111;color:#d8ae42;border-radius:8px;padding:7px 9px;font-weight:800;font-size:11px">'+x[0]+'</button>').join('')+
      '</div><div id="jptSettingsNavNotice" style="margin-top:7px;color:#888;font-size:10px"></div>';
    settings.prepend(box);

    box.querySelectorAll('[data-jpt-settings-target]').forEach(b=>{
      b.addEventListener('click',()=>jump(b.getAttribute('data-jpt-settings-target')));
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1000));
  else setTimeout(boot,1000);
})();
