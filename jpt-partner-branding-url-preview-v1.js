/* JPT Partner Branding URL Preview V1
   Adds safe previews for saved logo/banner URLs.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_BRANDING_URL_PREVIEW_V1__) return;
  window.__JPT_PARTNER_BRANDING_URL_PREVIEW_V1__=true;

  async function render(){
    try{
      const sb=window.sb, code=window.activeOutlet||document.getElementById('outletSelect')?.value||'';
      if(!sb||!code)return;
      const {data,error}=await sb.from('outlets').select('logo_url,banner_url').eq('code',code).maybeSingle();
      if(error||!data)return;
      const panel=document.getElementById('jptOutletBrandingPanel')||document.getElementById('jptOutletBranding');
      if(!panel)return;
      let box=document.getElementById('jptSavedBrandingPreview');
      if(!box){
        box=document.createElement('div');
        box.id='jptSavedBrandingPreview';
        box.style.cssText='margin-top:10px;padding:10px;border:1px solid #333;border-radius:12px;background:#111';
        panel.appendChild(box);
      }
      box.innerHTML='<b style="color:#d8ae42">Saved Branding Preview</b>'+
        '<div style="display:grid;gap:8px;margin-top:8px">'+
        (data.logo_url?'<div><span style="color:#999;font-size:11px">Logo</span><br><img src="'+String(data.logo_url).replace(/"/g,'&quot;')+'" style="width:72px;height:72px;object-fit:cover;border-radius:12px;border:1px solid #444"></div>':'<div style="color:#999;font-size:11px">Logo not uploaded</div>')+
        (data.banner_url?'<div><span style="color:#999;font-size:11px">Banner</span><br><img src="'+String(data.banner_url).replace(/"/g,'&quot;')+'" style="width:100%;max-height:150px;object-fit:cover;border-radius:10px;border:1px solid #444"></div>':'<div style="color:#999;font-size:11px">Banner not uploaded</div>')+
        '</div>';
    }catch(e){}
  }

  function boot(){setTimeout(render,1800);setInterval(render,20000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
