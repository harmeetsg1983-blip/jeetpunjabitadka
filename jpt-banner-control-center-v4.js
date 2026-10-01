/* JPT Banner Control Center V4
   Controlled replacement for the old sponsor manager UI.
   No schema changes. Uses existing outlets + campaigns + sponsor tables/buckets.
   Five fixed outlet banner codes:
   B01 JPT-001, B02 SOP-002, B03 PFA-003, B04 NME-004, B05 TOP-005.
*/
(function(){
'use strict';
if(window.__JPT_BANNER_CONTROL_CENTER_V4__) return;
window.__JPT_BANNER_CONTROL_CENTER_V4__=true;

const FIXED_IDS={
 'JPT-001':'B01','SOP-002':'B02','PFA-003':'B03','NME-004':'B04','TOP-005':'B05'
};
const PAGE_SIZE=25;
let outletPage=1,outletSearch='';
const controlId=o=>FIXED_IDS[o.code]||('OUT-'+String(o.code||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,24));
const CAMPAIGNS='campaigns';
const OUTLETS='outlets';

const sb=()=>window.sb||window.supabaseClient||null;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const msg=(el,t,ok)=>{if(el){el.textContent=t;el.style.color=ok?'#79e39b':'#ff9d9d'}};
const central=async()=>{try{const r=await sb()?.rpc('partner_access_is_central_owner');return !r?.error&&r.data===true}catch(e){return false}};
const outletCode=()=>String(window.activeOutlet||document.getElementById('outletSelect')?.value||'JPT-001');

function css(){
 if(document.getElementById('jptBccV3Css'))return;
 const s=document.createElement('style');s.id='jptBccV3Css';s.textContent=`
 #jptBannerControlV3{margin-top:18px}
 .jpt-bcc{background:linear-gradient(145deg,#151515,#080808);border:1px solid rgba(212,175,55,.55);border-radius:22px;padding:16px;color:#fff;box-shadow:0 14px 42px #0009}
 .jpt-bcc h3{margin:0;color:#f4d77a;font-size:19px}.jpt-bcc-sub{color:#aaa;font-size:11px;line-height:1.5;margin-top:5px}
 .jpt-bcc-tabs{display:flex;gap:8px;overflow:auto;margin:14px 0}.jpt-bcc-tabs button{white-space:nowrap;border:1px solid #51401f;background:#111;color:#ddd;border-radius:11px;padding:10px 13px;font-weight:900}.jpt-bcc-tabs button.on{background:#d8ae42;color:#111;border-color:#f4d77a}
 .jpt-bcc-outlet{border:1px solid #40351f;border-radius:16px;padding:12px;margin:10px 0;background:#0c0c0c}
 .jpt-bcc-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.jpt-bcc-code{font-size:10px;color:#f4d77a;border:1px solid #6b5521;border-radius:99px;padding:4px 8px}.jpt-bcc-name{font-weight:950;font-size:16px}
 .jpt-bcc-preview{height:300px;margin:11px 0;border:1px solid #59451d;border-radius:14px;overflow:hidden;background:#030303;display:grid;place-items:center;position:relative}
 .jpt-bcc-preview img,.jpt-bcc-preview video{width:100%;height:100%;object-fit:contain;display:block;transform-origin:center}
 .jpt-bcc-empty{color:#777;text-align:center;padding:20px}.jpt-bcc-empty b{display:block;color:#d8ae42;margin-bottom:4px}
 .jpt-bcc-tools{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.jpt-bcc-tools button,.jpt-bcc-actions button{border:1px solid #59451d;background:#171717;color:#f4d77a;border-radius:9px;padding:9px 7px;font-weight:900}
 .jpt-bcc-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.jpt-bcc-actions .push{background:linear-gradient(135deg,#f4d77a,#c69229);color:#111;border:0}.jpt-bcc-actions .danger{background:#321010;color:#ffb0b0;border-color:#933}.jpt-bcc-actions .onoff{background:#102817;color:#8be6a7;border-color:#27733e}
 .jpt-bcc-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px}.jpt-bcc label{font-size:10px;color:#aaa}.jpt-bcc input,.jpt-bcc select{width:100%;box-sizing:border-box;background:#0b0b0b;color:#fff;border:1px solid #51401f;border-radius:9px;padding:10px;margin:4px 0 8px}
 .jpt-bcc-status{font-size:11px;color:#999;min-height:18px;margin-top:8px}.jpt-bcc-small{font-size:10px;color:#888;line-height:1.4}
 .jpt-bcc-list{border-top:1px solid #292929;margin-top:12px;padding-top:10px}.jpt-bcc-row{display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #222}.jpt-bcc-thumb{width:70px;height:44px;object-fit:cover;border-radius:7px;background:#050505}
 .jpt-bcc-legacy{border:1px dashed #59451d;padding:8px;border-radius:9px;color:#aaa;font-size:10px;margin-top:7px}
 .jpt-bcc-global{border:1px solid #40351f;border-radius:16px;padding:12px;margin-top:12px;background:#0c0c0c}
 #jptOutletMediaV1{display:none!important}
 @media(max-width:700px){.jpt-bcc-fields{grid-template-columns:1fr}.jpt-bcc-preview{height:260px}.jpt-bcc-tools{grid-template-columns:repeat(2,1fr)}}
 `;document.head.appendChild(s)
}

function editor(){
 /* V4: render selected media immediately in the framing box. */
 let media=null,type='image',scale=1,ox=0,oy=0,drag=false,lx=0,ly=0,video=null;
 const state={};
 function reset(){media=null;video=null;type='image';scale=1;ox=0;oy=0}
 function setPreview(host,file){
  reset();
  const name=String(file.name||'').toLowerCase();
  const isVideo=String(file.type||'').toLowerCase().startsWith('video/')||['.mp4','.webm','.ogg'].some(ext=>name.endsWith(ext));
  type=isVideo?'video':'image';
  const u=URL.createObjectURL(file);
  host.innerHTML='';
  if(isVideo){
   video=document.createElement('video');media=video;video.src=u;video.controls=true;video.playsInline=true;video.muted=true;video.preload='metadata';video.style.width='100%';video.style.height='100%';video.style.objectFit='contain';video.style.display='block';video.style.transform='scale(1)';host.appendChild(video);
  }else{
   const img=new Image();img.onload=()=>{media=img;draw(host)};img.onerror=()=>{host.innerHTML='<div class="jpt-bcc-empty"><b>PREVIEW FAILED</b>Selected image could not be displayed.</div>'};img.src=u;host.appendChild(img);
  }
  return type;
 }
 function draw(host){
  if(!media)return;
  host.innerHTML='';
  const img=document.createElement('img');img.src=media.src;img.style.transform='translate('+ox+'px,'+oy+'px) scale('+scale+')';host.appendChild(img);
 }
 function zoom(host,d){scale=Math.max(.25,Math.min(4,scale+d));if(type==='video'&&video)video.style.transform='scale('+scale+')';else draw(host)}
 function center(host){scale=1;ox=0;oy=0;if(type==='video'&&video)video.style.transform='scale(1)';else draw(host)}
 function wire(host){
  host.onpointerdown=e=>{if(!media)return;if(type==='video'&&video&&e.target===video&&e.offsetY>video.clientHeight-56)return;drag=true;lx=e.clientX;ly=e.clientY;host.setPointerCapture(e.pointerId)};
  host.onpointermove=e=>{if(!drag)return;ox+=e.clientX-lx;oy+=e.clientY-ly;lx=e.clientX;ly=e.clientY;if(type==='video'&&video)video.style.transform='translate('+ox+'px,'+oy+'px) scale('+scale+')';else draw(host)};
  host.onpointerup=()=>drag=false;host.onpointercancel=()=>drag=false;
 }
 return {
  set(file,host){const t=setPreview(host,file);wire(host);return t},
  zoomIn(host){zoom(host,.15)},zoomOut(host){zoom(host,-.15)},center(host){center(host)},
  frame(host){return {type,scale:Number(scale.toFixed(3)),x:Number((ox/Math.max(1,host.clientWidth)*100).toFixed(3)),y:Number((oy/Math.max(1,host.clientHeight)*100).toFixed(3))}},
  async blob(file){
   if(type==='video')return file;
   if(!media)throw new Error('Choose an image first.');
   const c=document.createElement('canvas'),w=1200,h=420;c.width=w;c.height=h;
   const x=c.getContext('2d');x.fillStyle='#050505';x.fillRect(0,0,w,h);
   const iw=media.width*scale,ih=media.height*scale;x.drawImage(media,(w-iw)/2+ox,(h-ih)/2+oy,iw,ih);
   return await new Promise((res,rej)=>c.toBlob(b=>b?res(new File([b],'banner.jpg',{type:'image/jpeg'})):rej(new Error('Image export failed')),'image/jpeg',.92));
  }
 };
}

async function loadTus(){
 if(window.tus&&typeof window.tus.Upload==='function')return window.tus;
 await new Promise((resolve,reject)=>{
  const existing=document.querySelector('script[data-jpt-tus]');
  if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error('Resumable upload library failed to load.')),{once:true});return}
  const sc=document.createElement('script');
  sc.src='https://cdn.jsdelivr.net/npm/tus-js-client@4/dist/tus.min.js';
  sc.async=true;sc.dataset.jptTus='1';
  sc.onload=resolve;sc.onerror=()=>reject(new Error('Resumable upload library failed to load.'));
  document.head.appendChild(sc);
 });
 if(!window.tus||typeof window.tus.Upload!=='function')throw new Error('Resumable upload library unavailable.');
 return window.tus;
}
async function uploadVideoResumable(file,bucket,folder,msgEl){
 const tus=await loadTus();
 const session=await sb().auth.getSession();
 const token=session?.data?.session?.access_token;
 if(!token)throw new Error('AUTH SESSION EXPIRED. Please sign in again.');
 const base=String(window.JPT_SUPABASE_URL||'').trim();
 let host='';
 try{host=new URL(base).hostname}catch(e){}
 if(!host)throw new Error('SUPABASE STORAGE HOST NOT CONFIGURED.');
 const projectRef=host.split('.')[0];
 if(!projectRef)throw new Error('SUPABASE PROJECT REF NOT AVAILABLE.');
 const lower=String(file.name||'').toLowerCase();
 const ext=['.mp4','.webm','.ogg'].find(x=>lower.endsWith(x))||'.mp4';
 const path=folder+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,9)+ext;
 const endpoint='https://'+projectRef+'.storage.supabase.co/storage/v1/upload/resumable';
 if(msgEl)msg(msgEl,'Uploading video securely… 0%',true);
 return await new Promise((resolve,reject)=>{
  const upload=new tus.Upload(file,{
   endpoint,
   retryDelays:[0,3000,5000,10000,20000],
   headers:{authorization:'Bearer '+token,'x-upsert':'false'},
   metadata:{bucketName:bucket,objectName:path,contentType:file.type||'video/mp4',cacheControl:'60'},
   uploadDataDuringCreation:true,
   removeFingerprintOnSuccess:true,
   onError:error=>reject(new Error('VIDEO UPLOAD FAILED: '+(error?.message||String(error)))),
   onProgress:(bytesUploaded,bytesTotal)=>{
    const pct=bytesTotal?Math.floor(bytesUploaded/bytesTotal*100):0;
    if(msgEl)msg(msgEl,'Uploading video securely… '+pct+'%',true);
   },
   onSuccess:()=>{
    const u=sb().storage.from(bucket).getPublicUrl(path);
    const url=u?.data?.publicUrl||'';
    if(!url){reject(new Error('PUBLIC VIDEO URL NOT AVAILABLE'));return}
    resolve({path,url});
   }
  });
  upload.findPreviousUploads().then(previous=>{
   if(previous.length)upload.resumeFromPreviousUpload(previous[0]);
   upload.start();
  }).catch(reject);
 });
}
async function uploadMedia(file,bucket,folder,msgEl){
 const lower=String(file.name||'').toLowerCase();
 const isVideo=String(file.type||'').toLowerCase().startsWith('video/')||['.mp4','.webm','.ogg'].some(x=>lower.endsWith(x));
 if(isVideo)return uploadVideoResumable(file,bucket,folder,msgEl);
 const ext=['.jpg','.jpeg','.png','.webp'].find(x=>lower.endsWith(x))||'.jpg';
 const path=folder+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,9)+ext;
 const r=await sb().storage.from(bucket).upload(path,file,{upsert:false,cacheControl:'60',contentType:file.type||'image/jpeg'});
 if(r.error)throw new Error('MEDIA UPLOAD FAILED: '+r.error.message);
 const u=sb().storage.from(bucket).getPublicUrl(path);
 const url=u?.data?.publicUrl||'';
 if(!url)throw new Error('PUBLIC URL NOT AVAILABLE');
 return {path,url};
}

