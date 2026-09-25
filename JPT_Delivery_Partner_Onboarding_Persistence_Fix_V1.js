/* JPT DELIVERY PARTNER — PERMANENT ONBOARDING GATE FIX V1
   Loaded by delivery-partner-v11.html
   UI-only fix. Does not modify onboarding data, Supabase functions,
   KYC, GPS, orders, or customer app.
*/
(function(){
  'use strict';

  if(window.__JPT_ONBOARDING_PERSISTENCE_FIX_V1__) return;
  window.__JPT_ONBOARDING_PERSISTENCE_FIX_V1__ = true;

  let busy = false;
  let timer = null;

  function syncGate(){
    const gate = document.getElementById('gate');
    const onboard = document.getElementById('onboardState');
    const verify = document.getElementById('verifyState');

    if(!gate || !onboard || !verify) return;

    const submitted = /submitted/i.test(onboard.textContent || '');
    const verified = /verified|approved/i.test(verify.textContent || '');

    if(submitted && verified){
      gate.style.display = 'none';
    }else{
      gate.style.display = '';
    }
  }

  async function run(){
    if(busy) return;
    busy = true;

    try{
      if(typeof window.refresh === 'function'){
        await window.refresh();
      }

      syncGate();
    }catch(e){
      console.warn('[JPT Onboarding Persistence Fix V1]', e);
    }finally{
      busy = false;
    }
  }

  function start(){
    run();

    if(timer) clearInterval(timer);
    timer = setInterval(run, 10000);

    window.addEventListener('focus', run);

    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState === 'visible') run();
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  }else{
    start();
  }
})();
