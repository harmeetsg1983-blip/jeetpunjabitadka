/* JPT Partner Branding Upload Status V1
   Visual upload status helper for the existing branding uploader.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_BRANDING_UPLOAD_STATUS_V1__) return;
  window.__JPT_PARTNER_BRANDING_UPLOAD_STATUS_V1__=true;

  function ensure(){
    const host=document.getElementById('jptOutletBrandingPanel')||document.getElementById('jptOutletBranding');
    if(!host) return;
    let el=document.getElementById('jptBrandingUploadStatus');
    if(!el){
      el=document.createElement('div');
      el.id='jptBrandingUploadStatus';
      el.style.cssText='margin:8px 0;padding:8px 10px;border:1px solid #333;border-radius:10px;background:#151515;color:#999;font-size:11px';
      el.textContent='Branding upload system ready.';
      host.appendChild(el);
    }
  }

  function boot(){
    setTimeout(ensure,1200);
    setInterval(ensure,10000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
