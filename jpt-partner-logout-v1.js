/* JPT Partner Logout V1
   Additive safe logout control. Uses existing Supabase client.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_LOGOUT_V1__) return;
  window.__JPT_PARTNER_LOGOUT_V1__=true;

  function mount(){
    if(document.getElementById('jptPartnerLogoutBtn')) return;
    const controls=document.querySelector('.top .controls');
    if(!controls) return;
    const b=document.createElement('button');
    b.id='jptPartnerLogoutBtn';
    b.className='btn';
    b.textContent='↪ Logout';
    b.onclick=async()=>{
      if(!confirm('Sign out from the Partner Dashboard?')) return;
      b.disabled=true;
      try{
        const sb=window.sb;
        if(!sb) throw new Error('Supabase client not ready');
        const r=await sb.auth.signOut();
        if(r.error) throw r.error;
        localStorage.removeItem('jpt_admin_outlet');
        location.reload();
      }catch(e){
        b.disabled=false;
        if(typeof window.toast==='function') window.toast('Logout failed: '+(e.message||e));
      }
    };
    controls.appendChild(b);
  }

  function boot(){
    let n=0;
    const t=setInterval(()=>{
      mount();
      if(document.getElementById('jptPartnerLogoutBtn')||++n>30) clearInterval(t);
    },500);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();
