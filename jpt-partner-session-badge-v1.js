/* JPT Partner Session Badge V1
   Shows the signed-in partner email and authorized outlet context.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_SESSION_BADGE_V1__) return;
  window.__JPT_PARTNER_SESSION_BADGE_V1__=true;

  function mount(){
    if(document.getElementById('jptPartnerSessionBadge')) return;
    const controls=document.querySelector('.top .controls');
    if(!controls) return;
    const box=document.createElement('div');
    box.id='jptPartnerSessionBadge';
    box.innerHTML=`
      <div class="jpt-psb-email" id="jptPsbEmail">Partner</div>
      <div class="jpt-psb-role" id="jptPsbRole">Checking access…</div>
    `;
    controls.appendChild(box);
    const st=document.createElement('style');
    st.textContent=`
      #jptPartnerSessionBadge{
        flex:0 0 auto;min-width:175px;padding:8px 10px;
        border:1px solid #3a2d17;border-radius:10px;background:#111;
      }
      .jpt-psb-email{font-size:11px;font-weight:800;color:#f6d779;
        max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .jpt-psb-role{font-size:10px;color:#999;margin-top:2px}
    `;
    document.head.appendChild(st);
    refresh();
  }

  async function refresh(){
    try{
      const sb=window.sb;
      if(!sb) return;
      const session=await sb.auth.getSession();
      const user=session?.data?.session?.user;
      if(!user) return;
      const email=document.getElementById('jptPsbEmail');
      const role=document.getElementById('jptPsbRole');
      if(email) email.textContent=user.email||'Partner';
      const central=await sb.rpc('partner_access_is_central_owner');
      if(central?.data===true){
        if(role) role.textContent='CENTRAL OWNER • Multi-outlet access';
      }else{
        const rows=window.JPTPartnerAccess?.getOutlets?.()||[];
        const one=rows.length===1?rows[0]:null;
        if(role) role.textContent=one
          ? 'OUTLET PARTNER • '+one.outlet_id
          : 'OUTLET PARTNER • Authorized outlets';
      }
    }catch(e){}
  }

  function boot(){
    let n=0;
    const t=setInterval(()=>{
      mount();
      if(document.getElementById('jptPartnerSessionBadge') || ++n>30) clearInterval(t);
    },500);
    setInterval(refresh,20000);
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();