async function loadOutletData(page=1,search=''){
 const c=sb();if(!c)throw new Error('Supabase client not ready');
 const from=(page-1)*PAGE_SIZE,to=from+PAGE_SIZE-1;
 let oq=c.from(OUTLETS).select('code,name,banner_url,logo_url',{count:'exact'}).order('name',{ascending:true}).range(from,to);
 const term=String(search||'').trim().replace(/[,%()]/g,' ').replace(/\s+/g,' ').trim();
 if(term)oq=oq.or('code.ilike.%'+term+'%,name.ilike.%'+term+'%');
 const or=await oq;
 if(or.error)throw or.error;
 const pageOut=(or.data||[]).map(x=>({code:x.code,name:x.name||x.code,id:controlId(x),banner_url:x.banner_url||null,logo_url:x.logo_url||null}));
 const ids=pageOut.map(x=>x.code);
 let media=[];
 if(ids.length){
  const cr=await c.from(CAMPAIGNS).select('id,outlet_id,title,active,start_at,end_at,priority,banner_url,video_url,schedule_json,created_at').in('outlet_id',ids).order('priority',{ascending:false}).order('created_at',{ascending:false});
  if(cr.error)throw cr.error;
  media=(cr.data||[]).filter(x=>x.schedule_json?.campaign_type==='media');
 }
 const outlets=Object.fromEntries(pageOut.map(x=>[x.code,x]));
 return {outlets,media,items:pageOut,total:Number(or.count||0),page,totalPages:Math.max(1,Math.ceil(Number(or.count||0)/PAGE_SIZE))};
}

