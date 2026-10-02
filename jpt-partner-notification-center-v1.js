/* JPT Partner Notification & Sound Center V1
   Settings-only layer for Restaurant Partner notifications.
   Uses the existing IndexedDB ringtone store and shared owner preferences.
*/
(function(){
'use strict';
if(window.JPTPartnerNotificationCenterV1)return;

const DB='jptPartnerAlertDB', STORE='settings', KEY='notificationPrefs', RING_KEY='ringtone';
const defaults={
  orderNotifications:true,
  ringVolume:100,
  ringInSilentMode:false,
  liveComplaintNotifications:false,
  riderNotifications:true,
  shareWhatsApp:true,
  shareEmail:true,
  weeklyWhatsApp:true,
  weeklyEmail:true
};
let previewUrl=null, previewAudio=null;

function openDb(){
 return new Promise((resolve,reject)=>{
  const q=indexedDB.open(DB,1);
  q.onupgradeneeded=()=>{try{q.result.createObjectStore(STORE)}catch(e){}};
  q.onsuccess=()=>resolve(q.result); q.onerror=()=>reject(q.error);
 });
}
async function get(key){
 try{
  const db=await openDb();
  return await new Promise((resolve,reject)=>{
   const q=db.transaction(STORE,'readonly').objectStore(STORE).get(key);
   q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  });
 }catch(e){return null}
}
async function put(key,value){
 const db=await openDb();
 return new Promise((resolve,reject)=>{
  const q=db.transaction(STORE,'readwrite').objectStore(STORE).put(value,key);
  q.onsuccess=()=>resolve(true);q.onerror=()=>reject(q.error);
 });
}
async function prefs(){return Object.assign({},defaults,(await get(KEY))||{})}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function stopPreview(){
 if(previewAudio){try{previewAudio.pause()}catch(e){}try{previewAudio.currentTime=0}catch(e){}previewAudio=null}
 if(previewUrl){try{URL.revokeObjectURL(previewUrl)}catch(e){}previewUrl=null}
}
async function preview(){
 stopPreview();
 const file=await get(RING_KEY);
 if(!file){alert('Restaurant Partner ringtone is not saved on this device yet. Use “Add / Replace Ringtone” first.');return}
 previewUrl=URL.createObjectURL(file);
 previewAudio=new Audio(previewUrl);
 previewAudio.volume=Number(document.getElementById('jptNotifyVolume')?.value||100)/100;
 previewAudio.onended=()=>{previewAudio=null;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}};
 try{await previewAudio.play()}catch(e){alert('Tap Test Ringtone again after allowing audio playback.')}
}
async function savePrefs(p){
 await put(KEY,p);
 window.dispatchEvent(new CustomEvent('jpt:notification-settings',{detail:p}));
}
function row(label,desc,key,checked){
 return '<label class="jpt-nc-row"><span><b>'+label+'</b><small>'+desc+'</small></span><input type="checkbox" data-key="'+key+'" '+(checked?'checked':'')+'><i></i></label>';
}
async function render(){
 const root=document.getElementById('jptPartnerNotificationCenterV1');if(!root)return;
 const p=await prefs();
 root.innerHTML=
 '<div class="jpt-nc-title">🔔 Notification & Sound Center</div>'+
 '<div class="jpt-nc-sub">One notification system for all 5 personal outlets. The same saved Restaurant Partner ringtone is used centrally.</div>'+
 '<div class="jpt-nc-card"><div class="jpt-nc-section">Order notifications</div>'+
 row('Order notifications','Receive new-order notifications on this device.','orderNotifications',p.orderNotifications)+
 '<div class="jpt-nc-volume"><span><b>🔊 Ring volume</b><small>Restaurant Partner new-order ringtone</small></span><input id="jptNotifyVolume" type="range" min="0" max="100" step="1" value="'+p.ringVolume+'"><strong id="jptNotifyVolumeValue">'+p.ringVolume+'%</strong></div>'+
 row('Ring in silent mode','Allow order alert attempts while the phone is in silent mode. Device OS/DND rules may still apply.','ringInSilentMode',p.ringInSilentMode)+
 '<div class="jpt-nc-actions"><button id="jptTestRingtone">▶ Test Ringtone</button><button id="jptAddRingtone">＋ Add / Replace Ringtone</button><input id="jptRingtoneFile" type="file" accept="audio/*" hidden></div>'+
 '<div id="jptRingtoneState" class="jpt-nc-state">Checking saved ringtone…</div></div>'+
 '<div class="jpt-nc-card"><div class="jpt-nc-section">Message & report notifications</div>'+
 row('Share order / update on WhatsApp','Preference for supported WhatsApp sharing flows.','shareWhatsApp',p.shareWhatsApp)+
 row('Share order / update on email','Preference for supported email sharing flows.','shareEmail',p.shareEmail)+
 row('Weekly reports on WhatsApp','Preference for weekly report delivery.','weeklyWhatsApp',p.weeklyWhatsApp)+
 row('Weekly reports on email','Preference for weekly report delivery.','weeklyEmail',p.weeklyEmail)+'</div>'+
 '<div class="jpt-nc-card"><div class="jpt-nc-section">Operations alerts</div>'+
 row('Live complaint notifications','Notify this device when a customer complaint is raised on an order.','liveComplaintNotifications',p.liveComplaintNotifications)+
 row('Rider notifications','Notify this device when a rider assignment/acceptance event needs restaurant attention.','riderNotifications',p.riderNotifications)+'</div>'+
 '<div class="jpt-nc-note">Volume is the app audio setting. Android/iOS system volume, Do Not Disturb, browser permissions and device policies can still limit audible playback.</div>';
 const vol=document.getElementById('jptNotifyVolume');
 vol.oninput=async()=>{document.getElementById('jptNotifyVolumeValue').textContent=vol.value+'%';p.ringVolume=Number(vol.value);await savePrefs(p)};
 root.querySelectorAll('input[type=checkbox][data-key]').forEach(el=>el.onchange=async()=>{p[el.dataset.key]=el.checked;await savePrefs(p)});
 document.getElementById('jptTestRingtone').onclick=preview;
 document.getElementById('jptAddRingtone').onclick=()=>document.getElementById('jptRingtoneFile').click();
 document.getElementById('jptRingtoneFile').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  await put(RING_KEY,file);
  document.getElementById('jptRingtoneState').textContent='✓ Saved: '+file.name+' • '+Math.round(file.size/1024)+' KB';
  window.dispatchEvent(new CustomEvent('jpt:notification-ringtone',{detail:{name:file.name}}));
 };
 const saved=await get(RING_KEY);
 document.getElementById('jptRingtoneState').textContent=saved?'✓ Restaurant Partner ringtone is saved on this device.':'⚠ No Restaurant Partner ringtone saved on this device yet.';
}
function mount(){
 const settings=document.getElementById('settings');if(!settings||document.getElementById('jptPartnerNotificationCenterV1'))return false;
 const style=document.createElement('style');style.textContent=
 '#jptPartnerNotificationCenterV1{margin:14px 0;background:#0d0d0d;color:#fff;border:1px solid #3b321f;border-radius:20px;padding:14px}'+
 '.jpt-nc-title{font-size:20px;font-weight:950;color:#f4d77a}.jpt-nc-sub{font-size:11px;color:#999;margin:5px 0 12px;line-height:1.4}'+
 '.jpt-nc-card{background:#151515;border:1px solid #303030;border-radius:15px;margin-top:10px;padding:11px}.jpt-nc-section{font-weight:950;color:#f4d77a;margin-bottom:4px}'+
 '.jpt-nc-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 2px;border-bottom:1px solid #292929;cursor:pointer}.jpt-nc-row:last-child{border-bottom:0}.jpt-nc-row span{display:flex;flex-direction:column}.jpt-nc-row small,.jpt-nc-volume small{color:#888;font-size:10px;margin-top:3px}.jpt-nc-row input{display:none}.jpt-nc-row i{width:44px;height:24px;border-radius:20px;background:#3a3a3a;position:relative;flex:0 0 auto}.jpt-nc-row i:after{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;border-radius:50%;background:#aaa;transition:.18s}.jpt-nc-row input:checked+i{background:#d8ae42}.jpt-nc-row input:checked+i:after{left:23px;background:#111}'+
 '.jpt-nc-volume{display:flex;align-items:center;gap:10px;padding:12px 2px;border-bottom:1px solid #292929}.jpt-nc-volume span{display:flex;flex-direction:column;min-width:120px}.jpt-nc-volume input{flex:1;accent-color:#d8ae42}.jpt-nc-volume strong{width:42px;text-align:right;color:#f4d77a;font-size:12px}'+
 '.jpt-nc-actions{display:flex;gap:8px;flex-wrap:wrap;padding-top:11px}.jpt-nc-actions button{background:#f4d77a;color:#111;border:0;border-radius:10px;padding:10px 12px;font-weight:950}.jpt-nc-actions button+button{background:#222;color:#f4d77a;border:1px solid #55461f}.jpt-nc-state{font-size:10px;color:#aaa;margin-top:8px}.jpt-nc-note{font-size:10px;color:#777;line-height:1.4;padding:10px 2px}';
 document.head.appendChild(style);
 const root=document.createElement('section');root.id='jptPartnerNotificationCenterV1';settings.prepend(root);render();return true;
}
window.JPTPartnerNotificationCenterV1={version:'1.0',getPrefs:prefs,savePrefs,render};
let n=0;const t=setInterval(()=>{if(mount())clearInterval(t);if(++n>120)clearInterval(t)},250);
})();