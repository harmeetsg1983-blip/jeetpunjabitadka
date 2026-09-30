/* JPT Sponsor Media Manager V4
   Two Customer Tracking/Checkout sponsor slots.
   Each slot supports multiple image/video items.
   No schema changes: slot is stored in schedule_json.slot.
*/
(function(){
'use strict';
if(window.__JPT_SPONSOR_MEDIA_MANAGER_V4__)return;
window.__JPT_SPONSOR_MEDIA_MANAGER_V4__=true;
const TABLE='checkout_sponsor_ads',BUCKET='checkout-sponsor-media';
const sb=()=>window.sb||window.supabaseClient||null;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const host=()=>document.querySelector('#settings')||document.querySelector('#settingsPanel')||document.querySelector('.settings-panel');
async function central(){try{const r=await sb()?.rpc('partner_access_is_central_owner');return !r?.error&&r.data===true}catch(e){return false}}
function css(){if(document.getElementById('jptSmV4Css'))return;const s=document.createElement('style');s.id='jptSmV4Css';s.textContent='.jpt-smv4{margin-top:14px;background:#0b0b0b;border:1px solid #d4af37;border-radius:18px;padding:14px;color:#fff}.jpt-smv4 h3{margin:0;color:#f4d77a}.jpt-smv4-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.jpt-smv4 input,.jpt-smv4 select{width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #51401f;border-radius:9px;padding:9px;margin-top:4px}.jpt-smv4 label{font-size:10px;color:#bbb}.jpt-smv4-preview{height:150px;margin-top:8px;border:1px solid #493719;border-radius:12px;overflow:hidden;background:#050505}.jpt-smv4-preview canvas{width:100%;height:100%;display:block}.jpt-smv4-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.jpt-smv4 button{border:1px solid #5a461b;background:#171717;color:#f4d77a;border-radius:9px;padding:8px 10px;font-weight:800}.jpt-smv4 .primary{background:#d4af37;color:#111}.jpt-smv4 .danger{background:#351010;color:#ffbaba;border-color:#933}.jpt-smv4-row{display:grid;grid-template-columns:72px 1fr auto;gap:9px;align-items:center;border-top:1px solid #292929;padding:9px 0}.jpt-smv4-thumb{width:72px;height:50px;object-fit:cover;border-radius:8px;background:#050505}.jpt-smv4-chip{font-size:9px;border:1px solid #493719;border-radius:99px;padding:3px 6px;display:inline-block;margin:2px}.jpt-smv4-note{font-size:10px;color:#999;line-height:1.4}@media(max-width:700px){.jpt-smv4-grid{grid-template-columns:1fr}.jpt-smv4-row{grid-template-columns:58px 1fr}.jpt-smv4-row .actions{grid-column:1/-1}.jpt-smv4-thumb{width:58px;height:45px}}';document.head.appendChild(s)}
function mount(){
 const h=host();if(!h||document.getElementById('jptSponsorMediaManagerV4'))return;
 const box=document.createElement('section');box.id='jptSponsorMediaManagerV4';box.className='jpt-smv4';box.innerHTML='<h3>📢 Sponsor Ads V4 — Checkout / Order Tracking</h3><div class="jpt-smv4-note">One large sponsor position. It can contain multiple images/videos. Images change every 10 seconds; videos advance when finished.</div><div class="jpt-smv4-grid"><div><label>SPONSOR POSITION</label><select id="jpt4Slot"><option value="1">Single Sponsor Banner</option></select></div><div><label>MEDIA TYPE</label><select id="jpt4Type"><option value="image">Image</option><option value="video">Video</option></select></div><div><label>SPONSOR NAME</label><input id="jpt4Sponsor" placeholder="Brand name"></div><div><label>BANNER TITLE</label><input id="jpt4Title" placeholder="Optional title"></div><div><label>DISPLAY ORDER</label><input id="jpt4Order" type="number" min="0" value="1"></div><div><label>MEDIA FILE</label><input id="jpt4File" type="file" accept="image/*,video/*,.mp4,.webm,.ogg"></div><div><label>START</label><input id="jpt4Start" type="datetime-local"></div><div><label>END</label><input id="jpt4End" type="datetime-local"></div></div><div id="jpt4Preview" class="jpt-smv4-preview"><canvas id="jpt4Canvas"></canvas></div><div class="jpt-smv4-actions"><button id="jpt4Minus">− Zoom</button><button id="jpt4Center">Center</button><button id="jpt4Plus">＋ Zoom</button><label style="display:flex;align-items:center;gap:5px"><input id="jpt4Muted" type="checkbox" checked style="width:auto"> Mute video</label></div><div class="jpt-smv4-actions"><button id="jpt4Save" class="primary">SAVE + PUBLISH</button><button id="jpt4Refresh">REFRESH</button></div><div id="jpt4Msg" class="jpt-smv4-note"></div><div style="margin-top:12px"><b>Saved media</b><div id="jpt4List"></div></div>';
 h.appendChild(box);css();run();
}
async function run(){
 const file=document.getElementById('jpt4File'),type=document.getElementById('jpt4Type');
 const preview=document.getElementById('jpt4Preview');
 const zoomOut=document.getElementById('jpt4Minus'),center=document.getElementById('jpt4Center'),zoomIn=document.getElementById('jpt4Plus');
 const muted=document.getElementById('jpt4Muted'),save=document.getElementById('jpt4Save'),refreshBtn=document.getElementById('jpt4Refresh'),msg=document.getElementById('jpt4Msg');
 let canvas=document.getElementById('jpt4Canvas'),ctx=canvas.getContext('2d'),img=null,scale=1,ox=0,oy=0,drag=false,lx=0,ly=0,videoUrl='';
 canvas.width=900;canvas.height=330;
 const draw=()=>{ctx.fillStyle='#050505';ctx.fillRect(0,0,900,330);if(!img)return;const w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(900-w)/2+ox,(330-h)/2+oy,w,h)};
 function setMode(kind){
   const isVideo=kind==='video';
   canvas.style.display=isVideo?'none':'block';
   zoomOut.disabled=isVideo;center.disabled=isVideo;zoomIn.disabled=isVideo;
   zoomOut.style.opacity=isVideo ? .55 : 1;center.style.opacity=isVideo ? .55 : 1;zoomIn.style.opacity=isVideo ? .55 : 1;
   let v=document.getElementById('jpt4VideoPreview');
   if(isVideo){
     if(!v){v=document.createElement('video');v.id='jpt4VideoPreview';v.controls=true;v.playsInline=true;v.muted=muted.checked;v.style.cssText='width:100%;height:100%;object-fit:contain;background:#000';preview.appendChild(v)}
     v.style.display='block';
   }else if(v){v.style.display='none';v.pause()}
 }
 type.onchange=()=>{file.value='';img=null;videoUrl='';setMode(type.value);msg.textContent=type.value==='video'?'Video mode: choose an MP4/WebM/OGG.':'Image mode: choose an image for crop/zoom.'};
 file.onchange=()=>{
   const f=file.files?.[0];if(!f)return;
   const isVideo=/^video\\//i.test(f.type)||/\\.(mp4|webm|ogg)$/i.test(f.name);
   type.value=isVideo?'video':'image';setMode(type.value);
   if(isVideo){
     videoUrl=URL.createObjectURL(f);let v=document.getElementById('jpt4VideoPreview');v.src=videoUrl;v.muted=muted.checked;msg.textContent='Video selected. Zoom is for images; video will play to completion, then advance.';
     return;
   }
   const u=URL.createObjectURL(f);img=new Image();img.onload=()=>{scale=Math.max(900/img.width,330/img.height);ox=oy=0;draw();msg.textContent='Image selected. Drag / Zoom / Center as needed.'};img.src=u;
 };
 zoomOut.onclick=(e)=>{e.preventDefault();if(!img)return;scale=Math.max(.05,scale/1.12);draw()};
 zoomIn.onclick=(e)=>{e.preventDefault();if(!img)return;scale*=1.12;draw()};
 center.onclick=(e)=>{e.preventDefault();if(!img)return;ox=oy=0;draw()};
 canvas.onpointerdown=e=>{if(!img)return;drag=true;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture?.(e.pointerId)};
 canvas.onpointermove=e=>{if(!drag)return;ox+=e.clientX-lx;oy+=e.clientY-ly;lx=e.clientX;ly=e.clientY;draw()};
 canvas.onpointerup=()=>drag=false;canvas.onpointercancel=()=>drag=false;
 muted.onchange=()=>{const v=document.getElementById('jpt4VideoPreview');if(v)v.muted=muted.checked};
 const blob=()=>new Promise((resolve,reject)=>{if(!img)return reject(new Error('Image preview not ready'));canvas.toBlob(b=>b?resolve(b):reject(new Error('Image export failed')),'image/jpeg',.92)});
 async function refresh(){
   try{
    const r=await sb().from(TABLE).select('id,media_url,media_type,video_url,title,sponsor_name,is_active,sort_order,starts_at,ends_at,schedule_json').order('sort_order',{ascending:true}).order('created_at',{ascending:false});
    if(r.error)throw r.error;
    const rows=r.data||[];document.getElementById('jpt4List').innerHTML=rows.length?rows.map(x=>{const slot=Number(x.schedule_json?.slot||0),kind=String(x.media_type||x.schedule_json?.media_kind||'image');return '<div class="jpt-smv4-row"><div class="jpt-smv4-thumb" style="display:grid;place-items:center;font-size:20px">'+(kind==='video'?'🎬':'🖼️')+'</div><div><b>'+esc(x.title||x.sponsor_name||'Sponsor')+'</b><div><span class="jpt-smv4-chip">SINGLE+'</span><span class="jpt-smv4-chip">'+esc(kind.toUpperCase())+'</span><span class="jpt-smv4-chip">'+(x.is_active?'ON':'OFF')+'</span><span class="jpt-smv4-chip">ORDER '+Number(x.sort_order||0)+'</span><span class="jpt-smv4-chip">'+(kind==='image'?'10 SEC':'VIDEO END')+'</span></div></div><div class="actions"><button type="button" data-id="'+esc(x.id)+'" data-a="toggle">'+(x.is_active?'TURN OFF':'PUBLISH / ON')+'</button><button type="button" class="danger" data-id="'+esc(x.id)+'" data-a="delete">DELETE</button></div></div>'}).join(''):'No sponsor media saved yet.';
    document.querySelectorAll('#jpt4List button[data-id]').forEach(b=>b.onclick=async()=>{const id=b.dataset.id;const row=rows.find(x=>String(x.id)===String(id));if(b.dataset.a==='delete'){if(!confirm('Delete this sponsor media?'))return;const q=await sb().from(TABLE).delete().eq('id',id);if(q.error)msg.textContent=q.error.message}else{const q=await sb().from(TABLE).update({is_active:!row.is_active}).eq('id',id);if(q.error)msg.textContent=q.error.message}await refresh()});
   }catch(e){msg.textContent=e.message||'Unable to refresh saved media.'}
 }
 save.type='button';save.onclick=async(e)=>{
   e.preventDefault();e.stopPropagation();
   const f=file.files?.[0],slot=Number(document.getElementById('jpt4Slot').value),kind=type.value;
   if(!f){msg.textContent='Choose an image/video first.';return}
   save.disabled=true;msg.textContent='Uploading…';
   try{
     let outFile=f;if(kind==='image'){const b=await blob();outFile=new File([b],(f.name||'sponsor')+'.jpg',{type:'image/jpeg'})}
     if(kind==='video'&&f.size>60*1024*1024)throw new Error('Video must be under 60MB');
     const path='checkout/'+Date.now()+'-'+f.name.replace(/[^a-zA-Z0-9._-]/g,'-');const up=await sb().storage.from(BUCKET).upload(path,outFile,{upsert:false,contentType:outFile.type||'application/octet-stream'});if(up.error)throw up.error;
     const url=sb().storage.from(BUCKET).getPublicUrl(path).data.publicUrl,order=Number(document.getElementById('jpt4Order').value||1);
     const row={title:document.getElementById('jpt4Title').value.trim()||document.getElementById('jpt4Sponsor').value.trim()||'Sponsor Banner',sponsor_name:document.getElementById('jpt4Sponsor').value.trim(),media_type:kind,media_url:kind==='image'?url:null,video_url:kind==='video'?url:null,poster_url:kind==='image'?url:null,target_all_live:true,outlet_ids:[],is_active:true,sort_order:order,starts_at:document.getElementById('jpt4Start').value?new Date(document.getElementById('jpt4Start').value).toISOString():null,ends_at:document.getElementById('jpt4End').value?new Date(document.getElementById('jpt4End').value).toISOString():null,schedule_json:{version:5,slot:1,media_kind:kind,muted:muted.checked,image_duration_sec:10,advance:'video-ended'}};
     const ins=await sb().from(TABLE).insert(row);if(ins.error)throw ins.error;
     msg.textContent='Saved + published to Sponsor Slot '+slot+'.';file.value='';img=null;setMode(kind);await refresh();
   }catch(e){msg.textContent=e.message||'Save failed.'}finally{save.disabled=false}
 };
 refreshBtn.type='button';refreshBtn.onclick=async(e)=>{e.preventDefault();msg.textContent='Refreshing…';await refresh();msg.textContent='Saved media refreshed.'};
 setMode(type.value);await refresh();
}
}
function boot(){let n=0;const t=setInterval(async()=>{if(await central()){clearInterval(t);mount()}else if(++n>60)clearInterval(t)},500)}boot();
})();