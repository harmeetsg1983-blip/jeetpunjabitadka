/* Jeet Punjabi Tadka V106 — temporary UPI-only launch guard.
   Manual payment verification remains the source of truth.
*/
(function(){
  'use strict';
  function forceUPI(){
    var p=document.getElementById('payment');
    if(!p) return;
    Array.prototype.slice.call(p.options||[]).forEach(function(o){
      if(String(o.value||'').toUpperCase()==='COD' || /cash\s*on\s*delivery/i.test(o.textContent||'')){
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
      n.style.cssText='margin-top:7px;padding:9px 10px;border:1px solid #d8ae42;border-radius:9px;background:#17130a;color:#f4d77a;font-size:12px;font-weight:800';
      n.textContent='UPI payment required. Restaurant verifies the payment before accepting the order.';
      box.appendChild(n);
    }
  }
  function boot(){
    forceUPI();
    var mo=new MutationObserver(forceUPI);
    mo.observe(document.documentElement,{subtree:true,childList:true});
    setInterval(forceUPI,1500);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
