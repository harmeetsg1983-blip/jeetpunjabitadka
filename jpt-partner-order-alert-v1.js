(function(){
'use strict';
if(window.JPTPartnerOrderAlert)return;

const KEY='jpt_partner_order_alert_v1';
const DB='jptPartnerAlertDB',STORE='settings';
let state={enabled:true,volume:1,vibrate:true,silent:false,ringName:'Default Order Alert'};
let audio=null,ctx=null,ringUrl=null,dbp=null;

function $(id){return document.getElementById(id)}
function loadState(){try{Object.assign(state,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}}
function saveState(){localStorage.setItem(KEY,JSON.stringify({
  enabled:state.enabled,volume:state.volume,vibrate:state.vibrate,
  silent:state.silent,ringName:state.ringName
}))}

function db(){
  if(dbp)return dbp;
  dbp=new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB,1);
    r.onupgradeneeded=()=>{
      if(!r.result.objectStoreNames.contains(STORE))
        r.result.createObjectStore(STORE);
    };
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error);
  });
  return dbp;
}

async function getFile(){
  try{
    const d=await db();
    return await new Promise((res,rej)=>{
      const q=d.transaction(STORE,'readonly').objectStore(STORE).get('ringtone');
      q.onsuccess=()=>res(q.result||null);
      q.onerror=()=>rej(q.error);
    });
  }catch(e){return null}
}

async function putFile(file){
  const d=await db();
  return new Promise((res,rej)=>{
    const q=d.transaction(STORE,'readwrite').objectStore(STORE).put(file,'ringtone');
    q.onsuccess=res;
    q.onerror=()=>rej(q.error);
  });
}

function stop(){
  if(audio){try{audio.pause()}catch(e){}}
  audio=null;
  if(ringUrl){try{URL.revokeObjectURL(ringUrl)}catch(e){}ringUrl=null}
  if(ctx){try{ctx.close()}catch(e){}ctx=null}
}

async function unlock(){
  try{
    if(!ctx)ctx=new(window.AudioContext||window.webkitAudioContext)();
    if(ctx.state==='suspended')await ctx.resume();
  }catch(e){}
}

async function play(loop){
  if(!state.enabled)return;
  const file=await getFile();
  if(!file)return;
  stop();
  ringUrl=URL.createObjectURL(file);
  audio=new Audio(ringUrl);
  audio.loop=!!loop;
  audio.volume=Math.max(0,Math.min(1,Number(state.volume)||1));
  audio.playsInline=true;
  try{await audio.play()}
  catch(e){console.warn('JPT alert audio needs user activation',e)}
}

function vibrate(){
  if(state.vibrate){
    try{navigator.vibrate?.([350,120,350,120,500])}catch(e){}
  }
}

