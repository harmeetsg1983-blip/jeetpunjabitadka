/* JPT — RESTAURANT PARTNER PRO MENU + SIDE MENU V1
   UI/function layer only. Reuses existing dashboard functions and Supabase data.
*/
(function(){
'use strict';
if(window.__JPT_PARTNER_PRO_MENU__) return;
window.__JPT_PARTNER_PRO_MENU__=true;

const escLocal=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const moneyLocal=v=>'₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});
let menuFilter='all';
let menuSearch='';

function go(panel){
  if(typeof window.showPanel==='function') window.showPanel(panel);
  document.querySelectorAll('.jpt-side-link').forEach(x=>x.classList.toggle('active',x.dataset.panel===panel));
  const bottom=document.querySelectorAll('.jpt-bottom-item');
  bottom.forEach(x=>x.classList.toggle('is-active',x.dataset.bottomPanel===panel));
  window.scrollTo({top:0,behavior:'smooth'});
  closeSide();
}

function ensureHeader(){
  const header=document.querySelector('.top');
  if(!header) return;
  const brand=header.querySelector('.brandrow');
  if(!brand) return;
  const controls=header.querySelector('.controls');
  if(brand.querySelector('#jptMenuOpen')) return;

  const tools=document.createElement('div');
  tools.className='jpt-header-tools';
  tools.innerHTML='<button id="jptMenuOpen" class="jpt-icon-btn" aria-label="Open menu">☰</button>'+
    '<button id="jptNotificationOpen" class="jpt-icon-btn" aria-label="Open orders">🔔<span id="jptNotifDot"></span></button>';
  brand.insertBefore(tools,brand.firstChild);

  document.getElementById('jptMenuOpen').onclick=()=>document.getElementById('jptSideMenu')?.classList.add('open');
  document.getElementById('jptNotificationOpen').onclick=()=>go('orders');
  if(controls) controls.style.display='none';
}

function ensureSide(){
  if(document.getElementById('jptSideMenu')) return;
  const el=document.createElement('aside');
  el.id='jptSideMenu';
  el.className='jpt-side-menu';
  el.innerHTML='<div class="jpt-side-panel">'+
    '<div class="jpt-side-head"><div><div class="jpt-side-title">Jeet Punjabi Tadka</div><div class="jpt-side-sub">Restaurant Partner</div></div><button id="jptSideClose" class="jpt-icon-btn">✕</button></div>'+
    '<nav class="jpt-side-links">'+
    [['home','⌂','Home'],['orders','▣','Orders'],['menu','☷','Menu Management'],['categories','▤','Categories'],['images','▧','Images'],['offers','%','Offers'],['campaigns','◈','Campaigns'],['finance','₹','Finance'],['reports','▥','Reports'],['settings','⚙','Settings']].map(x=>'<button class="jpt-side-link" data-panel="'+x[0]+'"><span>'+x[1]+'</span><b>'+x[2]+'</b></button>').join('')+
    '<div class="jpt-side-divider"></div><button class="jpt-side-link jpt-back-dashboard" data-panel="home"><span>←</span><b>Back to Dashboard</b></button>'+
    '</nav></div>';
  document.body.appendChild(el);
  document.getElementById('jptSideClose').onclick=closeSide;
  el.addEventListener('click',e=>{if(e.target===el)closeSide()});
  el.querySelectorAll('.jpt-side-link').forEach(b=>b.onclick=()=>go(b.dataset.panel));
}
function closeSide(){document.getElementById('jptSideMenu')?.classList.remove('open')}

function menuCategories(){
  const names=[...new Set((typeof menuItems!=='undefined'?menuItems:[]).map(x=>String(x.category||'').trim()).filter(Boolean))];
  return names.sort((a,b)=>a.localeCompare(b));
}

function renderMenuPro(){
  const panel=document.getElementById('menu');
  const list=document.getElementById('menuList');
  if(!panel||!list||typeof menuItems==='undefined') return;
  const categories=menuCategories();
  const filtered=menuItems.filter(item=>{
    const q=menuSearch.toLowerCase();
    const matchQ=!q||String(item.name||'').toLowerCase().includes(q)||String(item.category||'').toLowerCase().includes(q);
    const matchC=menuFilter==='all'||String(item.category||'').trim()===menuFilter;
    return matchQ&&matchC;
  });

  list.innerHTML=filtered.map(item=>{
    const image=item.image_url||'';
    const on=item.available!==false;
    return '<article class="jpt-menu-pro-card" data-menu-category="'+escLocal(item.category||'')+'">'+
      '<div class="jpt-menu-image-wrap">'+(image?'<img class="jpt-menu-pro-image" src="'+escLocal(image)+'" alt="">':'<div class="jpt-menu-pro-image jpt-no-image">IMAGE</div>')+
      '<label class="jpt-image-overlay">CHANGE IMAGE<input class="jpt-image-input" data-id="'+escLocal(item.id)+'" type="file" accept="image/*" hidden></label></div>'+
      '<div class="jpt-menu-pro-main"><div class="jpt-menu-pro-name">'+escLocal(item.name||'Unnamed Item')+'</div>'+
      '<div class="jpt-menu-pro-cat">'+escLocal(item.category||'Uncategorised')+'</div>'+
      '<div class="jpt-menu-pro-price">'+moneyLocal(item.price)+'</div></div>'+
      '<div class="jpt-menu-pro-actions">'+
      '<button class="jpt-menu-action" data-image="'+escLocal(item.id)+'">IMAGE</button>'+
      '<button class="jpt-menu-action" data-price="'+escLocal(item.id)+'">PRICE</button>'+
      '<button class="jpt-menu-action" data-edit="'+escLocal(item.id)+'">EDIT</button>'+
      '<button class="jpt-menu-action '+(on?'is-on':'is-off')+'" data-toggle="'+escLocal(item.id)+'">'+(on?'ON':'OFF')+'</button>'+
      '</div></article>';
  }).join('')||'<div class="jpt-menu-empty">No menu items match this search/filter.</div>';

  list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>window.editItem?.(b.dataset.edit));
  list.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{await window.toggleItem?.(b.dataset.toggle);renderMenuPro()});
  list.querySelectorAll('[data-price]').forEach(b=>b.onclick=async()=>{
    const item=menuItems.find(x=>String(x.id)===String(b.dataset.price)); if(!item)return;
    const value=prompt('Update price for '+item.name,String(Number(item.price||0)));
    if(value===null)return;
    const price=Number(value);
    if(!Number.isFinite(price)||price<0){alert('Enter a valid price.');return}
    const r=await window.sb.from('menu_items').update({price,updated_at:new Date().toISOString()}).eq('id',item.id).eq('outlet_id',activeOutlet);
    if(r.error){alert('Price update failed: '+r.error.message);return}
    item.price=price;renderMenuPro();
  });
  list.querySelectorAll('.jpt-image-input').forEach(inp=>inp.onchange=async()=>{
    const item=menuItems.find(x=>String(x.id)===String(inp.dataset.id)); const file=inp.files?.[0];
    if(!item||!file)return;
    if(typeof window.openCropper==='function'&&typeof window.saveImageForItem==='function'){
      window.openCropper(file,async cropped=>{await window.saveImageForItem(item,cropped);renderMenuPro()});
    }else if(typeof window.saveImageForItem==='function'){
      await window.saveImageForItem(item,file);renderMenuPro();
    }
  });
  list.querySelectorAll('[data-image]').forEach(b=>b.onclick=()=>{
    list.querySelector('.jpt-image-input[data-id="'+CSS.escape(b.dataset.image)+'"]')?.click();
  });
  const count=document.getElementById('jptMenuResultCount');
  if(count)count.textContent=filtered.length+' items';
  const chips=document.querySelectorAll('.jpt-menu-category-chip');
  chips.forEach(c=>c.classList.toggle('active',c.dataset.category===menuFilter));
}

