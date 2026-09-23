/* JPT Partner Error Notice V1
   Lightweight global error notice for recoverable dashboard errors.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_ERROR_NOTICE_V1__) return;
  window.__JPT_PARTNER_ERROR_NOTICE_V1__=true;

  function show(msg){
    try{
      let el=document.getElementById('jptPartnerErrorNotice');
      if(!el){
        el=document.createElement('div');
        el.id='jptPartnerErrorNotice';
        el.style.cssText='position:fixed;left:12px;right:12px;bottom:14px;z-index:999;background:#260b0b;border:1px solid #8e3030;color:#ffb0b0;padding:10px 12px;border-radius:12px;font-size:11px;box-shadow:0 8px 30px #0008';
        document.body.appendChild(el);
      }
      el.textContent='Partner Dashboard notice: '+msg;
      clearTimeout(window.__jptErrTimer);
      window.__jptErrTimer=setTimeout(()=>el.remove(),5000);
    }catch(e){}
  }

  window.addEventListener('unhandledrejection',e=>{
    const m=String(e?.reason?.message||e?.reason||'');
    if(/supabase|outlet|partner|permission|network/i.test(m)) show(m.slice(0,180));
  });

  window.addEventListener('error',e=>{
    const m=String(e?.message||'');
    if(/supabase|outlet|partner|permission|network/i.test(m)) show(m.slice(0,180));
  });
})();
