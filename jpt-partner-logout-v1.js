/* JPT Partner Logout V2
   Safe visible logout control for the V107 Partner Dashboard.
   Existing Supabase signOut flow preserved.
*/
(function(){
  'use strict';

  if(window.__JPT_PARTNER_LOGOUT_V2__) return;
  window.__JPT_PARTNER_LOGOUT_V2__ = true;

  function mount(){
    if(document.getElementById('jptPartnerLogoutBtn')) return;

    const b=document.createElement('button');

    b.id='jptPartnerLogoutBtn';
    b.type='button';
    b.textContent='↪ Logout';

    b.style.cssText=[
      'position:fixed',
      'top:12px',
      'right:12px',
      'z-index:9999',
      'background:#151515',
      'color:#f5d477',
      'border:1px solid #d8ae42',
      'border-radius:10px',
      'padding:9px 12px',
      'font-weight:800',
      'font-size:13px',
      'box-shadow:0 0 10px rgba(216,174,66,.18)',
      'cursor:pointer'
    ].join(';');

    b.onclick=async()=>{
      if(!confirm('Sign out from the Partner Dashboard?')) return;

      b.disabled=true;
      b.textContent='Signing out…';

      try{
        const sb=window.sb;

        if(!sb){
          throw new Error('Supabase client not ready');
        }

        const r=await sb.auth.signOut();

        if(r.error){
          throw r.error;
        }

        localStorage.removeItem('jpt_admin_outlet');

        location.reload();

      }catch(e){
        b.disabled=false;
        b.textContent='↪ Logout';

        if(typeof window.toast==='function'){
          window.toast(
            'Logout failed: '+(e.message||e)
          );
        }else{
          alert(
            'Logout failed: '+(e.message||e)
          );
        }
      }
    };

    document.body.appendChild(b);
  }

  function boot(){
    let n=0;

    const t=setInterval(()=>{
      mount();

      if(
        document.getElementById('jptPartnerLogoutBtn') ||
        ++n>30
      ){
        clearInterval(t);
      }
    },500);
  }

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      boot
    );
  }else{
    boot();
  }

})();
