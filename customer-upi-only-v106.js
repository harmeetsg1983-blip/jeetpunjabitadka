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

    // TEMPORARY TEST MODE: restore COD for controlled end-to-end order testing.
    // Final launch can disable COD again from this single gate when explicitly requested.
    var cod=null;
    Array.prototype.slice.call(p.options||[]).forEach(function(o){
      if(String(o.value||'').toUpperCase()==='COD' || /cash\s*on\s*delivery/i.test(o.textContent||'')){
        cod=o;
      }
    });
    if(!cod){
      cod=document.createElement('option');
      cod.value='COD';
      cod.textContent='Cash on Delivery';
      p.insertBefore(cod,p.firstChild||null);
    }
    p.disabled=false;
    p.removeAttribute('aria-disabled');
    p.title='Cash on Delivery is temporarily enabled for controlled testing';

    var note=p.parentElement&&p.parentElement.querySelector('.jpt-upi-required');
    if(note)note.remove();
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