function html(){
  if($('jptOrderAlertSettings'))return;
  const host=$('settings');
  if(!host)return;

  const card=document.createElement('div');
  card.id='jptOrderAlertSettings';
  card.className='card';

  card.innerHTML=`
    <h3>🔔 Order Alert & Sound</h3>
    <p class="muted">
      New-order alert controls for this Partner App.
      These settings are saved on this device.
    </p>

    <div class="field">
      <label>Order Notifications</label>
      <label style="display:flex;align-items:center;gap:8px;margin-top:6px">
        <input id="jptAlertEnabled" type="checkbox"> ON
      </label>
    </div>

    <div class="field">
      <label>🔊 Alert Volume <span id="jptVolText"></span></label>
      <input id="jptAlertVolume" type="range" min="0" max="100"
             value="100" style="width:100%">
    </div>

    <div class="field">
      <label>🎵 Order Ringtone</label>
      <input id="jptAlertFile" class="input" type="file" accept="audio/*">
      <div id="jptRingName" class="muted" style="margin-top:5px">
        Default Order Alert
      </div>
    </div>

    <div class="rowactions">
      <button class="btn gold" id="jptTestAlert">🔔 TEST ALERT</button>
      <button class="btn" id="jptStopAlert">STOP</button>
    </div>

    <div class="field">
      <label style="display:flex;align-items:center;gap:8px">
        <input id="jptAlertVibrate" type="checkbox"> 📳 Vibration
      </label>
    </div>

    <div class="field">
      <label style="display:flex;align-items:center;gap:8px">
        <input id="jptSilentAlert" type="checkbox">
        🔔 Allow alert when phone is silent
        (device settings may override this)
      </label>
    </div>

    <div id="jptAlertStatus" class="notice">Ready</div>
  `;

  host.appendChild(card);

  $('jptAlertEnabled').checked=state.enabled;
  $('jptAlertVolume').value=Math.round(state.volume*100);
  $('jptAlertVibrate').checked=state.vibrate;
  $('jptSilentAlert').checked=state.silent;
  $('jptRingName').textContent=state.ringName;

  function sync(){
    state.enabled=$('jptAlertEnabled').checked;
    state.volume=Number($('jptAlertVolume').value)/100;
    state.vibrate=$('jptAlertVibrate').checked;
    state.silent=$('jptSilentAlert').checked;
    $('jptVolText').textContent=Math.round(state.volume*100)+'%';
    saveState();
  }

  $('jptAlertEnabled').onchange=async()=>{
    sync();
    if(state.enabled){
      await unlock();
      $('jptAlertStatus').textContent='Order alerts enabled on this device.';
    }else stop();
  };

  $('jptAlertVolume').oninput=()=>{
    sync();
    $('jptVolText').textContent=Math.round(state.volume*100)+'%';
  };

  $('jptAlertVibrate').onchange=sync;
  $('jptSilentAlert').onchange=sync;
  $('jptVolText').textContent=Math.round(state.volume*100)+'%';

  $('jptAlertFile').onchange=async e=>{
    const f=e.target.files?.[0];
    if(!f)return;

    if(!f.type.startsWith('audio/')){
      e.target.value='';
      $('jptAlertStatus').textContent='Please select an audio file.';
      return;
    }

    if(f.size>10*1024*1024){
      e.target.value='';
      $('jptAlertStatus').textContent='Ringtone must be under 10MB.';
      return;
    }

    await putFile(f);
    state.ringName=f.name;
    saveState();
    $('jptRingName').textContent=f.name;
    $('jptAlertStatus').textContent='Ringtone saved on this device.';
  };

  $('jptTestAlert').onclick=async()=>{
    sync();
    await unlock();
    await play(false);
    vibrate();
    $('jptAlertStatus').textContent='Test alert played.';
  };

  $('jptStopAlert').onclick=()=>{
    stop();
    try{navigator.vibrate?.(0)}catch(e){}
    $('jptAlertStatus').textContent='Alert stopped.';
  };
}

async function install(){
  loadState();

  const oldShow=window.showOrderAlarm;
  const oldStop=window.stopOrderAlarm;

  window.showOrderAlarm=async function(order){
    if(typeof oldShow==='function')oldShow(order);
    await play(true);
    vibrate();
  };

  window.stopOrderAlarm=function(){
    stop();
    try{navigator.vibrate?.(0)}catch(e){}
    if(typeof oldStop==='function')oldStop();
  };

  html();

  if('Notification'in window && Notification.permission==='default'){
    if(!$('jptAllowNotifications')){
      const b=document.createElement('button');
      b.id='jptAllowNotifications';
      b.className='btn';
      b.textContent='🔔 Allow Notifications';
      b.style.marginTop='8px';

      $('jptOrderAlertSettings')?.appendChild(b);

      b.onclick=async()=>{
        try{
          const p=await Notification.requestPermission();
          b.remove();
          if($('jptAlertStatus')){
            $('jptAlertStatus').textContent=
              p==='granted'
              ?'Notifications allowed.'
              :'Notification permission not granted.';
          }
        }catch(e){}
      };
    }
  }
}

window.JPTPartnerOrderAlert={
  play:()=>play(true),
  stop,
  refresh:html
};

let tries=0;
const timer=setInterval(()=>{
  install();
  if(++tries>20)clearInterval(timer);
},250);

window.addEventListener('load',()=>setTimeout(install,50));
})();