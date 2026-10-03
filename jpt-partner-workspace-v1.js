/* JPT Partner Workspace V1 — Orders/Menu switch + premium menu workspace
   UI-layer only. Preserves existing Supabase/order/menu functions and outlet scope.
*/
(function(){
'use strict';
const GOLD='#d8ae42';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
let menuSearch='',menuCategory='ALL',menuRows=[],menuLoadBusy=false;

function css(){
 if(document.getElementById('jptWorkspaceCSS'))return;
 const s=document.createElement('style');s.id='jptWorkspaceCSS';
 s.textContent=`
/* JPT Partner Workspace */
.jpt-ws-switch{position:sticky;top:74px;z-index:18;display:flex;gap:5px;padding:7px;margin:10px auto 12px;max-width:1100px;background:rgba(13,13,13,.96);border:1px solid #302815;border-radius:16px;box-shadow:0 8px 28px rgba(0,0,0,.32);backdrop-filter:blur(12px)}
.jpt-ws-switch button{flex:1;border:1px solid #353535;background:#151515;color:#aaa;border-radius:12px;padding:11px 10px;font-weight:900;letter-spacing:.3px;cursor:pointer;transition:.18s}
.jpt-ws-switch button.active{background:linear-gradient(135deg,#e7c15a,#b98925);border-color:#e7c15a;color:#111;box-shadow:0 5px 18px rgba(216,174,66,.2)}
.jpt-ws-switch small{display:block;font-size:9px;opacity:.7;margin-top:2px;font-weight:700}
.jpt-ws-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.jpt-ws-title{font-size:20px;font-weight:950;color:#f3d77e}.jpt-ws-sub{font-size:11px;color:#888;margin-top:2px}
.jpt-ws-search{display:flex;gap:8px;margin:8px 0 10px}.jpt-ws-search input{flex:1;background:#101010;color:#fff;border:1px solid #383838;border-radius:12px;padding:12px 13px;outline:none}.jpt-ws-search input:focus{border-color:#d8ae42}
.jpt-ws-chips{display:flex;gap:7px;overflow:auto;padding:2px 1px 10px;scrollbar-width:none}.jpt-ws-chips::-webkit-scrollbar{display:none}
.jpt-ws-chip{white-space:nowrap;border:1px solid #373737;background:#151515;color:#aaa;border-radius:99px;padding:7px 11px;font-size:11px;font-weight:850;cursor:pointer}.jpt-ws-chip.active{background:#d8ae42;color:#111;border-color:#d8ae42}
.jpt-ws-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0 12px}.jpt-ws-stat{padding:10px;border:1px solid #292929;background:linear-gradient(145deg,#141414,#0d0d0d);border-radius:13px}.jpt-ws-stat b{font-size:17px;color:#e3bf55}.jpt-ws-stat span{display:block;font-size:9px;color:#888;margin-top:2px}
#menu .card:first-child{background:linear-gradient(160deg,#15120b,#101010);border-color:#3a301b}
#menuList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
#menuList .itemrow{display:grid;grid-template-columns:76px 1fr;grid-template-rows:auto auto;gap:9px;padding:11px;border:1px solid #2a2a2a;border-radius:15px;background:linear-gradient(145deg,#151515,#0e0e0e);min-width:0}
#menuList .itemrow:hover{border-color:#5c4b22;transform:translateY(-1px)}
#menuList .thumb{width:76px;height:76px;grid-row:1 / span 2;border-radius:12px;border:1px solid #292929}
#menuList .grow{min-width:0}.jpt-menu-name{font-size:14px;font-weight:900}.jpt-menu-price{color:#e2bf58;font-weight:950;margin-top:3px}.jpt-menu-meta{font-size:10px;color:#888;margin-top:3px}
#menuList .rowactions{grid-column:1 / -1;display:grid;grid-template-columns:1fr 1fr;gap:6px}.jpt-menu-status{font-size:9px;font-weight:900;padding:4px 7px;border-radius:99px;border:1px solid #315f3e;color:#7be29a;background:#0b2112;display:inline-block;margin-top:5px}.jpt-menu-status.off{border-color:#643232;color:#ff9898;background:#240d0d}
#menuList .rowactions .btn{width:100%;padding:9px 7px;font-size:11px}
.jpt-menu-empty{grid-column:1/-1;padding:24px;text-align:center;border:1px dashed #393939;border-radius:14px;color:#888}
.jpt-ws-bottom{position:fixed;left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom));z-index:9990;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;padding:6px;background:rgba(13,13,13,.96);border:1px solid #302815;border-radius:17px;box-shadow:0 10px 35px rgba(0,0,0,.55);backdrop-filter:blur(14px)}
.jpt-ws-bottom button{border:0;background:transparent;color:#8e8e8e;border-radius:12px;padding:7px 3px;font-size:9px;font-weight:850;cursor:pointer}.jpt-ws-bottom button b{display:block;font-size:17px;line-height:18px;margin-bottom:2px}.jpt-ws-bottom button.active{background:#241d0c;color:#e1bd55}
.jpt-more-drawer{position:fixed;left:10px;right:10px;bottom:78px;z-index:9989;display:none;background:#111;border:1px solid #40351e;border-radius:17px;padding:10px;box-shadow:0 15px 50px #000}.jpt-more-drawer.show{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.jpt-more-drawer button{background:#181818;color:#ddd;border:1px solid #303030;border-radius:11px;padding:11px 5px;font-size:10px;font-weight:800}.jpt-more-drawer button span{display:block;font-size:17px;margin-bottom:3px}
.jpt-workspace-hidden{display:none!important}
@media(max-width:760px){.jpt-ws-switch{top:64px;margin:8px 10px 10px}.jpt-ws-switch button{padding:10px 6px}.jpt-ws-bottom{left:6px;right:6px}.jpt-more-drawer{left:6px;right:6px;bottom:74px}#menuList{grid-template-columns:1fr}.jpt-ws-stats{grid-template-columns:repeat(3,1fr)}}
@media(min-width:761px){.jpt-ws-bottom{left:50%;right:auto;width:min(760px,calc(100% - 24px));transform:translateX(-50%)}.jpt-more-drawer{left:50%;right:auto;width:min(760px,calc(100% - 24px));transform:translateX(-50%)}}
`;
 document.head.appendChild(s);
}

function makeSwitch(){
 if(document.getElementById('jptWorkspaceSwitch'))return;
 const tabs=document.querySelector('.tabs');
 if(!tabs)return;
 const nav=document.createElement('div');nav.id='jptWorkspaceSwitch';nav.className='jpt-ws-switch';
 nav.innerHTML='<button data-ws="orders" class="active">📦 ORDERS<small>Live order flow</small></button><button data-ws="menu">🍽️ MENU<small>Menu card manager</small></button>';
 tabs.parentNode.insertBefore(nav,tabs);
 nav.querySelectorAll('button').forEach(b=>b.onclick=()=>openWorkspace(b.dataset.ws));
}

function makeBottom(){
 if(document.getElementById('jptWorkspaceBottom'))return;
 const b=document.createElement('nav');b.id='jptWorkspaceBottom';b.className='jpt-ws-bottom';
 b.innerHTML='<button data-go="orders" class="active"><b>▣</b>Orders</button><button data-go="menu"><b>☷</b>Menu</button><button data-go="offers"><b>✦</b>Offers</button><button data-go="campaigns"><b>▣</b>Campaigns</button><button data-go="more"><b>•••</b>More</button>';
 document.body.appendChild(b);
 b.querySelectorAll('button').forEach(x=>x.onclick=()=>{if(x.dataset.go==='more'){toggleMore();return}openPanel(x.dataset.go)});
 const d=document.createElement('div');d.id='jptMoreDrawer';d.className='jpt-more-drawer';
 d.innerHTML='<button data-go="categories"><span>▤</span>Categories</button><button data-go="images"><span>▧</span>Images</button><button data-go="today"><span>🔥</span>Today Offer</button><button data-go="finance"><span>₹</span>Finance</button><button data-go="reports"><span>▥</span>Reports</button><button data-go="settings"><span>⚙</span>Settings</button>';
 document.body.appendChild(d);
 d.querySelectorAll('button').forEach(x=>x.onclick=()=>{openPanel(x.dataset.go);d.classList.remove('show')});
}

function toggleMore(){document.getElementById('jptMoreDrawer')?.classList.toggle('show')}

function setSwitch(id){
 document.querySelectorAll('#jptWorkspaceSwitch button').forEach(b=>b.classList.toggle('active',b.dataset.ws===id));
 document.querySelectorAll('#jptWorkspaceBottom button').forEach(b=>b.classList.toggle('active',b.dataset.go===id));
}

function openPanel(id){
 try{window.showPanel?.(id)}catch(e){
   document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===id));
 }
 setSwitch(id==='menu'?'menu':'orders');
 if(id==='menu')decorateMenu();
}

