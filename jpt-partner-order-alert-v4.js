/* JPT Partner Order Alert V4 — SINGLE OWNER
   Uses existing IndexedDB ringtone saved by V1/V3.1.
   One Audio object, one timer, generation token for async cancellation.
*/
(function(){
  'use strict';
  if(window.JPTPartnerOrderAlertV4)return;

  const DB='jptPartnerAlertDB', STORE='settings', KEY='jpt_v4_active_order', PREFS_KEY='notificationPrefs', RING_MS=9000;
  let audio=null, objectUrl=null, ringTimer=null, activeId=null, generation=0, armed=false;

  function stopAudio(){
    const a=audio; audio=null;
    if(a){try{a.pause()}catch(e){} try{a.currentTime=0}catch(e){} try{a.src=''}catch(e){} try{a.load()}catch(e){}}
    if(objectUrl){try{URL.revokeObjectURL(objectUrl)}catch(e){} objectUrl=null;}
  }

  function hardStop(clearOrder=true){
    generation++;
    clearTimeout(ringTimer); ringTimer=null; activeId=null; armed=false;
    stopAudio();
    try{navigator.vibrate?.(0)}catch(e){}
    const alarm=document.getElementById('orderAlarm');
    if(alarm){alarm.style.display='none';alarm.classList.remove('alarmPulse');}
    document.querySelectorAll('.alarmPulse').forEach(x=>x.classList.remove('alarmPulse'));
    if(clearOrder){try{localStorage.removeItem(KEY)}catch(e){}}
  }

  async function getPrefs(){
    try{
      const db=await new Promise((resolve,reject)=>{const q=indexedDB.open(DB,1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
      return await new Promise((resolve,reject)=>{const q=db.transaction(STORE,'readonly').objectStore(STORE).get(PREFS_KEY);q.onsuccess=()=>resolve(q.result||{});q.onerror=()=>reject(q.error)});
    }catch(e){return {}}
  }

  async function getRingtone(){
    try{
      const db=await new Promise((resolve,reject)=>{
        const q=indexedDB.open(DB,1);
        q.onsuccess=()=>resolve(q.result); q.onerror=()=>reject(q.error);
      });
      return await new Promise((resolve,reject)=>{
        const q=db.transaction(STORE,'readonly').objectStore(STORE).get('ringtone');
        q.onsuccess=()=>resolve(q.result||null); q.onerror=()=>reject(q.error);
      });
    }catch(e){return null}
  }

  async function arm(){
    const g=generation, prefs=await getPrefs(), file=await getRingtone();
    if(prefs.orderNotifications===false)return false;
    if(g!==generation || !file)return false;
    stopAudio();
    let a=null;
    try{
      objectUrl=URL.createObjectURL(file);
      a=new Audio(objectUrl); audio=a;
      a.preload='auto'; a.playsInline=true; a.volume=Math.max(0,Math.min(1,Number(prefs.ringVolume??100)/100)); a.muted=true;
      await a.play();
      if(g!==generation || audio!==a){try{a.pause()}catch(e){};return false;}
      a.pause(); a.currentTime=0; a.muted=false; armed=true; return true;
    }catch(e){if(audio===a)stopAudio();armed=false;return false;}
  }

  async function play(){
    const g=generation;
    if(!armed && !(await arm()))return false;
    if(g!==generation || !audio)return false;
    const a=audio;
    try{
      a.loop=true; a.muted=false; a.currentTime=0; await a.play();
      if(g!==generation || audio!==a){try{a.pause()}catch(e){};return false;}
      return true;
    }catch(e){return false;}
  }

  function persist(o){
    try{o?localStorage.setItem(KEY,JSON.stringify({id:o.id,order_no:o.order_no,outlet_id:o.outlet_id,created_at:o.created_at,status:'new'})):localStorage.removeItem(KEY)}catch(e){}
  }

  function attention(o){
    const alarm=document.getElementById('orderAlarm'), txt=document.getElementById('orderAlarmText');
    if(alarm){alarm.style.display='block';alarm.classList.add('alarmPulse');}
    if(txt)txt.textContent='NEW ORDER — '+(o?.order_no||'')+' • ACCEPT or REJECT to stop alert';
    document.querySelectorAll('.acceptBtn').forEach(b=>b.classList.add('alarmPulse'));
  }

  async function ring(o){
    if(!o || String(o.status||'').toLowerCase()!=='new')return;
    const prefs=await getPrefs(); if(prefs.orderNotifications===false)return;
    const id=String(o.id||o.order_no||''); if(!id)return;
    if(activeId!==id){hardStop(false);activeId=id;persist(o);}
    attention(o);
    const g=generation;
    await play();
    if(g!==generation || activeId!==id)return;
    try{navigator.vibrate?.([450,150,450,150,700])}catch(e){}
    clearTimeout(ringTimer);
    ringTimer=setTimeout(()=>{if(activeId===id && g===generation)ring(o)},RING_MS);
  }

  function wrap(){
    if(window.__JPTAlertV4Wrapped)return true;
    if(typeof window.orderAction!=='function' || typeof window.showOrderAlarm!=='function')return false;
    const baseAction=window.orderAction, baseStop=window.stopOrderAlarm;
    window.showOrderAlarm=function(order){ring(order);};
    window.stopOrderAlarm=function(){hardStop(true);try{baseStop?.apply(this,arguments)}catch(e){}};
    window.orderAction=async function(id,status,extra){
      const result=await baseAction.apply(this,arguments);
      if(result!==false && activeId!==null && String(activeId)===String(id))hardStop(true);
      return result;
    };
    window.__JPTAlertV4Wrapped=true; return true;
  }

  function bind(){
    const b=document.getElementById('stopAlarm');
    if(b&&!b.dataset.jptV4){b.dataset.jptV4='1';b.addEventListener('click',hardStop,{capture:true});}
    const t=document.getElementById('jptTestAlert');
    if(t&&!t.dataset.jptV4){t.dataset.jptV4='1';t.addEventListener('click',async()=>{await arm();await play()},{capture:true});}
  }

  async function restore(){
    try{
      const s=JSON.parse(localStorage.getItem(KEY)||'null'); if(!s?.id||!window.sb)return;
      const r=await window.sb.from('orders').select('id,order_no,outlet_id,status,created_at').eq('id',s.id).maybeSingle();
      if(!r.error&&r.data&&String(r.data.status).toLowerCase()==='new')ring(r.data);else persist(null);
    }catch(e){}
  }

  window.JPTPartnerOrderAlertV4={version:'4-single-owner',arm,ring,stop:hardStop,active:()=>activeId,getPrefs};
  window.addEventListener('jpt:notification-settings',()=>{if(activeId!==null)arm()});

  let n=0, restored=false;
  const timer=setInterval(()=>{
    wrap();bind();
    if(!restored){restored=true;restore();}
    if(++n>80)clearInterval(timer);
  },250);
  window.addEventListener('load',()=>setTimeout(()=>{wrap();bind()},100));
})();