(function(){
'use strict';
if(window.__JPT_CENTRAL_MENU_PRO_UI__) return;
window.__JPT_CENTRAL_MENU_PRO_UI__=true;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});

function sb(){return window.sb||window.supabaseClient||null}
function outlet(){return document.getElementById('jptCentralMenuPro')?.querySelector('#cmOutlet')?.value||document.getElementById('outletSelect')?.value||window.activeOutlet||localStorage.getItem('jpt_admin_outlet')||''}

function css(){
 if(document.getElementById('jptCentralMenuProCss'))return;
 const s=document.createElement('style');s.id='jptCentralMenuProCss';
 s.textContent=[
 '#jptCentralMenuPro{background:#090909;color:#fff;border:1px solid #2a2a2a;border-radius:22px;padding:16px;box-shadow:0 18px 55px #0008}',
 '#jptCentralMenuPro .cm-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}',
 '#jptCentralMenuPro .cm-back{background:#171717;color:#fff;border:1px solid #444;border-radius:10px;padding:9px 12px;font-weight:900}',
 '#jptCentralMenuPro .cm-title{flex:1}.cm-title h2{margin:0;color:#f4d77a;font-size:22px}.cm-title p{margin:4px 0;color:#999;font-size:12px}',
 '#jptCentralMenuPro .cm-outlet{border:1px solid #6b5320;border-radius:12px;padding:9px 12px;background:#151515;color:#f4d77a;font-weight:900;min-width:150px}',
 '#jptCentralMenuPro .cm-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:15px 0}',
 '#jptCentralMenuPro .cm-action{padding:12px;border-radius:12px;border:1px solid #333;background:#141414;color:#eee;font-weight:900}',
 '#jptCentralMenuPro .cm-action.primary{background:linear-gradient(135deg,#f4d77a,#c69229);color:#111;border:0}',
 '#jptCentralMenuPro .cm-search{width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #4a4a4a;border-radius:13px;padding:13px 15px;font-size:15px}',
 '#jptCentralMenuPro .cm-filters{display:flex;gap:8px;overflow:auto;padding:11px 0 5px}',
 '#jptCentralMenuPro .cm-filter{white-space:nowrap;background:#202020;color:#ddd;border:1px solid #333;border-radius:999px;padding:9px 13px;font-weight:800}',
 '#jptCentralMenuPro .cm-filter.on{background:#f4d77a;color:#111;border-color:#f4d77a}',
 '#jptCentralMenuPro .cm-meta{display:flex;justify-content:space-between;align-items:center;margin:12px 0;color:#aaa;font-size:12px}',
 '#jptCentralMenuPro .cm-cats{display:flex;gap:8px;overflow:auto;padding-bottom:8px}',
 '#jptCentralMenuPro .cm-cat{white-space:nowrap;background:#151515;border:1px solid #3b3b3b;color:#ddd;border-radius:10px;padding:8px 11px;font-weight:800}',
 '#jptCentralMenuPro .cm-cat.active{border-color:#d4af37;color:#f4d77a}',
 '#jptCentralMenuPro .cm-list{display:grid;gap:10px}',
 '#jptCentralMenuPro .cm-card{display:grid;grid-template-columns:86px 1fr auto;gap:12px;align-items:center;padding:11px;border:1px solid #292929;border-radius:15px;background:#111}',
 '#jptCentralMenuPro .cm-card:hover{border-color:#d4af3766}',
 '#jptCentralMenuPro .cm-img{width:86px;height:76px;border-radius:11px;object-fit:cover;background:#202020;display:grid;place-items:center;color:#777}',
 '#jptCentralMenuPro .cm-name{font-size:15px;font-weight:900}.cm-sub{font-size:11px;color:#999;margin-top:4px}.cm-price{color:#f4d77a;font-weight:900;margin-top:5px}',
 '#jptCentralMenuPro .cm-status{display:inline-block;font-size:10px;font-weight:900;border-radius:999px;padding:4px 7px;margin-top:6px}',
 '#jptCentralMenuPro .cm-status.on{background:#0c2a1a;color:#8ff0b0}.cm-status.off{background:#321313;color:#ffaaaa}.cm-status.img{background:#30270d;color:#f4d77a}',
 '#jptCentralMenuPro .cm-card-actions{display:flex;gap:7px;flex-direction:column}.cm-btn{background:#171717;color:#eee;border:1px solid #444;border-radius:9px;padding:8px 10px;font-weight:800}.cm-btn.gold{color:#f4d77a;border-color:#80631f}',
 '#jptCentralMenuPro .cm-drawer{position:fixed;inset:0;background:#0009;z-index:99999;display:flex;justify-content:flex-end}.cm-drawer>div{width:min(390px,92vw);height:100%;background:#111;border-left:1px solid #3b301b;padding:18px;overflow:auto;box-sizing:border-box}.cm-drawer h3{color:#f4d77a;margin-top:0}.cm-drawer button{display:block;width:100%;text-align:left;background:#181818;color:#fff;border:1px solid #333;border-radius:11px;padding:12px;margin:7px 0;font-weight:800}',
 '@media(max-width:700px){#jptCentralMenuPro .cm-head{flex-wrap:wrap}.cm-title{min-width:55%}#jptCentralMenuPro .cm-outlet{width:100%}.cm-actions{grid-template-columns:repeat(2,1fr)!important}.cm-card{grid-template-columns:70px 1fr}.cm-img{width:70px;height:68px}.cm-card-actions{grid-column:1/-1;flex-direction:row!important}.cm-btn{flex:1}}'
 ].join('\n');
 document.head.appendChild(s);
}

