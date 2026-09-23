/* JPT Partner Branding Preview V1 */
(function(){
'use strict';
if(window.__JPT_PARTNER_BRANDING_PREVIEW_V1__)return;
window.__JPT_PARTNER_BRANDING_PREVIEW_V1__=true;
function wire(){
 const panel=document.getElementById('jptOutletBrandingPanel')||document.getElementById('jptOutletBranding');if(!panel||panel.dataset.jptPreview)return;
 panel.dataset.jptPreview='1';
 panel.querySelectorAll('input[type=file]').forEach(inp=>{
  inp.addEventListener('change',()=>{
   const f=inp.files?.[0];if(!f)return;
   let img=inp.parentElement.querySelector('img[data-jpt-preview]');
   if(!img){img=document.createElement('img');img.dataset.jptPreview='1';img.style.cssText='display:block;max-width:100%;max-height:180px;border-radius:12px;margin-top:6px;object-fit:cover';inp.parentElement.appendChild(img)}
   img.src=URL.createObjectURL(f);
  });
 });
}
function boot(){wire();setInterval(wire,1500)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();