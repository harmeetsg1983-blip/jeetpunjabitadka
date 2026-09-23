/* JPT Partner Branding Fields Sync V1
   Keeps the existing branding form aligned with live outlet data.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_BRANDING_FIELDS_SYNC_V1__) return;
  window.__JPT_PARTNER_BRANDING_FIELDS_SYNC_V1__=true;

  function set(id,value){
    const el=document.getElementById(id);
    if(el && value!=null && !el.matches(':focus')) el.value=value;
  }

  async function sync(){
    try{
      const sb=window.sb;
      const code=window.activeOutlet||document.getElementById('outletSelect')?.value||'';
      if(!sb||!code) return;
      const {data,error}=await sb.from('outlets')
        .select('name,address,phone,contact_name,logo_url,banner_url')
        .eq('code',code).maybeSingle();
      if(error||!data) return;

      const ids={
        jptObRestaurantName:data.name,
        jptObAddress:data.address,
        jptObPhone:data.phone,
        jptObContactName:data.contact_name,
        jptObLogoUrl:data.logo_url,
        jptObBannerUrl:data.banner_url
      };
      Object.keys(ids).forEach(k=>set(k,ids[k]||''));
    }catch(e){}
  }

  function boot(){
    setTimeout(sync,900);
    window.addEventListener('jpt:outlet-changed',()=>setTimeout(sync,300));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
