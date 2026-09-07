/* JPT V106 CUSTOMER MENU CONNECTION BRIDGE — FINAL
   Non-destructive customer-side bridge.
   Reads the same public Supabase menu source used by the Partner/Admin app.
   Does NOT write, delete, import, modify prices, orders, payment data, or images.
*/
(function(){
'use strict';
var OUT={'JPT-001':'Jeet Punjabi Tadka','SOP-002':'Shan-e-Punjab','PFA-003':'Punjabi Food Adda','NME-004':'99 Meal Express','TOP-005':'Taste of Punjab'};
var client=null,busy=false,lastRows=[],lastMap={};
function el(id){return document.getElementById(id)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(v){return '₹'+Math.round(Number(v)||0)}
function outlet(){var id=window.outletId||new URLSearchParams(location.search).get('outlet')||'JPT-001';return OUT[id]?id:'JPT-001'}
function ensureClient(){
 if(client)return client;
 if(window.sb&&typeof window.sb.from==='function'){client=window.sb;return client}
 if(window.supabase&&window.JPT_SUPABASE_URL&&window.JPT_SUPABASE_PUBLISHABLE_KEY){
  client=window.supabase.createClient(window.JPT_SUPABASE_URL,window.JPT_SUPABASE_PUBLISHABLE_KEY);window.sb=client;return client
 }
 return null
}
function renderOutlets(){
 var bar=el('outletbar');if(!bar)return;
 var active=outlet();
 bar.innerHTML=Object.keys(OUT).map(function(id){return '<button type="button" class="outlet '+(id===active?'on':'')+'" data-jpt-bridge-outlet="'+id+'">'+esc(OUT[id])+'</button>'}).join('');
 Array.prototype.forEach.call(bar.querySelectorAll('[data-jpt-bridge-outlet]'),function(b){
  b.onclick=function(){var id=b.getAttribute('data-jpt-bridge-outlet');window.outletId=id;try{history.pushState({outlet:id},'',location.pathname+'?outlet='+encodeURIComponent(id))}catch(e){};renderOutlets();load(true)}
 })
}
function renderCats(rows){
 var chips=el('chips');if(!chips)return;
 var cats=[];rows.forEach(function(x){var c=String(x.category||'').trim();if(c&&cats.indexOf(c)<0)cats.push(c)});
 chips.innerHTML=['All'].concat(cats).map(function(c,i){return '<button type="button" class="chip '+(i===0?'on':'')+'" data-jpt-bridge-cat="'+esc(c)+'">'+esc(c)+'</button>'}).join('');
 Array.prototype.forEach.call(chips.querySelectorAll('[data-jpt-bridge-cat]'),function(b){
  b.onclick=function(){Array.prototype.forEach.call(chips.querySelectorAll('.chip'),function(x){x.classList.remove('on')});b.classList.add('on');var c=b.getAttribute('data-jpt-bridge-cat');renderMenu(c==='All'?lastRows:lastRows.filter(function(x){return String(x.category||'')===c}),lastMap)}
 })
}
function renderMenu(rows,map){
 var menu=el('menu');if(!menu)return;
 if(!rows.length){menu.innerHTML='<div class="box" style="margin:14px">No menu items are available for this outlet right now.</div>';return}
 lastRows=rows;lastMap=map||{};
 var cats=[];rows.forEach(function(x){var c=String(x.category||'').trim();if(c&&cats.indexOf(c)<0)cats.push(c)});
 var html='';
 cats.forEach(function(cat){
  var arr=rows.filter(function(x){return String(x.category||'')===cat});
  html+='<div class="section">'+esc(cat)+'</div>';
  html+=arr.map(function(x){
   var src=x.image_url||lastMap[x.id]||lastMap[x.name]||'';
   return '<div class="item"><div class="pic">'+(src?'<img src="'+esc(src)+'" alt="'+esc(x.name||'')+'" loading="lazy">':'<span>IMAGE<br>AVAILABLE FROM ADMIN</span>')+'</div><div class="info"><div class="dish">'+esc(x.name||'')+'</div><div class="desc">'+esc(x.description||'')+'</div><div class="price">'+money(x.price)+'</div><button class="add" type="button" data-jpt-add="'+esc(x.id)+'">ADD +</button></div></div>'
  }).join('')
 });
 menu.innerHTML=html;
 Array.prototype.forEach.call(menu.querySelectorAll('[data-jpt-add]'),function(b){b.onclick=function(){if(typeof window.change==='function')window.change(b.getAttribute('data-jpt-add'),1)}})
}
async function load(force){
 if(busy&&!force)return;busy=true;
 try{
  renderOutlets();
  var c=ensureClient();if(!c)return;
  var id=outlet();window.outletId=id;
  var r=await c.from('menu_items').select('id,name,description,price,category,available,is_deleted,image_url,sort_order,outlet_id').eq('outlet_id',id).order('sort_order',{ascending:true}).order('name',{ascending:true});
  if(r.error)throw new Error(r.error.message||'Menu query failed');
  var rows=(r.data||[]).filter(function(x){return x.available!==false&&x.is_deleted!==true});
  var map={};
  try{
   var ir=await c.from('menu_item_images').select('menu_item_id,item_name,image_url').eq('outlet_id',id);
   if(!ir.error)(ir.data||[]).forEach(function(x){if(x.menu_item_id)map[x.menu_item_id]=x.image_url;if(x.item_name)map[x.item_name]=x.image_url})
  }catch(e){}
  lastRows=rows;lastMap=map;renderCats(rows);renderMenu(rows,map);
  var title=el('menuTitle');if(title)title.textContent='📋 '+OUT[id]+' Menu';
  var name=el('restaurant');if(name)name.textContent=OUT[id];
  var meta=el('restaurantMeta');if(meta)meta.textContent='North Indian • Direct Order';
  if(typeof window.updateCart==='function')window.updateCart();
  document.documentElement.setAttribute('data-jpt-v106-connection','ok');
  document.documentElement.setAttribute('data-jpt-v106-menu-count',String(rows.length));
 }catch(e){console.warn('JPT V106 Customer Menu Bridge',e);document.documentElement.setAttribute('data-jpt-v106-connection','error')}
 finally{busy=false}
}
function boot(){
 renderOutlets();
 setTimeout(function(){load(false)},250);
 setTimeout(function(){load(true)},1200);
 setTimeout(function(){load(true)},3000);
 window.addEventListener('popstate',function(){setTimeout(function(){load(true)},50)});
 var n=0,t=setInterval(function(){n++;if(ensureClient())load(false);if(n>=20)clearInterval(t)},1000)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();