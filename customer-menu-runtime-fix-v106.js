/* JPT V106 CUSTOMER MENU + CART RECOVERY V5
   Safe/additive recovery bridge.
   Single source: Supabase menu rows are synchronized into the original
   Customer App `items` array, then the ORIGINAL render()/change()/cartRows()
   remain authoritative for cart behavior.
*/
(function(){
'use strict';

var OUT={
  'JPT-001':'Jeet Punjabi Tadka',
  'SOP-002':'Shan-e-Punjab',
  'PFA-003':'Punjabi Food Adda',
  'NME-004':'99 Meal Express',
  'TOP-005':'Taste of Punjab'
};

var client=null,busy=false,lastRows=[],lastMap={};

function el(id){return document.getElementById(id)}
function esc(v){
  return String(v==null?'':v).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  })
}

function outlet(){
  var id=window.outletId||new URLSearchParams(location.search).get('outlet')||'JPT-001';
  return OUT[id]?id:'JPT-001'
}

function ensureClient(){
  if(client)return client;
  if(window.sb&&typeof window.sb.from==='function'){
    client=window.sb;
    return client
  }
  if(window.supabase&&window.JPT_SUPABASE_URL&&window.JPT_SUPABASE_PUBLISHABLE_KEY){
    client=window.supabase.createClient(
      window.JPT_SUPABASE_URL,
      window.JPT_SUPABASE_PUBLISHABLE_KEY
    );
    window.sb=client;
    return client
  }
  return null
}

/* Put the live Supabase rows into the ORIGINAL Customer App state.
   This is the critical V5 repair: cartRows() uses `items.find(...)`. */
function syncOriginalState(rows,map){
  var safeRows=rows.map(function(x){
    var y={
      id:x.id,
      name:x.name||'',
      description:x.description||'',
      price:Number(x.price)||0,
      category:x.category||'',
      available:x.available!==false,
      is_deleted:x.is_deleted===true,
      image_url:x.image_url||map[x.id]||map[x.name]||'',
      sort_order:x.sort_order==null?0:x.sort_order
    };
    return y
  });

  try{
    window.eval(
      'items='+JSON.stringify(safeRows)+';'+
      'imageMap='+JSON.stringify(map||{})+';'
    );
    return true
  }catch(e){
    console.warn('JPT V106 state sync failed',e);
    return false
  }
}

/* Keep the five-outlet selector. */
function renderOutlets(){
  var bar=el('outletbar');if(!bar)return;
  var active=outlet();

  bar.innerHTML=Object.keys(OUT).map(function(id){
    return '<button type="button" class="outlet '+(id===active?'on':'')+
      '" data-jpt-v5-outlet="'+id+'">'+esc(OUT[id])+'</button>'
  }).join('');

  Array.prototype.forEach.call(
    bar.querySelectorAll('[data-jpt-v5-outlet]'),
    function(b){
      b.onclick=function(){
        var id=b.getAttribute('data-jpt-v5-outlet');
        window.outletId=id;
        try{
          history.pushState(
            {outlet:id},
            '',
            location.pathname+'?outlet='+encodeURIComponent(id)
          )
        }catch(e){}
        renderOutlets();
        load(true)
      }
    }
  )
}

/* Let the ORIGINAL render() create menu cards and original ADD/+/- buttons. */
function renderOriginal(){
  try{
    window.eval('render()');
    return true
  }catch(e){
    console.warn('JPT V106 original render failed',e);
    return false
  }
}

async function load(force){
  if(busy&&!force)return;
  busy=true;

  try{
    renderOutlets();

    var c=ensureClient();
    if(!c)return;

    var id=outlet();
    window.outletId=id;

    var r=await c.from('menu_items')
      .select('id,name,description,price,category,available,is_deleted,image_url,sort_order,outlet_id')
      .eq('outlet_id',id)
      .order('sort_order',{ascending:true})
      .order('name',{ascending:true});

    if(r.error)throw new Error(r.error.message||'Menu query failed');

    var rows=(r.data||[]).filter(function(x){
      return x.available!==false&&x.is_deleted!==true
    });

    var map={};

    try{
      var ir=await c.from('menu_item_images')
        .select('menu_item_id,item_name,image_url')
        .eq('outlet_id',id);

      if(!ir.error){
        (ir.data||[]).forEach(function(x){
          if(x.menu_item_id)map[x.menu_item_id]=x.image_url;
          if(x.item_name)map[x.item_name]=x.image_url
        })
      }
    }catch(e){}

    lastRows=rows;
    lastMap=map;

    if(!syncOriginalState(rows,map)){
      throw new Error('Could not synchronize Customer App menu state')
    }

    renderOriginal();

    var title=el('menuTitle');
    if(title)title.textContent='📋 '+OUT[id]+' Menu';

    var name=el('restaurant');
    if(name)name.textContent=OUT[id];

    var meta=el('restaurantMeta');
    if(meta)meta.textContent='North Indian • Direct Order';

    if(typeof window.updateCart==='function')window.updateCart();

    document.documentElement.setAttribute('data-jpt-v106-connection','ok');
    document.documentElement.setAttribute('data-jpt-v106-menu-count',String(rows.length));
    document.documentElement.setAttribute('data-jpt-v106-cart-bridge','original-state-sync-v5');

  }catch(e){
    console.warn('JPT V106 Customer Menu V5',e);
    document.documentElement.setAttribute('data-jpt-v106-connection','error')
  }finally{
    busy=false
  }
}

function boot(){
  renderOutlets();

  setTimeout(function(){load(false)},250);
  setTimeout(function(){load(true)},1200);
  setTimeout(function(){load(true)},3000);

  window.addEventListener('popstate',function(){
    setTimeout(function(){load(true)},50)
  });

  var n=0,t=setInterval(function(){
    n++;
    if(ensureClient())load(false);
    if(n>=20)clearInterval(t)
  },1000)
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot)
}else{
  boot()
}

})();
