/* JPT Outlet Showcase V1 — DISABLED
   Production safety: this legacy showcase layer must not render any outlet cards.
   Active customer media is handled only by the current published-media layer.
*/
(function(){
'use strict';
function removeLegacyShowcase(){
  var el=document.getElementById('jptOutletShowcase');
  if(el) el.remove();
}
removeLegacyShowcase();
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',removeLegacyShowcase,{once:true});
setTimeout(removeLegacyShowcase,0);
})();
