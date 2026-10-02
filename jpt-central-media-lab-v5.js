/* JPT Central Media Lab V5
   Unified production media controller.
   FIRST  = outlet main banner (one live record per outlet)
   SECOND = customer sponsor position 1
   THIRD  = customer sponsor position 2
   Dynamic outlets table; no hard-coded four/five-outlet controller.
   Uses existing campaigns + sponsor tables/buckets. No schema changes.
*/
(function(){
'use strict';
if(window.__JPT_CENTRAL_MEDIA_LAB_V5__)return;
window.__JPT_CENTRAL_MEDIA_LAB_V5__=true;

const CAMPAIGNS='campaigns',OUTLETS='outlets',SP='checkout_sponsor_ads',BUCKET='checkout-sponsor-media';
const sb=()=>window.sb||null;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const msg=(e,t,ok)=>{if(e){e.textContent=t;e.style.color=ok?'#79e39b':'#ff9d9d'}};
let outlets=[],mainRows=[],sponsorRows=[],activeView='main';

async function central(){
 try{const r=await sb()?.rpc('partner_access_is_central_owner');return !r?.error&&r.data===true}catch(e){return false}
}

function style(){
 if(document.getElementById('jptCmlV5Style'))return;
 const s=document.createElement('style');s.id='jptCmlV5Style';s.textContent=`
 #jptCentralMediaLabV5{margin-top:18px}.jpt-cml{background:linear-gradient(145deg,#151515,#080808);border:1px solid rgba(212,175,55,.55);border-radius:22px;padding:16px;color:#fff;box-shadow:0 14px 42px #0009}
 .jpt-cml h3{margin:0;color:#f4d77a;font-size:20px}.jpt-cml-sub{color:#aaa;font-size:11px;line-height:1.5;margin-top:5px}
 .jpt-cml-tabs{display:flex;gap:8px;overflow:auto;margin:14px 0}.jpt-cml-tabs button{white-space:nowrap;border:1px solid #51401f;background:#111;color:#ddd;border-radius:11px;padding:10px 13px;font-weight:900}.jpt-cml-tabs button.on{background:#d8ae42;color:#111;border-color:#f4d77a}
 .jpt-cml-toolbar{border:1px solid #40351f;border-radius:14px;padding:11px;margin:10px 0;background:#0c0c0c}
 .jpt-cml-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.jpt-cml label{font-size:10px;color:#aaa}.jpt-cml input,.jpt-cml select{width:100%;box-sizing:border-box;background:#0b0b0b;color:#fff;border:1px solid #51401f;border-radius:9px;padding:10px;margin:4px 0 8px}
 .jpt-cml-list{display:grid;gap:10px}.jpt-cml-card{border:1px solid #40351f;border-radius:16px;padding:12px;background:#0c0c0c}
 .jpt-cml-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.jpt-cml-code{font-size:10px;color:#f4d77a;border:1px solid #6b5521;border-radius:99px;padding:4px 8px}.jpt-cml-name{font-weight:950;font-size:16px;margin-top:6px}.jpt-cml-state{font-size:10px;font-weight:900;color:#8be6a7;border:1px solid #27733e;border-radius:99px;padding:5px 8px}.jpt-cml-preview{height:250px;margin:10px 0;border:1px solid #59451d;border-radius:13px;overflow:hidden;background:#030303;display:grid;place-items:center}.jpt-cml-preview img,.jpt-cml-preview video{width:100%;height:100%;object-fit:contain;display:block}
 .jpt-cml-empty{color:#777;text-align:center;padding:20px}.jpt-cml-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.jpt-cml-actions button{border:1px solid #59451d;background:#171717;color:#f4d77a;border-radius:9px;padding:9px 10px;font-weight:900}.jpt-cml-actions .push{background:linear-gradient(135deg,#f4d77a,#c69229);color:#111;border:0}.jpt-cml-actions .danger{background:#321010;color:#ffb0b0;border-color:#933}
 .jpt-cml-status{font-size:11px;color:#999;min-height:18px;margin-top:7px}.jpt-cml-listrow{display:flex;gap:9px;align-items:center;border-top:1px solid #252525;padding:9px 0}.jpt-cml-thumb{width:82px;height:50px;object-fit:cover;border-radius:8px;background:#050505}.jpt-cml-chip{display:inline-block;margin:3px 4px 0 0;padding:4px 7px;border:1px solid #4d3e1e;border-radius:99px;color:#d8ae42;font-size:9px}
 @media(max-width:700px){.jpt-cml-grid{grid-template-columns:1fr}.jpt-cml-preview{height:220px}}
 `;document.head.appendChild(s)
}

function editor(){
 let img=null,type='image',scale=1,ox=0,oy=0,video=null;
 function draw(host){if(!img)return;host.innerHTML='';const x=document.createElement('img');x.src=img.src;x.style.transform='translate('+ox+'px,'+oy+'px) scale('+scale+')';host.appendChild(x)}
 function set(file,host){
  const n=String(file.name||'').toLowerCase();type=(String(file.type||'').startsWith('video/')||/\.(mp4|webm|ogg)$/.test(n))?'video':'image';
  scale=1;ox=0;oy=0;video=null;img=null;host.innerHTML='';
  const u=URL.createObjectURL(file);
  if(type==='video'){video=document.createElement('video');video.src=u;video.controls=true;video.muted=true;video.playsInline=true;video.style.cssText='width:100%;height:100%;object-fit:contain';host.appendChild(video)}
  else{img=new Image();img.onload=()=>draw(host);img.src=u}
 }
 function zoom(host,d){scale=Math.max(.25,Math.min(4,scale+d));if(type==='video'&&video)video.style.transform='scale('+scale+')';else draw(host)}
 function center(host){scale=1;ox=0;oy=0;if(type==='video'&&video)video.style.transform='scale(1)';else draw(host)}
 function wire(host){let drag=false,lx=0,ly=0;host.onpointerdown=e=>{if(type!=='image'||!img)return;drag=true;lx=e.clientX;ly=e.clientY;host.setPointerCapture(e.pointerId)};host.onpointermove=e=>{if(!drag)return;ox+=e.clientX-lx;oy+=e.clientY-ly;lx=e.clientX;ly=e.clientY;draw(host)};host.onpointerup=()=>drag=false;host.onpointercancel=()=>drag=false}
 return {set,zoomIn:h=>zoom(h,.15),zoomOut:h=>zoom(h,-.15),center,wire,async blob(file){if(type==='video')return file;if(!img)throw new Error('Choose an image first.');const c=document.createElement('canvas');c.width=1200;c.height=420;const x=c.getContext('2d');x.fillStyle='#050505';x.fillRect(0,0,1200,420);const iw=img.width*scale,ih=img.height*scale;x.drawImage(img,(1200-iw)/2+ox,(420-ih)/2+oy,iw,ih);return await new Promise((r,j)=>c.toBlob(b=>b?r(new File([b],'banner.jpg',{type:'image/jpeg'})):j(new Error('Image export failed')),'image/jpeg',.92))}}
}

async function upload(file,folder){
 const n=String(file.name||'').toLowerCase(),video=String(file.type||'').startsWith('video/')||/\.(mp4|webm|ogg)$/.test(n);
 const ext=video?((n.match(/\.(mp4|webm|ogg)$/)||['.mp4'])[0]):'.jpg';
 const path=folder+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,9)+ext;
 if(video&&file.size>60*1024*1024)throw new Error('Video must be under 60MB.');
 if(!video&&file.size>12*1024*1024)throw new Error('Image must be under 12MB.');
 const r=await sb().storage.from(video&&folder.startsWith('sponsors/')?BUCKET:'menu-images').upload(path,file,{upsert:false,cacheControl:'60',contentType:file.type||'image/jpeg'});
 if(r.error)throw new Error('MEDIA UPLOAD FAILED: '+r.error.message);
 const bucket=video&&folder.startsWith('sponsors/')?BUCKET:'menu-images';
 const url=sb().storage.from(bucket).getPublicUrl(path).data.publicUrl;
 return {path,url,video,bucket};
}

async function loadData(){
 const [o,c,s]=await Promise.all([
  sb().from(OUTLETS).select('code,name,banner_url').order('name',{ascending:true}),
  sb().from(CAMPAIGNS).select('id,outlet_id,title,active,banner_url,video_url,start_at,end_at,priority,schedule_json,created_at').order('created_at',{ascending:false}),
  sb().from(SP).select('id,title,sponsor_name,media_type,media_url,video_url,target_all_live,outlet_ids,is_active,starts_at,ends_at,sort_order,schedule_json,created_at').order('sort_order',{ascending:true}).order('created_at',{ascending:false})
 ]);
 if(o.error)throw o.error;if(c.error)throw c.error;if(s.error)throw s.error;
 outlets=o.data||[];mainRows=(c.data||[]).filter(x=>x.schedule_json?.surface==='customer_outlet_showcase'&&x.schedule_json?.campaign_type==='media');sponsorRows=s.data||[];
}

function live(x){const n=Date.now(),s=x.start_at?Date.parse(x.start_at):-Infinity,e=x.end_at?Date.parse(x.end_at):Infinity;return x.active!==false&&s<=n&&n<=e}
function sponsorLive(x){const n=Date.now(),s=x.starts_at?Date.parse(x.starts_at):-Infinity,e=x.ends_at?Date.parse(x.ends_at):Infinity;return x.is_active!==false&&s<=n&&n<=e}
function mediaUrl(x){return x?.video_url||x?.banner_url||x?.media_url||''}

function preview(host,url,isVideo){host.innerHTML='';if(!url){host.innerHTML='<div class="jpt-cml-empty">NO MEDIA CONFIGURED</div>';return}if(isVideo){const v=document.createElement('video');v.src=url;v.controls=true;v.muted=true;v.playsInline=true;v.style.cssText='width:100%;height:100%;object-fit:contain';host.appendChild(v)}else{const i=document.createElement('img');i.src=url;i.alt='Media preview';host.appendChild(i)}}

async function saveMain(code,file,title,ed,host,status){
 if(!file)throw new Error('Choose an image or video first.');
 const prepared=await ed.blob(file);msg(status,'Uploading FIRST banner…',true);const up=await upload(prepared,'outlet-banners/'+code);
 const old=mainRows.filter(x=>String(x.outlet_id)===String(code));
 const row={outlet_id:code,title:title||code+' Main Banner',message:'FIRST outlet main banner',active:true,start_at:null,end_at:null,priority:100,banner_url:up.video?null:up.url,video_url:up.video?up.url:null,schedule_json:{version:5,campaign_type:'media',surface:'customer_outlet_showcase',placement:'FIRST',media_type:up.video?'video':'image',image_url:up.video?null:up.url,video_url:up.video?up.url:null,storage_bucket:up.bucket,storage_path:up.path,publication:'published'}};
 const ins=await sb().from(CAMPAIGNS).insert(row);if(ins.error)throw new Error('FIRST SAVE FAILED: '+ins.error.message);
 const off=old.map(x=>x.id).filter(Boolean);if(off.length){const q=await sb().from(CAMPAIGNS).update({active:false}).in('id',off);if(q.error)throw new Error('OLD FIRST RETIRE FAILED: '+q.error.message)}
 const ou=await sb().from(OUTLETS).update({banner_url:up.video?null:up.url}).eq('code',code);if(ou.error)throw new Error('OUTLET MAPPING FAILED: '+ou.error.message);
 msg(status,'✓ FIRST / '+code+' published live.',true);
}

async function deleteMain(code,status){
 const rows=mainRows.filter(x=>String(x.outlet_id)===String(code)),ids=rows.map(x=>x.id).filter(Boolean);
 if(ids.length){const q=await sb().from(CAMPAIGNS).update({active:false}).in('id',ids);if(q.error)throw q.error}
 const q=await sb().from(OUTLETS).update({banner_url:null}).eq('code',code);if(q.error)throw q.error;
 msg(status,'✓ FIRST banner disabled for '+code,true);
}

function renderMain(root){
 root.innerHTML='<div class="jpt-cml-toolbar"><b>FIRST — MAIN OUTLET BANNER</b><div class="jpt-cml-sub">One live main banner per outlet. Outlet code is the authoritative routing key. Directory is loaded from the outlets table, so future outlets appear automatically.</div></div>';
 const list=document.createElement('div');list.className='jpt-cml-list';root.appendChild(list);
 outlets.forEach(o=>{
  const rows=mainRows.filter(x=>String(x.outlet_id)===String(o.code)),row=rows.find(live)||rows[0]||null,url=mediaUrl(row)||o.banner_url||'',isVideo=!!row?.video_url;
  const card=document.createElement('article');card.className='jpt-cml-card';card.innerHTML=`
   <div class="jpt-cml-head"><div><span class="jpt-cml-code">FIRST • ${esc(o.code)}</span><div class="jpt-cml-name">${esc(o.name)}</div></div><span class="jpt-cml-state">${row?.active?'LIVE':'EMPTY / OFF'}</span></div>
   <div class="jpt-cml-preview" data-preview></div>
   <div class="jpt-cml-grid"><div><label>BANNER TITLE</label><input data-title value="${esc(row?.title||o.name+' Main Banner')}"></div><div><label>NEW IMAGE / VIDEO</label><input data-file type="file" accept="image/*,video/*"></div></div>
   <div class="jpt-cml-actions"><button class="push" data-save>⬆ SAVE FIRST</button><button data-toggle>${row?.active?'TURN OFF':'TURN ON'}</button><button class="danger" data-delete>DELETE FIRST</button></div><div class="jpt-cml-status" data-msg></div>`;
  list.appendChild(card);
  const p=card.querySelector('[data-preview]'),ed=editor();if(url)preview(p,url,isVideo);
  const file=card.querySelector('[data-file]');file.onchange=()=>{const f=file.files?.[0];if(f){ed.set(f,p);ed.wire(p);msg(card.querySelector('[data-msg]'),'Preview ready. Check framing, then SAVE FIRST.',true)}};
  card.querySelector('[data-save]').onclick=async()=>{const b=card.querySelector('[data-save]');b.disabled=true;try{await saveMain(o.code,file.files?.[0],card.querySelector('[data-title]').value.trim(),ed,p,card.querySelector('[data-msg]'));await refresh()}catch(e){msg(card.querySelector('[data-msg]'),e.message||String(e),false)}finally{b.disabled=false}};
  card.querySelector('[data-toggle]').onclick=async()=>{try{const next=!row?.active;if(!row)throw new Error('No FIRST record exists. Use SAVE FIRST.');const q=await sb().from(CAMPAIGNS).update({active:next}).eq('id',row.id).eq('outlet_id',o.code);if(q.error)throw q.error;await refresh()}catch(e){msg(card.querySelector('[data-msg]'),e.message||String(e),false)}};
  card.querySelector('[data-delete]').onclick=async()=>{if(!confirm('Disable the FIRST main banner for '+o.name+'?'))return;try{await deleteMain(o.code,card.querySelector('[data-msg]'));await refresh()}catch(e){msg(card.querySelector('[data-msg]'),e.message||String(e),false)}};
 });
}

async function saveSponsor(file,title,name,slot,target,outlet,sort,start,end,status){
 if(!file)throw new Error('Choose sponsor media first.');
 const prepared=file,up=await upload(prepared,'sponsors/checkout');
 msg(status,'Uploading sponsor media…',true);
 const row={title:title||name||'Sponsor Banner',sponsor_name:name||'',media_type:up.video?'video':'image',media_url:up.url,video_url:up.video?up.url:null,poster_url:up.video?null:up.url,target_all_live:target==='all',outlet_ids:target==='all'?[]:[outlet],is_active:true,sort_order:Number(sort||0),starts_at:start?new Date(start).toISOString():null,ends_at:end?new Date(end).toISOString():null,created_by:(await sb().auth.getUser()).data.user?.id||null,schedule_json:{version:5,slot:Number(slot),placement:Number(slot)===1?'SECOND':'THIRD',storage_bucket:up.bucket,storage_path:up.path,muted:true}};
 const ins=await sb().from(SP).insert(row);if(ins.error)throw new Error('SPONSOR SAVE FAILED: '+ins.error.message);
 msg(status,'✓ '+(Number(slot)===1?'SECOND':'THIRD')+' sponsor saved.',true);
}

async function renderSponsors(root){
 root.innerHTML='<div class="jpt-cml-toolbar"><b>SECOND / THIRD — SPONSOR MEDIA</b><div class="jpt-cml-sub">These are the two customer sponsor positions. Images run for 10 seconds; videos run until ended. Every saved banner has an explicit slot, target, schedule and sort order.</div></div>';
 const form=document.createElement('div');form.className='jpt-cml-toolbar';form.innerHTML=`
 <div class="jpt-cml-grid">
  <div><label>SPONSOR NAME</label><input data-name placeholder="Sponsor / Brand"></div><div><label>BANNER TITLE</label><input data-title placeholder="Optional title"></div>
  <div><label>SPONSOR POSITION</label><select data-slot><option value="1">SECOND — Sponsor Banner 1</option><option value="2">THIRD — Sponsor Banner 2</option></select></div>
  <div><label>TARGET</label><select data-target><option value="all">All live users</option><option value="outlet">Selected outlet</option></select></div>
  <div data-outlet-wrap style="display:none"><label>OUTLET</label><select data-outlet></select></div>
  <div><label>SORT ORDER</label><input data-sort type="number" value="0" min="0"></div>
  <div><label>START (OPTIONAL)</label><input data-start type="datetime-local"></div><div><label>END (OPTIONAL)</label><input data-end type="datetime-local"></div>
  <div><label>IMAGE / VIDEO</label><input data-file type="file" accept="image/*,video/*"></div>
 </div>
 <div class="jpt-cml-preview" data-preview style="height:220px"></div>
 <div class="jpt-cml-actions"><button class="push" data-add>＋ SAVE SPONSOR BANNER</button></div><div class="jpt-cml-status" data-msg></div>`;
 root.appendChild(form);
 const out=form.querySelector('[data-outlet]');out.innerHTML=outlets.map(o=>`<option value="${esc(o.code)}">${esc(o.name)} (${esc(o.code)})</option>`).join('');
 const target=form.querySelector('[data-target]');target.onchange=()=>form.querySelector('[data-outlet-wrap]').style.display=target.value==='outlet'?'block':'none';
 const file=form.querySelector('[data-file]'),p=form.querySelector('[data-preview]'),ed=editor();file.onchange=()=>{const f=file.files?.[0];if(f){ed.set(f,p);ed.wire(p);msg(form.querySelector('[data-msg]'),'Preview ready.',true)}};
 form.querySelector('[data-add]').onclick=async()=>{const b=form.querySelector('[data-add]');b.disabled=true;try{await saveSponsor(file.files?.[0],form.querySelector('[data-title]').value.trim(),form.querySelector('[data-name]').value.trim(),form.querySelector('[data-slot]').value,target.value,out.value,form.querySelector('[data-sort]').value,form.querySelector('[data-start]').value,form.querySelector('[data-end]').value,form.querySelector('[data-msg]'));await refresh()}catch(e){msg(form.querySelector('[data-msg]'),e.message||String(e),false)}finally{b.disabled=false}};
 const list=document.createElement('div');list.className='jpt-cml-list';root.appendChild(list);
 sponsorRows.forEach(row=>{
  const slot=Number(row.schedule_json?.slot||1),label=slot===1?'SECOND':'THIRD',targetLabel=row.target_all_live?'ALL LIVE':(row.outlet_ids||[]).join(', ')||'TARGETED',url=row.media_url||'',card=document.createElement('article');card.className='jpt-cml-card';
  card.innerHTML=`<div class="jpt-cml-head"><div><span class="jpt-cml-code">${label} • ${esc(targetLabel)}</span><div class="jpt-cml-name">${esc(row.sponsor_name||row.title||'Sponsor Banner')}</div></div><span class="jpt-cml-state" style="${row.is_active?'':'color:#ffb0b0;border-color:#933'}">${row.is_active?'LIVE':'OFF'}</span></div><div class="jpt-cml-listrow"><img class="jpt-cml-thumb" src="${esc(url)}" onerror="this.style.visibility='hidden'"><div><b>${esc(row.title||'Sponsor Banner')}</b><div class="jpt-cml-sub">${row.media_type==='video'?'VIDEO':'IMAGE'} • sort ${Number(row.sort_order||0)} • ${row.starts_at||row.ends_at?'scheduled':'no schedule'}</div><span class="jpt-cml-chip">${label}</span><span class="jpt-cml-chip">${esc(targetLabel)}</span></div></div><div class="jpt-cml-actions"><button data-toggle>${row.is_active?'TURN OFF':'TURN ON'}</button><button class="danger" data-delete>DELETE</button></div><div class="jpt-cml-status" data-msg></div>`;
  list.appendChild(card);
  card.querySelector('[data-toggle]').onclick=async()=>{try{const q=await sb().from(SP).update({is_active:!row.is_active}).eq('id',row.id);if(q.error)throw q.error;await refresh()}catch(e){msg(card.querySelector('[data-msg]'),e.message||String(e),false)}};
  card.querySelector('[data-delete]').onclick=async()=>{if(!confirm('Delete this sponsor banner record?'))return;try{const q=await sb().from(SP).delete().eq('id',row.id);if(q.error)throw q.error;await refresh()}catch(e){msg(card.querySelector('[data-msg]'),e.message||String(e),false)}};
 });
}

async function refresh(){
 await loadData();
 const root=document.getElementById('jptCmlView');if(!root)return;
 if(activeView==='main')renderMain(root);else await renderSponsors(root);
}

async function mount(){
 const h=document.querySelector('#settings')||document.querySelector('#settingsPanel')||document.querySelector('.settings-panel');if(!h||document.getElementById('jptCentralMediaLabV5'))return false;
 if(!(await central()))return false;
 style();
 // Hide legacy/parallel controllers. Their files remain untouched for rollback.
 ['jptBannerControlV3','jptSponsorManager','jptSponsorMediaManagerV4','jptOutletMediaV1'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none'});
 const box=document.createElement('section');box.id='jptCentralMediaLabV5';box.innerHTML=`<div class="jpt-cml"><h3>🎛️ Central Media Lab V5</h3><div class="jpt-cml-sub">ONE source of truth for customer media. FIRST = outlet main banner. SECOND / THIRD = sponsor positions. Dynamic outlet directory. No hard-coded four-outlet controller.</div><div class="jpt-cml-tabs"><button class="on" data-view="main">FIRST — OUTLET BANNERS</button><button data-view="sponsors">SECOND / THIRD — SPONSORS</button></div><div id="jptCmlView"></div></div>`;
 h.appendChild(box);
 box.querySelectorAll('[data-view]').forEach(b=>b.onclick=async()=>{activeView=b.dataset.view;box.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('on',x===b));await refresh()});
 await refresh();
 return true;
}
async function boot(){
 let n=0;const t=setInterval(async()=>{try{if(await mount()){clearInterval(t)}}catch(e){}if(++n>120)clearInterval(t)},500)
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();