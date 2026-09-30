/* JPT Banner Control Center V3
   Controlled replacement for the old sponsor manager UI.
   No schema changes. Uses existing outlets + campaigns + sponsor tables/buckets.
   Five fixed outlet banner codes:
   B01 JPT-001, B02 SOP-002, B03 PFA-003, B04 NME-004, B05 TOP-005.
*/
(function(){
'use strict';
if(window.__JPT_BANNER_CONTROL_CENTER_V3__) return;
window.__JPT_BANNER_CONTROL_CENTER_V3__=true;

const FIXED_IDS={
 'JPT-001':'B01','SOP-002':'B02','PFA-003':'B03','NME-004':'B04','TOP-005':'B05'
};
const PAGE_SIZE=25;
let outletPage=1,outletSearch='';
const controlId=o=>FIXED_IDS[o.code]||('OUT-'+String(o.code||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,24));
const CAMPAIGNS='campaigns';
const OUTLETS='outlets';
const SPONSOR_TABLES={delivery:'delivery_partner_sponsor_ads',customer:'checkout_sponsor_ads'};
const SPONSOR_BUCKETS={delivery:'delivery-partner-sponsors',customer:'checkout-sponsor-media'};

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
 let media=null,type='image',scale=1,ox=0,oy=0,drag=false,lx=0,ly=0,video=null;
 const state={};
 function reset(){media=null;video=null;type='image';scale=1;ox=0;oy=0}
 function setPreview(host,file){
  reset();
  const isVideo=/^video\\//i.test(file.type)||/\\.(mp4|webm|ogg)$/i.test(file.name);
  type=isVideo?'video':'image';
  const u=URL.createObjectURL(file);
  host.innerHTML='';
  if(isVideo){
   video=document.createElement('video');video.src=u;video.controls=true;video.playsInline=true;video.muted=true;
   video.style.transform='scale(1)';host.appendChild(video);
  }else{
   const img=new Image();img.onload=()=>{media=img;draw(host)};img.src=u;
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
  host.onpointerdown=e=>{if(type!=='image'||!media)return;drag=true;lx=e.clientX;ly=e.clientY;host.setPointerCapture(e.pointerId)};
  host.onpointermove=e=>{if(!drag)return;ox+=e.clientX-lx;oy+=e.clientY-ly;lx=e.clientX;ly=e.clientY;draw(host)};
  host.onpointerup=()=>drag=false;host.onpointercancel=()=>drag=false;
 }
 return {
  set(file,host){const t=setPreview(host,file);wire(host);return t},
  zoomIn(host){zoom(host,.15)},zoomOut(host){zoom(host,-.15)},center(host){center(host)},
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

async function uploadMedia(file,bucket,folder){
 const ext=(file.name.match(/\\.(mp4|webm|ogg|jpg|jpeg|png|webp)$/i)||['.bin'])[0].toLowerCase();
 const path=folder+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,9)+ext;
 const r=await sb().storage.from(bucket).upload(path,file,{upsert:false,cacheControl:'60',contentType:file.type||'application/octet-stream'});
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

async function saveOutletBanner(code,file,title,ed,preview,msgEl){
 if(!file)throw new Error('Please choose an image or video.');
 const isVideo=/^video\\//i.test(file.type)||/\\.(mp4|webm|ogg)$/i.test(file.name);
 if(isVideo&&file.size>60*1024*1024)throw new Error('Video must be under 60MB.');
 if(!isVideo&&file.size>12*1024*1024)throw new Error('Image must be under 12MB.');
 msg(msgEl,'Uploading media…',true);
 const prepared=await ed.blob(file);
 const up=await uploadMedia(prepared,SPONSOR_BUCKETS.customer,'outlet-banners/'+code);
 await deactivateOutletMedia(code);
 const row={
  outlet_id:code,
  title:title||code+' Banner',
  message:'Outlet banner '+code,
  active:true,
  start_at:null,
  end_at:null,
  priority:100,
  banner_url:isVideo?null:up.url,
  video_url:isVideo?up.url:null,
  schedule_json:{version:3,campaign_type:'media',surface:'customer_outlet_showcase',media_type:isVideo?'video':'image',video_url:isVideo?up.url:null,image_url:isVideo?null:up.url,placement:'outlet_showcase',publication:'published',banner_control_id:FIXED_IDS[code]||('OUT-'+String(code||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,24))}
 };
 const ins=await sb().from(CAMPAIGNS).insert(row);
 if(ins.error)throw new Error('BANNER SAVE FAILED: '+ins.error.message);
 // Keep legacy outlet banner field in sync for other existing consumers.
 const patch= isVideo ? {banner_url:null} : {banner_url:up.url};
 const ou=await sb().from(OUTLETS).update(patch).eq('code',code);
 if(ou.error)throw new Error('OUTLET BANNER MAPPING FAILED: '+ou.error.message);
 msg(msgEl,'✅ Pushed live to '+code+' • '+(isVideo?'VIDEO':'IMAGE'),true);
 return up.url;
}

async function outletToggle(code,row,next,msgEl){
 const c=sb();if(!row?.id)throw new Error('No saved banner found for this outlet.');
 const r=await c.from(CAMPAIGNS).update({active:next}).eq('id',row.id).eq('outlet_id',code);
 if(r.error)throw r.error;
 msg(msgEl,next?'✅ Banner ON':'Banner OFF',true);
}

async function outletDelete(code,row,msgEl){
 const c=sb();
 if(row?.id){const r=await c.from(CAMPAIGNS).update({active:false}).eq('id',row.id).eq('outlet_id',code);if(r.error)throw r.error}
 const u=await c.from(OUTLETS).update({banner_url:null}).eq('code',code);if(u.error)throw u.error;
 msg(msgEl,'🗑️ Banner removed from live display.',true);
}

function mediaPreview(url,isVideo,host){
 host.innerHTML='';
 if(!url){host.innerHTML='<div class="jpt-bcc-empty"><b>NO LIVE BANNER</b>Choose media below and Push Banner.</div>';return}
 if(isVideo){const v=document.createElement('video');v.src=url;v.controls=true;v.playsInline=true;v.muted=true;v.style.cssText='width:100%;height:100%;object-fit:contain';host.appendChild(v)}
 else{const i=document.createElement('img');i.src=url;i.alt='Banner preview';host.appendChild(i)}
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
  </div>
  <div class="jpt-bcc-small">Code <b>${o.id}</b> हमेशा इसी outlet का रहेगा. Push करने पर पुराना active media OFF होगा और नया single live banner बनेगा.</div>
  <div class="jpt-bcc-actions">
   <button class="push" type="button" data-push>⬆ PUSH / SAVE</button>
   <button class="onoff" type="button" data-toggle>${row?.active?'TURN OFF':'TURN ON'}</button>
   <button class="danger" type="button" data-delete>DELETE LIVE BANNER</button>
  </div>
  <div class="jpt-bcc-status" data-msg></div>
  <div class="jpt-bcc-list"><b>Current Media Record</b><div class="jpt-bcc-row">${url?'<img class="jpt-bcc-thumb" src="'+esc(url)+'">':'<div class="jpt-bcc-thumb"></div>'}<div><div>${esc(row?.title||'No saved media')}</div><div class="jpt-bcc-small">${row?.video_url?'VIDEO':'IMAGE'} • ${row?.active?'ON':'OFF'} • Priority ${Number(row?.priority||0)}</div></div></div></div>`;
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
  try{await saveOutletBanner(o.code,f,box.querySelector('[data-title]').value.trim(),ed,preview,m);await bootOutlet();}catch(e){msg(m,e.message||String(e),false)}finally{b.disabled=false}
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

async function renderSponsorSurface(kind){
 const root=document.getElementById(kind==='delivery'?'jptBccDelivery':'jptBccCustomer');if(!root)return;
 const table=SPONSOR_TABLES[kind],bucket=SPONSOR_BUCKETS[kind];
 root.innerHTML='<div class="jpt-bcc-small">Loading current advertisement…</div>';
 try{
  const q=await sb().from(table).select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});
  if(q.error)throw q.error;
  const row=(q.data||[]).find(x=>x.is_active)||q.data?.[0]||null;
  const wrap=document.createElement('div');
  wrap.innerHTML=`
   <div class="jpt-bcc-preview" data-preview></div>
   <div class="jpt-bcc-tools"><button type="button" data-zout>− Zoom</button><button type="button" data-center>Center</button><button type="button" data-zin>＋ Zoom</button><button type="button" data-play>▶ Play/Pause</button></div>
   <div class="jpt-bcc-fields">
    <div><label>BANNER TITLE</label><input data-title value="${esc(row?.title||'')}"></div>
    <div><label>SPONSOR NAME</label><input data-sponsor value="${esc(row?.sponsor_name||'')}"></div>
    <div><label>NEW IMAGE / VIDEO</label><input data-file type="file" accept="image/*,video/*"></div>
    <div><label>TARGET</label><select data-target><option value="all">All live users</option><option value="outlet">Selected outlet</option></select></div>
   </div>
   <div class="jpt-bcc-actions"><button class="push" type="button" data-push>⬆ PUSH / SAVE</button><button class="onoff" type="button" data-toggle>${row?.is_active?'TURN OFF':'TURN ON'}</button><button class="danger" type="button" data-delete>DELETE</button></div>
   <div class="jpt-bcc-status" data-msg></div>
   <div class="jpt-bcc-small">Current code: ${kind==='delivery'?'DEL-01':'CHK-01'} • ${row?.target_all_live?'ALL LIVE':((row?.outlet_ids||[]).join(', ')||'ALL LIVE')}</div>`;
  root.innerHTML='';root.appendChild(wrap);
  const p=wrap.querySelector('[data-preview]'),ed=editor(),m=wrap.querySelector('[data-msg]');
  if(row?.media_url)mediaPreview(row.media_url,row.media_type==='video',p);
  const file=wrap.querySelector('[data-file]');
  file.onchange=()=>{const f=file.files?.[0];if(f){ed.set(f,p);msg(m,'Preview ready. Check framing, then PUSH / SAVE.',true)}};
  wrap.querySelector('[data-zin]').onclick=()=>ed.zoomIn(p);
  wrap.querySelector('[data-zout]').onclick=()=>ed.zoomOut(p);
  wrap.querySelector('[data-center]').onclick=()=>ed.center(p);
  wrap.querySelector('[data-play]').onclick=()=>{const v=p.querySelector('video');if(v)(v.paused?v.play():v.pause())};
  wrap.querySelector('[data-push]').onclick=async()=>{
   const b=wrap.querySelector('[data-push]'),f=file.files?.[0];b.disabled=true;
   try{
    if(!f)throw new Error('Choose an image or video first.');
    const isVideo=/^video\\//i.test(f.type)||/\\.(mp4|webm|ogg)$/i.test(f.name);
    if(isVideo&&f.size>60*1024*1024)throw new Error('Video must be under 60MB.');
    const prepared=await ed.blob(f),up=await uploadMedia(prepared,bucket,'manager-v3/'+kind);
    const current=await sb().from(table).select('id').eq('is_active',true);
    if(current.data?.length){const off=await sb().from(table).update({is_active:false}).in('id',current.data.map(x=>x.id));if(off.error)throw off.error}
    const targetAll=wrap.querySelector('[data-target]').value==='all';
    const rowData={title:wrap.querySelector('[data-title]').value.trim()||'Sponsor Banner',sponsor_name:wrap.querySelector('[data-sponsor]').value.trim(),media_type:isVideo?'video':'image',media_url:up.url,video_url:isVideo?up.url:null,poster_url:isVideo?null:up.url,target_all_live:targetAll,outlet_ids:targetAll?[]:[outletCode()],is_active:true,sort_order:0,starts_at:null,ends_at:null,created_by:(await sb().auth.getUser()).data.user?.id||null,schedule_json:{slot:1,media_kind:isVideo?'video':'image',single_position:true}};
    const ins=await sb().from(table).insert(rowData);if(ins.error)throw new Error('DATABASE SAVE FAILED: '+ins.error.message);
    msg(m,'✅ Pushed live • '+(isVideo?'VIDEO':'IMAGE'),true);await renderSponsorSurface(kind);
   }catch(e){msg(m,e.message||String(e),false)}finally{b.disabled=false}
  };
  wrap.querySelector('[data-toggle]').onclick=async()=>{
   if(!row?.id){msg(m,'No saved banner found.',false);return}
   const next=!row.is_active,q=await sb().from(table).update({is_active:next}).eq('id',row.id);if(q.error){msg(m,q.error.message,false);return}await renderSponsorSurface(kind)
  };
  wrap.querySelector('[data-delete]').onclick=async()=>{
   if(!row?.id){msg(m,'No saved banner found.',false);return}
   if(!confirm('Remove this live advertisement?'))return;
   const q=await sb().from(table).update({is_active:false}).eq('id',row.id);if(q.error){msg(m,q.error.message,false);return}await renderSponsorSurface(kind)
  };
 }catch(e){root.innerHTML='<div class="jpt-bcc-status">'+esc(e.message||String(e))+'</div>'}
}

async function mount(){
 const h=document.querySelector('#settings')||document.querySelector('#settingsPanel')||document.querySelector('.settings-panel');if(!h||document.getElementById('jptBannerControlV3'))return;
 if(!(await central()))return;
 css();
 // Remove duplicate legacy managers visually; their files remain untouched for rollback.
 const old=document.getElementById('jptSponsorManager');if(old)old.style.display='none';
 const old4=document.getElementById('jptSponsorMediaManagerV4');if(old4)old4.style.display='none';

 const box=document.createElement('section');box.id='jptBannerControlV3';box.innerHTML=`
 <div class="jpt-bcc">
  <h3>🎛️ Banner Control Center V3</h3>
  <div class="jpt-bcc-sub">Central outlet banner authority • searchable/paginated outlet directory • one live banner per outlet • large preview • image/video zoom • drag/center • Push • ON/OFF • Delete. Existing menu/order system is not touched.</div>
  <div class="jpt-bcc-tabs"><button class="on" data-tab="outlets">🏪 OUTLET DIRECTORY</button><button data-tab="delivery">🛵 DELIVERY ADS</button><button data-tab="customer">🧾 CHECKOUT / TRACKING</button></div>
  <div data-view="outlets">
   <div class="notice">Each outlet has exactly <b>one live banner position</b>. The directory is loaded from the central <b>outlets</b> table, so adding outlets does not require adding new hard-coded cards. Search by name/code and manage one outlet at a time.</div>
   <div id="jptBccOutletList"></div>
  </div>
  <div data-view="delivery" style="display:none"><div class="jpt-bcc-global"><b>Delivery Partner Advertisement</b><div class="jpt-bcc-sub">One live advertisement position. Upload a new image/video to replace the current one.</div><div id="jptBccDelivery"></div></div></div>
  <div data-view="customer" style="display:none"><div class="jpt-bcc-global"><b>Checkout / Order Tracking Advertisement</b><div class="jpt-bcc-sub">One live sponsor position. Upload a new image/video to replace the current one.</div><div id="jptBccCustomer"></div></div></div>
 </div>`;
 h.appendChild(box);
 box.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{box.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('on',x===b));box.querySelectorAll('[data-view]').forEach(v=>v.style.display=v.dataset.view===b.dataset.tab?'block':'none')});
 await bootOutlet();
 await renderSponsorSurface('delivery');
 await renderSponsorSurface('customer');
}
async function boot(){let n=0;const t=setInterval(async()=>{try{await mount()}catch(e){}if(document.getElementById('jptBannerControlV3')||++n>80)clearInterval(t)},500)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();