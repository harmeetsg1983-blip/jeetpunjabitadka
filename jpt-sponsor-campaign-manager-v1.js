/* JPT — ISOLATED SPONSOR CAMPAIGN MANAGER V1
   Owns ONLY jpt_sponsor_campaigns + jpt-sponsor-media-v2.
   Does not touch orders, alarms, customer cart, checkout or legacy sponsor tables.
*/
(function(){
'use strict';
if(window.__JPT_SPONSOR_CAMPAIGN_MANAGER_V1__)return;
window.__JPT_SPONSOR_CAMPAIGN_MANAGER_V1__=true;
const TABLE='jpt_sponsor_campaigns', BUCKET='jpt-sponsor-media-v2';
const db=()=>window.sb||window.supabaseClient||null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let rows=[], editId=null, mediaUrl='', mediaType='image', crop={x:50,y:50,zoom:1};

function css(){if(document.getElementById('jptSponsorMgrStyle'))return;
const s=document.createElement('style');s.id='jptSponsorMgrStyle';s.textContent=`
#jptSponsorMgr{position:fixed;inset:0;z-index:1200;background:#000b;display:none;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
#jptSponsorMgr.open{display:block}#jptSMPanel{position:absolute;right:0;top:0;bottom:0;width:min(620px,100vw);background:#090909;border-left:1px solid #3a3a3a;overflow:auto;padding:16px}
.jptSMHead{display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid #292929;padding-bottom:12px}.jptSMTitle{font-size:19px;font-weight:1000;color:#d8ae42}
.jptSMGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.jptSMField{margin:9px 0}.jptSMField label{display:block;color:#aaa;font-size:11px;margin-bottom:4px}.jptSMField input,.jptSMField select{width:100%;background:#151515;color:#fff;border:1px solid #3b3b3b;border-radius:9px;padding:10px}
.jptSMPreview{height:210px;background:#111;border:1px solid #3b3b3b;border-radius:14px;overflow:hidden;position:relative}.jptSMPreview img,.jptSMPreview video{width:100%;height:100%;object-fit:cover;display:block;transform:scale(var(--z,1));object-position:var(--x,50%) var(--y,50%)}
.jptSMBtns{display:flex;gap:7px;flex-wrap:wrap}.jptSMBtn{border:1px solid #444;background:#151515;color:#fff;border-radius:9px;padding:10px 12px;font-weight:850}.jptSMBtn.gold{background:#d8ae42;color:#111;border-color:#d8ae42}.jptSMBtn.red{color:#ff9999;border-color:#6b2929}
.jptSMList{margin-top:14px}.jptSMRow{display:grid;grid-template-columns:72px 1fr auto;gap:9px;align-items:center;padding:9px 0;border-bottom:1px solid #292929}.jptSMThumb{width:72px;height:52px;border-radius:8px;object-fit:cover;background:#151515}.jptSMMeta b{display:block}.jptSMMeta small{color:#999}.jptSMTag{font-size:9px;border:1px solid #444;border-radius:99px;padding:3px 6px;color:#bbb}.jptSMNotice{padding:9px;border:1px solid #3a3019;background:#171207;border-radius:9px;color:#d8ae42;font-size:11px;margin:8px 0}
@media(max-width:560px){.jptSMGrid{grid-template-columns:1fr}.jptSMRow{grid-template-columns:58px 1fr}.jptSMRow .jptSMBtns{grid-column:1/-1}.jptSMThumb{width:58px;height:48px}}
`;document.head.appendChild(s)}
function ui(){if(document.getElementById('jptSponsorMgr'))return;
css();const root=document.createElement('div');root.id='jptSponsorMgr';root.innerHTML=`<div id="jptSMPanel">
<div class="jptSMHead"><div><div class="jptSMTitle">Sponsor Campaign Manager</div><div style="font-size:10px;color:#888">Isolated V1 • new sponsor system only</div></div><button class="jptSMBtn" id="jptSMClose">Close</button></div>
<div class="jptSMNotice">Each sponsor is a separate campaign with its own code. Order/ringtone infrastructure is not used.</div>
<div class="jptSMField"><label>Sponsor name</label><input id="jptSMName" placeholder="Sponsor / brand name"></div>
<div class="jptSMField"><label>Banner title</label><input id="jptSMTitle" placeholder="Promotion title"></div>
<div class="jptSMField"><label>Optional click URL</label><input id="jptSMClick" type="url" placeholder="https://..."></div>
<div class="jptSMGrid">
<div class="jptSMField"><label>Media</label><input id="jptSMFile" type="file" accept="image/*,video/*"></div>
<div class="jptSMField"><label>Display seconds</label><select id="jptSMSec"><option>10</option><option>11</option><option>12</option></select></div>
<div class="jptSMField"><label>Target</label><select id="jptSMTarget"><option value="all_live">All live outlets</option><option value="selected">Selected outlet</option></select></div>
<div class="jptSMField"><label>Start</label><input id="jptSMStart" type="datetime-local"></div>
<div class="jptSMField"><label>End</label><input id="jptSMEnd" type="datetime-local"></div>
<div class="jptSMField"><label>Sort order</label><input id="jptSMSort" type="number" value="0"></div>
</div>
<div class="jptSMField"><label>Selected outlet code (only when Target = Selected)</label><input id="jptSMOutlet" placeholder="JPT-001"></div>
<div class="jptSMField"><label>Image/video preview</label><div id="jptSMPreview" class="jptSMPreview"><div style="height:100%;display:grid;place-items:center;color:#777">Choose media</div></div></div>
<div class="jptSMBtns"><button class="jptSMBtn" id="jptSMZoomOut">Zoom −</button><button class="jptSMBtn" id="jptSMZoomIn">Zoom +</button><button class="jptSMBtn" id="jptSMLeft">←</button><button class="jptSMBtn" id="jptSMRight">→</button><button class="jptSMBtn" id="jptSMUp">↑</button><button class="jptSMBtn" id="jptSMDown">↓</button></div>
<div class="jptSMBtns" style="margin-top:10px"><button class="jptSMBtn gold" id="jptSMSave">Save sponsor</button><button class="jptSMBtn" id="jptSMNew">New sponsor</button></div>
<div id="jptSMList" class="jptSMList"></div>
</div>`;document.body.appendChild(root);
document.getElementById('jptSMClose').onclick=close;document.getElementById('jptSMNew').onclick=reset;
document.getElementById('jptSMFile').onchange=previewFile;
['jptSMZoomOut','jptSMZoomIn','jptSMLeft','jptSMRight','jptSMUp','jptSMDown'].forEach(id=>document.getElementById(id).onclick=()=>{if(id==='jptSMZoomOut')crop.zoom=Math.max(1,crop.zoom-.1);if(id==='jptSMZoomIn')crop.zoom=Math.min(2.5,crop.zoom+.1);if(id==='jptSMLeft')crop.x=Math.max(0,crop.x-5);if(id==='jptSMRight')crop.x=Math.min(100,crop.x+5);if(id==='jptSMUp')crop.y=Math.max(0,crop.y-5);if(id==='jptSMDown')crop.y=Math.min(100,crop.y+5);paintPreview()});
document.getElementById('jptSMSave').onclick=save};
function open(){ui();document.getElementById('jptSponsorMgr').classList.add('open');load()}
function close(){document.getElementById('jptSponsorMgr')?.classList.remove('open')}
function reset(){editId=null;mediaUrl='';mediaType='image';crop={x:50,y:50,zoom:1};['jptSMName','jptSMTitle','jptSMClick','jptSMStart','jptSMEnd','jptSMOutlet'].forEach(id=>document.getElementById(id).value='');document.getElementById('jptSMSort').value='0';document.getElementById('jptSMFile').value='';paintPreview()}
function paintPreview(){const p=document.getElementById('jptSMPreview');if(!p)return;if(!mediaUrl){p.innerHTML='<div style="height:100%;display:grid;place-items:center;color:#777">Choose media</div>';return}p.innerHTML=mediaType==='video'?'<video muted playsinline controls></video>':'<img alt="Preview">';const el=p.querySelector('img,video');el.src=mediaUrl;el.style.setProperty('--z',crop.zoom);el.style.objectPosition=crop.x+'% '+crop.y+'%'}
async function previewFile(e){const f=e.target.files?.[0];if(!f)return;mediaType=f.type.startsWith('video/')?'video':'image';mediaUrl=URL.createObjectURL(f);paintPreview()}
function iso(v){return v?new Date(v).toISOString():null}
async function uploadIfNeeded(){const f=document.getElementById('jptSMFile').files?.[0];if(!f)return mediaUrl;const c=db();if(!c)throw Error('Supabase client unavailable');const ext=(f.name.split('.').pop()||'bin').toLowerCase();const path='campaigns/'+Date.now()+'-'+crypto.randomUUID()+'.'+ext;const up=await c.storage.from(BUCKET).upload(path,f,{upsert:false,contentType:f.type});if(up.error)throw up.error;return c.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}
async function save(){try{const c=db();if(!c)throw Error('Supabase client unavailable');const name=document.getElementById('jptSMName').value.trim();if(!name)throw Error('Sponsor name is required');const newUrl=await uploadIfNeeded();if(!newUrl)throw Error('Media is required for a new sponsor');const target=document.getElementById('jptSMTarget').value;const payload={sponsor_name:name,title:document.getElementById('jptSMTitle').value.trim()||null,media_type:mediaType,media_url:newUrl,poster_url:null,surface:'customer_home',slider_group:'primary',outlet_scope:target,outlet_ids:target==='selected'?[document.getElementById('jptSMOutlet').value.trim()].filter(Boolean):[],sort_order:Number(document.getElementById('jptSMSort').value||0),display_seconds:Number(document.getElementById('jptSMSec').value||10),is_active:true,starts_at:iso(document.getElementById('jptSMStart').value),ends_at:iso(document.getElementById('jptSMEnd').value),click_url:document.getElementById('jptSMClick').value.trim()||null,crop_data:crop,metadata:{manager_version:'v1'}};let r;if(editId){delete payload.media_url;if(newUrl!==mediaUrl)payload.media_url=newUrl;r=await c.from(TABLE).update(payload).eq('id',editId)}else r=await c.from(TABLE).insert(payload);if(r.error)throw r.error;alert('Sponsor saved');reset();load()}catch(e){alert('Sponsor save failed: '+(e.message||e))}}
async function load(){const c=db();if(!c)return;const r=await c.from(TABLE).select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});if(r.error){document.getElementById('jptSMList').innerHTML='<div class="jptSMNotice">Load failed: '+esc(r.error.message)+'</div>';return}rows=r.data||[];renderList()}
function renderList(){const host=document.getElementById('jptSMList');if(!host)return;if(!rows.length){host.innerHTML='<div class="jptSMNotice">No sponsors yet. Create the first sponsor above.</div>';return}host.innerHTML='<h3 style="color:#d8ae42">Saved sponsors</h3>'+rows.map(x=>'<div class="jptSMRow" draggable="true" data-drag="'+esc(x.id)+'" data-drop="'+esc(x.id)+'"><img class="jptSMThumb" src="'+esc(x.media_url)+'"><div class="jptSMMeta"><b>'+esc(x.sponsor_name)+'</b><small>'+esc(x.sponsor_code)+' • '+esc(x.display_seconds)+' sec • '+(x.is_active?'ACTIVE':'OFF')+'</small></div><div class="jptSMBtns"><button class="jptSMBtn" data-edit="'+esc(x.id)+'">Edit</button><button class="jptSMBtn" data-toggle="'+esc(x.id)+'">'+(x.is_active?'Disable':'Enable')+'</button><button class="jptSMBtn red" data-del="'+esc(x.id)+'">Delete</button></div></div>').join('');
host.querySelectorAll('[data-drag]').forEach(b=>b.ondragstart=e=>e.dataTransfer.setData('text/plain',b.dataset.drag));
host.querySelectorAll('[data-drop]').forEach(b=>b.ondragover=e=>e.preventDefault());
host.querySelectorAll('[data-drop]').forEach(b=>b.ondrop=async e=>{e.preventDefault();const from=e.dataTransfer.getData('text/plain'),to=b.dataset.drop;if(!from||from===to)return;const a=rows.find(r=>r.id===from),z=rows.find(r=>r.id===to);if(!a||!z)return;const oldA=a.sort_order,oldZ=z.sort_order;const r1=await db().from(TABLE).update({sort_order:oldZ}).eq('id',a.id);const r2=await db().from(TABLE).update({sort_order:oldA}).eq('id',z.id);if(r1.error||r2.error){alert((r1.error||r2.error).message);return}load()});
host.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));host.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>toggle(b.dataset.toggle));host.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>del(b.dataset.del))}
async function edit(id){const x=rows.find(r=>r.id===id);if(!x)return;editId=id;mediaUrl=x.media_url||'';mediaType=x.media_type||'image';crop=x.crop_data||{x:50,y:50,zoom:1};document.getElementById('jptSMName').value=x.sponsor_name||'';document.getElementById('jptSMTitle').value=x.title||'';document.getElementById('jptSMClick').value=x.click_url||'';document.getElementById('jptSMSec').value=String(x.display_seconds||10);document.getElementById('jptSMTarget').value=x.outlet_scope||'all_live';document.getElementById('jptSMOutlet').value=(x.outlet_ids||[])[0]||'';document.getElementById('jptSMSort').value=x.sort_order||0;document.getElementById('jptSMStart').value=x.starts_at?new Date(x.starts_at).toISOString().slice(0,16):'';document.getElementById('jptSMEnd').value=x.ends_at?new Date(x.ends_at).toISOString().slice(0,16):'';paintPreview()}
async function toggle(id){const c=db();const x=rows.find(r=>r.id===id);if(!c||!x)return;const r=await c.from(TABLE).update({is_active:!x.is_active}).eq('id',id);if(r.error)alert(r.error.message);load()}
function storagePath(url){try{const u=new URL(url);const marker='/storage/v1/object/public/'+BUCKET+'/';const i=u.pathname.indexOf(marker);return i>=0?decodeURIComponent(u.pathname.slice(i+marker.length)):null}catch(e){return null}}
async function del(id){if(!confirm('Delete this sponsor campaign?'))return;const c=db();if(!c)return;const x=rows.find(r=>r.id===id);const r=await c.from(TABLE).delete().eq('id',id);if(r.error){alert('Delete failed: '+r.error.message);return}try{const p=storagePath(x?.media_url);if(p)await c.storage.from(BUCKET).remove([p])}catch(e){}await load();alert('Sponsor deleted')}
function addButton(){if(document.getElementById('jptSponsorOpenBtn'))return;const b=document.createElement('button');b.id='jptSponsorOpenBtn';b.className='btn';b.textContent='Sponsors V1';b.style.cssText='position:fixed;right:12px;bottom:82px;z-index:95;background:#d8ae42;color:#111;font-weight:950';b.onclick=open;document.body.appendChild(b)}
window.JPTSponsorManagerV1={open,load};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addButton);else addButton();
})();