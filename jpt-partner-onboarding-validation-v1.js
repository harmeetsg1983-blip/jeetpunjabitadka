/* JPT Partner Onboarding Validation V1
   Tightens the existing Central Owner application form without replacing it.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_ONBOARDING_VALIDATION_V1__) return;
  window.__JPT_PARTNER_ONBOARDING_VALIDATION_V1__=true;

  function wire(){
    const save=document.getElementById('jptObSave');
    if(!save || save.dataset.jptValidationV1) return;
    save.dataset.jptValidationV1='1';

    const original=save.onclick;
    save.onclick=async function(ev){
      const restaurant=document.getElementById('jptObRestaurant')?.value.trim()||'';
      const owner=document.getElementById('jptObOwner')?.value.trim()||'';
      const email=document.getElementById('jptObEmail')?.value.trim()||'';
      const phone=document.getElementById('jptObPhone')?.value.trim()||'';

      if(!restaurant){ if(window.toast) toast('Restaurant Name is required'); return; }
      if(!owner){ if(window.toast) toast('Owner Name is required'); return; }
      if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        if(window.toast) toast('Valid Owner Email is required'); return;
      }
      if(!phone){ if(window.toast) toast('Owner Phone is required'); return; }

      save.disabled=true;
      const old=save.textContent;
      save.textContent='SUBMITTING…';
      try{
        await original.call(this,ev);
      }finally{
        save.disabled=false;
        save.textContent=old;
      }
    };
  }

  function boot(){
    let n=0;
    const t=setInterval(()=>{
      wire();
      if(document.getElementById('jptObSave')?.dataset.jptValidationV1||++n>40) clearInterval(t);
    },500);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();
