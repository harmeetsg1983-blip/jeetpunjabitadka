/* JPT Partner Order Alert V3.1 — audio ownership + stop-on-action fix
   Additive repair for V3. Keeps existing V1/V2 order flow.
   Fixes:
   1) V3's own audio is explicitly stopped on ACCEPT/REJECT/successful order action.
   2) Existing STOP button also stops V3 audio.
   3) Prevents V3 audio from restarting after STOP.
   Browser/Android may still restrict background audio while fully suspended/locked.
*/
(function(){
  'use strict';
  if(window.JPTPartnerOrderAlertV31)return;

  const DB='jptPartnerAlertDB', STORE='settings';
  let audio=null, url=null, armed=false, active=false;
  let actionWrapped=false, stopButtonBound=false;

  async function getRingtone(){
    try{
      const db=await new Promise((resolve,reject)=>{
        const r=indexedDB.open(DB,1);
        r.onsuccess=()=>resolve(r.result);
        r.onerror=()=>reject(r.error);
      });
      return await new Promise((resolve,reject)=>{
        const q=db.transaction(STORE,'readonly').objectStore(STORE).get('ringtone');
        q.onsuccess=()=>resolve(q.result||null);
        q.onerror=()=>reject(q.error);
      });
    }catch(e){return null}
  }

  async function arm(){
    const file=await getRingtone();
    if(!file)return false;

    try{
      if(audio){try{audio.pause()}catch(e){} audio=null}
      if(url){try{URL.revokeObjectURL(url)}catch(e){} url=null}

      url=URL.createObjectURL(file);
      audio=new Audio(url);
      audio.preload='auto';
      audio.playsInline=true;
      audio.volume=1;
      audio.muted=true;

      await audio.play();
      audio.pause();
      audio.currentTime=0;
      audio.muted=false;
      armed=true;

      const s=document.getElementById('jptV3AlertStatus');
      if(s)s.textContent='🔔 Alert sound armed on this device.';
      return true;
    }catch(e){
      console.warn('[JPT Alert V3.1] arm failed',e);
      armed=false;
      return false;
    }
  }

  async function ring(){
    if(!armed){
      const ok=await arm();
      if(!ok)return false;
    }
    try{
      audio.loop=true;
      audio.muted=false;
      audio.currentTime=0;
      await audio.play();
      active=true;
      return true;
    }catch(e){
      console.warn('[JPT Alert V3.1] ring failed',e);
      return false;
    }
  }

  function stop(){
    active=false;
    if(audio){
      try{audio.pause()}catch(e){}
      try{audio.currentTime=0}catch(e){}
    }
  }

  function addArmButton(){
    if(document.getElementById('jptV3ArmAlert'))return;
    const host=document.getElementById('jptOrderAlertSettings');
    if(!host)return;

    const row=document.createElement('div');
    row.className='rowactions';
    row.style.marginTop='10px';
    row.innerHTML='<button class="btn gold" id="jptV3ArmAlert">🔔 ARM ALERT SOUND</button><div id="jptV3AlertStatus" class="notice" style="margin-top:8px">Sound not armed yet.</div>';
    host.appendChild(row);

    document.getElementById('jptV3ArmAlert').onclick=async()=>{
      const ok=await arm();
      document.getElementById('jptV3AlertStatus').textContent=
        ok?'🔔 Alert sound armed on this device.':'⚠️ Could not arm sound. Tap TEST ALERT once and try ARM again.';
    };

    const test=document.getElementById('jptTestAlert');
    if(test && !test.dataset.jptV3Bound){
      test.dataset.jptV3Bound='1';
      test.addEventListener('click',async()=>{await arm();},{capture:true});
    }
  }

  function patchStopButton(){
    const btn=document.getElementById('jptStopAlert');
    if(btn && !stopButtonBound){
      stopButtonBound=true;
      btn.addEventListener('click',()=>stop(),{capture:true});
    }
  }

  function patchOrderAction(){
    if(actionWrapped || typeof window.orderAction!=='function')return;
    const oldAction=window.orderAction;

    window.orderAction=async function(id,status,extra){
      const result=await oldAction.apply(this,arguments);

      /* Any successful action on the active NEW order ends the alert.
         ACCEPT/REJECT are the normal acknowledgement actions. */
      if(result!==false){
        stop();
      }
      return result;
    };

    actionWrapped=true;
  }

  function patchAlarm(){
    if(window.__JPTAlertV31AlarmPatched)return;
    if(typeof window.showOrderAlarm!=='function')return;

    const oldShow=window.showOrderAlarm;
    const oldStop=window.stopOrderAlarm;

    window.showOrderAlarm=async function(order){
      try{oldShow.apply(this,arguments)}catch(e){}
      await ring();
      try{navigator.vibrate?.([450,150,450,150,700])}catch(e){}
    };

    window.stopOrderAlarm=function(){
      stop();
      try{oldStop?.apply(this,arguments)}catch(e){}
    };

    window.__JPTAlertV31AlarmPatched=true;
  }

  function boot(){
    addArmButton();
    patchStopButton();
    patchOrderAction();
    patchAlarm();
  }

  window.JPTPartnerOrderAlertV31={
    version:'3.1',
    arm,ring,stop,
    armed:()=>armed,
    active:()=>active
  };

  let n=0;
  const t=setInterval(()=>{
    boot();
    if(++n>120)clearInterval(t);
  },250);

  window.addEventListener('load',()=>setTimeout(boot,100));
})();
