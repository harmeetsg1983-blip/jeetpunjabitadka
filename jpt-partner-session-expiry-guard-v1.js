/* JPT Partner Session Expiry Guard V1
   Safe session presentation guard. Does not store credentials.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_SESSION_EXPIRY_GUARD_V1__) return;
  window.__JPT_PARTNER_SESSION_EXPIRY_GUARD_V1__=true;

  async function check(){
    try{
      const sb=window.sb;
      if(!sb?.auth?.getSession) return;
      const {data}=await sb.auth.getSession();
      if(data?.session) return;

      const path=location.pathname||'';
      if(/admin\.html$/i.test(path)){
        const key='jpt-session-expiry-notified';
        if(sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key,'1');
        const go=confirm('Your partner session has expired. Open the Partner Login page?');
        if(go) location.href='./partner-invite.html';
      }
    }catch(e){}
  }

  function boot(){
    check();
    setInterval(check,30000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
