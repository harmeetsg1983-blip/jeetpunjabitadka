/* JPT V106 — DELIVERY LOCATION + HANDOVER MODULE
   Additive module. Customer: consent-based one-time GPS pin per order.
   Partner: map/share + secure 6-digit handover verification.
*/
(function(){
  'use strict';
  if(window.__JPT_V106_DELIVERY_LOCATION_HANDOVER__) return;
  window.__JPT_V106_DELIVERY_LOCATION_HANDOVER__=true;

  var isPartner=!!document.getElementById('ordersList');
  var isCustomer=!isPartner;
  var pendingLocation=null;
  var trackingKey='jpt_v106_pending_delivery_location';

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function toast(msg){
    if(typeof window.toast==='function'){window.toast(msg);return}
    var x=document.createElement('div');x.textContent=msg;x.style.cssText='position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;background:#f4d77a;color:#111;padding:11px 15px;border-radius:12px;font:800 13px system-ui;box-shadow:0 8px 25px #0008';document.body.appendChild(x);setTimeout(function(){x.remove()},2500);
  }
  function sb(){
    try{if(window.supabase&&window.JPT_SUPABASE_URL&&window.JPT_SUPABASE_PUBLISHABLE_KEY)return window.supabase.createClient(window.JPT_SUPABASE_URL,window.JPT_SUPABASE_PUBLISHABLE_KEY)}catch(e){}
    return null;
  }

  function customerBoot(){
    var address=document.getElementById('address');
    if(!address) return setTimeout(customerBoot,300);
    var box=document.createElement('div');box.id='jptDeliveryLocationBox';box.style.cssText='margin-top:8px;padding:10px;border:1px solid #4b3b1e;border-radius:10px;background:#111';
    box.innerHTML='<button id="jptUseLocation" type="button" style="width:100%;padding:11px;border:0;border-radius:10px;background:#f4d77a;color:#111;font-weight:1000">📍 Use Current Location</button><div id="jptLocationState" style="font-size:11px;color:#aaa;margin-top:7px">Location is requested only after you tap the button.</div>';
    address.parentNode.appendChild(box);
    var state=box.querySelector('#jptLocationState');
    box.querySelector('#jptUseLocation').onclick=function(){
      if(!navigator.geolocation){toast('This device does not provide location access.');return}
      state.textContent='Requesting location permission…';
      navigator.geolocation.getCurrentPosition(function(pos){
        pendingLocation={lat:Number(pos.coords.latitude),lng:Number(pos.coords.longitude),at:new Date().toISOString()};
        try{sessionStorage.setItem(trackingKey,JSON.stringify(pendingLocation))}catch(e){}
        state.innerHTML='✅ Delivery location confirmed for this order.';
        toast('Delivery location confirmed.');
      },function(){state.textContent='Location permission was not granted. Please allow location to continue.';toast('Please allow location permission for delivery.');},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
    };

    var tries=0;
    var timer=setInterval(function(){
      tries++;
      if(typeof window.placeOrder!=='function'){if(tries>120)clearInterval(timer);return}
      if(window.placeOrder.__jptV106DeliveryLocation) {clearInterval(timer);return}
      var original=window.placeOrder;
      window.placeOrder=async function(){
        var loc=pendingLocation;
        try{if(!loc){var raw=sessionStorage.getItem(trackingKey);if(raw)loc=JSON.parse(raw)} }catch(e){}
        if(!loc){toast('Please tap “Use Current Location” before placing the delivery order.');return}
        var phone=(document.getElementById('phone')?.value||'').trim();
        if(!phone){toast('Please enter your mobile number first.');return}
        var fixed=Date.now(), nativeNow=Date.now, expected='JPT-'+String(fixed).slice(-7);
        try{
          Date.now=function(){return fixed};
          var result=await original.apply(this,arguments);
          var client=sb();
          if(client){
            var r=await client.rpc('save_customer_delivery_location',{p_order_no:expected,p_phone:phone,p_lat:loc.lat,p_lng:loc.lng});
            if(r.error||!(Array.isArray(r.data)?r.data[0]?.ok===true:r.data===true)) toast('Order placed, but location could not be attached. Please contact the restaurant.');
          }
          try{sessionStorage.removeItem(trackingKey)}catch(e){}
          pendingLocation=null;
          return result;
        }finally{Date.now=nativeNow}
      };
      window.placeOrder.__jptV106DeliveryLocation=true;
      clearInterval(timer);
    },250);
  }

  function partnerBoot(){
    var frameWindow=window;
    function getClient(){return sb()}
    function mapUrl(lat,lng){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(lat+','+lng)}
    async function verify(orderNo,code,button){
      button.disabled=true;button.textContent='VERIFYING…';
      try{
        var client=getClient();if(!client)throw new Error('Supabase unavailable');
        var r=await client.rpc('verify_delivery_handover',{p_order_no:orderNo,p_code:code});
        var ok=Array.isArray(r.data)?r.data[0]?.ok===true:r.data===true;
        if(r.error||!ok)throw new Error(r.error?.message||'Invalid code');
        button.textContent='✅ HANDOVER VERIFIED';button.disabled=true;
        toast('Delivery handover verified.');
      }catch(e){button.disabled=false;button.textContent='VERIFY CODE';toast('Invalid code or order is not ready.');}
    }
    async function enhance(){
      var list=document.getElementById('ordersList');if(!list)return;
      var cards=list.querySelectorAll('.order');
      for(var i=0;i<cards.length;i++){
        var card=cards[i];if(card.querySelector('.jpt-delivery-tools'))continue;
        var m=(card.textContent||'').match(/JPT-[A-Za-z0-9-]+/);if(!m)continue;
        var orderNo=m[0];
        var client=getClient();if(!client)continue;
        var q=await client.from('orders').select('order_no,status,delivery_lat,delivery_lng,delivery_code,delivery_handover_verified,customer_confirmed').eq('order_no',orderNo).maybeSingle();
        if(q.error||!q.data)continue;
        var o=q.data, box=document.createElement('div');box.className='jpt-delivery-tools';box.style.cssText='margin-top:10px;padding:10px;border:1px solid #4b3b1e;border-radius:12px;background:#17130d';
        var html='<div style="font-weight:1000;color:#f4d77a;margin-bottom:7px">🚚 DELIVERY HANDOVER</div>';
        if(o.delivery_lat!=null&&o.delivery_lng!=null){
          html+='<div style="font-size:12px;color:#ddd;margin-bottom:7px">📍 Customer delivery location available</div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="btn primary jpt-map" type="button">🗺️ OPEN MAP</button><button class="btn dark jpt-share" type="button">📤 SHARE LOCATION</button></div>';
        }else html+='<div style="font-size:12px;color:#aaa">📍 Customer has not confirmed a GPS delivery location.</div>';
        if(String(o.status).toLowerCase()==='ready'){
          if(o.delivery_handover_verified){html+='<div style="margin-top:9px;color:#7be19a;font-weight:1000">✅ HANDOVER VERIFIED</div>'}
          else html+='<div style="display:flex;gap:7px;margin-top:9px"><input class="jpt-code" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="flex:1;min-width:0;padding:10px;border-radius:9px;border:1px solid #4a3b22;background:#0e0e0e;color:#fff"><button class="btn primary jpt-verify" type="button">VERIFY CODE</button></div>';
        }
        if(o.customer_confirmed||String(o.status).toLowerCase()==='delivered')html+='<div style="margin-top:9px;color:#7be19a;font-weight:1000">✅ CUSTOMER RECEIVED — ORDER CLOSED</div>';
        box.innerHTML=html;card.appendChild(box);
        if(o.delivery_lat!=null&&o.delivery_lng!=null){
          var u=mapUrl(o.delivery_lat,o.delivery_lng);box.querySelector('.jpt-map').onclick=function(){window.open(u,'_blank','noopener')};
          box.querySelector('.jpt-share').onclick=async function(){try{if(navigator.share){await navigator.share({title:'JPT Delivery Location',text:'Customer delivery location',url:u})}else{await navigator.clipboard.writeText(u);toast('Map link copied.')}}catch(e){}};
        }
        var vb=box.querySelector('.jpt-verify');if(vb)vb.onclick=function(){verify(orderNo,box.querySelector('.jpt-code').value.trim(),vb)};
      }
    }
    var list=document.getElementById('ordersList');if(list){new MutationObserver(function(){enhance()}).observe(list,{childList:true,subtree:true});enhance();setInterval(enhance,5000)}
  }

  function customerCodeBoot(){
    var timer=setInterval(async function(){
      var raw=null;try{raw=localStorage.getItem('jpt_v106_last_order')}catch(e){}
      if(!raw)return;
      var o;try{o=JSON.parse(raw)}catch(e){return}
      if(!o||!o.order_no||!o.phone)return;
      var tracker=document.getElementById('jptOrderTracker');if(!tracker)return;
      var client=sb();if(!client)return;
      try{
        var r=await client.rpc('get_customer_order',{p_order_no:o.order_no,p_phone:o.phone});
        var row=Array.isArray(r.data)?r.data[0]:r.data;if(!row||!row.delivery_code)return;
        var old=tracker.querySelector('.jpt-customer-code');
        if(old)old.remove();
        if(String(row.status||'').toLowerCase()==='ready'||String(row.status||'').toLowerCase()==='delivered'){
          var box=document.createElement('div');box.className='jpt-customer-code';box.style.cssText='margin-top:10px;padding:12px;border:1px solid #d8ae42;border-radius:12px;background:#17130d;text-align:center';
          box.innerHTML='<div style="font-size:11px;color:#aaa">DELIVERY HANDOVER CODE</div><div style="font-size:28px;font-weight:1000;letter-spacing:5px;color:#f4d77a;margin-top:3px">'+esc(row.delivery_code)+'</div><div style="font-size:10px;color:#aaa;margin-top:4px">Tell this code only to the delivery partner at handover.</div>';
          var st=tracker.querySelector('#jptTrackStatus');if(st)st.appendChild(box);
        }
      }catch(e){}
    },2500);
    setTimeout(function(){clearInterval(timer)},24*60*60*1000);
  }

  if(isCustomer){ customerBoot(); customerCodeBoot(); }
  else partnerBoot();
})();