async function load(){
 const outletId=outlet(); if(!outletId)return [];
 const q=await sb().from('menu_items').select('*').eq('outlet_id',outletId).order('sort_order').order('name');
 if(q.error)throw q.error;
 const rows=(q.data||[]).filter(x=>x.is_deleted!==true);
 const im=await sb().from('menu_item_images').select('menu_item_id,item_name,image_url').eq('outlet_id',outletId);
 const map={};if(!im.error)(im.data||[]).forEach(x=>map[x.menu_item_id||x.item_name]=x.image_url);
 rows.forEach(x=>x.__image=map[x.id]||x.image_url||'');
 return rows;
}

function jump(panel){
 if(typeof window.showPanel==='function')window.showPanel(panel);
}

async function categoryDrawer(categories){
 const d=document.createElement('div');d.className='cm-drawer';
 d.innerHTML='<div><button id="cmClose">← Back to menu</button><h3>Menu Categories</h3><p class="cm-sub">Jump, activate or deactivate a category without scrolling through the full menu.</p><div id="cmCatButtons">Loading categories…</div></div>';
 document.body.appendChild(d);
 const box=d.querySelector('#cmCatButtons');
 try{
   const outletId=outlet();
   const q=await sb().from('categories').select('id,name,sort_order,is_active').eq('outlet_id',outletId).order('sort_order').order('name');
   if(q.error)throw q.error;
   const dbCats=q.data||[];
   const names=[...new Set([...dbCats.map(x=>String(x.name||'').trim()).filter(Boolean),...categories])];
   box.innerHTML='';
   names.forEach(name=>{
     const row=dbCats.find(x=>String(x.name||'').trim()===name);
     const wrap=document.createElement('div');wrap.style.cssText='display:grid;grid-template-columns:1fr auto;gap:7px;align-items:center;margin:7px 0';
     const jumpBtn=document.createElement('button');jumpBtn.textContent=name+'  →';jumpBtn.style.margin='0';
     jumpBtn.onclick=()=>{document.querySelectorAll('[data-cm-category]').forEach(x=>x.style.display=(x.dataset.cmCategory===name?'':'none'));d.remove()};
     wrap.appendChild(jumpBtn);
     if(row){
       const active=row.is_active!==false;
       const toggle=document.createElement('button');toggle.textContent=active?'ON':'OFF';toggle.style.cssText='width:auto;margin:0;text-align:center;padding:10px 12px;color:'+(active?'#8ff0b0':'#ffaaaa')+';border-color:'+(active?'#295d3c':'#703030');
       toggle.onclick=async()=>{
         toggle.disabled=true;
         const r=await sb().from('categories').update({is_active:!active,updated_at:new Date().toISOString()}).eq('id',row.id).eq('outlet_id',outletId);
         if(r.error){if(typeof window.toast==='function')window.toast('Category update failed: '+r.error.message);toggle.disabled=false;return}
         const verify=await sb().from('categories').select('id,is_active').eq('id',row.id).eq('outlet_id',outletId).maybeSingle();
         if(verify.error||!verify.data||Boolean(verify.data.is_active)!==!active){if(typeof window.toast==='function')window.toast('Category state change could not be verified');toggle.disabled=false;return}
         if(typeof window.toast==='function')window.toast(active?'Category deactivated':'Category activated');
         await render();
         await categoryDrawer(categories);
         d.remove();
       };
       wrap.appendChild(toggle);
     }
     box.appendChild(wrap);
   });
   if(!names.length)box.innerHTML='<div class="cm-sub">No categories found for this outlet.</div>';
 }catch(e){box.innerHTML='<div class="notice danger">'+esc(e.message||'Category load failed')+'</div>'}
 d.querySelector('#cmClose').onclick=()=>d.remove();
 d.addEventListener('click',e=>{if(e.target===d)d.remove()});
}

