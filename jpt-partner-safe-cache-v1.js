/* JPT Partner Safe Cache V1
   Keeps selected outlet context but never stores passwords/tokens.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_SAFE_CACHE_V1__) return;
  window.__JPT_PARTNER_SAFE_CACHE_V1__=true;
  const KEY='jpt_admin_outlet';
  function sync(){
    const id=window.activeOutlet||document.getElementById('outletSelect')?.value||'';
    if(id) localStorage.setItem(KEY,String(id));
  }
  window.addEventListener('beforeunload',sync);
  function boot(){sync();setInterval(sync,5000)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();