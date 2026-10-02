(function(){'use strict';
if(window.__JPT_DELIVERY_DEVICE_V1__) return;
window.__JPT_DELIVERY_DEVICE_V1__=true;
const KEY='jpt_delivery_device_key_v1', INTERVAL=60000;
let timer=null, registered=false;
function getKey(){try{let k=localStorage.getItem(KEY);if(k)return k;const b=new Uint8Array(32);crypto.getRandomValues(b);k=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');localStorage.setItem(KEY,k);return k}catch(e){return null}}
async function hashKey(k){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(k));return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,'0')).join('')}
function permission(){try{return ('Notification' in window)?Notification.permission:'unsupported'}catch(e){return 'unsupported'}}
async function register(){const sb=window.sb;if(!sb)return false;const s=await sb.auth.getSession();if(!s.data?.session)return false;
const p=await sb.from('delivery_partners').select('id,is_active,onboarding_completed,verification_status').eq('user_id',s.data.session.user.id).maybeSingle();
if(p.error||!p.data?.id||p.data.is_active!==true||p.data.onboarding_completed!==true||p.data.verification_status!=='verified'){registered=false;return false}
const k=getKey();if(!k)return false;const h=await hashKey(k);
const r=await sb.rpc('delivery_partner_register_device',{p_device_key_hash:h,p_platform:'web',p_app_version:'V11',p_notification_permission:permission()});
if(r.error){console.warn('JPT device registration:',r.error.message);return false}
registered=true;return true}
async function heartbeat(){if(!registered)return;const sb=window.sb;if(!sb)return;const r=await sb.rpc('delivery_partner_heartbeat',{p_notification_permission:permission(),p_sound_enabled:true,p_vibration_enabled:true});if(r.error)console.warn('JPT device heartbeat:',r.error.message)}
async function boot(){try{await register();if(timer)clearInterval(timer);timer=setInterval(heartbeat,INTERVAL)}catch(e){console.warn('JPT device boot:',e.message)}}
window.JPTDeliveryDevice={boot,register,heartbeat};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')boot()});
})();