function setupMenu(){
  const panel=document.getElementById('menu');
  const card=panel?.querySelector('.card');
  if(!card||document.getElementById('jptMenuProTools'))return;
  const oldControls=card.querySelector('.rowactions');
  if(oldControls)oldControls.style.display='none';
  const tools=document.createElement('div');
  tools.id='jptMenuProTools';
  tools.innerHTML='<div class="jpt-menu-pro-title-row"><div><h2>Menu Management</h2><span id="jptMenuResultCount">0 items</span></div><button id="jptMenuAdd" class="jpt-add-item">+ ADD ITEM</button></div>'+
    '<div class="jpt-menu-search"><span>⌕</span><input id="jptMenuSearchInput" placeholder="Search item..." autocomplete="off"></div>'+
    '<div id="jptMenuCategories" class="jpt-menu-category-bar"><button class="jpt-menu-category-chip active" data-category="all">ALL</button></div>';
  const notice=document.getElementById('menuNotice');
  card.insertBefore(tools,notice);
  document.getElementById('jptMenuSearchInput').oninput=e=>{menuSearch=e.target.value;renderMenuPro()};
  document.getElementById('jptMenuAdd').onclick=()=>window.addItem?.();
  const refreshCats=()=>{
    const bar=document.getElementById('jptMenuCategories');
    if(!bar)return;
    bar.innerHTML='<button class="jpt-menu-category-chip '+(menuFilter==='all'?'active':'')+'" data-category="all">ALL</button>'+
      menuCategories().map(c=>'<button class="jpt-menu-category-chip '+(menuFilter===c?'active':'')+'" data-category="'+escLocal(c)+'">'+escLocal(c.toUpperCase())+'</button>').join('');
    bar.querySelectorAll('button').forEach(b=>b.onclick=()=>{menuFilter=b.dataset.category;renderMenuPro()});
  };
  window.__JPTRefreshMenuPro=()=>{refreshCats();renderMenuPro()};
  refreshCats();
}

function patchMenuLoader(){
  const original=window.loadMenu;
  if(typeof original!=='function'||original.__jptProWrapped)return;
  const wrapped=async function(){
    const r=await original.apply(this,arguments);
    setupMenu();
    window.__JPTRefreshMenuPro?.();
    return r;
  };
  wrapped.__jptProWrapped=true;
  window.loadMenu=wrapped;
}

function init(){
  ensureHeader();ensureSide();setupMenu();patchMenuLoader();
  setTimeout(()=>{setupMenu();window.__JPTRefreshMenuPro?.()},700);
  setTimeout(()=>{setupMenu();window.__JPTRefreshMenuPro?.()},1800);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
