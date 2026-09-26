/* JPT Partner Order Alert V3 — audio unlock + persistent foreground bell
   Additive layer. Keeps existing order flow and V2 persistence.
   Best-effort browser/PWA behavior; Android may restrict audio when fully suspended/locked.
*/
(function(){
  'use strict';
  if(window.JPTPartnerOrderAlertV3)return;

  const DB='jptPartnerAlertDB', STORE='settings';
  let audio=null, url=null, armed=false, active=false;

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
      if(audio){audio.pause();audio=null}
      if(url){URL.revokeObjectURL(url);url=null}

      url=URL.createObjectURL(file);
      audio=new Audio(url);
      audio.preload='auto';
      audio.playsInline=true;
      audio.volume=1;
      audio.muted=true;

      /* This play() occurs directly from a user action through arm(). */
      await audio.play();
      audio.pause();
      audio.currentTime=0;
      audio.muted=false;
      armed=true;

      const s=document.getElementById('jptV3AlertStatus');
      if(s)s.textContent='🔔 Alert sound armed on this device.';
      return true;
    }catch(e){
      console.warn('[JPT Alert V3] arm failed',e);
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
      console.warn('[JPT Alert V3] ring failed',e);
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
    if(test){
      test.addEventListener('click',async()=>{
        await arm();
      },{capture:true});
    }
  }

  function patchAlarm(){
    if(window.__JPTAlertV3Patched)return;
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

    window.__JPTAlertV3Patched=true;
  }

  function boot(){
    addArmButton();
    patchAlarm();
  }

  window.JPTPartnerOrderAlertV3={version:'3',arm,ring,stop,armed:()=>armed,active:()=>active};

  let n=0;
  const t=setInterval(()=>{
    boot();
    if(++n>80)clearInterval(t);
  },250);
  window.addEventListener('load',()=>setTimeout(boot,100));
})();
