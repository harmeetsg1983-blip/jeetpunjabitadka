/* JPT V108 Management Module v2 — current-V107 compatible candidate */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>String(v??'').trim().replace(/\s+/g,' ').toLowerCase();
const activeOutlet=()=>String($('outletSelect')?.value||localStorage.getItem('jpt_admin_outlet')||'').trim();
async function authorizedOutlets(){
 const b=window.JPTPartnerAccess;
 if(b&&typeof b.getOutlets==='function'){try{const r=await b.getOutlets();if(Array.isArray(r))return r;}catch(e){}}
 if(window.sb?.rpc){const {data,error}=await window.sb.rpc('partner_my_outlets');if(!error&&Array.isArray(data))return data;}
 return [];
}
function hasAccess(oid,rows){return rows.some(r=>String(r.outlet_id??r.id??'').trim()===String(oid).trim() && ['manage','admin','owner'].includes(String(r.access_level??r.role??'').toLowerCase()));}
function notice(msg){const n=$('jptMgmtNotice');if(n)n.textContent=msg;if(typeof window.toast==='function')try{window.toast(msg)}catch(e){}}
function ensureManagementUI(){
 if($('management'))return;
 const tabs=document.querySelector('.tabs');const anchor=tabs?.querySelector('[data-panel="settings"]')||tabs?.lastElementChild;
 if(tabs){const b=document.createElement('button');b.type='button';b.className='btn';b.dataset.panel='management';b.textContent='Management';b.onclick=()=>{if(typeof window.showPanel==='function')window.showPanel('management');};if(anchor)anchor.insertAdjacentElement('beforebegin',b);else tabs.appendChild(b);}
 const settings=$('settings');const panel=document.createElement('section');panel.id='management';panel.className='panel';
 panel.innerHTML=`<div class="card" style="margin-bottom:14px"><div style="font-weight:800;font-size:18px">Outlet Management</div><div id="jptMgmtNotice" class="muted" style="margin-top:6px">Manage categories and import the official menu without changing outlet online/offline status.</div></div>
 <div class="card" style="margin-bottom:14px"><div style="font-weight:800;margin-bottom:10px">Categories</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><input id="jptCatName" placeholder="Category name" style="flex:1;min-width:180px"><button id="jptCatAdd" class="btn">Add Category</button><button id="jptCatRefresh" class="btn">Refresh</button></div><div id="jptCatList"></div></div>
 <div class="card" style="margin-bottom:14px"><div style="font-weight:800;margin-bottom:8px">Official Menu Import</div><div class="muted" style="margin-bottom:10px">Only missing dishes/categories are inserted. Existing dishes are not overwritten or deleted. Outlet status is never changed by import.</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="jptImportCurrent" class="btn">Import Current Outlet Menu</button><button id="jptImportAll" class="btn">Import All Authorized Outlet Menus</button></div><pre id="jptImportProgress" style="white-space:pre-wrap;margin-top:10px"></pre></div>
 <div class="card"><div style="font-weight:800;margin-bottom:8px">Session</div><button id="jptMgmtLogout" class="btn">Logout</button></div>`;
 if(settings?.parentNode)settings.parentNode.insertBefore(panel,settings.nextSibling);else document.body.appendChild(panel);
 $('jptCatAdd').onclick=addCategory;$('jptCatRefresh').onclick=loadCategories;$('jptImportCurrent').onclick=()=>importMenu(false);$('jptImportAll').onclick=()=>importMenu(true);$('jptMgmtLogout').onclick=logout;
}
async function loadCategories(){
 ensureManagementUI();const oid=activeOutlet();if(!oid){$('jptCatList').innerHTML='<div class="muted">Select an outlet first.</div>';return;}
 const {data,error}=await window.sb.from('categories').select('id,name,sort_order,is_active').eq('outlet_id',oid).order('sort_order',{ascending:true}).order('name',{ascending:true});
 if(error){$('jptCatList').textContent='Category load failed: '+error.message;return;}const rows=data||[];
 $('jptCatList').innerHTML=rows.length?rows.map(r=>`<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)"><div><b>${esc(r.name)}</b><span class="muted"> · ${r.is_active===false?'OFF':'ON'}</span></div><div style="display:flex;gap:6px"><button class="btn" data-cat-edit="${esc(r.id)}">Edit</button><button class="btn" data-cat-toggle="${esc(r.id)}">${r.is_active===false?'Activate':'Deactivate'}</button></div></div>`).join(''):'<div class="muted">No categories for this outlet.</div>';
 rows.forEach(r=>{document.querySelector(`[data-cat-edit="${CSS.escape(String(r.id))}"]`)?.addEventListener('click',()=>editCategory(r));document.querySelector(`[data-cat-toggle="${CSS.escape(String(r.id))}"]`)?.addEventListener('click',()=>toggleCategory(r));});
}
async function addCategory(){
 const oid=activeOutlet(),input=$('jptCatName'),name=String(input?.value||'').trim();if(!oid||!name){notice('Enter a category name.');return;}
 const {data:existing,error:e}=await window.sb.from('categories').select('id,name').eq('outlet_id',oid).ilike('name',name);if(e){notice(e.message);return;}if((existing||[]).some(x=>norm(x.name)===norm(name))){notice('Category already exists.');return;}
 const {data:rows}=await window.sb.from('categories').select('sort_order').eq('outlet_id',oid).order('sort_order',{ascending:false}).limit(1);const next=(Number(rows?.[0]?.sort_order)||0)+10;
 const {error}=await window.sb.from('categories').insert({outlet_id:oid,name,sort_order:next,is_active:true});if(error){notice(error.message);return;}input.value='';notice('Category added.');await loadCategories();if(typeof window.loadMenu==='function')window.loadMenu();
}
async function editCategory(r){
 const oid=activeOutlet(),next=prompt('Category name',r.name);if(next===null)return;const name=String(next).trim();if(!name)return;
 const {data:existing}=await window.sb.from('categories').select('id,name').eq('outlet_id',oid).ilike('name',name);if((existing||[]).some(x=>String(x.id)!==String(r.id)&&norm(x.name)===norm(name))){notice('Category already exists.');return;}
 const {error}=await window.sb.from('categories').update({name}).eq('id',r.id).eq('outlet_id',oid);if(error){notice(error.message);return;}
 const {error:me}=await window.sb.from('menu_items').update({category:name}).eq('outlet_id',oid).eq('category',r.name);if(me){notice('Category renamed, but menu-item category update failed: '+me.message);return;}notice('Category renamed.');await loadCategories();if(typeof window.loadMenu==='function')window.loadMenu();
}
async function toggleCategory(r){
 const oid=activeOutlet();if(r.is_active!==false){const {count,error}=await window.sb.from('menu_items').select('id',{count:'exact',head:true}).eq('outlet_id',oid).eq('category',r.name).eq('is_active',true);if(error){notice(error.message);return;}if((count||0)>0){notice('Cannot deactivate a category that is still used by active menu items.');return;}}
 const {error}=await window.sb.from('categories').update({is_active:r.is_active===false}).eq('id',r.id).eq('outlet_id',oid);if(error){notice(error.message);return;}notice(r.is_active===false?'Category activated.':'Category deactivated.');await loadCategories();
}
function rowsFor(oid){const d=window.JPT_OFFICIAL_MENU_DATA||{};return Array.isArray(d[oid])?d[oid]:[];}
const rowName=r=>String(r.name??r.item_name??r.dish_name??'').trim();const rowCategory=r=>String(r.category??r.category_name??'Uncategorized').trim()||'Uncategorized';const rowPrice=r=>Number(r.price??r.selling_price??r.amount??0);
async function ensureCategories(oid,rows){
 const names=[...new Set(rows.map(rowCategory).filter(Boolean))];if(!names.length)return 0;const {data:existing,error}=await window.sb.from('categories').select('id,name').eq('outlet_id',oid);if(error)throw error;const have=new Set((existing||[]).map(x=>norm(x.name)));const {data:all}=await window.sb.from('categories').select('sort_order').eq('outlet_id',oid).order('sort_order',{ascending:false}).limit(1);let next=Number(all?.[0]?.sort_order)||0;const add=names.filter(n=>!have.has(norm(n))).map(name=>({outlet_id:oid,name,sort_order:(next+=10),is_active:true}));if(add.length){const {error:e}=await window.sb.from('categories').insert(add);if(e)throw e;}return add.length;
}
async function importOutlet(oid,progress){
 const rows=rowsFor(oid);if(!rows.length){progress(`• ${oid}: no official rows found`);return {added:0,categories:0};}const cats=await ensureCategories(oid,rows);const {data:existing,error}=await window.sb.from('menu_items').select('id,name,category,price').eq('outlet_id',oid);if(error)throw error;const keys=new Set((existing||[]).map(x=>norm(`${x.name}|${x.category}|${Number(x.price)}`)));const missing=[];
 for(const r of rows){const name=rowName(r),category=rowCategory(r),price=rowPrice(r);if(!name||!Number.isFinite(price))continue;const key=norm(`${name}|${category}|${price}`);if(keys.has(key))continue;missing.push({outlet_id:oid,name,category,price,description:String(r.description??'').trim(),is_active:r.is_active===false?false:true});keys.add(key);}
 for(let i=0;i<missing.length;i+=50){const batch=missing.slice(i,i+50);const {error:e}=await window.sb.from('menu_items').insert(batch);if(e)throw e;progress(`  inserted ${Math.min(i+50,missing.length)}/${missing.length}`);}progress(`• ${oid}: categories +${cats}, dishes +${missing.length}`);return {added:missing.length,categories:cats};
}
async function importMenu(all){
 ensureManagementUI();const out=$('jptImportProgress'),progress=s=>{out.textContent+=(out.textContent?'\n':'')+s;};out.textContent='';const rows=await authorizedOutlets();const current=activeOutlet();const ids=all?rows.filter(r=>['manage','admin','owner'].includes(String(r.access_level??r.role??'').toLowerCase())).map(r=>String(r.outlet_id??r.id??'').trim()).filter(Boolean):[current];if(!ids[0]){notice('Select an outlet first.');return;}if(!all&&!hasAccess(current,rows)){notice('You are not authorized for this outlet.');return;}const data=window.JPT_OFFICIAL_MENU_DATA||{};const allowed=ids.filter(oid=>Object.prototype.hasOwnProperty.call(data,oid));if(!allowed.length){notice('No official menu data is available for the authorized outlet(s).');return;}notice(all?'Importing all authorized outlet menus…':'Importing current outlet menu…');for(const oid of allowed){try{await importOutlet(oid,progress);}catch(e){progress(`• ${oid}: ERROR — ${e.message||e}`);}}notice('Import finished. Existing dishes were not overwritten or deleted.');if(typeof window.loadMenu==='function')await window.loadMenu();await loadCategories();
}
async function logout(){try{if(typeof window.stopOrderAlarm==='function')window.stopOrderAlarm();if(window.orderChannel&&window.sb?.removeChannel)await window.sb.removeChannel(window.orderChannel);if(window.sb?.auth)await window.sb.auth.signOut();}finally{location.reload();}}
ensureManagementUI();window.JPTV108Management={loadCategories,importMenu,importOutletMenu:importOutlet,logout,ensureManagementUI};
})();
