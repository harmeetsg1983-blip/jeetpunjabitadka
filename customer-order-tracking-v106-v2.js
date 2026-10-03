/* JPT V106 — CUSTOMER ORDER TRACKING BRIDGE V4
   Additive ETA/countdown layer.
   Uses existing secure get_customer_order RPC.
   Customer ETA = restaurant preparation target + 20-minute delivery buffer.
   The 20-minute buffer is a maximum planning buffer, not a live traffic prediction.
*/
(function(){
  'use strict';
  if(window.__JPT_V106_CUSTOMER_TRACKING_V4__) return;
  window.__JPT_V106_CUSTOMER_TRACKING_V4__=true;

  var KEY='jpt_v106_last_order';
  var POLL_MS=4000;
  var DELIVERY_BUFFER=20;
  var timer=null, active=false, sbClient=null;
  var lastStatus='';
  var lastAssignmentStatus='';
  var noticeItems=[];
  var noticeUnread=0;
  var JPT_CUSTOMER_ACCEPTED_AUDIO='./ringtones/1000449572.mp4';
  var readySinceKey='jpt_v106_ready_since';
  function playCustomerAcceptedTone(){
    try{
      var a=new Audio(JPT_CUSTOMER_ACCEPTED_AUDIO);
      a.preload='auto';a.loop=false;
      a.play().catch(function(){});
    }catch(e){}
  }

  function getSb(){
    if(sbClient) return sbClient;
    try{
      if(window.supabase&&window.JPT_SUPABASE_URL&&window.JPT_SUPABASE_PUBLISHABLE_KEY){
        sbClient=window.supabase.createClient(window.JPT_SUPABASE_URL,window.JPT_SUPABASE_PUBLISHABLE_KEY);
      }
    }catch(e){sbClient=null}
    return sbClient;
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}}
  function save(x){try{localStorage.setItem(KEY,JSON.stringify(x))}catch(e){}}
  function moneyMinutes(n){n=Math.max(0,Number(n)||0);return Math.ceil(n)}

  function ensureStyle(){
    if(document.getElementById('jptTrackStyleV4'))return;
    var s=document.createElement('style');s.id='jptTrackStyleV4';
    s.textContent=
      '.jpt-customer-bell{position:fixed;right:14px;top:14px;z-index:320;background:#111;border:1px solid #d8ae42;color:#f4d77a;border-radius:14px;padding:9px 12px;font-weight:1000;box-shadow:0 8px 24px #0009}.jpt-customer-bell .badge{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;margin-left:5px;border-radius:99px;background:#d8ae42;color:#111;font-size:10px}.jpt-customer-notices{position:fixed;right:14px;top:60px;z-index:319;width:min(330px,calc(100% - 28px));background:#111;border:1px solid #5b471c;border-radius:14px;box-shadow:0 10px 30px #000b;padding:10px;display:none}.jpt-customer-notices.show{display:block}.jpt-customer-notice{padding:9px;border-bottom:1px solid #292929}.jpt-customer-notice b{font-size:12px}.jpt-customer-notice span{display:block;color:#aaa;font-size:10px;margin-top:3px}' + '.jpt-track{position:fixed;inset:0;z-index:1000;width:100%;height:100dvh;overflow:auto;background:#f5f6f8;color:#15171b;padding:0;display:none;border:0;border-radius:0;box-shadow:none;transform:none}.jpt-track.show{display:block}.jpt-track-top{height:66px;display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 16px;background:#fff;border-bottom:1px solid #e7e7e7}.jpt-track-brand{min-width:0}.jpt-track-title{font-weight:1000;color:#17191d;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jpt-track-code{font-weight:800;color:#777;font-size:11px;margin-top:2px}.jpt-track-close{background:#fff;border:1px solid #ddd;color:#222;border-radius:50%;width:40px;height:40px;font-size:18px}.jpt-track-ad{height:clamp(110px,18vh,190px);margin:0;background:#111;position:relative;overflow:hidden}.jpt-track-ad-media{width:100%;height:100%;display:block;object-fit:cover}.jpt-track-ad-label{position:absolute;left:12px;bottom:10px;background:#000b;color:#fff;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:900}.jpt-track-ad-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#151515,#34270d);color:#f5d879;font-size:18px}.jpt-track-ad-empty span{font-size:10px;color:#ddd;margin-top:4px}.jpt-track-map{height:clamp(260px,42vh,480px);background:#e8ebef;position:relative;overflow:hidden}.jpt-track-map iframe{width:100%;height:100%;border:0;display:block}.jpt-track-status{position:relative;margin:-42px 16px 18px;padding:18px;border-radius:22px;background:#fff;box-shadow:0 8px 28px #0002;border:0;z-index:2}.jpt-track-status-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.jpt-track-status-copy{min-width:0}.jpt-track-line{display:flex;align-items:center;gap:8px;margin:8px 0}.jpt-track-dot{width:10px;height:10px;border-radius:50%;background:#d2d5da;flex:none}.jpt-track-dot.on{background:#18a66d;box-shadow:0 0 8px #18a66d66}.jpt-track-sub{font-size:13px;color:#8b8d92;line-height:1.4}.jpt-track-eta{margin:0;padding:0;width:76px;min-width:76px;height:76px;border-radius:18px;background:#18a66d;color:#fff;text-align:center;display:flex;flex-direction:column;justify-content:center;order:2}.jpt-track-eta-title{font-size:0}.jpt-track-eta-time{font-size:27px;font-weight:1000;line-height:1}.jpt-track-eta-note{font-size:11px;color:#fff;margin-top:4px}.jpt-track-btn{width:100%;margin-top:10px;padding:13px;border:0;border-radius:12px;background:#f4c84a;color:#111;font-weight:1000}.jpt-track-wait{color:#a97900;font-weight:900}.jpt-track-done{color:#18a66d;font-weight:900}.jpt-location{margin-top:10px}.jpt-location-map{display:none}.jpt-location-actions{display:none}.jpt-track-info{margin:0 16px 30px;padding:15px 4px;color:#45474c;font-weight:900;font-size:15px}.jpt-track-info::after{content:'›';float:right;color:#e87916;font-size:24px;line-height:14px}@media(max-width:380px){.jpt-track-top{padding:8px 12px}.jpt-track-status{margin-left:12px;margin-right:12px}.jpt-track-info{margin-left:12px;margin-right:12px}}';
    document.head.appendChild(s);
  }

  function ensureCustomerBell(){
    var bell=document.getElementById('jptCustomerBell');
    if(!bell){
      bell=document.createElement('button');bell.id='jptCustomerBell';bell.className='jpt-customer-bell';bell.type='button';
      bell.innerHTML='🔔 <span class="badge" id="jptCustomerBellCount">0</span>';
      document.body.appendChild(bell);
      var panel=document.createElement('div');panel.id='jptCustomerNoticePanel';panel.className='jpt-customer-notices';
      document.body.appendChild(panel);
      bell.onclick=function(){panel.classList.toggle('show');noticeUnread=0;updateCustomerBell()};
    }
    updateCustomerBell();
  }
  function updateCustomerBell(){
    var count=document.getElementById('jptCustomerBellCount'),panel=document.getElementById('jptCustomerNoticePanel');
    if(!count||!panel)return;
    count.textContent=String(noticeUnread);count.style.display=noticeUnread?'inline-grid':'none';
    panel.innerHTML=noticeItems.length?noticeItems.map(function(n){return '<div class="jpt-customer-notice"><b>'+esc(n.title)+'</b><span>'+esc(n.text)+'</span></div>'}).join(''):'<div class="jpt-customer-notice"><span>No new order notifications.</span></div>';
  }
  function addCustomerNotice(title,text){
    noticeItems.unshift({title:title,text:text});noticeItems=noticeItems.slice(0,8);
    noticeUnread=Math.min(9,noticeUnread+1);ensureCustomerBell();updateCustomerBell();
  }

  async function ensureCustomerNotifications(){
    try{
      if('serviceWorker' in navigator){
        await navigator.serviceWorker.register('./customer-app-sw.js?v=5',{scope:'./',updateViaCache:'none'});
      }
      if('Notification' in window && Notification.permission==='default'){
        try{await Notification.requestPermission()}catch(e){}
      }
    }catch(e){}
  }
  async function notifyCustomer(title,text,tag){
    try{
      if(!('Notification' in window) || Notification.permission!=='granted')return false;
      if('serviceWorker' in navigator){
        const reg=await navigator.serviceWorker.getRegistration('./');
        if(reg?.active){await reg.showNotification(title,{body:text,tag:tag||'jpt-customer-order',renotify:true,data:{order_no:load()?.order_no||''}});return true;}
      }
      try{new Notification(title,{body:text,tag:tag||'jpt-customer-order'});return true}catch(e){}
    }catch(e){}
    return false;
  }

  function ensureUI(){
    ensureStyle();
    var el=document.getElementById('jptOrderTracker');
    if(el)return el;
    el=document.createElement('section');el.id='jptOrderTracker';el.className='jpt-track';
    el.innerHTML='<div class="jpt-track-top"><div class="jpt-track-brand"><div id="jptTrackRestaurantName" class="jpt-track-title">Restaurant Partner</div><div id="jptTrackCode" class="jpt-track-code"></div></div><button id="jptTrackClose" class="jpt-track-close" type="button" aria-label="Close">✕</button></div><div id="jptTrackOutletAd" class="jpt-track-ad"></div><div id="jptTrackMap" class="jpt-track-map"></div><div id="jptTrackStatus" class="jpt-track-status"></div><div class="jpt-track-info">Order info &amp; instructions</div>';
    document.body.appendChild(el);
    el.querySelector('#jptTrackClose').onclick=function(){el.classList.remove('show')};
    ensureCustomerBell();
    return el;
  }

  function statusInfo(o){
    var s=String(o&&o.status||'new').toLowerCase().trim().replace(/\s+/g,'_');
    if(s==='delivered')return {title:'Delivered',sub:'Order received. Thank you!',step:5,done:true};
    if(s==='out_for_delivery'||s==='out_for_delivery_'||s==='out-for-delivery')return {title:'Out for delivery',sub:'Your order is on the way.',step:4};
    if(s==='ready')return {title:'Ready for delivery',sub:'Your order is ready. Delivery partner is on the delivery stage.',step:3,ready:true};
    if(s==='preparing')return {title:'Preparing your order',sub:'The restaurant is preparing your food.',step:2};
    if(s==='accepted')return {title:'Order confirmed',sub:'Restaurant accepted your order.',step:1};
    if(s==='cancelled'||s==='canceled'||s==='rejected')return {title:'Order cancelled',sub:'The restaurant did not accept this order.',step:0,cancelled:true};
    return {title:'Order received',sub:'Waiting for the restaurant to accept your order.',step:0};
  }

  function getPrepMinutes(o){
    var n=Number(o&&o.target_minutes);
    return n>0?n:15;
  }

  var outletMediaCache={};
  var outletMediaBusy={};
  var OUTLET_FALLBACK_NAMES={
    'JPT-001':'Jeet Punjabi Tadka',
    'SOP-002':'Shan-e-Punjab',
    'NME-004':'99 Meal Express',
    'PFA-003':'Punjabi Food Adda',
    'TOP-005':'Taste of Punjab'
  };
  async function loadOutletMedia(outletCode){
    outletCode=String(outletCode||'').trim();
    if(!outletCode)return null;
    if(outletMediaCache[outletCode])return outletMediaCache[outletCode];
    if(outletMediaBusy[outletCode])return outletMediaBusy[outletCode];
    var sb=getSb(); if(!sb)return null;
    outletMediaBusy[outletCode]=(async function(){
      try{
        var [ou,ca]=await Promise.all([
          sb.from('outlets').select('code,name,banner_url').eq('code',outletCode).maybeSingle(),
          sb.from('campaigns').select('id,outlet_id,title,active,banner_url,video_url,start_at,end_at,priority,schedule_json,created_at').eq('outlet_id',outletCode).eq('active',true).order('priority',{ascending:false}).order('created_at',{ascending:false}).limit(20)
        ]);
        var outlet=ou.error?null:ou.data;
        var now=Date.now();
        var campaigns=(ca.error?[]:(ca.data||[])).filter(function(row){
          var s=row.start_at?Date.parse(row.start_at):-Infinity,e=row.end_at?Date.parse(row.end_at):Infinity;
          if(!(s<=now&&now<=e))return false;
          var j=row.schedule_json||{};
          return j.surface==='customer_outlet_showcase' && (j.placement==='FIRST'||j.placement==null);
        });
        var row=campaigns[0]||null;
        var media=row?.video_url||row?.banner_url||outlet?.banner_url||'';
        var data={code:outletCode,name:outlet?.name||OUTLET_FALLBACK_NAMES[outletCode]||'Restaurant Partner',url:media,isVideo:!!row?.video_url,title:row?.title||outlet?.name||OUTLET_FALLBACK_NAMES[outletCode]||'Restaurant Partner'};
        outletMediaCache[outletCode]=data;
        return data;
      }catch(e){
        var fallback={code:outletCode,name:OUTLET_FALLBACK_NAMES[outletCode]||'Restaurant Partner',url:'',isVideo:false,title:OUTLET_FALLBACK_NAMES[outletCode]||'Restaurant Partner'};
        outletMediaCache[outletCode]=fallback; return fallback;
      }finally{delete outletMediaBusy[outletCode]}
    })();
    return outletMediaBusy[outletCode];
  }
  function paintOutletMedia(data){
    var host=document.getElementById('jptTrackOutletAd');
    var name=document.getElementById('jptTrackRestaurantName');
    if(!host)return;
    data=data||{};
    if(name)name.textContent=data.name||'Restaurant Partner';
    if(!data.url){
      host.innerHTML='<div class="jpt-track-ad-empty"><b>'+esc(data.name||'Restaurant Partner')+'</b><span>Official restaurant promotion</span></div>';
      return;
    }
    if(data.isVideo){
      host.innerHTML='<video class="jpt-track-ad-media" autoplay muted loop playsinline preload="metadata" src="'+esc(data.url)+'"></video><div class="jpt-track-ad-label">'+esc(data.name||'Restaurant Partner')+'</div>';
    }else{
      host.innerHTML='<img class="jpt-track-ad-media" src="'+esc(data.url)+'" alt="'+esc(data.title||data.name||'Restaurant advertisement')+'" loading="eager"><div class="jpt-track-ad-label">'+esc(data.name||'Restaurant Partner')+'</div>';
    }
  }

  function getReadySince(o){
    var key=readySinceKey+'_'+String(o.order_no||'');
    try{
      var saved=Number(localStorage.getItem(key)||0);
      if(saved>0)return saved;
      var now=Date.now();
      localStorage.setItem(key,String(now));
      return now;
    }catch(e){return Date.now()}
  }

  function etaFor(o,info){
    var status=String(o&&o.status||'').toLowerCase();
    var prep=getPrepMinutes(o);
    if(status==='accepted'||status==='preparing'){
      if(o.deadline_at){
        var prepLeft=Math.max(0,new Date(o.deadline_at).getTime()-Date.now());
        return {leftMs:prepLeft+DELIVERY_BUFFER*60000, label:'Estimated arrival up to '+(moneyMinutes(prep+DELIVERY_BUFFER))+' minutes', note:prep+' min preparation + up to '+DELIVERY_BUFFER+' min delivery buffer'};
      }
      return {leftMs:(prep+DELIVERY_BUFFER)*60000,label:'Estimated arrival up to '+(prep+DELIVERY_BUFFER)+' minutes',note:prep+' min preparation + up to '+DELIVERY_BUFFER+' min delivery buffer'};
    }
    if(status==='ready'){
      var rs=getReadySince(o);
      var left=Math.max(0,rs+DELIVERY_BUFFER*60000-Date.now());
      return {leftMs:left,label:'Estimated arrival up to '+DELIVERY_BUFFER+' minutes',note:'Order ready + up to '+DELIVERY_BUFFER+' min delivery buffer'};
    }
    if(status==='out_for_delivery'){
      var rs2=getReadySince(o);
      var left2=Math.max(0,rs2+DELIVERY_BUFFER*60000-Date.now());
      return {leftMs:left2,label:'Delivery countdown',note:'Up to '+DELIVERY_BUFFER+' min delivery buffer after READY'};
    }
    if(status==='new'){
      return {leftMs:(prep+DELIVERY_BUFFER)*60000,label:'Estimated arrival up to '+(prep+DELIVERY_BUFFER)+' minutes',note:'Initial estimate: preparation + up to '+DELIVERY_BUFFER+' min delivery buffer'};
    }
    return null;
  }

  function countdownText(ms){
    var sec=Math.max(0,Math.floor(ms/1000)),mm=Math.floor(sec/60),ss=sec%60;
    return String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');
  }

  function render(o){
    var el=ensureUI(),info=statusInfo(o||{}),steps=['Received','Confirmed','Preparing','Ready','Out for delivery','Delivered'];
    var outletCode=String(o&&o.outlet_id||'').trim();
    var mapHost=el.querySelector('#jptTrackMap');
    var clat=Number(o&&o.delivery_lat),clng=Number(o&&o.delivery_lng);
    if(Number.isFinite(clat)&&Number.isFinite(clng)&&Math.abs(clat)<=90&&Math.abs(clng)<=180){
      var mapUrl='https://www.openstreetmap.org/export/embed.html?bbox='+(clng-0.01)+'%2C'+(clat-0.01)+'%2C'+(clng+0.01)+'%2C'+(clat+0.01)+'&layer=mapnik&marker='+clat+'%2C'+clng;
      if(mapHost)mapHost.innerHTML='<iframe title="Delivery map" loading="eager" src="'+mapUrl+'"></iframe>';
    }else if(mapHost)mapHost.innerHTML='<div style="height:100%;display:grid;place-items:center;color:#777;font-weight:800">Delivery location will appear here</div>';

    var html='<div class="jpt-track-status-head"><div class="jpt-track-status-copy">';
    var eta=etaFor(o,info);
    if(eta){
      var left=Math.max(0,eta.leftMs);
      html+='<div style="color:#159866;font-size:13px;font-weight:1000;margin-bottom:5px">'+(left>0?'✓ ON TIME':'')+'</div>';
    }
    html+='<div style="font-size:25px;font-weight:1000;letter-spacing:-.6px">'+esc(info.title)+'</div><div class="jpt-track-sub">'+esc(info.sub)+'</div></div>';

    if(!info.cancelled && eta){
      html+='<div class="jpt-track-eta"><div class="jpt-track-eta-title">'+esc(eta.label)+'</div><div id="jptEtaCountdown" class="jpt-track-eta-time">'+countdownText(eta.leftMs)+'</div><div class="jpt-track-eta-note">mins</div></div>';
    }
    html+='</div>';

    if(!info.cancelled){
      if(!eta && info.step<1)html+='<div class="jpt-track-sub jpt-track-wait" style="margin-top:10px">Waiting for restaurant acceptance…</div>';
      html+='<div style="margin-top:14px">'+steps.map(function(x,i){return '<div class="jpt-track-line"><span class="jpt-track-dot '+(i<=info.step?'on':'')+'"></span><span style="font-weight:'+(i<=info.step?'900':'600')+'">'+esc(x)+'</span></div>'}).join('')+'</div>';
    }

    var rlat=Number(o&&o.rider_lat),rlng=Number(o&&o.rider_lng);
    if(Number.isFinite(rlat)&&Number.isFinite(rlng)&&Math.abs(rlat)<=90&&Math.abs(rlng)<=180){
      var riderMapUrl='https://www.openstreetmap.org/?mlat='+rlat+'&mlon='+rlng+'#map=16/'+rlat+'/'+rlng;
      html+='<div class="jpt-track-sub" style="margin-top:10px">🚴 Rider live location available • <a target="_blank" rel="noopener" href="'+riderMapUrl+'">Open</a></div>';
    }else if(o&&o.assignment_status){
      html+='<div class="jpt-track-sub" style="margin-top:10px">🚴 Rider live location will appear after GPS sharing.</div>';
    }

    if(info.ready)html+='<button id="jptConfirmDelivery" class="jpt-track-btn" type="button">I RECEIVED MY ORDER</button>';
    if(info.done)html+='<div class="jpt-track-done" style="margin-top:10px">✅ Delivery confirmed</div>';
    if(info.cancelled)html+='<div style="margin-top:10px;color:#b64d43;font-size:12px">This order is no longer active.</div>';

    el.querySelector('#jptTrackCode').textContent=o&&o.order_no?o.order_no:'';
    el.querySelector('#jptTrackStatus').innerHTML=html;
    el.classList.add('show');
    loadOutletMedia(outletCode).then(paintOutletMedia);

    var b=document.getElementById('jptConfirmDelivery');
    if(b)b.onclick=async function(){
      b.disabled=true;b.textContent='Confirming…';
      try{
        var sb=getSb();if(!sb)throw new Error('Supabase client unavailable');
        var r=await sb.rpc('confirm_customer_delivery',{p_order_no:o.order_no,p_phone:o.phone});
        if(r.error)throw r.error;
        var ok=Array.isArray(r.data)?(r.data[0]?.ok===true):r.data===true;
        if(!ok){b.disabled=false;b.textContent='I RECEIVED MY ORDER';return}
        o.status='delivered';save(o);render(o);
      }catch(e){b.disabled=false;b.textContent='I RECEIVED MY ORDER';if(typeof window.toast==='function')window.toast('Delivery confirmation failed. Please try again.')}
    };
  }

  async function poll(){
    var o=load();if(!o||!o.order_no||!o.phone)return;
    try{
      var sb=getSb();if(!sb)return;
      var r=await sb.rpc('get_customer_order',{p_order_no:o.order_no,p_phone:o.phone});
      if(r.error)return;
      var row=Array.isArray(r.data)?r.data[0]:r.data;
      if(row){
        var nextStatus=String(row.status||'').toLowerCase().trim().replace(/\s+/g,'_');
        if(!lastStatus){addCustomerNotice('Order placed','Your order is saved and waiting for restaurant acceptance.');notifyCustomer('JPT — Order placed','Your order is saved and waiting for restaurant acceptance.','jpt-order-placed-'+o.order_no);}
        else if(nextStatus!==lastStatus){var titles={accepted:'Order accepted',preparing:'Order is being prepared',ready:'Order is READY',out_for_delivery:'Order is out for delivery',delivered:'Order delivered',cancelled:'Order cancelled'};var nt=titles[nextStatus]||'Order status updated';addCustomerNotice(nt,statusInfo(row).sub);notifyCustomer('JPT — '+nt,statusInfo(row).sub,'jpt-order-status-'+o.order_no+'-'+nextStatus);}
        if(lastStatus && lastStatus!=='accepted' && nextStatus==='accepted') playCustomerAcceptedTone();
        lastStatus=nextStatus;
        var tr=await sb.rpc('get_customer_delivery_tracking',{p_order_no:o.order_no,p_phone:o.phone});
        var tracking=tr.error?{}:(Array.isArray(tr.data)?tr.data[0]:tr.data)||{};
        var nextAssignment=String(tracking.assignment_status||'');
        if(nextAssignment && nextAssignment!==lastAssignmentStatus){var at='',ab='';if(nextAssignment==='accepted'){at='Delivery partner assigned';ab='A rider has been assigned to your order.';}else if(nextAssignment==='picked_up'){at='Order picked up';ab='Your delivery partner has picked up the order.';}else if(nextAssignment==='out_for_delivery'){at='Rider is on the way';ab='Your order is out for delivery.';}if(at){addCustomerNotice(at,ab);notifyCustomer('JPT — '+at,ab,'jpt-order-assignment-'+o.order_no+'-'+nextAssignment);}}
        if(nextAssignment && nextAssignment!==lastAssignmentStatus && nextAssignment==='accepted') playCustomerAcceptedTone();
        lastAssignmentStatus=nextAssignment;
        o=Object.assign({},o,row,tracking);save(o);render(o);
        if(nextStatus==='delivered'){
          active=false;if(timer){clearInterval(timer);timer=null}
        }
      }
    }catch(e){}
  }

  function start(){if(active)return;active=true;poll();timer=setInterval(poll,POLL_MS)}

  function hook(){
    if(typeof window.placeOrder!=='function')return false;
    if(window.placeOrder.__jptV106TrackingV4)return true;
    var original=window.placeOrder;
    window.placeOrder=async function(){
      var phone=(document.getElementById('phone')?.value||'').trim();
      var fixed=Date.now(),expected='JPT-'+String(fixed).slice(-7),nativeNow=Date.now;
      try{
        Date.now=function(){return fixed};
        var result=await original.apply(this,arguments);
        var sb=getSb(),found=null;
        if(sb&&phone){
          try{
            var r=await sb.rpc('get_customer_order',{p_order_no:expected,p_phone:phone});
            if(!r.error)found=Array.isArray(r.data)?r.data[0]:r.data;
          }catch(e){}
        }
        if(found){save(Object.assign({order_no:expected,phone:phone,created_at:new Date(fixed).toISOString()},found));ensureUI();start()}
        return result;
      }finally{Date.now=nativeNow}
    };
    window.placeOrder.__jptV106TrackingV4=true;
    return true;
  }

  function boot(){
    try{if('serviceWorker' in navigator)navigator.serviceWorker.register('./customer-app-sw.js?v=5',{scope:'./',updateViaCache:'none'}).catch(function(){})}catch(e){}
    var tries=0;
    var t=setInterval(function(){tries++;if(hook()||tries>120)clearInterval(t)},250);
    var old=load();if(old&&old.order_no&&old.phone){render(old);start()}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
