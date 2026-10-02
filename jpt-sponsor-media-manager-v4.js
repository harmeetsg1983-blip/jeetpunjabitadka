/* JPT Sponsor Media Manager V4 — syntax-safe production layer */
(function(){
'use strict';
if(window.__JPT_SPONSOR_MEDIA_MANAGER_V4__) return;
window.__JPT_SPONSOR_MEDIA_MANAGER_V4__=true;

const TABLE='checkout_sponsor_ads';
const BUCKET='checkout-sponsor-media';
const db=()=>window.sb||window.supabaseClient||null;
const esc=(v)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
const host=()=>document.querySelector('#settings')||document.querySelector('#settingsPanel')||document.querySelector('.settings-panel');

async function isCentral(){
 try{const r=await db()?.rpc('partner_access_is_central_owner');return !r?.error&&r.data===true}catch(e){return false}
}

function addCss(){
 if(document.getElementById('jptSmV4Css')) return;
 const s=document.createElement('style');
 s.id='jptSmV4Css';
 s.textContent='.jpt-smv4{margin-top:14px;background:#0b0b0b;border:1px solid #d4af37;border-radius:18px;padding:14px;color:#fff}.jpt-smv4 h3{margin:0;color:#f4d77a}.jpt-smv4-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.jpt-smv4 input,.jpt-smv4 select{width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #51401f;border-radius:9px;padding:9px;margin-top:4px}.jpt-smv4 label{font-size:10px;color:#bbb}.jpt-smv4-preview{height:150px;margin-top:8px;border:1px solid #493719;border-radius:12px;overflow:hidden;background:#050505}.jpt-smv4-preview img,.jpt-smv4-preview video{width:100%;height:100%;object-fit:contain;display:block}.jpt-smv4-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.jpt-smv4 button{border:1px solid #5a461b;background:#171717;color:#f4d77a;border-radius:9px;padding:8px 10px;font-weight:800}.jpt-smv4 .primary{background:#d4af37;color:#111}.jpt-smv4 .danger{background:#351010;color:#ffbaba;border-color:#933}.jpt-smv4-row{display:grid;grid-template-columns:72px 1fr auto;gap:9px;align-items:center;border-top:1px solid #292929;padding:9px 0}.jpt-smv4-thumb{width:72px;height:50px;object-fit:cover;border-radius:8px;background:#050505}.jpt-smv4-chip{font-size:9px;border:1px solid #493719;border-radius:99px;padding:3px 6px;display:inline-block;margin:2px}.jpt-smv4-note{font-size:10px;color:#999;line-height:1.4}.jpt-smv4-context{margin:8px 0;padding:9px 10px;border:1px solid #d4af37;border-radius:10px;background:#171717;color:#f4d77a;font-size:11px;font-weight:900}@media(max-width:700px){.jpt-smv4-grid{grid-template-columns:1fr}.jpt-smv4-row{grid-template-columns:58px 1fr}.jpt-smv4-row .actions{grid-column:1/-1}.jpt-smv4-thumb{width:58px;height:45px}}';
 document.head.appendChild(s);
}

async function outletContext(){
 const code=String(window.activeOutlet||document.getElementById('outletSelect')?.value||localStorage.getItem('jpt_admin_outlet')||'JPT-001');
 let name=code;
 try{const r=await db().from('outlets').select('code,name').eq('code',code).maybeSingle();if(!r.error&&r.data?.name)name=r.data.name}catch(e){}
 return {code,name};
}

function mount(){
 const h=host();
 if(!h||document.getElementById('jptSponsorMediaManagerV4')) return false;
 addCss();
 const box=document.createElement('section');
 box.id='jptSponsorMediaManagerV4';
 box.className='jpt-smv4';
 box.innerHTML='<h3>📢 Sponsor Ads V4 — Checkout / Order Tracking</h3><div id="jpt4OutletContext" class="jpt-smv4-context">CURRENT OUTLET: Loading…</div><div class="jpt-smv4-note">Two sponsor positions. Images rotate every 10 seconds; videos advance when finished.</div><div class="jpt-smv4-grid"><div><label>SPONSOR POSITION</label><select id="jpt4Slot"><option value="1">Sponsor Position 1</option><option value="2">Sponsor Position 2</option></select></div><div><label>MEDIA TYPE</label><select id="jpt4Type"><option value="image">Image</option><option value="video">Video</option></select></div><div><label>SPONSOR NAME</label><input id="jpt4Sponsor" placeholder="Brand name"></div><div><label>BANNER TITLE</label><input id="jpt4Title" placeholder="Optional title"></div><div><label>DISPLAY ORDER</label><input id="jpt4Order" type="number" min="0" value="1"></div><div><label>MEDIA FILE</label><input id="jpt4File" type="file" accept="image/*,video/*,.mp4,.webm,.ogg"></div><div><label>START</label><input id="jpt4Start" type="datetime-local"></div><div><label>END</label><input id="jpt4End" type="datetime-local"></div></div><div id="jpt4Preview" class="jpt-smv4-preview"></div><div class="jpt-smv4-actions"><button id="jpt4Save" class="primary" type="button">SAVE + PUBLISH</button><button id="jpt4Refresh" type="button">REFRESH</button></div><div id="jpt4Msg" class="jpt-smv4-note"></div><div style="margin-top:12px"><b>Saved media</b><div id="jpt4List"></div></div>';
 h.appendChild(box);
 wire();
 return true;
}

async function wire(){
 const file=document.getElementById('jpt4File');
 const type=document.getElementById('jpt4Type');
 const preview=document.getElementById('jpt4Preview');
 const save=document.getElementById('jpt4Save');
 const refresh=document.getElementById('jpt4Refresh');
 const msg=document.getElementById('jpt4Msg');
 const slot=document.getElementById('jpt4Slot');
 const current=async()=>await outletContext();

 function showPreview(){
  preview.innerHTML='';
  const f=file.files?.[0];
  if(!f) return;
  const url=URL.createObjectURL(f);
  if(type.value==='video'){
   const v=document.createElement('video');v.src=url;v.controls=true;v.playsInline=true;v.muted=true;preview.appendChild(v);
  }else{
   const img=document.createElement('img');img.src=url;img.alt='Sponsor preview';preview.appendChild(img);
  }
 }
 type.onchange=showPreview;
 file.onchange=()=>{
  const f=file.files?.[0];
  if(f&&String(f.type||'').toLowerCase().startsWith('video/')) type.value='video';
  showPreview();
 };

 async function refreshList(){
  const ctx=await current();
  const label=document.getElementById('jpt4OutletContext');
  if(label)label.textContent='CURRENT OUTLET: '+ctx.name+' • '+ctx.code;
  const r=await db().from(TABLE).select('id,media_url,media_type,video_url,title,sponsor_name,target_all_live,outlet_ids,is_active,sort_order,starts_at,ends_at,schedule_json').order('sort_order',{ascending:true}).order('created_at',{ascending:false});
  if(r.error)throw r.error;
  const rows=(r.data||[]).filter(x=>x.target_all_live||(Array.isArray(x.outlet_ids)&&x.outlet_ids.includes(ctx.code)));
  const list=document.getElementById('jpt4List');
  list.innerHTML=rows.length?rows.map(x=>{
   const kind=String(x.media_type||x.schedule_json?.media_kind||'image');
   const pos=Number(x.schedule_json?.slot||1);
   const scope=x.target_all_live?'ALL LIVE':(Array.isArray(x.outlet_ids)?x.outlet_ids.join(', '):ctx.code);
   return '<div class="jpt-smv4-row"><div class="jpt-smv4-thumb">'+(kind==='video'?'🎬':'🖼️')+'</div><div><b>'+esc(x.title||x.sponsor_name||'Sponsor')+'</b><div><span class="jpt-smv4-chip">SLOT '+pos+'</span><span class="jpt-smv4-chip">'+esc(kind.toUpperCase())+'</span><span class="jpt-smv4-chip">'+(x.is_active?'ON':'OFF')+'</span><span class="jpt-smv4-chip">ORDER '+Number(x.sort_order||0)+'</span><span class="jpt-smv4-chip">'+esc(scope)+'</span></div></div><div class="actions"><button type="button" data-id="'+esc(x.id)+'" data-action="toggle">'+(x.is_active?'TURN OFF':'PUBLISH / ON')+'</button><button type="button" class="danger" data-id="'+esc(x.id)+'" data-action="delete">DELETE</button></div></div>';
  }).join(''):'No sponsor media saved yet.';
  list.querySelectorAll('button[data-id]').forEach(b=>b.onclick=async()=>{
   const id=b.dataset.id;
   if(b.dataset.action==='delete'){
    if(!confirm('Delete this sponsor media?'))return;
    b.disabled=true;
    try{
      const existing=await db().from(TABLE).select('id,media_url,video_url').eq('id',id).maybeSingle();
      if(existing.error)throw existing.error;
      if(!existing.data)throw new Error('Sponsor media record was not found.');
      const q=await db().from(TABLE).delete().eq('id',id);if(q.error)throw q.error;
      const verify=await db().from(TABLE).select('id').eq('id',id).maybeSingle();if(verify.error)throw verify.error;
      if(verify.data)throw new Error('Delete was not persisted in the database.');
      const mediaUrl=existing.data.media_url||existing.data.video_url||'';
      const prefix='/storage/v1/object/public/'+BUCKET+'/';
      if(mediaUrl.includes(prefix)){const path=decodeURIComponent(mediaUrl.split(prefix)[1].split('?')[0]);const rm=await db().storage.from(BUCKET).remove([path]);if(rm.error)console.warn('[JPT Sponsor V4] storage cleanup failed:',rm.error)}
    }finally{b.disabled=false}
   }else{
    const row=rows.find(x=>String(x.id)===String(id));
    const q=await db().from(TABLE).update({is_active:!row.is_active}).eq('id',id);if(q.error)throw q.error;
   }
   await refreshList();
  });
 }

 save.onclick=async()=>{
  const f=file.files?.[0];
  if(!f){msg.textContent='Choose an image or video first.';return}
  const ctx=await current();
  save.disabled=true;msg.textContent='Uploading…';
  try{
   const safeName=encodeURIComponent(f.name||'sponsor-media').replaceAll('%','-');
   const path='checkout/'+Date.now()+'-'+safeName;
   const up=await db().storage.from(BUCKET).upload(path,f,{upsert:false,contentType:f.type||'application/octet-stream'});
   if(up.error)throw up.error;
   const url=db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
   const kind=type.value==='video'?'video':'image';
   const row={title:document.getElementById('jpt4Title').value.trim()||document.getElementById('jpt4Sponsor').value.trim()||'Sponsor Banner',sponsor_name:document.getElementById('jpt4Sponsor').value.trim(),media_type:kind,media_url:kind==='image'?url:null,video_url:kind==='video'?url:null,poster_url:kind==='image'?url:null,target_all_live:false,outlet_ids:[ctx.code],is_active:true,sort_order:Number(document.getElementById('jpt4Order').value||1),starts_at:document.getElementById('jpt4Start').value?new Date(document.getElementById('jpt4Start').value).toISOString():null,ends_at:document.getElementById('jpt4End').value?new Date(document.getElementById('jpt4End').value).toISOString():null,schedule_json:{version:5,slot:Number(slot.value),media_kind:kind,image_duration_sec:10,advance:'video-ended'}};
   const ins=await db().from(TABLE).insert(row).select('id,media_url,video_url,is_active').maybeSingle();if(ins.error)throw ins.error;if(!ins.data?.id)throw new Error('Sponsor media database save could not be verified.');if((ins.data.media_url||ins.data.video_url)!==(kind==='image'?url:null) && kind==='image')throw new Error('Sponsor media URL verification failed.');if(kind==='video' && ins.data.video_url!==url)throw new Error('Sponsor video URL verification failed.');try{const head=await fetch(url,{method:'HEAD',cache:'no-store'});if(!head.ok)throw new Error('Uploaded media URL returned HTTP '+head.status)}catch(mediaVerify){console.warn('[JPT Sponsor V4] media URL HEAD verification:',mediaVerify)}
   msg.textContent='Saved + published for '+ctx.name+' ('+ctx.code+') • Sponsor Slot '+slot.value+'.';
   file.value='';preview.innerHTML='';
   await refreshList();
  }catch(e){msg.textContent=e?.message||'Sponsor media save failed.'}
  finally{save.disabled=false}
 };
 refresh.onclick=async()=>{msg.textContent='Refreshing…';try{await refreshList();msg.textContent='Saved media refreshed.'}catch(e){msg.textContent=e?.message||'Refresh failed.'}};
 try{await refreshList()}catch(e){msg.textContent=e?.message||'Unable to load sponsor media.'}
}

async function boot(){
 let n=0;
 const t=setInterval(async()=>{
  n++;
  try{if(await isCentral()){clearInterval(t);mount()}}catch(e){}
  if(n>60)clearInterval(t);
 },500);
}
boot();
})();