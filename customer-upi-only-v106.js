/* JPT V107 — COD ENABLED FOR LIVE TESTING
   Keeps the existing payment selector and permits COD + UPI.
   No payment-success spoofing. Restaurant/payment verification rules remain server-side.
*/
(function(){
'use strict';
function enableCOD(){
 const p=document.getElementById('payment');
 if(!p)return;
 let cod=Array.from(p.options||[]).find(o=>String(o.value||'').toUpperCase()==='COD'||/cash\s*on\s*delivery/i.test(o.textContent||''));
 if(!cod){
   cod=document.createElement('option');
   cod.value='COD';cod.textContent='Cash on Delivery';
   p.insertBefore(cod,p.firstChild);
 }
 p.disabled=false;
 p.removeAttribute('aria-disabled');
 p.title='Select UPI or Cash on Delivery';
 const old=p.parentElement?.querySelector('.jpt-upi-required');
 if(old)old.remove();
}
function boot(){
 enableCOD();
 const mo=new MutationObserver(enableCOD);
 mo.observe(document.documentElement,{subtree:true,childList:true});
 setInterval(enableCOD,1500);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();