function live(row){
 if(!row||row.active===false)return false;
 const n=Date.now(),s=row.start_at?Date.parse(row.start_at):-Infinity,e=row.end_at?Date.parse(row.end_at):Infinity;
 return s<=n&&n<=e;
}

async function deactivateOutletMedia(code){
 const c=sb();
 const q=await c.from(CAMPAIGNS).update({active:false}).eq('outlet_id',code).eq('schedule_json->>campaign_type','media').eq('schedule_json->>surface','customer_outlet_showcase');
 if(q.error)throw q.error;
}

function scheduleIso(value,label){if(!value)return null;const d=new Date(value);if(Number.isNaN(d.getTime()))throw new Error(label+' schedule is invalid.');return d.toISOString()}
async function saveOutletBanner(code,file,title,startAt,endAt,ed,preview,msgEl){
 if(!file)throw new Error('Please choose an image or video.');
 const lower=String(file.name||'').toLowerCase();
 const isVideo=String(file.type||'').toLowerCase().startsWith('video/')||['.mp4','.webm','.ogg'].some(ext=>lower.endsWith(ext));
 if(isVideo&&file.size>60*1024*1024)throw new Error('Video must be under 60MB.');
 if(!isVideo&&file.size>12*1024*1024)throw new Error('Image must be under 12MB.');
 const startIso=scheduleIso(startAt,'Start');
 const endIso=scheduleIso(endAt,'End');
 if(startIso&&endIso&&new Date(endIso).getTime()<=new Date(startIso).getTime())throw new Error('End schedule must be after Start schedule.');
 const prepared=await ed.blob(file);
 msg(msgEl,isVideo?'Preparing resumable video upload…':'Uploading image…',true);
 const up=await uploadMedia(prepared,'menu-images','outlet-banners/'+code,msgEl);
 let insertedId=null;
 let previousRows=[];
 try{
  const existing=await sb().from(CAMPAIGNS).select('id,active,banner_url,video_url,schedule_json').eq('outlet_id',code).eq('schedule_json->>campaign_type','media').eq('schedule_json->>surface','customer_outlet_showcase');
  if(existing.error)throw new Error('CURRENT MEDIA READ FAILED: '+existing.error.message);
  previousRows=existing.data||[];
  const row={
   outlet_id:code,
   title:title||code+' Banner',
   message:'Outlet banner '+code,
   active:true,
   start_at:startIso,
   end_at:endIso,
   priority:100,
   banner_url:isVideo?null:up.url,
   video_url:isVideo?up.url:null,
   schedule_json:{version:4,campaign_type:'media',surface:'customer_outlet_showcase',media_type:isVideo?'video':'image',video_url:isVideo?up.url:null,image_url:isVideo?null:up.url,storage_bucket:'menu-images',storage_path:up.path,placement:'outlet_showcase',publication:'published',frame:ed.frame(preview),banner_control_id:FIXED_IDS[code]||('OUT-'+String(code||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,24))}
  };
  const ins=await sb().from(CAMPAIGNS).insert(row).select('id').single();
  if(ins.error)throw new Error('BANNER SAVE FAILED: '+ins.error.message);
  insertedId=ins.data?.id||null;
  if(!insertedId)throw new Error('BANNER SAVE FAILED: new campaign id was not returned.');

  // New record is now safely committed. Only now retire the previous showcase records.
  const oldIds=previousRows.map(x=>x.id).filter(Boolean);
  if(oldIds.length){
   const off=await sb().from(CAMPAIGNS).update({active:false}).in('id',oldIds).eq('outlet_id',code);
   if(off.error){
    await sb().from(CAMPAIGNS).update({active:false}).eq('outlet_id',code).eq('schedule_json->>storage_path',up.path);
    throw new Error('OLD MEDIA RETIRE FAILED: '+off.error.message);
   }
  }

  // Remove storage objects belonging only to retired showcase records.
  // The new live object is excluded by its unique storage path.
  const retiredPaths=[...new Set(previousRows.map(x=>x?.schedule_json?.storage_path).filter(p=>p&&p!==up.path))];
  const cleanupErrors=[];
  for(const retiredPath of retiredPaths){
   const oldStorage=await sb().storage.from('menu-images').remove([retiredPath]);
   if(oldStorage.error)cleanupErrors.push(retiredPath+': '+oldStorage.error.message);
  }

  // Keep the legacy outlet field synchronized only after the campaign is live.
  const patch=isVideo?{banner_url:null}:{banner_url:up.url};
  const ou=await sb().from(OUTLETS).update(patch).eq('code',code);
  if(ou.error){
   if(insertedId)await sb().from(CAMPAIGNS).update({active:false}).eq('id',insertedId).eq('outlet_id',code);
   for(const old of previousRows.filter(x=>x.active))await sb().from(CAMPAIGNS).update({active:true}).eq('id',old.id).eq('outlet_id',code);
   throw new Error('OUTLET BANNER MAPPING FAILED: '+ou.error.message);
  }

  if(cleanupErrors.length){
   msg(msgEl,'⚠️ LIVE PUBLISHED • old media cleanup needs review: '+cleanupErrors.join(' | '),true);
  }else{
   msg(msgEl,'✅ LIVE PUBLISHED • '+code+' • '+(isVideo?'VIDEO':'IMAGE')+' • old media cleaned',true);
  }
  return up.url;
 }catch(e){
  // If DB publication failed, remove the just-uploaded object so failed attempts do not accumulate.
  try{await sb().storage.from('menu-images').remove([up.path])}catch(cleanup){}
  throw e;
}
async function outletToggle(code,row,next,msgEl){
 const c=sb();if(!row?.id)throw new Error('No saved banner found for this outlet.');
 if(!next){
  const r=await c.from(CAMPAIGNS).update({active:false}).eq('id',row.id).eq('outlet_id',code);
  if(r.error)throw r.error;
  const clear=await c.from(OUTLETS).update({banner_url:null}).eq('code',code);
  if(clear.error){
   await c.from(CAMPAIGNS).update({active:true}).eq('id',row.id).eq('outlet_id',code);
   throw new Error('BANNER OFF MAPPING CLEAR FAILED: '+clear.error.message);
  }
  msg(msgEl,'Banner OFF',true);
  return;
 }
 const others=await c.from(CAMPAIGNS).select('id,active').eq('outlet_id',code).eq('schedule_json->>campaign_type','media').eq('schedule_json->>surface','customer_outlet_showcase').neq('id',row.id);
 if(others.error)throw new Error('CURRENT MEDIA READ FAILED: '+others.error.message);
 const activeOthers=(others.data||[]).filter(x=>x.active).map(x=>x.id).filter(Boolean);
 const r=await c.from(CAMPAIGNS).update({active:true}).eq('id',row.id).eq('outlet_id',code);
 if(r.error)throw r.error;
 if(activeOthers.length){
  const off=await c.from(CAMPAIGNS).update({active:false}).in('id',activeOthers).eq('outlet_id',code);
  if(off.error){
   await c.from(CAMPAIGNS).update({active:false}).eq('id',row.id).eq('outlet_id',code);
   throw new Error('OTHER MEDIA RETIRE FAILED: '+off.error.message);
  }
 }
 const mediaUrl=row.video_url||row.banner_url||row.schedule_json?.video_url||row.schedule_json?.image_url||null;
 const patch=row.video_url||row.schedule_json?.video_url?{banner_url:null}:{banner_url:mediaUrl};
 const map=await c.from(OUTLETS).update(patch).eq('code',code);
 if(map.error){
  await c.from(CAMPAIGNS).update({active:false}).eq('id',row.id).eq('outlet_id',code);
  if(activeOthers.length)await c.from(CAMPAIGNS).update({active:true}).in('id',activeOthers).eq('outlet_id',code);
  throw new Error('BANNER ON MAPPING RESTORE FAILED: '+map.error.message);
 }
 msg(msgEl,'Banner ON',true);
}

async function outletDelete(code,row,msgEl){
 const c=sb();
 if(!row?.id)throw new Error('No saved banner found for this outlet.');
 const s=row.schedule_json&&typeof row.schedule_json==='object'?row.schedule_json:{};
 const path=s.storage_path||'';
 const bucket=s.storage_bucket||'menu-images';
 const r=await c.from(CAMPAIGNS).update({active:false}).eq('id',row.id).eq('outlet_id',code);
 if(r.error)throw new Error('BANNER OFF FAILED: '+r.error.message);
 const u=await c.from(OUTLETS).update({banner_url:null}).eq('code',code);
 if(u.error){
  await c.from(CAMPAIGNS).update({active:true}).eq('id',row.id).eq('outlet_id',code);
  throw new Error('OUTLET BANNER CLEAR FAILED: '+u.error.message);
 }
 if(path){
  const rm=await c.storage.from(bucket).remove([path]);
  if(rm.error)throw new Error('LIVE REMOVED, BUT MEDIA FILE CLEANUP FAILED: '+rm.error.message);
 }
 msg(msgEl,'🗑️ Banner, live record and media file removed.',true);
}

function mediaPreview(url,isVideo,host){
 host.innerHTML='';
 if(!url){host.innerHTML='<div class="jpt-bcc-empty"><b>NO LIVE BANNER</b>Choose media below and Push Banner.</div>';return}
 if(isVideo){const v=document.createElement('video');v.src=url;v.controls=true;v.playsInline=true;v.muted=true;v.style.cssText='width:100%;height:100%;object-fit:contain';host.appendChild(v)}
 else{const imgEl=document.createElement('img');imgEl.src=url;imgEl.alt='Banner preview';host.appendChild(imgEl)}
}

function renderOutletCard(o,data,ed){
 const rec=data.outlets[o.code]||{};
 const rows=data.media.filter(x=>x.outlet_id===o.code);
 const row=rows.find(live)||rows[0]||null;
 const url=row?.video_url||row?.banner_url||rec.banner_url||'';
 const isVideo=!!row?.video_url;
 const box=document.createElement('article');box.className='jpt-bcc-outlet';
 box.innerHTML=`
  <div class="jpt-bcc-head"><div><span class="jpt-bcc-code">${o.id} • ${esc(o.code)}</span><div class="jpt-bcc-name">${esc(o.name)}</div></div><span class="jpt-bcc-code">${row?.active?'LIVE':'OFF / EMPTY'}</span></div>
  <div class="jpt-bcc-preview" data-preview>${url?'':'<div class="jpt-bcc-empty"><b>NO LIVE BANNER</b>Upload image/video for this outlet.</div>'}</div>
  <div class="jpt-bcc-tools">
   <button type="button" data-zout>− Zoom</button><button type="button" data-center>Center</button><button type="button" data-zin>＋ Zoom</button><button type="button" data-reset>Reset</button>
  </div>
  <div class="jpt-bcc-fields">
   <div><label>BANNER TITLE</label><input data-title value="${esc(row?.title||o.name+' Banner')}"></div>
   <div><label>NEW IMAGE / VIDEO</label><input data-file type="file" accept="image/*,video/*"></div>
   <div><label>START SCHEDULE (OPTIONAL)</label><input data-start type="datetime-local" value="${row?.start_at?esc(String(row.start_at).slice(0,16)):''}"></div>
   <div><label>END SCHEDULE (OPTIONAL)</label><input data-end type="datetime-local" value="${row?.end_at?esc(String(row.end_at).slice(0,16)):''}"></div>
  </div>
  <div class="jpt-bcc-small">Code <b>${o.id}</b> हमेशा इसी outlet का रहेगा. Push करने पर पुराना active media OFF होगा और नया single live banner बनेगा.</div>
  <div class="jpt-bcc-actions">
   <button class="push" type="button" data-push>⬆ PUSH / SAVE</button>
   <button class="onoff" type="button" data-toggle>${row?.active?'TURN OFF':'TURN ON'}</button>
   <button class="danger" type="button" data-delete>DELETE LIVE BANNER</button>
  </div>
  <div class="jpt-bcc-status" data-msg></div>
  <div class="jpt-bcc-list"><b>Current Media Record</b><div class="jpt-bcc-row">${url?'<img class="jpt-bcc-thumb" src="'+esc(url)+'">':'<div class="jpt-bcc-thumb"></div>'}<div><div>${esc(row?.title||'No saved media')}</div><div class="jpt-bcc-small">${row?.video_url?'🎬 VIDEO':'🖼️ IMAGE'} • 📍 ${esc(row?.schedule_json?.surface||'customer_outlet_showcase')} • ${row?.active?(row?.start_at&&new Date(row.start_at).getTime()>Date.now()?'🟡 SCHEDULED':'🟢 LIVE / ON'):'⚪ OFF'} • Priority ${Number(row?.priority||0)} • ${row?.start_at?'START '+esc(String(row.start_at)):'NO START'} • ${row?.end_at?'END '+esc(String(row.end_at)):'NO END'}</div><div class="jpt-bcc-small">TARGET: <b>${esc(o.code)}</b> • ${esc(o.name)} • PUSH publishes this outlet only.</div></div></div></div>`;
 const preview=box.querySelector('[data-preview]');
 if(url)mediaPreview(url,isVideo,preview);
 const state={row,code:o.code};
 const setFile=()=>{const f=box.querySelector('[data-file]').files?.[0];if(!f)return;ed.set(f,preview);box.querySelector('[data-file]').dataset.ready='1';msg(box.querySelector('[data-msg]'),'Preview ready. Check framing, then PUSH / SAVE.',true)};
 box.querySelector('[data-file]').onchange=setFile;
 box.querySelector('[data-zin]').onclick=()=>ed.zoomIn(preview);
 box.querySelector('[data-zout]').onclick=()=>ed.zoomOut(preview);
 box.querySelector('[data-center]').onclick=()=>ed.center(preview);
 box.querySelector('[data-reset]').onclick=()=>{if(state.row?.video_url||state.row?.banner_url)mediaPreview(state.row.video_url||state.row.banner_url,!!state.row.video_url,preview)};
 box.querySelector('[data-push]').onclick=async()=>{
  const b=box.querySelector('[data-push]'),f=box.querySelector('[data-file]').files?.[0],m=box.querySelector('[data-msg]');
  b.disabled=true;msg(m,'Preparing…',true);
  let saveStep='start';
  try{
   saveStep='saveOutletBanner';
   await saveOutletBanner(o.code,f,box.querySelector('[data-title]').value.trim(),box.querySelector('[data-start]').value,box.querySelector('[data-end]').value,ed,preview,m);
   saveStep='refresh';
   await bootOutlet();
  }catch(e){
   msg(m,'SAVE FAILED @ '+saveStep+': '+(e?.message||String(e))+' | '+String(e?.stack||'').split('\n').slice(0,3).join(' ← '),false);
  }finally{b.disabled=false}
 };
 box.querySelector('[data-toggle]').onclick=async()=>{
  try{await outletToggle(o.code,state.row,!state.row?.active,box.querySelector('[data-msg]'));await bootOutlet()}catch(e){msg(box.querySelector('[data-msg]'),e.message||String(e),false)}
 };
 box.querySelector('[data-delete]').onclick=async()=>{
  if(!confirm('Remove the live banner for '+o.name+'?'))return;
  try{await outletDelete(o.code,state.row,box.querySelector('[data-msg]'));await bootOutlet()}catch(e){msg(box.querySelector('[data-msg]'),e.message||String(e),false)}
 };
 return box;
}

async function bootOutlet(reset=false){
 const root=document.getElementById('jptBccOutletList');if(!root)return;
 if(reset){outletPage=1;outletSearch=''}
 root.innerHTML='<div class="jpt-bcc-small">Loading outlet directory…</div>';
 try{
  const data=await loadOutletData(outletPage,outletSearch);
  root.innerHTML='';
  const bar=document.createElement('div');bar.className='jpt-bcc-global';
  bar.innerHTML='<div class="jpt-bcc-fields"><div><label>SEARCH OUTLETS</label><input data-search placeholder="Search by outlet name or code" value="'+esc(outletSearch)+'"></div><div><label>DIRECTORY</label><div class="jpt-bcc-small">'+Number(data.total||0)+' outlet(s) • Page '+data.page+' / '+data.totalPages+' • 25 per page</div></div></div><div class="jpt-bcc-actions"><button type="button" class="push" data-search-btn>SEARCH</button><button type="button" data-clear>RESET</button><button type="button" data-prev>← PREVIOUS</button><button type="button" data-next>NEXT →</button></div>';
  root.appendChild(bar);
  const list=document.createElement('div');list.dataset.cards='1';root.appendChild(list);
  if(!data.items.length)list.innerHTML='<div class="jpt-bcc-status">No outlets found for this search.</div>';
  else data.items.forEach(o=>list.appendChild(renderOutletCard(o,data,editor())));
  const search=bar.querySelector('[data-search]');
  const goSearch=()=>{outletSearch=search.value.trim();outletPage=1;bootOutlet()};
  bar.querySelector('[data-search-btn]').onclick=goSearch;
  search.onkeydown=e=>{if(e.key==='Enter')goSearch()};
  bar.querySelector('[data-clear]').onclick=()=>{outletSearch='';outletPage=1;bootOutlet()};
  bar.querySelector('[data-prev]').onclick=()=>{if(outletPage>1){outletPage--;bootOutlet()}};
  bar.querySelector('[data-next]').onclick=()=>{if(outletPage<data.totalPages){outletPage++;bootOutlet()}};
  bar.querySelector('[data-prev]').disabled=outletPage<=1;
  bar.querySelector('[data-next]').disabled=outletPage>=data.totalPages;
 }catch(e){root.innerHTML='<div class="jpt-bcc-status">'+esc(e.message||String(e))+'</div>'}
}

async function mount(){
 const h=document.querySelector('#settings')||document.querySelector('#settingsPanel')||document.querySelector('.settings-panel');
 if(!h||document.getElementById('jptBannerControlV3'))return false;
 /* Wait for the central-owner state established by the existing role guard.
    This prevents the feature disappearing during the auth/RPC boot window.
    Backend/RLS authorization remains unchanged. */
 const centralClass=document.documentElement.classList.contains('jpt-central-owner');
 if(!centralClass && !(await central()))return false;
 css();
 // Remove duplicate legacy managers visually; their files remain untouched for rollback.
 const old=document.getElementById('jptSponsorManager');if(old)old.style.display='none';
 const old4=document.getElementById('jptSponsorMediaManagerV4');if(old4)old4.style.display='none';

 const box=document.createElement('section');box.id='jptBannerControlV3';box.innerHTML=`
 <div class="jpt-bcc">
  <h3>🎛️ Banner Control Center V3</h3>
  <div class="jpt-bcc-sub">Central outlet banner authority • searchable/paginated outlet directory • one live banner per outlet • large preview • image/video zoom • drag/center • Push • resumable video upload • ON/OFF • Delete with media cleanup. Existing menu/order system is not touched.</div>
  <div class="jpt-bcc-tabs"><button class="on" data-tab="outlets">🏪 OUTLET DIRECTORY</button></div>
  <div data-view="outlets">
   <div class="notice">Each outlet has exactly <b>one live banner position</b>. The directory is loaded from the central <b>outlets</b> table, so adding outlets does not require adding new hard-coded cards. Search by name/code and manage one outlet at a time.</div>
   <div id="jptBccOutletList"></div>
  </div>
 </div>`;
 h.appendChild(box);
 box.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{box.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('on',x===b));box.querySelectorAll('[data-view]').forEach(v=>v.style.display=v.dataset.view===b.dataset.tab?'block':'none')});
 await bootOutlet();
}
async function boot(){
 let n=0;
 const tryMount=async()=>{try{await mount()}catch(e){}};
 await tryMount();
 const mo=new MutationObserver(()=>{if(!document.getElementById('jptBannerControlV3'))tryMount()});
 mo.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 const t=setInterval(async()=>{
  await tryMount();
  if(document.getElementById('jptBannerControlV3')||++n>120){
   clearInterval(t);
   if(document.getElementById('jptBannerControlV3'))mo.disconnect();
  }
 },500);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();