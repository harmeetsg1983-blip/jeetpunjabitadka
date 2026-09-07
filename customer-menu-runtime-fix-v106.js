/* JPT V106 CUSTOMER MENU RUNTIME RECOVERY
   Non-destructive: re-queries Supabase and re-renders the existing customer UI.
   Does not alter menu data, prices, outlets, cart, checkout, or payment records.
*/
(function(){
  'use strict';
  var started=false, tries=0;
  var OUT={
    'JPT-001':'Jeet Punjabi Tadka',
    'SOP-002':'Shan-e-Punjab',
    'PFA-003':'Punjabi Food Adda',
    'NME-004':'99 Meal Express',
    'TOP-005':'Taste of Punjab'
  };
  function q(id){return document.getElementById(id)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function money(v){return '₹'+Math.round(Number(v)||0)}
  function getOutlet(){return window.outletId||new URLSearchParams(location.search).get('outlet')||'JPT-001'}
  function imageUrl(x,map){return x.image_url||map[x.id]||map[x.name]||''}
  function renderOutletButtons(){
    var bar=q('outletbar'); if(!bar)return;
    var id=getOutlet();
    bar.innerHTML=Object.keys(OUT).map(function(k){return '<button type="button" class="outlet '+(k===id?'on':'')+'" data-jpt-outlet="'+k+'">'+esc(OUT[k])+'</button>'}).join('');
    bar.querySelectorAll('[data-jpt-outlet]').forEach(function(b){b.addEventListener('click',function(){
      var next=b.getAttribute('data-jpt-outlet');
      if(typeof window.switchOutlet==='function'){window.switchOutlet(next)}
      else{window.outletId=next;history.pushState({outlet:next},'',location.pathname+'?outlet='+encodeURIComponent(next));recover(true)}
    })});
  }
  function renderMenu(rows,map){
    var menu=q('menu'); if(!menu)return;
    if(!rows.length){menu.innerHTML='<div class="box" style="margin:14px">No menu items are available for this outlet right now.</div>';return}
    window.items=rows; window.imageMap=map;
    var cats=[]; rows.forEach(function(x){if(x.category&&cats.indexOf(x.category)<0)cats.push(x.category)});
    var chips=q('chips');
    if(chips)chips.innerHTML=['All'].concat(cats).map(function(c,i){return '<button type="button" class="chip '+(i===0?'on':'')+'" data-jpt-cat="'+esc(c)+'">'+esc(c)+'</button>'}).join('');
    if(chips)chips.querySelectorAll('[data-jpt-cat]').forEach(function(b){b.addEventListener('click',function(){
      chips.querySelectorAll('.chip').forEach(function(x){x.classList.remove('on')});b.classList.add('on');
      var c=b.getAttribute('data-jpt-cat');renderMenu(c==='All'?rows:rows.filter(function(x){return x.category===c}),map);
    })});
    var html=''; cats.forEach(function(cat){
      var arr=rows.filter(function(x){return x.category===cat});
      html+='<div class="section">'+esc(cat)+'</div>';
      html+=arr.map(function(x){
        var src=imageUrl(x,map);
        var add='';
        if(typeof window.change==='function') add='<button class="add" onclick="change(\''+esc(String(x.id)).replace(/'/g,"\\'")+'\',1)">ADD +</button>';
        return '<div class="item"><div class="pic">'+(src?'<img src="'+esc(src)+'" alt="'+esc(x.name)+'" loading="lazy">':'<span>IMAGE<br>AVAILABLE FROM ADMIN</span>')+'</div><div class="info"><div class="dish">'+esc(x.name)+'</div><div class="desc">'+esc(x.description||'')+'</div><div class="price">'+money(x.price)+'</div>'+add+'</div></div>';
      }).join('');
    });
    menu.innerHTML=html;
  }
  async function recover(force){
    if(started&&!force)return; started=true;
    tries++;
    try{
      renderOutletButtons();
      var client=window.sb;
      if(!client){if(tries<20){started=false;setTimeout(function(){recover(false)},1000)}return}
      var id=getOutlet(); window.outletId=id;
      var r=await client.from('menu_items').select('*').eq('outlet_id',id).order('sort_order').order('name');
      if(r.error)throw new Error(r.error.message);
      var rows=(r.data||[]).filter(function(x){return x.available!==false&&x.is_deleted!==true});
      var map={};
      try{
        var ir=await client.from('menu_item_images').select('*').eq('outlet_id',id);
        if(!ir.error)(ir.data||[]).forEach(function(x){map[x.menu_item_id||x.item_name]=x.image_url})
      }catch(e){}
      renderMenu(rows,map);
      var title=q('menuTitle');if(title)title.textContent='📋 '+(OUT[id]||'Restaurant')+' Menu';
      var sr=await client.from('outlets').select('*').eq('outlet_id',id).maybeSingle();
      if(sr.data){var n=q('restaurant');if(n)n.textContent=sr.data.name||OUT[id]||'Jeet Punjabi Tadka';var m=q('restaurantMeta');if(m)m.textContent=(sr.data.cuisine||'North Indian • Punjabi')+' • Direct Order'}
      if(typeof window.updateCart==='function')window.updateCart();
      document.documentElement.setAttribute('data-jpt-menu-recovered','1');
    }catch(e){
      console.warn('JPT V106 menu recovery:',e);
      if(tries<3){started=false;setTimeout(function(){recover(false)},1500)}
    }
  }
  function boot(){setTimeout(function(){recover(false)},350);setTimeout(function(){recover(true)},2500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
