/* JPT Partner Application Safety V1
   UI safety layer for the existing Central Owner onboarding form.
   Does not replace approval backend or create accounts itself.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_APPLICATION_SAFETY_V1__) return;
  window.__JPT_PARTNER_APPLICATION_SAFETY_V1__=true;

  function boot(){
    const form=document.getElementById('jptPartnerOnboarding')||
               document.getElementById('jptPartnerOnboardPanel')||
               document.getElementById('jptPartnerOnboard');
    if(!form) return;

    const email=form.querySelector('input[type="email"]');
    const phone=form.querySelector('input[type="tel"]');
    [email,phone].filter(Boolean).forEach(el=>{
      el.addEventListener('input',()=>{
        if(el===email) el.value=el.value.trim().toLowerCase();
        if(el===phone) el.value=el.value.replace(/[^\d+]/g,'').slice(0,15);
      });
    });

    let note=form.querySelector('.jpt-application-safety-note');
    if(!note){
      note=document.createElement('div');
      note.className='jpt-application-safety-note';
      note.style.cssText='margin:8px 0;padding:9px;border:1px solid #333;border-radius:10px;background:#151515;color:#aaa;font-size:11px';
      note.textContent='Application safety: one application per owner email is checked before submission. Approval creates the outlet and partner access through the secure approval flow.';
      form.prepend(note);
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900));
  else setTimeout(boot,900);
})();
