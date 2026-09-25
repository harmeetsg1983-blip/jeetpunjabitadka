/* JPT DELIVERY APPROVAL SYNC V1
   Additive UI-only layer.
   Does not change onboarding, KYC, order, GPS or delivery logic.
*/
(function(){
  'use strict';

  if(window.__JPT_DELIVERY_APPROVAL_SYNC_V1__) return;
  window.__JPT_DELIVERY_APPROVAL_SYNC_V1__ = true;

  let timer = null;
  let busy = false;

  async function checkApproval(){
    if(busy) return;
    busy = true;

    try{
      if(typeof window.refresh === 'function'){
        await window.refresh();
      }

      const state = document.getElementById('verifyState');
      const onboard = document.getElementById('onboardState');

      const verified = /verified|approved/i.test(state?.textContent || '');
      const submitted = /submitted/i.test(onboard?.textContent || '');

      if(verified && submitted){
        if(typeof window.show === 'function'){
          window.show('home');
        }

        const gate = document.getElementById('gate');
        if(gate){
          gate.style.display = 'none';
        }
      }
    }catch(e){
      console.warn('[JPT Approval Sync V1]', e);
    }finally{
      busy = false;
    }
  }

  function start(){
    checkApproval();

    if(timer) clearInterval(timer);
    timer = setInterval(checkApproval, 15000);

    window.addEventListener('focus', checkApproval);

    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState === 'visible') checkApproval();
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  }else{
    start();
  }
})();
