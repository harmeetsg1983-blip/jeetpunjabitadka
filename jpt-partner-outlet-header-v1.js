/* JPT Partner Outlet Header V1 */
(function(){
  'use strict';
  if(window.__JPT_PARTNER_OUTLET_HEADER_V1__) return;
  window.__JPT_PARTNER_OUTLET_HEADER_V1__=true;
  function sync(){
    const id=window.activeOutlet||localStorage.getItem('jpt_admin_outlet')||'';
    const rows=window.JPTPartnerAccess?.getOutlets?.()||[];
    const row=rows.find(x=>String(x.outlet_id||x.code)===String(id));
    const name=row?.outlet_name||row?.name||id||'Outlet';
    let el=document.getElementById('jptPartnerContext');
    if(!el){
      el=document.createElement('div');
      el.id='jptPartnerContext';
      el.style.cssText='font-size:11px;color:#d8ae42;margin:6px 0 0 56px;font-weight:800';
      const top=document.querySelector('.top .brandrow');
      if(top?.parentNode) top.parentNode.insertBefore(el,top.nextSibling);
    }
    el.textContent=name+(id?' • '+id:'');
  }
  function boot(){sync();let n=0;const t=setInterval(()=>{sync();if(++n>=20)clearInterval(t)},500)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();