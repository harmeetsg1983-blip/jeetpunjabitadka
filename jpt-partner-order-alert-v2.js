/* JPT Partner Order Alert V2 — persistent NEW-order attention layer
   Additive layer. Does not rewrite admin.html, customer app, or rider app.
   Keeps the existing V1 ringtone/settings and makes NEW-order attention persist
   until ACCEPT or REJECT/other order action. Browser/Android OS may still restrict
   audio while the app is fully suspended or the device is locked.
*/
(function(){
  'use strict';
  if(window.JPTPartnerOrderAlertV2)return;

  const KEY='jpt_v2_active_new_order';
  const PULSE_MS=9000;
  let activeOrder=null;
  let pulseTimer=null;
  let wrapped=false;

  const $=id=>document.getElementById(id);
  const norm=s=>String(s||'').toLowerCase().trim().replace(/\s+/g,'_');

  function isUnacknowledged(o){
    return !!o && norm(o.status)==='new';
  }

  function save(o){
    try{
      if(o) localStorage.setItem(KEY,JSON.stringify({id:o.id,order_no:o.order_no,outlet_id:o.outlet_id,created_at:o.created_at,status:'new'}));
      else localStorage.removeItem(KEY);
    }catch(e){}
  }

  function load(){
    try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}
  }

  function renderAttention(o){
    const panel=$('orders');
    if(panel && typeof window.showPanel==='function') window.showPanel('orders');

    const alarm=$('orderAlarm');
    if(alarm){
      alarm.style.display='block';
      alarm.classList.add('alarmPulse');
      const txt=$('orderAlarmText');
      if(txt) txt.textContent='NEW ORDER — '+(o?.order_no||'')+' • ACCEPT or REJECT to stop alert';
      const btn=$('stopAlarm');
      if(btn){
        btn.textContent='Acknowledge';
        btn.style.display='none';
      }
    }

    // Highlight the primary ACCEPT action without changing the frozen design.
    document.querySelectorAll('.acceptBtn').forEach(b=>b.classList.add('alarmPulse'));
    document.querySelectorAll('[data-act="accept"]').forEach(b=>b.classList.add('alarmPulse'));
  }

  async function ring(){
    try{
      if(window.JPTPartnerOrderAlert?.play) await window.JPTPartnerOrderAlert.play();
    }catch(e){console.warn('[JPT Alert V2] ring failed',e)}
    try{navigator.vibrate?.([450,150,450,150,700]);}catch(e){}
    renderAttention(activeOrder);
  }

  function start(o){
    if(!isUnacknowledged(o))return;
    activeOrder=o;
    save(o);
    clearInterval(pulseTimer);
    ring();
    pulseTimer=setInterval(()=>{
      if(activeOrder && isUnacknowledged(activeOrder)) ring();
      else stop(false);
    },PULSE_MS);
  }

  function stop(clear=true){
    clearInterval(pulseTimer);pulseTimer=null;
    if(clear) {activeOrder=null;save(null)}
    try{window.JPTPartnerOrderAlert?.stop?.()}catch(e){}
    try{navigator.vibrate?.(0)}catch(e){}
    const alarm=$('orderAlarm');
    if(alarm){alarm.classList.remove('alarmPulse');alarm.style.display='none'}
    document.querySelectorAll('.alarmPulse').forEach(x=>x.classList.remove('alarmPulse'));
    const btn=$('stopAlarm');if(btn)btn.style.display='';
  }

  function wrap(){
    if(wrapped)return true;
    if(typeof window.showOrderAlarm!=='function' || typeof window.orderAction!=='function')return false;

    const oldShow=window.showOrderAlarm;
    const oldAction=window.orderAction;
    const oldStop=window.stopOrderAlarm;

    window.showOrderAlarm=function(order){
      start(order);
      try{return oldShow.apply(this,arguments)}catch(e){return undefined}
    };

    window.orderAction=async function(id,status,extra){
      const result=await oldAction.apply(this,arguments);
      if(result!==false && activeOrder && String(activeOrder.id)===String(id)) stop(true);
      return result;
    };

    window.stopOrderAlarm=function(){
      // Manual acknowledgement remains available to the base layer, but V2's
      // persistent NEW-order alert is intentionally stopped only by an order action.
      if(activeOrder) return;
      try{oldStop?.apply(this,arguments)}catch(e){}
    };

    // If the existing V1 12-second alarm timeout calls its stop function,
    // immediately resume V2's persistent attention cycle while the order is NEW.
    window.__JPTAlertV2OldStop=oldStop;
    wrapped=true;
    return true;
  }

  function boot(){
    if(!wrap())return false;
    const old=load();
    if(old && isUnacknowledged(old)){
      // Re-check live status before resuming a persisted alert.
      const id=old.id;
      if(window.sb && id){
        window.sb.from('orders').select('id,order_no,outlet_id,status,created_at,total').eq('id',id).maybeSingle().then(r=>{
          if(!r.error && isUnacknowledged(r.data)) start(r.data); else stop(true);
        }).catch(()=>start(old));
      }else start(old);
    }
    return true;
  }

  window.JPTPartnerOrderAlertV2={
    version:'v2',
    start,
    stop,
    active:()=>!!activeOrder
  };

  let n=0;
  const t=setInterval(()=>{if(boot()||++n>80)clearInterval(t)},250);
  window.addEventListener('load',()=>setTimeout(boot,100));
})();
