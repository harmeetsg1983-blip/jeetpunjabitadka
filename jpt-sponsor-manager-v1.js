/* JPT Sponsor Manager V1
   Central Owner manager for Delivery Partner + Customer Order Tracking sponsor sliders.
   Uses existing sponsor tables and public storage buckets.
*/
(function(){
'use strict';
if(window.__JPT_SPONSOR_MANAGER_V1__) return;
window.__JPT_SPONSOR_MANAGER_V1__=true;

const DELIVERY_TABLE='delivery_partner_sponsor_ads';
const CUSTOMER_TABLE='checkout_sponsor_ads';
const DELIVERY_BUCKET='delivery-partner-sponsors';
const CUSTOMER_BUCKET='checkout-sponsor-media';

function sb(){return window.sb||window.supabaseClient||null}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function host(){return document.querySelector('#settingsPanel')||document.querySelector('[data-panel="settings"]')||document.querySelector('#settings')||document.querySelector('.settings-panel')}
function currentOutlet(){
 const s=document.getElementById('outletSelect');
 return window.activeOutlet||s?.value||'';
}
function isCentral(){return sb()?.rpc('partner_access_is_central_owner')}
async function load(table){
 const r=await sb().from(table).select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});
 if(r.error) throw r.error; return r.data||[];
}
async function upload(file,bucket){
 const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
 const path='sponsors/'+Date.now()+'-'+Math.random().toString(36).slice(2,10)+'.'+(ext||'jpg');
 const r=await sb().storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
 if(r.error) throw r.error;
 const u=sb().storage.from(bucket).getPublicUrl(path);
 return u.data.publicUrl;
}
function preview(input,img){
 const f=input.files?.[0]; if(!f)return;
 const u=URL.createObjectURL(f); img.src=u; img.style.display='block';
}
function css(){
 if(document.getElementById('jptSponsorManagerCss'))return;
 const s=document.createElement('style');s.id='jptSponsorManagerCss';s.textContent=`
 #jptSponsorManager{margin-top:18px}.jpt-sm{background:linear-gradient(145deg,#151515,#090909);border:1px solid rgba(212,175,55,.4);border-radius:20px;padding:16px;color:#fff;box-shadow:0 12px 38px #0008}
 .jpt-sm h3{margin:0;color:#f4d77a}.jpt-sm .sub{font-size:12px;color:#aaa;margin-top:4px}.jpt-sm-tabs{display:flex;gap:8px;margin:14px 0;flex-wrap:wrap}.jpt-sm-tabs button{border:1px solid #4a3818;background:#151515;color:#ddd;border-radius:10px;padding:9px 12px;font-weight:800}.jpt-sm-tabs button.on{border-color:#d4af37;color:#f4d77a;background:#211a0d}
 .jpt-sm-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.jpt-sm label{font-size:11px;color:#c8c8c8}.jpt-sm input,.jpt-sm select{width:100%;box-sizing:border-box;background:#0a0a0a;color:#fff;border:1px solid #51401f;border-radius:10px;padding:10px;margin:5px 0 9px}.jpt-sm button{cursor:pointer}.jpt-sm-primary{background:linear-gradient(135deg,#f4d77a,#c69229);color:#111;border:0;border-radius:10px;padding:11px 14px;font-weight:900}
 .jpt-sm-preview{height:190px;border-radius:14px;border:1px solid #4a3818;background:#050505;overflow:hidden;display:grid;place-items:center;margin:4px 0 10px}.jpt-sm-preview img{width:100%;height:100%;object-fit:cover;display:none}
 .jpt-sm-list{margin-top:16px}.jpt-sm-item{display:grid;grid-template-columns:110px 1fr auto;gap:10px;align-items:center;border-top:1px solid #292929;padding:10px 0}.jpt-sm-thumb{width:110px;height:62px;object-fit:cover;border-radius:9px;border:1px solid #493719}.jpt-sm-chip{display:inline-block;padding:4px 7px;border-radius:999px;border:1px solid #493719;font-size:10px;margin:2px}.jpt-sm-danger{background:#291111;color:#ffb8b8;border:1px solid #733;border-radius:9px;padding:8px 10px}.jpt-sm-note{font-size:11px;color:#aaa;line-height:1.45}
 @media(max-width:700px){.jpt-sm-grid{grid-template-columns:1fr}.jpt-sm-item{grid-template-columns:82px 1fr}.jpt-sm-item button{grid-column:1/-1}.jpt-sm-thumb{width:82px;height:54px}}
 `;
 document.head.appendChild(s)
}
async function mount(){
 const h=host(); if(!h||document.getElementById('jptSponsorManager'))return;
 const central=await isCentral(); if(central.error||central.data!==true)return;
 css();
 const box=document.createElement('section');box.id='jptSponsorManager';
 box.innerHTML=`<div class="jpt-sm">
 <h3>✨ Sponsor Advertisement Manager</h3><div class="sub">Central control for Delivery Partner and Customer Order Tracking banners.</div>
 <div class="jpt-sm-tabs"><button id="jptSmDelivery" class="on">Delivery Partner</button><button id="jptSmCustomer">Customer Tracking</button></div>
 <div id="jptSmForm">
  <div class="jpt-sm-grid">
   <div><label>Sponsor Name</label><input id="jptSmSponsor" placeholder="Sponsor / Brand"></div>
   <div><label>Banner Title</label><input id="jptSmTitle" placeholder="Optional title"></div>
  </div>
  <label>Banner Image</label><input id="jptSmFile" type="file" accept="image/*">
  <div class="jpt-sm-preview"><img id="jptSmPreview" alt="Banner preview"><span id="jptSmPreviewText">Choose an image</span></div>
  <div class="jpt-sm-grid">
   <div><label>Target</label><select id="jptSmTarget"><option value="all">All live users</option><option value="outlet">Selected outlet</option></select></div>
   <div><label>Sort Order</label><input id="jptSmSort" type="number" value="0" min="0"></div>
  </div>
  <div id="jptSmOutletWrap" style="display:none"><label>Outlet</label><select id="jptSmOutlet"></select></div>
  <div class="jpt-sm-grid">
   <div><label>Start (optional)</label><input id="jptSmStart" type="datetime-local"></div>
   <div><label>End (optional)</label><input id="jptSmEnd" type="datetime-local"></div>
  </div>
  <button id="jptSmSave" class="jpt-sm-primary">ADD SPONSOR BANNER</button>
  <div id="jptSmMsg" class="jpt-sm-note"></div>
 </div>
 <div class="jpt-sm-list"><b>Active / Saved Banners</b><div id="jptSmList" class="jpt-sm-note">Loading...</div></div>
 </div>`;
 h.appendChild(box);

 let mode='delivery';
 const refs={};
 ['jptSmDelivery','jptSmCustomer','jptSmSponsor','jptSmTitle','jptSmFile','jptSmPreview','jptSmPreviewText','jptSmTarget','jptSmSort','jptSmOutletWrap','jptSmOutlet','jptSmStart','jptSmEnd','jptSmSave','jptSmMsg','jptSmList'].forEach(id=>refs[id]=document.getElementById(id));
 refs.jptSmFile.onchange=()=>{refs.jptSmPreviewText.style.display='none';preview(refs.jptSmFile,refs.jptSmPreview)};
 refs.jptSmTarget.onchange=()=>refs.jptSmOutletWrap.style.display=refs.jptSmTarget.value==='outlet'?'block':'none';
 async function outlets(){
   const r=await sb().from('outlets').select('code,name').order('name'); if(r.error)throw r.error;
   refs.jptSmOutlet.innerHTML=(r.data||[]).map(o=>`<option value="${esc(o.code)}">${esc(o.name||o.code)}</option>`).join('');
 }
 await outlets();
 function setMode(x){mode=x;refs.jptSmDelivery.classList.toggle('on',x==='delivery');refs.jptSmCustomer.classList.toggle('on',x==='customer');refresh()}
 refs.jptSmDelivery.onclick=()=>setMode('delivery');refs.jptSmCustomer.onclick=()=>setMode('customer');

 async function refresh(){
  try{
   const table=mode==='delivery'?DELIVERY_TABLE:CUSTOMER_TABLE;
   const rows=await load(table);
   refs.jptSmList.innerHTML=rows.length?rows.map(x=>`<div class="jpt-sm-item">
    <img class="jpt-sm-thumb" src="${esc(x.media_url)}">
    <div><b>${esc(x.sponsor_name||x.title||'Sponsor')}</b><div class="jpt-sm-note">${esc(x.title||'')} · ${x.is_active?'ON':'OFF'} · order ${x.sort_order??0}</div><span class="jpt-sm-chip">${x.target_all_live?'ALL LIVE':(x.outlet_ids||[]).join(', ')}</span></div>
    <button class="jpt-sm-danger" data-id="${esc(x.id)}" data-active="${x.is_active?'1':'0'}">${x.is_active?'TURN OFF':'TURN ON'}</button>
   </div>`).join(''):'No sponsor banners yet.';
   refs.jptSmList.querySelectorAll('button[data-id]').forEach(b=>b.onclick=async()=>{
     const r=await sb().from(table).update({is_active:b.dataset.active!=='1'}).eq('id',b.dataset.id);if(r.error)refs.jptSmMsg.textContent=r.error.message;else refresh();
   });
  }catch(e){refs.jptSmList.textContent=e.message||'Unable to load banners.'}
 }
 refs.jptSmSave.onclick=async()=>{
  const file=refs.jptSmFile.files?.[0];if(!file){refs.jptSmMsg.textContent='Please choose a banner image.';return}
  refs.jptSmSave.disabled=true;refs.jptSmMsg.textContent='Uploading banner...';
  try{
   const table=mode==='delivery'?DELIVERY_TABLE:CUSTOMER_TABLE;
   const bucket=mode==='delivery'?DELIVERY_BUCKET:CUSTOMER_BUCKET;
   const url=await upload(file,bucket);
   const targetAll=refs.jptSmTarget.value==='all';
   const outlet=refs.jptSmOutlet.value||currentOutlet();
   const row={title:refs.jptSmTitle.value.trim()||refs.jptSmSponsor.value.trim()||'Sponsor Banner',sponsor_name:refs.jptSmSponsor.value.trim(),media_type:'image',media_url:url,poster_url:url,target_all_live:targetAll,outlet_ids:targetAll?null:[outlet],is_active:true,sort_order:Number(refs.jptSmSort.value||0),starts_at:refs.jptSmStart.value?new Date(refs.jptSmStart.value).toISOString():null,ends_at:refs.jptSmEnd.value?new Date(refs.jptSmEnd.value).toISOString():null,created_by:(await sb().auth.getUser()).data.user?.id||null};
   const r=await sb().from(table).insert(row);if(r.error)throw r.error;
   refs.jptSmMsg.textContent='Banner added successfully.';
   refs.jptSmFile.value='';refs.jptSmPreview.removeAttribute('src');refs.jptSmPreview.style.display='none';refs.jptSmPreviewText.style.display='block';await refresh();
  }catch(e){refs.jptSmMsg.textContent=e.message||'Upload failed.'}finally{refs.jptSmSave.disabled=false}
 };
 await refresh();
}
function boot(){let n=0;const t=setInterval(async()=>{try{await mount()}catch(e){}if(document.getElementById('jptSponsorManager')||++n>40)clearInterval(t)},500)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();