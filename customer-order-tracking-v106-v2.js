/* JPT V106 — CUSTOMER ORDER TRACKING BRIDGE
   Additive module. Does not replace menu/cart/payment core.
   Uses existing secure Supabase RPCs:
   - get_customer_order(order_no, phone)
   - confirm_customer_delivery(order_no, phone)
*/
(function(){
  'use strict';

  var KEY='jpt_v106_last_order';
  var POLL_MS=4000;
  var timer=null;
  var active=false;
  var sbClient=null;

  function getSb(){
    if(sbClient) return sbClient;
    try{
      if(window.supabase && window.JPT_SUPABASE_URL && window.JPT_SUPABASE_PUBLISHABLE_KEY){
        sbClient=window.supabase.createClient(window.JPT_SUPABASE_URL,window.JPT_SUPABASE_PUBLISHABLE_KEY);
      }
    }catch(e){ sbClient=null; }
    return sbClient;
  }

  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g,function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }
  function money(n){
    return '₹'+Math.max(0,Math.round(Number(n||0))).toLocaleString('en-IN');
  }
  function load(){
    try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}
  }
  function save(x){
    try{localStorage.setItem(KEY,JSON.stringify(x))}catch(e){}
  }
  function clear(){
    try{localStorage.removeItem(KEY)}catch(e){}
  }

  function ensureStyle(){
    if(document.getElementById('jptTrackStyle')) return;
    var s=document.createElement('style');
    s.id='jptTrackStyle';
    s.textContent=
      '.jpt-track{position:fixed;left:50%;bottom:76px;transform:translateX(-50%);width:min(492px,calc(100% - 28px));z-index:180;background:#111;border:1px solid #d8ae42;border-radius:16px;box-shadow:0 10px 35px #000b;color:#fff;padding:14px;display:none}.jpt-track.show{display:block}.jpt-track-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.jpt-track-title{font-weight:1000;color:#f4d77a;font-size:16px}.jpt-track-code{font-weight:950;color:#fff;font-size:12px}.jpt-track-close{background:#211b0d;border:1px solid #5b471c;color:#f4d77a;border-radius:8px;padding:6px 9px}.jpt-track-status{margin-top:10px;padding:10px;border-radius:10px;background:#171717;border:1px solid #332b1b}.jpt-track-line{display:flex;align-items:center;gap:8px;margin:8px 0}.jpt-track-dot{width:10px;height:10px;border-radius:50%;background:#555;flex:none}.jpt-track-dot.on{background:#d8ae42;box-shadow:0 0 9px #d8ae42}.jpt-track-sub{font-size:11px;color:#aaa;line-height:1.4}.jpt-track-btn{width:100%;margin-top:10px;padding:11px;border:0;border-radius:10px;background:#f4d77a;color:#111;font-weight:1000}.jpt-track-wait{color:#f4d77a;font-weight:900}.jpt-track-done{color:#7be19a;font-weight:900}';
    document.head.appendChild(s);
  }

  function ensureUI(){
    ensureStyle();
    var el=document.getElementById('jptOrderTracker');
    if(el) return el;
    el=document.createElement('section');
    el.id='jptOrderTracker';
    el.className='jpt-track';
    el.innerHTML=
      '<div class="jpt-track-top"><div><div class="jpt-track-title">📦 Your Order</div><div id="jptTrackCode" class="jpt-track-code"></div></div><button id="jptTrackClose" class="jpt-track-close" type="button">✕</button></div>'+
      '<div id="jptTrackStatus" class="jpt-track-status"></div>';
    document.body.appendChild(el);
    el.querySelector('#jptTrackClose').onclick=function(){
      el.classList.remove('show');
    };
    return el;
  }

  function statusInfo(o){
    var s=String(o&&o.status||'new').toLowerCase();
    if(s==='delivered') return {title:'Delivered',sub:'Order received. Thank you!',step:4,done:true};
    if(s==='ready') return {title:'Ready for delivery',sub:'Your order is ready. Please confirm when you receive it.',step:3,ready:true};
    if(s==='preparing') return {title:'Preparing your order',sub:'The restaurant is preparing your food.',step:2};
    if(s==='accepted') return {title:'Order confirmed',sub:'Restaurant accepted your order.',step:1};
    if(s==='cancelled'||s==='rejected') return {title:'Order cancelled',sub:'The restaurant did not accept this order.',step:0,cancelled:true};
    return {title:'Order received',sub:'Waiting for the restaurant to accept your order.',step:0};
  }

  function render(o){
    var el=ensureUI();
    var info=statusInfo(o||{});
    var steps=['Received','Confirmed','Preparing','Ready'];
    var html='<div style="font-weight:950">'+esc(info.title)+'</div><div class="jpt-track-sub">'+esc(info.sub)+'</div>';
    if(o&&o.deadline_at && (String(o.status||'').toLowerCase()==='accepted'||String(o.status||'').toLowerCase()==='preparing')){
      var left=Math.max(0,new Date(o.deadline_at).getTime()-Date.now());
      var mm=Math.floor(left/60000),ss=Math.floor((left%60000)/1000);
      html+='<div class="jpt-track-sub" style="margin-top:7px">⏱ Restaurant target: '+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0')+'</div>';
    } else if(info.step<1 && !info.cancelled){
      html+='<div class="jpt-track-sub jpt-track-wait" style="margin-top:7px">Waiting for restaurant acceptance…</div>';
    }
    if(!info.cancelled){
      html+='<div style="margin-top:10px">'+steps.map(function(x,i){
        return '<div class="jpt-track-line"><span class="jpt-track-dot '+(i<=info.step?'on':'')+'"></span><span>'+esc(x)+'</span></div>';
      }).join('')+'</div>';
    }
    if(info.ready){
      html+='<button id="jptConfirmDelivery" class="jpt-track-btn" type="button">I RECEIVED MY ORDER</button>';
    }
    if(info.done){
      html+='<div class="jpt-track-done" style="margin-top:8px">✅ Delivery confirmed</div>';
    }
    if(info.cancelled){
      html+='<div style="margin-top:8px;color:#ff9b8f;font-size:12px">This order is no longer active.</div>';
    }
    el.querySelector('#jptTrackCode').textContent=o&&o.order_no?o.order_no:'';
    el.querySelector('#jptTrackStatus').innerHTML=html;
    el.classList.add('show');

    var b=document.getElementById('jptConfirmDelivery');
    if(b){
      b.onclick=async function(){
        b.disabled=true;
        b.textContent='Confirming…';
        try{
          var sb=getSb();
          if(!sb) throw new Error('Supabase client unavailable');
          var r=await sb.rpc('confirm_customer_delivery',{
            p_order_no:o.order_no,
            p_phone:o.phone
          });
          if(r.error) throw r.error;
          var ok=Array.isArray(r.data)?(r.data[0]?.ok===true):r.data===true;
          if(!ok){b.disabled=false;b.textContent='I RECEIVED MY ORDER';return}
          o.status='delivered';
          save(o);
          render(o);
        }catch(e){
          b.disabled=false;
          b.textContent='I RECEIVED MY ORDER';
          if(typeof window.toast==='function') window.toast('Delivery confirmation failed. Please try again.');
        }
      };
    }
  }

  async function poll(){
    var o=load();
    if(!o||!o.order_no||!o.phone) return;
    try{
      var sb=getSb();
      if(!sb) return;
      var r=await sb.rpc('get_customer_order',{
        p_order_no:o.order_no,
        p_phone:o.phone
      });
      if(r.error) return;
      var row=Array.isArray(r.data)?r.data[0]:r.data;
      if(row){
        o=Object.assign(o,row);
        save(o);
        render(o);
        if(String(row.status||'').toLowerCase()==='delivered'){
          active=false;
          if(timer){clearInterval(timer);timer=null}
        }
      }
    }catch(e){}
  }

  function start(){
    if(active) return;
    active=true;
    poll();
    timer=setInterval(poll,POLL_MS);
  }

  function hook(){
    if(typeof window.placeOrder!=='function') return false;
    if(window.placeOrder.__jptV106Tracking) return true;

    var original=window.placeOrder;
    window.placeOrder=async function(){
      var phone=(document.getElementById('phone')?.value||'').trim();
      var fixed=Date.now();
      var expected='JPT-'+String(fixed).slice(-7);
      var nativeNow=Date.now;
      try{
        Date.now=function(){return fixed};
        var result=await original.apply(this,arguments);
        // Confirm the order actually exists before saving a tracking record.
        // This prevents invalid/empty checkout attempts from creating a fake tracker.
        var sb=getSb();
        var found=null;
        if(sb && phone){
          try{
            var r=await sb.rpc('get_customer_order',{p_order_no:expected,p_phone:phone});
            if(!r.error) found=Array.isArray(r.data)?r.data[0]:r.data;
          }catch(e){}
        }
        if(found){
          save(Object.assign({order_no:expected,phone:phone,created_at:new Date(fixed).toISOString()},found));
          ensureUI();
          start();
        }
        return result;
      }finally{
        Date.now=nativeNow;
      }
    };
    window.placeOrder.__jptV106Tracking=true;
    return true;
  }

  function boot(){
    var tries=0;
    var t=setInterval(function(){
      tries++;
      if(hook()||tries>120) clearInterval(t);
    },250);
    var old=load();
    if(old&&old.order_no&&old.phone){
      render(old);
      start();
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