function openWorkspace(id){openPanel(id)}

function decorateMenu(){
 const panel=document.getElementById('menu');if(!panel)return;
 if(!document.getElementById('jptMenuTools')){
   const host=panel.querySelector('.card');if(!host)return;
   const tools=document.createElement('div');tools.id='jptMenuTools';
   tools.innerHTML='<div class="jpt-ws-head"><div><div class="jpt-ws-title">Menu Card</div><div class="jpt-ws-sub">Outlet-scoped • Live customer menu controls</div></div><button class="btn" id="jptMenuBack">← Orders</button></div><div class="jpt-ws-search"><input id="jptMenuSearch" placeholder="Search dishes, categories…"><button class="btn" id="jptMenuClear">Clear</button></div><div id="jptMenuStats" class="jpt-ws-stats"></div><div id="jptMenuChips" class="jpt-ws-chips"></div>';
   host.insertBefore(tools,host.firstChild);
   document.getElementById('jptMenuBack').onclick=()=>openPanel('orders');
   document.getElementById('jptMenuClear').onclick=()=>{const i=document.getElementById('jptMenuSearch');i.value='';menuSearch='';renderMenuView()};
   document.getElementById('jptMenuSearch').oninput=e=>{menuSearch=e.target.value.toLowerCase().trim();renderMenuView()};
 }
 renderMenuView();
}

