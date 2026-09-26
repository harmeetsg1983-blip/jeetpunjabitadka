/* JPT Sponsor Manager V2
   Central Owner sponsor manager.
   Additive: preserves existing sponsor tables and storage buckets.
   Adds image crop/zoom/position before upload and outlet targeting.
*/
(function(){
'use strict';
if(window.__JPT_SPONSOR_MANAGER_V2__) return;
window.__JPT_SPONSOR_MANAGER_V2__=true;

const DELIVERY_TABLE='delivery_partner_sponsor_ads';
const CUSTOMER_TABLE='checkout_sponsor_ads';
const DELIVERY_BUCKET='delivery-partner-sponsors';
const CUSTOMER_BUCKET='checkout-sponsor-media';

function sb(){return window.sb||window.supabaseClient||null}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function host(){return document.querySelector('#settings')||document.querySelector('#settingsPanel')||document.querySelector('.settings-panel')}
function currentOutlet(){const s=document.getElementById('outletSelect');return window.activeOutlet||s?.value||''}
async function isCentral(){try{const r=await sb()?.rpc('partner_access_is_central_owner');return !r?.error&&r.data===true}catch(e){return false}}
async function load(table){const r=await sb().from(table).select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});if(r.error)throw r.error;return r.data||[]}
async function outlets(ref){const r=await sb().from('outlets').select('code,name').order('name');if(r.error)throw r.error;ref.outlet.innerHTML=(r.data||[]).map(o=>`<option value="${esc(o.code)}">${esc(o.name||o.code)}</option>`).join('')}
function css(){
 if(document.getElementById('jptSponsorManagerCssV2'))return;
 const s=document.createElement('style');s.id='jptSponsorManagerCssV2';s.textContent=`
 #jptSponsorManager{margin-top:18px}.jpt-sm{background:linear-gradient(145deg,#151515,#090909);border:1px solid rgba(212,175,55,.4);border-radius:20px;padding:16px;color:#fff;box-shadow:0 12px 38px #0008}.jpt-sm h3{margin:0;color:#f4d77a}.jpt-sm .sub{font-size:12px;color:#aaa;margin-top:4px}.jpt-sm-tabs{display:flex;gap:8px;margin:14px 0;flex-wrap:wrap}.jpt-sm-tabs button{border:1px solid #4a3818;background:#151515;color:#ddd;border-radius:10px;padding:9px 12px;font-weight:800}.jpt-sm-tabs button.on{border-color:#d4af37;color:#f4d77a;background:#211a0d}.jpt-sm-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.jpt-sm label{font-size:11px;color:#c8c8c8}.jpt-sm input,.jpt-sm select{width:100%;box-sizing:border-box;background:#0a0a0a;color:#fff;border:1px solid #51401f;border-radius:10px;padding:10px;margin:5px 0 9px}.jpt-sm button{cursor:pointer}.jpt-sm-primary{background:linear-gradient(135deg,#f4d77a,#c69229);color:#111;border:0;border-radius:10px;padding:11px 14px;font-weight:900}.jpt-sm-preview{height:190px;border-radius:14px;border:1px solid #4a3818;background:#050505;overflow:hidden;display:grid;place-items:center;margin:4px 0 10px}.jpt-sm-preview img{max-width:100%;max-height:100%;object-fit:contain}.jpt-crop{background:#050505;border:1px solid #493719;border-radius:14px;padding:10px;margin:8px 0}.jpt-crop canvas{display:block;width:100%;height:auto;max-height:280px;background:#111;border-radius:10px}.jpt-crop-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px}.jpt-crop button{background:#211a0d;color:#f4d77a;border:1px solid #5a461b;border-radius:9px;padding:8px;font-weight:800}.jpt-sm-list{margin-top:16px}.jpt-sm-item{display:grid;grid-template-columns:110px 1fr auto;gap:10px;align-items:center;border-top:1px solid #292929;padding:10px 0}.jpt-sm-thumb{width:110px;height:62px;object-fit:cover;border-radius:9px;border:1px solid #493719}.jpt-sm-chip{display:inline-block;padding:4px 7px;border-radius:999px;border:1px solid #493719;font-size:10px;margin:2px}.jpt-sm-danger{background:#291111;color:#ffb8b8;border:1px solid #733;border-radius:9px;padding:8px 10px}.jpt-sm-note{font-size:11px;color:#aaa;line-height:1.45}@media(max-width:700px){.jpt-sm-grid{grid-template-columns:1fr}.jpt-sm-item{grid-template-columns:82px 1fr}.jpt-sm-item button{grid-column:1/-1}.jpt-sm-thumb{width:82px;height:54px}}
 `;document.head.appendChild(s)
}
function cropEditor(ref){
 let img=null,scale=1,ox=0,oy=0,drag=false,lx=0,ly=0,ready=false;
 const canvas=ref.canvas,ctx=canvas.getContext('2d');
 function draw(){
  if(!img)return;
  const w=canvas.width,h=canvas.height;
  ctx.fillStyle='#111';ctx.fillRect(0,0,w,h);
  const iw=img.width*scale,ih=img.height*scale;
  ctx.drawImage(img,(w-iw)/2+ox,(h-ih)/2+oy,iw,ih);
 }
 function fit(){
  if(!img)return;
  const cw=900,ch=330;canvas.width=cw;canvas.height=ch;
  scale=Math.max(cw/img.width,ch/img.height);ox=0;oy=0;draw();
 }
 ref.file.onchange=()=>{
  const f=ref.file.files?.[0];if(!f)return;
  const u=URL.createObjectURL(f);img=new Image();img.onload=()=>{fit();ref.cropBox.style.display='block';ref.preview.src=u;ref.preview.style.display='block';ready=true};img.src=u;
 };
 ref.zoomIn.onclick=()=>{if(!img)return;scale*=1.12;draw()};
 ref.zoomOut.onclick=()=>{if(!img)return;scale=Math.max(scale/1.12,0.05);draw()};
 ref.center.onclick=()=>{if(!img)return;ox=0;oy=0;draw()};
 canvas.addEventListener('pointerdown',e=>{if(!img)return;drag=true;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;ox+=e.clientX-lx;oy+=e.clientY-ly;lx=e.clientX;ly=e.clientY;draw()});
 canvas.addEventListener('pointerup',()=>drag=false);
 return {ready,exportBlob:()=>new Promise((resolve,reject)=>{
   if(!img)return reject(new Error('Choose an image first.'));
   canvas.toBlob(b=>b?resolve(b):reject(new Error('Crop export failed.')),'image/jpeg',.92);
 })};
}
async function mount(){
 const h=host();if(!h||document.getElementById('jptSponsorManager'))return;
if(!(await isCentral()))return;
// V2 visibility bridge: expose Sponsor Ads V2 inside Settings.
const settingsHost = h;

if(settingsHost && !document.getElementById('jptSponsorLauncherV2')){
  const btn = document.createElement('button');

  btn.id = 'jptSponsorLauncherV2';
  btn.type = 'button';
  btn.className = 'btn';
  btn.textContent = '📢 Sponsor Ads V2';

  btn.style.cssText =
    'display:block;margin:0 0 14px;width:100%;' +
    'background:#171717;color:#f4d77a;' +
    'border:1px solid #d4af37;border-radius:10px;' +
    'padding:11px 14px;font-weight:900;cursor:pointer;';

  btn.onclick = () => {
    if(typeof window.showPanel === 'function'){
      window.showPanel('settings');
    }

    document.getElementById('jptSponsorManager')
      ?.scrollIntoView({
        behavior:'smooth',
        block:'start'
      });
  };

  settingsHost.insertBefore(btn, settingsHost.firstChild);
}
 css();
 const box=document.createElement('section');box.id='jptSponsorManager';
 box.innerHTML=`<div class="jpt-sm"><h3>✨ Sponsor Advertisement Manager V2</h3>
 <div class="sub">Central Owner controls Delivery Partner + Customer Tracking sponsor banners. Image-only • crop • zoom • drag • schedule • outlet targeting.</div>
 <div class="jpt-sm-tabs"><button id="jptSmDelivery" class="on">Delivery Partner</button><button id="jptSmCustomer">Customer Tracking</button></div>
 <div class="jpt-sm-grid"><div><label>Sponsor Name</label><input id="jptSmSponsor" placeholder="Sponsor / Brand"></div><div><label>Banner Title</label><input id="jptSmTitle" placeholder="Optional title"></div></div>
 <label>Banner Image</label><input id="jptSmFile" type="file" accept="image/*">
 <div id="jptSmCrop" class="jpt-crop" style="display:none"><canvas id="jptSmCanvas"></canvas><div class="jpt-crop-row"><button id="jptSmZoomOut">− Zoom</button><button id="jptSmCenter">Center</button><button id="jptSmZoomIn">＋ Zoom</button></div><div class="jpt-sm-note" style="margin-top:6px">Drag the image inside the frame to position it.</div></div>
 <div class="jpt-sm-grid"><div><label>Target</label><select id="jptSmTarget"><option value="all">All live users</option><option value="outlet">Selected outlet</option></select></div><div><label>Sort Order</label><input id="jptSmSort" type="number" value="0" min="0"></div></div>
 <div id="jptSmOutletWrap" style="display:none"><label>Outlet</label><select id="jptSmOutlet"></select></div>
 <div class="jpt-sm-grid"><div><label>Start (optional)</label><input id="jptSmStart" type="datetime-local"></div><div><label>End (optional)</label><input id="jptSmEnd" type="datetime-local"></div></div>
 <button id="jptSmSave" class="jpt-sm-primary">ADD SPONSOR BANNER</button><div id="jptSmMsg" class="jpt-sm-note"></div>
 <div class="jpt-sm-list"><b>Saved Banners</b><div id="jptSmList" class="jpt-sm-note">Loading...</div></div></div>`;
 h.appendChild(box);
 const r={};['jptSmDelivery','jptSmCustomer','jptSmSponsor','jptSmTitle','jptSmFile','jptSmCrop','jptSmCanvas','jptSmZoomOut','jptSmCenter','jptSmZoomIn','jptSmTarget','jptSmOutletWrap','jptSmOutlet','jptSmSort','jptSmStart','jptSmEnd','jptSmSave','jptSmMsg','jptSmList'].forEach(id=>r[id.replace('jptSm','').toLowerCase()]=document.getElementById(id));
 let mode='delivery',editor=cropEditor({file:r.file,cropBox:r.crop,canvas:r.canvas,zoomOut:r.zoomout,center:r.center,zoomIn:r.zoomin,preview:r.preview||document.createElement('img')});
 async function fillOutlets(){await outlets({outlet:r.outlet})} await fillOutlets();
 r.target.onchange=()=>r.outletwrap.style.display=r.target.value==='outlet'?'block':'none';
 const setMode=x=>{mode=x;r.delivery.classList.toggle('on',x==='delivery');r.customer.classList.toggle('on',x==='customer');refresh()};
 r.delivery.onclick=()=>setMode('delivery');r.customer.onclick=()=>setMode('customer');
 async function refresh(){
  try{const rows=await load(mode==='delivery'?DELIVERY_TABLE:CUSTOMER_TABLE);
   r.list.innerHTML=rows.length?rows.map(x=>`<div class="jpt-sm-item"><img class="jpt-sm-thumb" src="${esc(x.media_url)}"><div><b>${esc(x.sponsor_name||x.title||'Sponsor')}</b><div class="jpt-sm-note">${esc(x.title||'')} · ${x.is_active?'ON':'OFF'} · order ${x.sort_order??0}</div><span class="jpt-sm-chip">${x.target_all_live?'ALL LIVE':(x.outlet_ids||[]).join(', ')}</span></div><button class="jpt-sm-danger" data-id="${esc(x.id)}" data-active="${x.is_active?'1':'0'}">${x.is_active?'TURN OFF':'TURN ON'}</button></div>`).join(''):'No sponsor banners yet.';
   r.list.querySelectorAll('button[data-id]').forEach(b=>b.onclick=async()=>{const q=await sb().from(mode==='delivery'?DELIVERY_TABLE:CUSTOMER_TABLE).update({is_active:b.dataset.active!=='1'}).eq('id',b.dataset.id);if(q.error)r.msg.textContent=q.error.message;else refresh()});
  }catch(e){r.list.textContent=e.message||'Unable to load banners.'}
 }
 r.save.onclick=async()=>{
  const file=r.file.files?.[0];if(!file){r.msg.textContent='Please choose a banner image.';return}
  r.save.disabled=true;r.msg.textContent='Cropping and uploading...';
  try{
   const blob=await editor.exportBlob(),safe=new File([blob],(file.name||'sponsor')+'.jpg',{type:'image/jpeg'});
   const bucket=mode==='delivery'?DELIVERY_BUCKET:CUSTOMER_BUCKET,table=mode==='delivery'?DELIVERY_TABLE:CUSTOMER_TABLE;
   const path='sponsors/'+Date.now()+'-'+Math.random().toString(36).slice(2,9)+'.jpg';
   const up=await sb().storage.from(bucket).upload(path,safe,{upsert:false,contentType:'image/jpeg'});if(up.error)throw up.error;
   const url=sb().storage.from(bucket).getPublicUrl(path).data.publicUrl,targetAll=r.target.value==='all',outlet=r.outlet.value||currentOutlet();
   const row={title:r.title.value.trim()||r.sponsor.value.trim()||'Sponsor Banner',sponsor_name:r.sponsor.value.trim(),media_type:'image',media_url:url,poster_url:url,target_all_live:targetAll,outlet_ids:targetAll?[]:[outlet],is_active:true,sort_order:Number(r.sort.value||0),starts_at:r.start.value?new Date(r.start.value).toISOString():null,ends_at:r.end.value?new Date(r.end.value).toISOString():null,created_by:(await sb().auth.getUser()).data.user?.id||null};
   const ins=await sb().from(table).insert(row);if(ins.error)throw ins.error;
   r.msg.textContent='Banner added successfully.';r.file.value='';r.crop.style.display='none';await refresh();
  }catch(e){r.msg.textContent=e.message||'Upload failed.'}finally{r.save.disabled=false}
 };
 await refresh();
}
function boot(){let n=0;const t=setInterval(async()=>{try{await mount()}catch(e){}if(document.getElementById('jptSponsorManager')||++n>60)clearInterval(t)},500)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();
