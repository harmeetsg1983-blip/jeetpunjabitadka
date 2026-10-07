/* JPT — UNIFIED CUSTOMER LIVE ORDER V1
   Single owner for customer tracking, outlet identity, sponsor media and live order state.
   Supabase remains the source of truth.
*/
(function(){
'use strict';
if(window.__JPT_UNIFIED_CUSTOMER_LIVE_V1__)return;
window.__JPT_UNIFIED_CUSTOMER_LIVE_V1__=true;

const ORDER_KEY='jpt_v106_last_order';
const DELIVERY_BUFFER=20;
let sb=null, order=null, orderChannel=null, sponsorChannel=null, timer=null, sponsorTimer=null;
let sponsorIndex=0, sponsorRows=[];
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getOrder=()=>{try{return JSON.parse(localStorage.getItem(ORDER_KEY)||'null')}catch(e){return null}};
const saveOrder=o=>{try{localStorage.setItem(ORDER_KEY,JSON.stringify(o))}catch(e){}};
const client=()=>{
 if(sb)return sb;
 if(window.sb)return sb=window.sb;
 if(window.supabase&&window.JPT_SUPABASE_URL&&window.JPT_SUPABASE_PUBLISHABLE_KEY){
   try{return sb=window.supabase.createClient(window.JPT_SUPABASE_URL,window.JPT_SUPABASE_PUBLISHABLE_KEY)}catch(e){}
 }
 return null;
};
const status=s=>{s=String(s||'new').toLowerCase().trim();return s==='completed'?'delivered':s==='canceled'?'cancelled':s};
const mins=n=>Math.max(0,Math.ceil(Number(n)||0));
const countdown=ms=>{const s=Math.max(0,Math.floor(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const outletId=()=>String(order?.outlet_id||'').trim();

function style(){
 if($('jptUnifiedLiveStyle'))return;
 const s=document.createElement('style');s.id='jptUnifiedLiveStyle';s.textContent=
 '#jptUnifiedLive{position:fixed;inset:0;z-index:10000;display:none;overflow:auto;background:#f5f6f8;color:#16181c}#jptUnifiedLive.show{display:block}.jul-head{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e8e8e8;padding:12px 15px;display:flex;align-items:center;gap:11px}.jul-logo{width:46px;height:46px;border-radius:13px;object-fit:cover;background:#111}.jul-brand{min-width:0;flex:1}.jul-name{font-size:17px;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jul-meta{font-size:10px;color:#777;margin-top:3px}.jul-call{padding:9px 11px;border-radius:11px;background:#111;color:#f4d77a;text-decoration:none;font-weight:950;font-size:11px}.jul-body{max-width:760px;margin:auto;padding-bottom:30px}.jul-media{height:clamp(150px,25vh,250px);background:#111;overflow:hidden}.jul-media img,.jul-media video{width:100%;height:100%;object-fit:cover;display:block}.jul-status{margin:-25px 14px 14px;position:relative;background:#fff;border-radius:20px;padding:17px;box-shadow:0 8px 28px #0002}.jul-status-title{font-size:23px;font-weight:1000}.jul-sub{font-size:12px;color:#777;margin-top:5px;line-height:1.45}.jul-eta{margin-top:13px;padding:13px;border-radius:15px;background:#111;color:#f4d77a;display:flex;justify-content:space-between;align-items:center}.jul-eta b{font-size:28px}.jul-steps{margin-top:14px}.jul-step{display:flex;align-items:center;gap:9px;margin:9px 0;font-size:12px;font-weight:800}.jul-dot{width:10px;height:10px;border-radius:50%;background:#d5d7da}.jul-dot.on{background:#18a66d;box-shadow:0 0 8px #18a66d66}.jul-card{margin:0 14px 14px;padding:15px;border-radius:18px;background:#fff;border:1px solid #ececec;box-shadow:0 6px 20px #0000000b}.jul-card h3{margin:0 0 10px;font-size:15px}.jul-row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:12px;color:#555}.jul-total{border-top:1px solid #eee;margin-top:5px;padding-top:10px;font-weight:1000;color:#15171b}.jul-sponsors{margin:0 14px 16px}.jul-sponsor{height:210px;border-radius:18px;overflow:hidden;background:#090909;border:1px solid #d8ae42;position:relative}.jul-sponsor img,.jul-sponsor video{width:100%;height:100%;object-fit:cover}.jul-sponsor-label{position:absolute;left:9px;top:9px;padding:5px 8px;border-radius:99px;background:#111d;color:#f4d77a;border:1px solid #d8ae42;font-size:9px;font-weight:950}.jul-empty{padding:35px 15px;text-align:center;color:#888}.jul-contact{display:flex;gap:8px}.jul-contact a{flex:1;text-align:center;padding:11px;border-radius:12px;text-decoration:none;font-weight:950;font-size:12px}.jul-wa{background:#18a66d;color:#fff}.jul-help{background:#f4c84a;color:#111}';
 document.head.appendChild(s);
}
function mount(){
 style();
 let root=$('jptUnifiedLive');
 if(root)return root;
 root=document.createElement('section');root.id='jptUnifiedLive';
 root.innerHTML='<div class="jul-body"><header class="jul-head"><img id="julLogo" class="jul-logo" alt="Restaurant logo"><div class="jul-brand"><div id="julName" class="jul-name">Restaurant</div><div id="julMeta" class="jul-meta"></div></div><a id="julCall" class="jul-call" href="#" style="display:none">CALL</a></header><div id="julMedia" class="jul-media"></div><main><section id="julStatus" class="jul-status"></section><section id="julOrder" class="jul-card"></section><section class="jul-card"><h3>Restaurant</h3><div id="julContact" class="jul-contact"></div></section><section id="julSponsors" class="jul-sponsors"></section></main></div>';
 document.body.appendChild(root);return root;
}
async function loadOutlet(){
 const c=client();if(!c||!outletId())return;
 const r=await c.from('outlets').select('code,name,address,phone,contact_name,logo_url,banner_url,accepting_orders,delivery_enabled').eq('code',outletId()).maybeSingle();
 if(r.error||!r.data)return;
 const x=r.data;
 $('julName').textContent=x.name||x.code||'Restaurant';
 $('julMeta').textContent=[x.code,x.address].filter(Boolean).join(' • ');
 const logo=$('julLogo');if(logo){logo.src=x.logo_url||'';logo.style.display=x.logo_url?'block':'none'}
 const call=$('julCall');if(call&&x.phone){call.href='tel:'+x.phone;call.style.display='block'}else if(call)call.style.display='none';
 $('julContact').innerHTML=(x.phone?'<a class="jul-wa" href="tel:'+esc(x.phone)+'">📞 Call Restaurant</a>':'')+'<a class="jul-help" href="javascript:void(0)" id="julHelp">Help</a>';
 $('julHelp')?.addEventListener('click',()=>window.toast?.('Please contact '+(x.name||'the restaurant')+' for support.'));
 const media=$('julMedia');
 if(x.banner_url)media.innerHTML='<img src="'+esc(x.banner_url)+'" alt="'+esc(x.name||'Restaurant')+'">';
 else media.innerHTML='<div class="jul-empty">Welcome to '+esc(x.name||'Restaurant')+'</div>';
}
function render(){
 if(!order)return;
 const st=status(order.status);
 const prep=mins(order.target_minutes||15);
 let left=0;
 if(st==='accepted'||st==='preparing')left=Math.max(0,new Date(order.deadline_at||Date.now()).getTime()-Date.now());
 else if(st==='ready'||st==='out_for_delivery')left=Math.max(0,new Date(order.ready_at||order.out_for_delivery_at||Date.now()).getTime()+DELIVERY_BUFFER*60000-Date.now());
 const titles={new:['Order placed','Waiting for restaurant acceptance.'],accepted:['Order confirmed','Restaurant accepted your order.'],preparing:['Preparing your order','Your food is being prepared.'],ready:['Ready for delivery','Your order is ready.'],out_for_delivery:['Out for delivery','Your order is on the way.'],delivered:['Delivered','Thank you for ordering.'],cancelled:['Order cancelled','This order is no longer active.']};
 const t=titles[st]||titles.new;
 const steps=[['NEW',0],['ACCEPTED',1],['READY',2],['OUT FOR DELIVERY',3],['DELIVERED',4]];
 const rank={new:0,accepted:1,preparing:2,ready:2,out_for_delivery:3,delivered:4,cancelled:-1};
 const r=rank[st]??0;
 $('julStatus').innerHTML='<div class="jul-status-title">'+esc(t[0])+'</div><div class="jul-sub">'+esc(t[1])+'</div>'+
  ((st==='accepted'||st==='preparing'||st==='ready'||st==='out_for_delivery')?'<div class="jul-eta"><span>Estimated arrival</span><b id="julCountdown">'+countdown(left)+'</b></div>':'')+
  '<div class="jul-steps">'+steps.map((x,i)=>'<div class="jul-step"><span class="jul-dot '+(r>=x[1]?'on':'')+'"></span>'+x[0]+'</div>').join('')+'</div>';
 const items=Array.isArray(order.items)?order.items:[];
 $('julOrder').innerHTML='<h3>Order '+esc(order.order_no||'')+'</h3>'+
  (items.length?items.map(i=>'<div class="jul-row"><span>'+esc(i.name||'Item')+' × '+Number(i.qty||1)+'</span><b>₹'+Math.round(Number(i.price||0)*Number(i.qty||1)).toLocaleString('en-IN')+'</b></div>').join(''):'')+
  '<div class="jul-row jul-total"><span>Total</span><b>₹'+Math.round(Number(order.total||0)).toLocaleString('en-IN')+'</b></div>';
 mount().classList.add('show');
}
async function refreshOrder(){
 const c=client();if(!c||!order?.order_no||!order?.phone)return;
 const r=await c.rpc('get_customer_order',{p_order_no:order.order_no,p_phone:order.phone});
 if(r.error)return;
 const row=Array.isArray(r.data)?r.data[0]:r.data;
 if(row){order=Object.assign({},order,row);saveOrder(order);await loadOutlet();render()}
}
function subscribeOrder(){
 const c=client();if(!c||!order?.order_no)return;
 if(orderChannel)c.removeChannel(orderChannel);
 orderChannel=c.channel('jpt-customer-live-order-'+String(order.order_no)+'-'+Date.now())
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders',filter:'order_no=eq.'+String(order.order_no)},p=>{
    if(p?.new){order=Object.assign({},order,p.new);saveOrder(order);loadOutlet();render()}
  }).subscribe();
}
function activeSponsors(){
 const now=Date.now(),id=outletId();
 return sponsorRows.filter(x=>x.is_active!==false&&(!x.starts_at||Date.parse(x.starts_at)<=now)&&(!x.ends_at||Date.parse(x.ends_at)>=now)&&(x.target_all_live||((x.outlet_ids||[]).includes(id))));
}
function renderSponsor(){
 const host=$('julSponsors');if(!host)return;
 const list=activeSponsors();
 if(!list.length){host.innerHTML='';return}
 sponsorIndex=sponsorIndex%list.length;
 const x=list[sponsorIndex],s=x.schedule_json||{},type=String(x.media_type||s.media_kind||'image').toLowerCase(),src=type==='video'?(x.video_url||x.media_url):(x.media_url||x.banner_url);
 if(!src){host.innerHTML='';return}
 host.innerHTML='<div class="jul-sponsor"><span class="jul-sponsor-label">'+esc(x.sponsor_name||x.title||'Sponsored')+'</span>'+(type==='video'?'<video autoplay muted playsinline></video>':'<img alt="Sponsored promotion">')+'</div>';
 const el=host.querySelector(type==='video'?'video':'img');el.src=src;
 if(type==='video'){el.onended=()=>{sponsorIndex=(sponsorIndex+1)%list.length;renderSponsor()};el.play?.().catch(()=>{})}
 else{clearTimeout(sponsorTimer);sponsorTimer=setTimeout(()=>{sponsorIndex=(sponsorIndex+1)%list.length;renderSponsor()},10000)}
}
async function refreshSponsors(){
 const c=client();if(!c)return;
 const r=await c.from('checkout_sponsor_ads').select('id,media_url,media_type,video_url,title,sponsor_name,target_all_live,outlet_ids,is_active,starts_at,ends_at,sort_order,schedule_json').eq('is_active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
 if(r.error)return;
 sponsorRows=r.data||[];sponsorIndex=0;renderSponsor();
}
function subscribeSponsors(){
 const c=client();if(!c)return;
 if(sponsorChannel)c.removeChannel(sponsorChannel);
 sponsorChannel=c.channel('jpt-customer-sponsor-live-'+Date.now())
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'checkout_sponsor_ads'},()=>refreshSponsors())
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'checkout_sponsor_ads'},()=>refreshSponsors())
  .on('postgres_changes',{event:'DELETE',schema:'public',table:'checkout_sponsor_ads'},()=>refreshSponsors())
  .subscribe();
}
function startClock(){clearInterval(timer);timer=setInterval(()=>{if(order)render()},1000)}
window.JPTOpenTracking=function(input){
 order=input||getOrder();if(!order?.order_no||!order?.phone)return false;
 saveOrder(order);mount();loadOutlet();refreshSponsors();subscribeSponsors();subscribeOrder();refreshOrder();render();startClock();return true;
};
window.addEventListener('jpt:order-placed',e=>window.JPTOpenTracking(e.detail||null));
window.addEventListener('load',()=>{if(getOrder()?.order_no&&location.hash==='#tracking')window.JPTOpenTracking(getOrder())});
})();