function renderMenuView(){
 const items=menuRows;
 const chips=document.getElementById('jptMenuChips'),stats=document.getElementById('jptMenuStats'),list=document.getElementById('menuList');
 if(!chips||!stats||!list)return;
 const cats=['ALL',...Array.from(new Set(items.map(x=>String(x.category||'Uncategorised').trim()||'Uncategorised')))];
 if(!cats.includes(menuCategory))menuCategory='ALL';
 chips.innerHTML=cats.map(c=>'<button class="jpt-ws-chip '+(c===menuCategory?'active':'')+'" data-cat="'+esc(c)+'">'+esc(c)+'</button>').join('');
 chips.querySelectorAll('button').forEach(b=>b.onclick=()=>{menuCategory=b.dataset.cat;renderMenuView()});
 const filtered=items.filter(x=>{
   const text=(String(x.name||'')+' '+String(x.category||'')+' '+String(x.description||'')).toLowerCase();
   return (menuCategory==='ALL'||String(x.category||'Uncategorised')===menuCategory)&&(!menuSearch||text.includes(menuSearch));
 });
 const on=items.filter(x=>x.available!==false).length,off=items.length-on,featured=items.filter(x=>x.featured===true).length;
 stats.innerHTML='<div class="jpt-ws-stat"><b>'+items.length+'</b><span>Total dishes</span></div><div class="jpt-ws-stat"><b>'+on+'</b><span>Available</span></div><div class="jpt-ws-stat"><b>'+featured+'</b><span>Featured</span></div>';
 list.innerHTML=filtered.length?filtered.map(x=>{
   const id=esc(x.id),name=esc(x.name||'Unnamed dish'),cat=esc(x.category||'Uncategorised'),img=x.image_url;
   return '<div class="itemrow">'+(img?'<img class="thumb" src="'+esc(img)+'" alt="">':'<div class="thumb" style="display:grid;place-items:center;color:#666;font-size:10px">NO PHOTO</div>')+
   '<div class="grow"><div class="jpt-menu-name">'+name+'</div><div class="jpt-menu-price">'+money(x.price)+'</div><div class="jpt-menu-meta">'+cat+(x.featured?' • ★ Featured':'')+'</div><span class="jpt-menu-status '+(x.available===false?'off':'')+'">'+(x.available===false?'OFFLINE':'LIVE')+'</span></div>'+
   '<div class="rowactions"><button class="btn" data-edit="'+id+'">Edit</button><button class="btn '+(x.available===false?'green':'red')+'" data-toggle="'+id+'">'+(x.available===false?'Turn ON':'Turn OFF')+'</button></div></div>';
 }).join(''):'<div class="jpt-menu-empty">No dishes match this search/category.</div>';
 list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>window.editItem?.(b.dataset.edit));
 list.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>window.toggleItem?.(b.dataset.toggle));
}

