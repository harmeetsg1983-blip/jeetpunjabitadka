/* JPT Partner Branding Apply Status V1
   Shows saved branding state for the active outlet.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_BRANDING_APPLY_STATUS_V1__)return;
  window.__JPT_PARTNER_BRANDING_APPLY_STATUS_V1__=true;

  async function check(){
    try{
      const sb=window.sb,code=window.activeOutlet||document.getElementById('outletSelect')?.value||'';
      if(!sb||!code)return;
      const {data,error}=await sb.from('outlets').select('logo_url,banner_url').eq('code',code).maybeSingle();
      if(error||!data)return;
      const panel=document.getElementById('jptOutletBrandingPanel')||document.getElementById('jptOutletBranding');
      if(!panel)return;
      let el=document.getElementById('jptBrandingApplyStatus');
      if(!el){
        el=document.createElement('div');
        el.id='jptBrandingApplyStatus';
        el.style.cssText='margin-top:8px;padding:8px 10px;border-radius:10px;font-size:11px';
        panel.appendChild(el);
      }
      const logo=!!String(data.logo_url||'').trim(),banner=!!String(data.banner_url||'').trim();
      el.style.border='1px solid '+(logo&&banner?'#27733e':'#604d1c');
      el.style.background=logo&&banner?'#092313':'#171207';
      el.style.color=logo&&banner?'#79e39b':'#d8ae42';
      el.textContent=(logo&&banner?'✓ Branding assets ready':'○ Branding assets pending')+' — Logo '+(logo?'✓':'○')+' • Banner '+(banner?'✓':'○');
    }catch(e){}
  }
  function boot(){setTimeout(check,2000);setInterval(check,15000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