async function mount(){
 const panel=document.getElementById('menu');if(!panel||document.getElementById('jptCentralMenuPro'))return false;
 css();
 const old=panel.querySelector('.card');if(old)old.style.display='none';
 const root=document.createElement('div');root.id='jptCentralMenuPro';
 root.innerHTML='<div class="cm-head"><button class="cm-back" id="cmBack">← Back</button><div class="cm-title"><h2>Menu Management</h2><p>Central menu workspace • manage one outlet at a time without leaving the menu.</p></div><select class="cm-outlet" id="cmOutlet"><option>Loading outlet…</option></select></div><div class="cm-actions"><button class="cm-action primary" id="cmAdd">＋ Add Item</button><button class="cm-action" id="cmCategories">☰ Categories</button><button class="cm-action" id="cmImages">🖼 Images</button><button class="cm-action" id="cmRefresh">↻ Refresh</button></div><input class="cm-search" id="cmSearch" placeholder="Search menu item, category or price…"><div class="cm-filters"><button class="cm-filter on" data-filter="all">All Items</button><button class="cm-filter" data-filter="on">In Stock</button><button class="cm-filter" data-filter="off">Out of Stock</button><button class="cm-filter" data-filter="image">Needs Image</button></div><div class="cm-meta"><span id="cmCount">Loading…</span><span id="cmSelected">All categories</span></div><div class="cm-cats" id="cmCats"></div><div class="cm-list" id="cmList"></div>';
 panel.appendChild(root);

 const select=document.getElementById('outletSelect'), cmOutlet=root.querySelector('#cmOutlet');
 if(select){
   [...select.options].forEach(o=>{const n=document.createElement('option');n.value=o.value;n.textContent=o.textContent;cmOutlet.appendChild(n)});
   cmOutlet.value=select.value||outlet();
   cmOutlet.onchange=()=>{select.value=cmOutlet.value;select.dispatchEvent(new Event('change',{bubbles:true}));render()};
 }else cmOutlet.value=outlet();

 let rows=[],filter='all',cat='';

 async function render(){
   try{
    rows=await load();
    const cats=[...new Set(rows.map(x=>String(x.category||'Uncategorised').trim()||'Uncategorised'))];
    const q=(root.querySelector('#cmSearch').value||'').trim().toLowerCase();
    root.querySelector('#cmCats').innerHTML='<button class="cm-cat active" data-cat="">All</button>'+cats.map(x=>'<button class="cm-cat" data-cat="'+esc(x)+'">'+esc(x)+'</button>').join('');
    const filtered=rows.filter(x=>{
      const okFilter=filter==='all'||(filter==='on'&&x.available!==false)||(filter==='off'&&x.available===false)||(filter==='image'&&!x.__image);
      const okCat=!cat||String(x.category||'Uncategorised')===cat;
      const hay=[x.name,x.category,x.price].join(' ').toLowerCase();
      return okFilter&&okCat&&(!q||hay.includes(q));
    });
    root.querySelector('#cmCount').textContent=filtered.length+' items • '+rows.length+' total';
    root.querySelector('#cmSelected').textContent=cat||'All categories';
    root.querySelector('#cmList').innerHTML=filtered.length?filtered.map(x=>{
      const status=x.available===false?'<span class="cm-status off">OUT OF STOCK</span>':'<span class="cm-status on">IN STOCK</span>';
      const img=x.__image?'<img class="cm-img" src="'+esc(x.__image)+'" alt="">':'<div class="cm-img">NO IMAGE</div>';
      const needs=x.__image?'':'<span class="cm-status img">NEEDS IMAGE</span>';
      return '<article class="cm-card" data-cm-category="'+esc(String(x.category||'Uncategorised'))+'">'+img+'<div><div class="cm-name">'+esc(x.name)+'</div><div class="cm-sub">'+esc(x.category||'Uncategorised')+'</div><div class="cm-price">'+money(x.price)+'</div>'+status+' '+needs+'</div><div class="cm-card-actions"><button class="cm-btn gold" data-edit="'+esc(x.id)+'">Edit</button><button class="cm-btn" data-toggle="'+esc(x.id)+'">'+(x.available===false?'Turn ON':'Turn OFF')+'</button></div></article>';
    }).join(''):'<div class="notice">No items match the selected filters.</div>';
    root.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{cat=b.dataset.cat||'';render()});
    root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{if(typeof window.editItem==='function')window.editItem(b.dataset.edit);});
    root.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{
  const id=b.dataset.toggle;const item=rows.find(x=>String(x.id)===String(id));b.disabled=true;b.textContent='Saving…';
  try{
    if(!item)throw new Error('Menu item not found');
    const next=item.available===false;
    const outletId=outlet();
    if(!outletId)throw new Error('Outlet context is missing');
    const r=await sb().from('menu_items').update({available:next,updated_at:new Date().toISOString()}).eq('id',item.id).eq('outlet_id',outletId).select('id,available').maybeSingle();
    if(r.error)throw r.error;
    if(!r.data)throw new Error('No menu item was updated for this outlet');
    if(Boolean(r.data.available)!==next)throw new Error('Availability change could not be verified');
    item.available=next;
    if(typeof window.toast==='function')window.toast(next?'Item turned ON — customer menu will show it':'Item turned OFF — customer menu will hide it');
    await render();
  }catch(e){b.disabled=false;b.textContent=item?.available===false?'Turn ON':'Turn OFF';if(typeof window.toast==='function')window.toast('Item status update failed: '+(e.message||e));}
});
   }catch(e){root.querySelector('#cmList').innerHTML='<div class="notice danger">'+esc(e.message||'Menu load failed')+'</div>'}
 }
 root.querySelector('#cmBack').onclick=()=>jump('home');
 root.querySelector('#cmAdd').onclick=()=>document.getElementById('addItemBtn')?.click();
 root.querySelector('#cmCategories').onclick=()=>categoryDrawer([...new Set(rows.map(x=>String(x.category||'Uncategorised').trim()||'Uncategorised'))]);
 root.querySelector('#cmImages').onclick=()=>jump('images');
 root.querySelector('#cmRefresh').onclick=render;
 root.querySelector('#cmSearch').oninput=render;
 root.querySelectorAll('.cm-filter').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;root.querySelectorAll('.cm-filter').forEach(x=>x.classList.toggle('on',x===b));render()});
 await render();
 return true;
}

function boot(){let n=0;const t=setInterval(()=>{try{if(mount())clearInterval(t)}catch(e){}if(++n>120)clearInterval(t)},500)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();