async function loadWorkspaceMenu(){
 if(menuLoadBusy)return;
 const sb=window.sb, outlet=document.getElementById('outletSelect')?.value||'';
 if(!sb||!outlet)return;
 menuLoadBusy=true;
 try{
   const r=await sb.from('menu_items').select('*').eq('outlet_id',outlet).order('sort_order').order('name');
   if(r.error)throw r.error;
   menuRows=(r.data||[]).filter(x=>x.is_deleted!==true);
   const ir=await sb.from('menu_item_images').select('menu_item_id,item_name,image_url').eq('outlet_id',outlet);
   const map={};if(!ir.error)(ir.data||[]).forEach(v=>map[v.menu_item_id||v.item_name]=v.image_url);
   menuRows.forEach(x=>x.image_url=map[x.id]||x.image_url||'');
   renderMenuView();
 }catch(e){
   const list=document.getElementById('menuList');
   if(list)list.innerHTML='<div class="jpt-menu-empty">'+esc(e?.message||'Menu could not be loaded')+'</div>';
 }finally{menuLoadBusy=false}
}
function patchLoadMenu(){
 if(window.__jptWorkspaceLoadMenuPatched||typeof window.loadMenu!=='function')return;
 window.__jptWorkspaceLoadMenuPatched=true;
 const original=window.loadMenu;
 window.loadMenu=async function(){const r=await original.apply(this,arguments);await loadWorkspaceMenu();return r};
}

function patchShowPanel(){
 if(window.__jptWorkspaceShowPatched||typeof window.showPanel!=='function')return;
 window.__jptWorkspaceShowPatched=true;
 const original=window.showPanel;
 window.showPanel=function(id){const r=original.apply(this,arguments);setSwitch(id==='menu'?'menu':'orders');if(id==='menu')setTimeout(decorateMenu,0);return r};
}

function boot(){
 css();makeSwitch();makeBottom();patchShowPanel();patchLoadMenu();decorateMenu();loadWorkspaceMenu();
 try{window.addEventListener('jpt:menu-refreshed',renderMenuView)}catch(e){}
}
let tries=0;const t=setInterval(()=>{tries++;if(document.getElementById('menu')&&document.getElementById('orders')){boot();clearInterval(t)}if(tries>80)clearInterval(t)},250);
window.JPTPartnerWorkspaceV1={openWorkspace,openPanel,refresh:renderMenuView};
})();
