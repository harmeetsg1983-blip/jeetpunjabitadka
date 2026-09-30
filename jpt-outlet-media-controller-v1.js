/* JPT Outlet Media Controller V1
   Central/Partner controller for top + lower Customer App outlet media.
   Uses existing campaigns table and existing menu-images storage bucket.
   No schema changes.
*/
(function(){
'use strict';
if(window.__JPT_OUTLET_MEDIA_CONTROLLER_V1__)return;
window.__JPT_OUTLET_MEDIA_CONTROLLER_V1__=true;
const TABLE='campaigns',BUCKET='menu-images';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sb=()=>window.sb||window.supabaseClient;
const toast=m=>typeof window.toast==='function'?window.toast(m):alert(m);
const ALLOWED=['SOP-002','NME-004','PFA-003','TOP-005'];
const outlets=()=>{
 const rows=Array.isArray(window.JPT_PARTNER_OUTLETS)?window.JPT_PARTNER_OUTLETS:[];
 const filtered=rows.filter(o=>ALLOWED.includes(String(o.outlet_id||o.code||o.id||'')));
 return filtered.length?filtered:[...ALLOWED].map(id=>({outlet_id:id,outlet_name:id}));
};

function mount(){
 const panel=document.getElementById('campaigns'); if(!panel||document.getElementById('jptOutletMediaV1'))return;
 const box=document.createElement('div');box.id='jptOutletMediaV1';box.innerHTML=`
 <div class="card jptmc">
 <h3>🎬 Four-Outlet Banner & Media Controller</h3>
 <div class="notice">One simple controller for Shan-e-Punjab, 99 Meal Express, Punjabi Food Adda and Taste of Punjab. Manage TOP + LOWER banners, images + videos, timing, sound, zoom/position, save, publish ON/OFF and delete.</div>
 <div class="jptmc-grid">
  <div><label>Outlet</label><select id="jptmcOutlet" class="select"></select></div>
  <div><label>Placement</label><select id="jptmcPlace" class="select"><option value="top">TOP BANNER</option><option value="lower">LOWER BANNER</option></select></div>
  <div><label>Media type</label><select id="jptmcType" class="select"><option value="image">IMAGE</option><option value="video">VIDEO</option></select></div>
  <div><label>Title</label><input id="jptmcTitle" class="input" placeholder="Festival / Weekend / Offer"></div>
  <div><label>Upload image/video</label><input id="jptmcFile" type="file" accept="image/*,video/mp4,video/webm,video/ogg"></div>
  <div><label>Display order</label><input id="jptmcOrder" class="input" type="number" min="0" value="0"></div>
  <div><label>Start (optional)</label><input id="jptmcStart" class="input" type="datetime-local"></div>
  <div><label>End (optional)</label><input id="jptmcEnd" class="input" type="datetime-local"></div>
 </div>
 <div id="jptmcImageTools" class="jptmc-editor">
  <div class="jptmc-preview"><canvas id="jptmcCanvas"></canvas></div>
  <div class="jptmc-controls"><button type="button" id="jptmcMinus" class="btn">− Zoom</button><button type="button" id="jptmcCenter" class="btn">Center</button><button type="button" id="jptmcPlus" class="btn">＋ Zoom</button></div>
  <div class="notice">Drag the image inside the frame. Preview is the same framing that will be used in the banner.</div>
 </div>
 <div id="jptmcVideoTools" class="jptmc-editor" style="display:none">
  <div id="jptmcVideoPreview" class="jptmc-video"></div>
 </div>
 <div class="jptmc-options">
  <label><input id="jptmcMuted" type="checkbox" checked> MUTE VIDEO</label>
  <label><input id="jptmcPublish" type="checkbox" checked> PUBLISH / ON</label>
  <span class="jptmc-limit">IMAGE DISPLAY: 10 SEC MAX • VIDEO: NEXT STARTS WHEN VIDEO ENDS</span>
 </div>
 <div class="jptmc-actions"><button type="button" id="jptmcSave" class="btn gold">SAVE MEDIA</button><button type="button" id="jptmcClear" class="btn">CLEAR</button></div>
 <div id="jptmcMsg" class="notice"></div>
 </div>
 <div class="card jptmc"><h3>📋 Saved Media</h3><div class="notice">Each media item has its own ON/OFF, PUBLISH, DELETE and placement/order control.</div><div id="jptmcList"></div></div>`;
 panel.appendChild(box);
 addCss(); init();
}
function addCss(){if(document.getElementById('jptmcCss'))return;const s=document.createElement('style');s.id='jptmcCss';s.textContent=`
.jptmc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.jptmc label{font-size:11px;color:#bbb}.jptmc-editor{margin-top:10px}.jptmc-preview{height:220px;background:#050505;border:1px solid #5b471c;border-radius:14px;overflow:hidden;display:grid;place-items:center}.jptmc-preview canvas{width:100%;height:100%;display:block}.jptmc-controls,.jptmc-actions,.jptmc-options{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:9px}.jptmc-options{padding:10px;border:1px solid #3c321f;border-radius:12px;background:#101010}.jptmc-limit{color:#f4d77a;font-size:10px}.jptmc-video{min-height:220px;background:#050505;border:1px solid #5b471c;border-radius:14px;display:grid;place-items:center;overflow:hidden}.jptmc-video video{width:100%;height:220px;object-fit:contain}.jptmc-row{display:grid;grid-template-columns:90px 1fr auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid #292929}.jptmc-thumb{width:90px;height:58px;object-fit:cover;border-radius:9px;border:1px solid #493719;background:#050505}.jptmc-status{font-size:10px;padding:4px 7px;border-radius:99px;border:1px solid #493719;display:inline-block;margin:2px}.jptmc-danger{background:#3a1010;color:#ffb8b8;border:1px solid #933;border-radius:9px;padding:8px 10px;font-weight:800}.jptmc-mini{background:#171717;color:#f4d77a;border:1px solid #5a461b;border-radius:9px;padding:8px 10px;font-weight:800}@media(max-width:700px){.jptmc-grid{grid-template-columns:1fr}.jptmc-row{grid-template-columns:72px 1fr}.jptmc-row .jptmc-row-actions{grid-column:1/-1}.jptmc-thumb{width:72px;height:52px}}`;document.head.appendChild(s)}
function init(){
 const outlet=document.getElementById('jptmcOutlet'),rows=outlets();
 outlet.innerHTML=rows.map(o=>`<option value="${esc(o.outlet_id||o.code||o.id)}">${esc(o.outlet_name||o.name||o.outlet_id||o.code||o.id)}</option>`).join('');
 const active=document.getElementById('outletSelect')?.value;if(active&&rows.some(o=>String(o.outlet_id||o.code||o.id)===String(active)))outlet.value=active;
 let img=null,scale=1,ox=0,oy=0,drag=false,lx=0,ly=0;
 const canvas=document.getElementById('jptmcCanvas'),ctx=canvas.getContext('2d');
 function draw(){canvas.width=900;canvas.height=330;ctx.fillStyle='#070707';ctx.fillRect(0,0,900,330);if(!img)return;const iw=img.width*scale,ih=img.height*scale;ctx.drawImage(img,(900-iw)/2+ox,(330-ih)/2+oy,iw,ih)}
 function loadImage(file){const u=URL.createObjectURL(file);img=new Image();img.onload=()=>{scale=Math.max(900/img.width,330/img.height);ox=0;oy=0;draw();};img.src=u}
 canvas.addEventListener('pointerdown',e=>{if(!img)return;drag=true;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;ox+=e.clientX-lx;oy+=e.clientY-ly;lx=e.clientX;ly=e.clientY;draw()});canvas.addEventListener('pointerup',()=>drag=false);
 document.getElementById('jptmcMinus').onclick=()=>{if(img){scale/=1.12;draw()}};document.getElementById('jptmcPlus').onclick=()=>{if(img){scale*=1.12;draw()}};document.getElementById('jptmcCenter').onclick=()=>{ox=0;oy=0;draw()};
 const type=document.getElementById('jptmcType'),file=document.getElementById('jptmcFile'),it=document.getElementById('jptmcImageTools'),vt=document.getElementById('jptmcVideoTools'),vp=document.getElementById('jptmcVideoPreview');
 type.onchange=()=>{const isV=type.value==='video';it.style.display=isV?'none':'block';vt.style.display=isV?'block':'none';file.accept=isV?'video/mp4,video/webm,video/ogg':'image/*';file.value='';vp.innerHTML='';img=null;draw();};
 file.onchange=()=>{const f=file.files?.[0];if(!f)return;if(type.value==='image'){loadImage(f);vp.innerHTML=''}else{const u=URL.createObjectURL(f);vp.innerHTML=`<video controls playsinline muted src="${u}"></video>`}};
 async function blob(){return new Promise((res,rej)=>{if(!img)return rej(new Error('Choose an image first.'));canvas.toBlob(b=>b?res(b):rej(new Error('Preview export failed.')),'image/jpeg',.92)})}
 async function upload(f,outletId){const safe=(f.name||'media').toLowerCase().replace(/[^a-z0-9.]+/g,'-');const path='outlet-media/'+outletId+'/'+Date.now()+'-'+safe;const up=await sb().storage.from(BUCKET).upload(path,f,{upsert:false,contentType:f.type||'application/octet-stream'});if(up.error)throw up.error;return sb().storage.from(BUCKET).getPublicUrl(path).data.publicUrl}
 async function refresh(){const id=outlet.value;const r=await sb().from(TABLE).select('*').eq('outlet_id',id).order('priority',{ascending:false}).order('created_at',{ascending:false});const list=document.getElementById('jptmcList');if(r.error){list.innerHTML='<div class="danger">'+esc(r.error.message)+'</div>';return}const rows=r.data||[];const media=rows.filter(c=>{const s=c.schedule_json;return s&&s.controller==='jpt-outlet-media-v1'});if(!media.length){list.innerHTML='<div class="notice">No saved media for this outlet.</div>';return}list.innerHTML=media.map(c=>{const s=c.schedule_json||{},active=!!c.active,kind=s.media_kind||'image',place=s.placement||'top';return `<div class="jptmc-row"><div class="jptmc-thumb" style="${kind==='image'?'background:url('+esc(c.banner_url||'')+') center/cover no-repeat':''}">${kind==='video'?'🎬':''}</div><div><b>${esc(c.title||'Media')}</b><div><span class="jptmc-status">${place.toUpperCase()}</span><span class="jptmc-status">${kind.toUpperCase()}</span><span class="jptmc-status">${active?'ON':'OFF'}</span><span class="jptmc-status">ORDER ${Number(c.priority||0)}</span><span class="jptmc-status">${kind==='image'?'10 SEC MAX':'NEXT ON END'}</span><span class="jptmc-status">${s.muted===false?'SOUND':'MUTED'}</span></div></div><div class="jptmc-row-actions"><button type="button" class="jptmc-mini" data-act="toggle" data-id="${esc(c.id)}">${active?'OFF':'PUBLISH / ON'}</button><button type="button" class="jptmc-danger" data-act="delete" data-id="${esc(c.id)}">DELETE</button></div></div>`}).join('');list.querySelectorAll('button[data-act]').forEach(b=>b.onclick=async()=>{const id=b.dataset.id,act=b.dataset.act;if(act==='delete'){if(!confirm('Delete this media permanently?'))return;const q=await sb().from(TABLE).delete().eq('id',id).eq('outlet_id',outlet.value);if(q.error)toast(q.error.message);else{toast('Media deleted');refresh()}}else{const q=await sb().from(TABLE).update({active:b.textContent==='PUBLISH / ON'}).eq('id',id).eq('outlet_id',outlet.value);if(q.error)toast(q.error.message);else{toast('Media status updated');refresh()}}})}
 document.getElementById('jptmcSave').type='button';document.getElementById('jptmcClear').type='button';document.getElementById('jptmcSave').onclick=async()=>{const f=file.files?.[0],id=outlet.value;if(!f)return toast('Choose image or video first');if(type.value==='video'&&f.size>60*1024*1024)return toast('Video must be under 60MB');if(type.value==='image'&&f.size>8*1024*1024)return toast('Image must be under 8MB');const btn=document.getElementById('jptmcSave');btn.disabled=true;document.getElementById('jptmcMsg').textContent='Saving…';try{let url;if(type.value==='image'){url=await upload(new File([await blob()],(f.name||'banner')+'.jpg',{type:'image/jpeg'}),id)}else url=await upload(f,id);const row={outlet_id:id,title:document.getElementById('jptmcTitle').value.trim()||'Outlet Media',message:'Customer outlet media',active:document.getElementById('jptmcPublish').checked,start_at:document.getElementById('jptmcStart').value?new Date(document.getElementById('jptmcStart').value).toISOString():null,end_at:document.getElementById('jptmcEnd').value?new Date(document.getElementById('jptmcEnd').value).toISOString():null,priority:Number(document.getElementById('jptmcOrder').value||0),banner_url:type.value==='image'?url:null,video_url:type.value==='video'?url:null,schedule_json:{version:1,controller:'jpt-outlet-media-v1',campaign_type:'media',media_kind:type.value,placement:document.getElementById('jptmcPlace').value,muted:document.getElementById('jptmcMuted').checked,image_duration_sec:10,advance:'video-ended',zoom:scale,offset_x:ox,offset_y:oy}};const ins=await sb().from(TABLE).insert(row);if(ins.error)throw ins.error;document.getElementById('jptmcMsg').textContent='Saved and '+(row.active?'PUBLISHED ON.':'kept OFF.');file.value='';vp.innerHTML='';img=null;draw();await refresh()}catch(e){document.getElementById('jptmcMsg').textContent=e.message||'Save failed.'}finally{btn.disabled=false}};
 document.getElementById('jptmcClear').onclick=()=>{file.value='';document.getElementById('jptmcTitle').value='';img=null;vp.innerHTML='';draw();document.getElementById('jptmcMsg').textContent='Cleared.'};
 outlet.onchange=refresh;refresh();
}
const wait=setInterval(()=>{if(window.sb&&document.getElementById('campaigns')){clearInterval(wait);mount()}},700);
})();