/* JPT V106 CUSTOMER CART HOTFIX V3
   Non-destructive. Keeps Supabase menu/outlet/image loading.
   ADD now invokes the original inline change() through global eval,
   which can reach a page-level lexical function that external scripts
   cannot access through window.change.
*/
(function(){
'use strict';
function runOriginalChange(id,d){
  try{
    window.eval('change('+JSON.stringify(String(id))+','+Number(d)+')');
    return true;
  }catch(e){
    console.warn('JPT V106 original cart change failed',e);
    return false;
  }
}
function bindCart(){
  var menu=document.getElementById('menu');
  if(!menu)return;
  Array.prototype.forEach.call(menu.querySelectorAll('[data-jpt-add]'),function(b){
    b.onclick=function(){
      runOriginalChange(b.getAttribute('data-jpt-add'),1);
    };
  });
}
function boot(){
  bindCart();
  var n=0,t=setInterval(function(){
    bindCart();
    n++;
    if(n>=30)clearInterval(t);
  },500);
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot);
}else{
  boot();
}
})();
