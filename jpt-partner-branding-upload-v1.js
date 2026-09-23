/* JPT Partner Branding Upload V1
   Adds file upload controls to the existing Outlet Branding panel.
   Uses the existing public menu-images bucket and current outlet RLS.
*/
(function(){
'use strict';
if(window.__JPT_PARTNER_BRANDING_UPLOAD_V1__)return;
window.__JPT_PARTNER_BRANDING_UPLOAD_V1__=true;
const bucket='menu-images';
function outlet(){return String(window.activeOutlet||document.getElementById('outletSelect')?.value||'');}
async function upload(file,kind){
  const sb=window.sb,id=outlet();
  if(!sb||!id||!file)throw new Error('Outlet or Supabase client not ready');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
  const path=`partner-branding/${id}/${kind}-${Date.now()}.${ext}`;
  const u=await sb.storage.from(bucket).upload(path,file,{upsert:true,contentType:file.type||'image/jpeg'});
  if(u.error)throw u.error;
  const pub=sb.storage.from(bucket).getPublicUrl(path);
  const url=pub?.data?.publicUrl||'';
  if(!url)throw new Error('Public URL could not be generated');
  const patch=kind==='logo'?{logo_url:url}:{banner_url:url};
  const r=await sb.from('outlets').update(patch).eq('code',id);
  if(r.error)throw r.error;
  return url;
}
function add(panel){
  if(panel.dataset.jptBrandUpload)return;
  panel.dataset.jptBrandUpload='1';
  const box=document.createElement('div');
  box.className='notice';
  box.innerHTML=`<b>📤 Upload Branding</b><div style="margin-top:8px;display:grid;gap:8px">
  <label>Logo <input id="jptBrandLogoFile" type="file" accept="image/*"></label>
  <button class="btn" id="jptBrandLogoUpload">Upload Logo</button>
  <label>Banner <input id="jptBrandBannerFile" type="file" accept="image/*"></label>
  <button class="btn" id="jptBrandBannerUpload">Upload Banner</button>
  <div id="jptBrandUploadMsg" class="muted">Files upload directly to the selected outlet.</div></div>`;
  panel.appendChild(box);
  async function go(kind,inputId,buttonId){
    const f=document.getElementById(inputId)?.files?.[0],b=document.getElementById(buttonId),m=document.getElementById('jptBrandUploadMsg');
    if(!f){m.textContent='Choose an image first.';return}
    b.disabled=true;b.textContent='UPLOADING…';
    try{await upload(f,kind);m.textContent='✅ '+kind+' uploaded and mapped to '+outlet();if(typeof window.loadOutlet==='function')await window.loadOutlet();}
    catch(e){m.textContent='❌ Upload failed: '+(e.message||e)}
    finally{b.disabled=false;b.textContent=kind==='logo'?'Upload Logo':'Upload Banner'}
  }
  document.getElementById('jptBrandLogoUpload').onclick=()=>go('logo','jptBrandLogoFile','jptBrandLogoUpload');
  document.getElementById('jptBrandBannerUpload').onclick=()=>go('banner','jptBrandBannerFile','jptBrandBannerUpload');
}
function boot(){let n=0;const t=setInterval(()=>{const p=document.getElementById('jptOutletBrandingPanel')||document.getElementById('jptOutletBranding');if(p)add(p);if(p||++n>40)clearInterval(t)},500)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();