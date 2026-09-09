/* Jeet Punjabi Tadka V106 — UPI FIRST launch lock
   UPI payment flow comes before WhatsApp.
   Existing order/payment verification logic remains untouched.
*/
(function(){
  'use strict';

  var originalPlaceOrder = null;
  var wrapped = false;
  var pendingWhatsAppUrl = '';
  var suppressUntil = 0;

  function forceUPI(){
    var p=document.getElementById('payment');
    if(!p) return;

    Array.prototype.slice.call(p.options||[]).forEach(function(o){
      if(
        String(o.value||'').toUpperCase()==='COD' ||
        /cash\s*on\s*delivery/i.test(o.textContent||'')
      ){
        o.remove();
      }
    });

    p.value='UPI';
    p.disabled=true;
    p.setAttribute('aria-disabled','true');
    p.title='UPI payment is required for launch';

    var box=p.parentElement;
    if(box && !box.querySelector('.jpt-upi-required')){
      var n=document.createElement('div');
      n.className='jpt-upi-required';
      n.style.cssText=
        'margin-top:7px;padding:9px 10px;border:1px solid #d8ae42;' +
        'border-radius:9px;background:#17130a;color:#f4d77a;' +
        'font-size:12px;font-weight:800';

      n.textContent=
        'UPI payment required. Complete payment first. ' +
        'Restaurant verifies the payment before accepting the order.';

      box.appendChild(n);
    }
  }

  function installUPIFirst(){
    if(wrapped || typeof window.placeOrder!=='function') return;

    originalPlaceOrder=window.placeOrder;
    if(typeof originalPlaceOrder!=='function') return;

    window.placeOrder=async function(){
      var oldOpen=window.open;

      window.open=function(url){
        var u=String(url||'');

        if(/^https?:\/\/wa\.me\//i.test(u)){
          pendingWhatsAppUrl=u;
          suppressUntil=Date.now()+5000;
          return null;
        }

        return oldOpen.apply(window,arguments);
      };

      try{
        return await originalPlaceOrder.apply(this,arguments);
      }finally{
        setTimeout(function(){
          if(Date.now()>=suppressUntil){
            window.open=oldOpen;
          }
        },5100);
      }
    };

    wrapped=true;
  }

  function restoreWhatsAppAfterPayment(){
    if(!pendingWhatsAppUrl) return;
    if(Date.now()<suppressUntil) return;

    var url=pendingWhatsAppUrl;
    pendingWhatsAppUrl='';

    try{
      window.open(url,'_blank');
    }catch(e){
      /* no-op */
    }
  }

  function boot(){
    forceUPI();
    installUPIFirst();

    var mo=new MutationObserver(function(){
      forceUPI();
      installUPIFirst();
    });

    mo.observe(document.documentElement,{
      subtree:true,
      childList:true
    });

    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible'){
        setTimeout(restoreWhatsAppAfterPayment,600);
      }
    });

    window.addEventListener('pageshow',function(){
      setTimeout(restoreWhatsAppAfterPayment,600);
    });

    setInterval(function(){
      forceUPI();
      installUPIFirst();
      restoreWhatsAppAfterPayment();
    },1500);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot);
  }else{
    boot();
  }

})();
