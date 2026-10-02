/* JPT V108 — COD HARDENED COMPATIBILITY LAYER */
(function(){
'use strict';
function cleanLegacyUpiGate(){
 const p=document.getElementById('payment');
 if(!p)return;
 let cod=Array.from(p.options||[]).find(o=>String(o.value||'').toUpperCase()==='COD'||/cash\s*on\s*delivery/i.test(o.textContent||''));
 if(!cod){
   cod=document.createElement('option');
   cod.value='COD'; cod.textContent='Cash on Delivery';
   p.insertBefore(cod,p.firstChild);
 }
 p.disabled=false;
 p.removeAttribute('aria-disabled');
 p.title='Select UPI or Cash on Delivery';

 // Remove legacy UPI-only warning/gate text if an older cached HTML shell is still present.
 const bad=/UPI payment required|Complete payment first|payment required.*accepting the order/i;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 const nodes=[];
 while(walker.nextNode()) if(bad.test(walker.currentNode.nodeValue||'')) nodes.push(walker.currentNode);
 nodes.forEach(n=>{
   const el=n.parentElement;
   if(el && el.children.length===0) el.remove();
   else n.nodeValue='';
 });

 const box=document.getElementById('upiBox');
 if(box) box.style.display=p.value==='UPI'?'block':'none';
 if(!p.dataset.codHardened){
   p.dataset.codHardened='1';
   p.addEventListener('change',()=>{ if(box) box.style.display=p.value==='UPI'?'block':'none'; });
 }
}
function boot(){
 cleanLegacyUpiGate();
 new MutationObserver(cleanLegacyUpiGate).observe(document.documentElement,{subtree:true,childList:true});
 setInterval(cleanLegacyUpiGate,1000);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();