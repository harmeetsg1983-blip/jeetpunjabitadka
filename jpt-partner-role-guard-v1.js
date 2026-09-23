/* JPT Partner Role Guard V1
   Additive UI layer. Security remains enforced by Supabase RPC/RLS.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_ROLE_GUARD_V1__) return;
  window.__JPT_PARTNER_ROLE_GUARD_V1__=true;

  async function isCentral(){
    try{
      const sb=window.sb;
      if(!sb) return false;
      const r=await sb.rpc('partner_access_is_central_owner');
      return !r.error && r.data===true;
    }catch(e){ return false; }
  }

  function hideCentralOnly(){
    const ids=[
      'jptPartnerOnboardBtn',
      'jptPartnerAccessManager'
    ];
    ids.forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.style.display='none';
    });
  }

  async function sync(){
    const central=await isCentral();
    document.documentElement.classList.toggle('jpt-central-owner',central);
    document.documentElement.classList.toggle('jpt-outlet-partner',!central);
    if(!central) hideCentralOnly();
  }

  function boot(){
    const s=document.createElement('style');
    s.textContent=`
      html.jpt-outlet-partner #jptPartnerOnboardBtn{display:none!important}
      html.jpt-outlet-partner #jptPartnerAccessManager{display:none!important}
    `;
    document.head.appendChild(s);
    sync();
    const mo=new MutationObserver(()=>{ if(document.documentElement.classList.contains('jpt-outlet-partner')) hideCentralOnly(); });
    mo.observe(document.body,{childList:true,subtree:true});
    setInterval(sync,15000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
