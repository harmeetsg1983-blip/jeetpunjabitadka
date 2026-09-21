/* JPT V108 Master Integration — additive, outlet-scoped */
(function(){
'use strict';
function el(id){return document.getElementById(id)}
function escV(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toastV(s){if(typeof window.toast==='function')window.toast(s);else alert(s)}
function active(){return String(window.activeOutlet||'').trim()}
function inject(){
  const tabs=document.querySelector('.tabs');
  if(tabs&&!document.querySelector('[data-panel="categories"]')){
    const b=document.createElement('button'); b.className='btn'; b.dataset.panel='categories'; b.textContent='Categories'; tabs.appendChild(b);
    b.onclick=()=>showCategories();
  }
  if(!el('categories')){
    const main=document.querySelector('main.shell');
    if(!main)return;
    const sec=document.createElement('section'); sec.id='categories'; sec.className='panel';
    sec.innerHTML='<div class="card"><h3>🏷️ Categories Manager</h3><div class="notice">Categories are scoped to the selected outlet. Renaming a category also updates that outlet\'s menu items.</div><div class="rowactions"><button class="btn gold" id="v108AddCategory">＋ Add Category</button><button class="btn" id="v108RefreshCategories">↻ Refresh</button></div><div id="v108CategoryNotice" class="notice">Loading…</div><div id="v108CategoryList"></div></div>';
    main.appendChild(sec);
    el('v108AddCategory').onclick=()=>editCategory();
    el('v108RefreshCategories').onclick=loadCategories;
  }
  const settings=el('settings');
  if(settings&&!el('v108Logout')){
    const box=document.createElement('div'); box.className='card'; box.style.marginTop='10px';
    box.innerHTML='<h3>Partner Session</h3><p class="muted">Sign out from this Partner Dashboard on this device.</p><button class="btn red" id="v108Logout">Log out</button>';
    settings.appendChild(box);
    el('v108Logout').onclick=logout;
  }
}
function showCategories(){
  if(typeof window.showPanel==='function')window.showPanel('categories');
  loadCategories();
}
async function loadCategories(){
  inject();
  const outlet=active();
  const box=el('v108CategoryList'), note=el('v108CategoryNotice');
  if(!box||!note)return;
  if(!outlet){note.textContent='Select an outlet first.';return}
  note.textContent='Loading categories for '+outlet+'…';
  const r=await window.sb.from('categories').select('id,name,sort_order,is_active').eq('outlet_id',outlet).eq('is_active',true).order('sort_order').order('name');
  if(r.error){note.innerHTML='<span class="danger">'+escV(r.error.message)+'</span>';box.innerHTML='';return}
  const cats=r.data||[];
  const counts={};
  (window.menuItems||[]).forEach(x=>{counts[x.category]=(counts[x.category]||0)+1});
  note.textContent=cats.length+' active categories for '+outlet;
  box.innerHTML=cats.map(c=>'<div class="itemrow"><div class="grow"><b>🏷️ '+escV(c.name)+'</b><div class="muted">'+(counts[c.name]||0)+' menu item(s)</div></div><button class="btn" data-v108-edit="'+escV(c.id)+'">Edit</button><button class="btn red" data-v108-delete="'+escV(c.id)+'">Delete</button></div>').join('')||'<div class="notice">No categories found. Add the first category.</div>';
  box.querySelectorAll('[data-v108-edit]').forEach(b=>b.onclick=()=>editCategory(cats.find(x=>String(x.id)===b.dataset.v108Edit)));
  box.querySelectorAll('[data-v108-delete]').forEach(b=>b.onclick=()=>deleteCategory(cats.find(x=>String(x.id)===b.dataset.v108Delete)));
}
async function editCategory(c){
  inject();
  const name=prompt(c?'Edit category name:':'New category name:',c?.name||'');
  if(name===null)return;
  const clean=name.trim(); if(!clean){toastV('Category name is required.');return}
  const outlet=active(); if(!outlet)return;
  const dup=(await window.sb.from('categories').select('id,name').eq('outlet_id',outlet).eq('is_active',true)).data||[];
  if(dup.some(x=>String(x.name).trim().toLowerCase()===clean.toLowerCase()&&String(x.id)!==String(c?.id||''))){toastV('Category already exists.');return}
  const payload={outlet_id:outlet,name:clean,is_active:true,updated_at:new Date().toISOString()};
  let r;
  if(c?.id) r=await window.sb.from('categories').update(payload).eq('id',c.id).eq('outlet_id',outlet);
  else {
    const mx=(await window.sb.from('categories').select('sort_order').eq('outlet_id',outlet).order('sort_order',{ascending:false}).limit(1)).data?.[0]?.sort_order||0;
    payload.sort_order=Number(mx)+10; r=await window.sb.from('categories').insert(payload);
  }
  if(r.error){toastV('Category save failed: '+r.error.message);return}
  if(c?.id&&c.name!==clean){
    const u=await window.sb.from('menu_items').update({category:clean,updated_at:new Date().toISOString()}).eq('outlet_id',outlet).eq('category',c.name);
    if(u.error){toastV('Category renamed, but menu item mapping update failed: '+u.error.message);return}
  }
  toastV('Category saved.'); await loadCategories(); if(typeof window.loadMenu==='function')await window.loadMenu();
}
async function deleteCategory(c){
  if(!c)return;
  const outlet=active();
  const used=(window.menuItems||[]).some(x=>String(x.category||'')===String(c.name||''));
  if(used){toastV('This category is used by menu items. Move/rename those items first.');return}
  if(!confirm('Delete category '+c.name+'?'))return;
  const r=await window.sb.from('categories').update({is_active:false,updated_at:new Date().toISOString()}).eq('id',c.id).eq('outlet_id',outlet);
  if(r.error){toastV('Category delete failed: '+r.error.message);return}
  toastV('Category deleted.');loadCategories();
}
async function logout(){
  if(!confirm('Log out from Partner Dashboard?'))return;
  try{await window.sb.auth.signOut()}catch(e){toastV('Logout failed: '+e.message);return}
  try{localStorage.removeItem('jpt_admin_outlet')}catch(e){}
  location.reload();
}
window.JPTV108Master={version:'1.0',loadCategories,showCategories,logout};
const boot=()=>{inject(); if(active())loadCategories()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(inject,1200);
})();
