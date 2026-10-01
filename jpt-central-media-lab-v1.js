/* JPT Central Media Lab V1 — controlled branch
   Dynamic outlet media control. Does not touch Campaign Hero.
   Destinations reserved: CUSTOMER B1/B2/B3, CHECKOUT C1/C2, DELIVERY TOP/LOWER.
*/
(function(){
'use strict';
if(window.__JPT_CENTRAL_MEDIA_LAB_V1__) return;
window.__JPT_CENTRAL_MEDIA_LAB_V1__=true;

const TABLE='campaigns', BUCKET='menu-images';
const slots=['B1','B2','B3'];
const machine=(code,slot)=>'OUTLET-'+String(code||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'')+'-'+slot;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const client=()=>window.sb||window.supabaseClient||null;
const toast=m=>typeof window.toast==='function'?window.toast(m):alert(m);

function root(){
 let el=document.getElementById('jptCentralMediaLab');
 if(el) return el;
 const main=document.querySelector('main.shell')||document.body;
 el=document.createElement('section'); el.id='jptCentralMediaLab'; el.className='card';
 el.style.cssText='margin-top:12px;border:1px solid #4b3a16;background:#0e0e0e;border-radius:16px;padding:16px';
 main.appendChild(el); return el;
}
function machineId(code,slot){return machine(code,slot)}
async function outlets(){
 const sb=client(); if(!sb) throw new Error('Partner Supabase client unavailable');
 const all=[]; for(let from=0;from<3000;from+=1000){
   const r=await sb.from('outlets').select('id,code,name,is_active').order('name',{ascending:true}).range(from,from+999);
   if(r.error) throw r.error; all.push(...(r.data||[])); if((r.data||[]).length<1000) break;
 }
 return all;
}
function card(o,slot,row){
 const code=o.code||o.id||''; const mid=machine(code,slot);
 const s=row?.schedule_json||{}; const media=row?.media_url||s.image_url||s.video_url||'';
 return '<div class="card jpt-cml-slot" data-slot="'+slot+'" data-code="'+esc(code)+'" style="margin-top:10px;background:#121212">'+
  '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b style="color:#d8ae42">'+esc(slot==='B1'?'FIRST BANNER':slot==='B2'?'SECOND BANNER':'THIRD BANNER')+'</b><div class="muted">'+esc(mid)+'</div></div>'+
  '<span class="tag">'+(row?.is_active?'ON':'OFF')+'</span></div>'+
  '<div class="two" style="margin-top:8px"><div>'+
  '<div class="field"><label>Image / Video</label><input class="input cml-file" type="file" accept="image/*,video/*"></div>'+
  '<div class="field"><label>Start / End</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><input class="input cml-start" type="datetime-local" value="'+esc((s.start_at||'').slice(0,16))+'"><input class="input cml-end" type="datetime-local" value="'+esc((s.end_at||'').slice(0,16))+'"></div></div>'+
  '<div class="rowactions"><button class="btn gold cml-save">Push / Save</button><button class="btn cml-toggle">'+(row?.is_active?'Turn OFF':'Turn ON')+'</button><button class="btn red cml-delete">Delete</button></div></div>'+
  '<div><div class="notice">Preview</div><div class="cml-preview" style="min-height:130px;border:1px dashed #444;border-radius:10px;display:grid;place-items:center;overflow:hidden">'+
  (media?(s.media_type==='video'||row?.media_type==='video'?'<video src="'+esc(media)+'" muted playsinline controls style="max-width:100%;max-height:210px"></video>':'<img src="'+esc(media)+'" style="max-width:100%;max-height:210px;object-fit:contain">'):'<span class="muted">No media saved</span>')+
  '</div><div class="rowactions" style="margin-top:6px"><button class="btn cml-zoom">Zoom 100%</button><button class="btn cml-center">Center / Reset</button><button class="btn cml-mute">Mute</button></div></div></div></div>';
}
async function rowsFor(code){
 const sb=client(); if(!sb) throw new Error('Supabase client unavailable');
 const r=await sb.from(TABLE).select('id,title,is_active,media_url,media_type,schedule_json,updated_at').eq('is_active',true).limit(200);
 if(r.error) throw r.error;
 return (r.data||[]).filter(x=>{
   const s=x.schedule_json||{};
   return s.controller==='jpt-central-media-lab-v1' && s.surface==='customer_outlet_media' && String(s.outlet_code||'').toUpperCase()===String(code).toUpperCase();
 });
}
async function load(){
 const r=root(); r.innerHTML='<h2 style="margin:0;color:#d8ae42">CENTRAL MEDIA LAB</h2><div class="muted" style="margin-top:4px">Customer outlet media • Campaign Hero remains separate</div><div class="two" style="margin-top:10px"><div><label class="muted">Outlet</label><select id="cmlOutlet" class="select"></select></div><div><label class="muted">Target</label><select id="cmlTarget" class="select"><option value="all">ALL OUTLETS</option><option value="selected">SELECTED OUTLET</option></select></div></div><div id="cmlSlots"></div>';
 const os=await outlets(); const sel=document.getElementById('cmlOutlet'); sel.innerHTML=os.map(o=>'<option value="'+esc(o.code||o.id)+'">'+esc(o.name||o.code||o.id)+' — '+esc(o.code||o.id)+'</option>').join('');
 const render=async()=>{const code=sel.value; const rows=await rowsFor(code); const by=new Map(rows.map(x=>[(x.schedule_json||{}).slot,x])); document.getElementById('cmlSlots').innerHTML=slots.map(s=>card(os.find(o=>String(o.code||o.id)===String(code)),s,by.get(s))).join(''); bind(sel.value);};
 sel.onchange=render; if(os.length) await render();\n await renderSponsorDestinations();
}
function bind(code){
 document.querySelectorAll('.jpt-cml-slot').forEach(el=>{
  const slot=el.dataset.slot; const file=el.querySelector('.cml-file'); const preview=el.querySelector('.cml-preview');
  let zoom=100;
  el.querySelector('.cml-zoom').onclick=()=>{zoom=Math.min(160,zoom+10); el.querySelector('.cml-zoom').textContent='Zoom '+zoom+'%'; const m=preview.querySelector('img'); if(m)m.style.transform='scale('+zoom/100+')';};
  el.querySelector('.cml-center').onclick=()=>{zoom=100;el.querySelector('.cml-zoom').textContent='Zoom 100%';const m=preview.querySelector('img');if(m)m.style.transform='scale(1)'};
  el.querySelector('.cml-mute').onclick=()=>{const v=preview.querySelector('video');if(v){v.muted=!v.muted;el.querySelector('.cml-mute').textContent=v.muted?'Unmute':'Mute';}};
  file.onchange=()=>{const f=file.files?.[0];if(!f)return; const u=URL.createObjectURL(f); preview.innerHTML=f.type.startsWith('video/')?'<video src="'+u+'" muted playsinline controls style="max-width:100%;max-height:210px"></video>':'<img src="'+u+'" style="max-width:100%;max-height:210px;object-fit:contain">';};
  el.querySelector('.cml-save').onclick=()=>save(code,slot,el);
  el.querySelector('.cml-delete').onclick=()=>remove(code,slot);
  el.querySelector('.cml-toggle').onclick=()=>toggle(code,slot);
 });
}
async function save(code,slot,el){
 const sb=client(); const f=el.querySelector('.cml-file').files?.[0]; if(!sb)throw new Error('Supabase client unavailable');
 if(f && f.size>(f.type.startsWith('video/')?60:12)*1024*1024) return toast('File too large');
 const id=machineId(code,slot); let url=''; let kind='';
 if(f){
  kind=f.type.startsWith('video/')?'video':'image'; const path='central-media-lab/'+code+'/'+slot+'/'+Date.now()+'-'+f.name.replace(/[^A-Za-z0-9._-]/g,'_');
  const up=await sb.storage.from(BUCKET).upload(path,f,{upsert:false}); if(up.error)throw up.error;
  const pu=sb.storage.from(BUCKET).getPublicUrl(path); url=pu.data.publicUrl;
 }
 const schedule={version:1,controller:'jpt-central-media-lab-v1',surface:'customer_outlet_media',slot,machine_id:id,outlet_code:code,media_type:kind||'image',image_url:kind==='image'?url:'',video_url:kind==='video'?url:'',placement:'customer_outlet_banner',start_at:el.querySelector('.cml-start').value||null,end_at:el.querySelector('.cml-end').value||null};
 if(!url){const old=await rowsFor(code);const hit=old.find(x=>(x.schedule_json||{}).slot===slot); if(hit){schedule.media_type=(hit.schedule_json||{}).media_type||hit.media_type||'image';schedule.image_url=(hit.schedule_json||{}).image_url||'';schedule.video_url=(hit.schedule_json||{}).video_url||'';url=hit.media_url||schedule.image_url||schedule.video_url;}}
 const ins=await sb.from(TABLE).insert({title:id,description:'Central Media Lab '+id,media_url:url,media_type:schedule.media_type,is_active:true,schedule_json:schedule}).select('id').single(); if(ins.error)throw ins.error;
 const old=await sb.from(TABLE).select('id').eq('is_active',true).limit(300); if(old.data)for(const x of old.data){const s=x.schedule_json||{};if(s.controller==='jpt-central-media-lab-v1'&&s.outlet_code===code&&s.slot===slot&&x.id!==ins.data.id)await sb.from(TABLE).update({is_active:false}).eq('id',x.id);}
 toast(id+' saved');
 await load();
}
async function toggle(code,slot){
 const sb=client(); const r=await rowsFor(code); const hit=r.find(x=>(x.schedule_json||{}).slot===slot); if(!hit)return toast('No saved media');
 const u=await sb.from(TABLE).update({is_active:!hit.is_active}).eq('id',hit.id); if(u.error)throw u.error; await load();
}
async function remove(code,slot){
 const sb=client(); const r=await rowsFor(code); const hit=r.find(x=>(x.schedule_json||{}).slot===slot); if(!hit)return;
 const u=await sb.from(TABLE).update({is_active:false}).eq('id',hit.id); if(u.error)throw u.error; toast('Deleted / OFF: '+machineId(code,slot)); await load();
}

async function sponsorRows(table,destination){
 const q=client(); if(!q) throw new Error('Supabase client unavailable');
 const r=await q.from(table).select('id,media_url,media_type,video_url,title,sponsor_name,target_all_live,outlet_ids,is_active,starts_at,ends_at,sort_order,schedule_json').order('sort_order',{ascending:true}).order('created_at',{ascending:false});
 if(r.error) throw r.error;
 return (r.data||[]).filter(x=>String((x.schedule_json||{}).central_media_destination||'')===destination);
}
function sponsorCard(destination,title,table,bucket,rows){
 const list=rows.map(x=>'<div class="notice" style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span><b>'+esc(x.sponsor_name||x.title||'Sponsor')+'</b><div class="muted">'+esc(x.id)+' • '+(x.is_active?'ON':'OFF')+'</div></span><span class="rowactions"><button class="btn '+(x.is_active?'':'gold')+' cml-sp-toggle" data-id="'+esc(x.id)+'" data-table="'+table+'">'+(x.is_active?'Turn OFF':'Turn ON')+'</button><button class="btn red cml-sp-delete" data-id="'+esc(x.id)+'" data-table="'+table+'">Delete</button></span></div>').join('');
 return '<div class="card cml-sponsor-dest" data-destination="'+destination+'" data-table="'+table+'" data-bucket="'+bucket+'" style="margin-top:10px"><h3 style="margin:0;color:#d8ae42">'+title+'</h3><div class="muted">Machine destination: '+destination+'</div><div class="field"><label>Sponsor Name</label><input class="input cml-sp-name" placeholder="Sponsor / Brand"></div><div class="field"><label>Banner Image / Video</label><input class="input cml-sp-file" type="file" accept="image/*,video/*"></div><div class="two"><div class="field"><label>Target</label><select class="select cml-sp-target"><option value="all">ALL OUTLETS</option><option value="selected">SELECTED OUTLET</option></select></div><div class="field"><label>Selected Outlet</label><select class="select cml-sp-outlet"></select></div></div><div class="two"><div class="field"><label>Start</label><input class="input cml-sp-start" type="datetime-local"></div><div class="field"><label>End</label><input class="input cml-sp-end" type="datetime-local"></div></div><div class="rowactions"><button class="btn gold cml-sp-save">Push / Save</button></div><div class="notice">Saved media</div><div class="cml-sp-list">'+(list||'<span class="muted">No saved media.</span>')+'</div></div>';
}
async function renderSponsorDestinations(){
 const rootEl=root(), q=client(); if(!q) return;
 const os=await outlets();
 const defs=[
  ['CHECKOUT-C1','CHECKOUT / TRACKING — FIRST BANNER','checkout_sponsor_ads','checkout-sponsor-media'],
  ['CHECKOUT-C2','CHECKOUT / TRACKING — SECOND BANNER','checkout_sponsor_ads','checkout-sponsor-media'],
  ['DELIVERY-TOP','DELIVERY PARTNER — TOP BANNER','delivery_partner_sponsor_ads','delivery-partner-sponsors'],
  ['DELIVERY-LOWER','DELIVERY PARTNER — LOWER BANNER','delivery_partner_sponsor_ads','delivery-partner-sponsors']
 ];
 const blocks=[];
 for(const d of defs){blocks.push(sponsorCard(d[0],d[1],d[2],d[3],await sponsorRows(d[2],d[0])));}
 let host=document.getElementById('jptCmlSponsorDestinations');
 if(!host){host=document.createElement('div');host.id='jptCmlSponsorDestinations';rootEl.appendChild(host);}
 host.innerHTML='<h3 style="color:#d8ae42;margin:18px 0 6px">CHECKOUT / TRACKING + DELIVERY PARTNER</h3><div class="muted">Independent Central Lab destinations. Existing legacy sponsor rows remain untouched unless they carry a Central Media destination.</div>'+blocks.join('');
 document.querySelectorAll('.cml-sp-outlet').forEach(s=>s.innerHTML=os.map(o=>'<option value="'+esc(o.code||o.id)+'">'+esc(o.name||o.code||o.id)+'</option>').join(''));
 document.querySelectorAll('.cml-sp-save').forEach(b=>b.onclick=async()=>{
  const box=b.closest('.cml-sponsor-dest'),f=box.querySelector('.cml-sp-file').files?.[0];if(!f)return toast('Choose image/video first');
  const table=box.dataset.table,bucket=box.dataset.bucket,dest=box.dataset.destination;
  if(f.size>(f.type.startsWith('video/')?60:12)*1024*1024)return toast('File too large');
  const path='central-media-lab/sponsor/'+dest+'/'+Date.now()+'-'+f.name.replace(/[^A-Za-z0-9._-]/g,'_');
  const up=await q.storage.from(bucket).upload(path,f,{upsert:false});if(up.error)throw up.error;
  const url=q.storage.from(bucket).getPublicUrl(path).data.publicUrl, kind=f.type.startsWith('video/')?'video':'image';
  const target=box.querySelector('.cml-sp-target').value, outletCode=box.querySelector('.cml-sp-outlet').value;
  const user=(await q.auth.getUser()).data.user;
  const row={title:dest,sponsor_name:box.querySelector('.cml-sp-name').value.trim()||'Sponsor',media_type:kind,media_url:url,video_url:kind==='video'?url:null,target_all_live:target==='all',outlet_ids:target==='all'?[]:[outletCode],is_active:true,sort_order:0,starts_at:box.querySelector('.cml-sp-start').value||null,ends_at:box.querySelector('.cml-sp-end').value||null,created_by:user?.id||null,schedule_json:{version:1,controller:'jpt-central-media-lab-v1',central_media_destination:dest,media_kind:kind,slot:dest.endsWith('C1')||dest.endsWith('TOP')?1:2}};
  const ins=await q.from(table).insert(row);if(ins.error)throw ins.error;toast(dest+' saved');await renderSponsorDestinations();
 });
 document.querySelectorAll('.cml-sp-toggle').forEach(b=>b.onclick=async()=>{const q=client();const r=await q.from(b.dataset.table).select('is_active').eq('id',b.dataset.id).single();if(r.error)throw r.error;const u=await q.from(b.dataset.table).update({is_active:!r.data.is_active}).eq('id',b.dataset.id);if(u.error)throw u.error;await renderSponsorDestinations()});
 document.querySelectorAll('.cml-sp-delete').forEach(b=>b.onclick=async()=>{const q=client();const u=await q.from(b.dataset.table).update({is_active:false}).eq('id',b.dataset.id);if(u.error)throw u.error;toast('Media deleted / OFF');await renderSponsorDestinations()});
}
\nwindow.JPTCentralMediaLab={machineId,slots,load,renderSponsorDestinations};
document.addEventListener('DOMContentLoaded',()=>{if(document.getElementById('jptCentralMediaLab'))load().catch(e=>toast(e.message));});
})();