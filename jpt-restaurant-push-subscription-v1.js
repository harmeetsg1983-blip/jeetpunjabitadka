(function(){'use strict';
if(window.__JPT_RESTAURANT_PUSH_SUB_V1__) return;
window.__JPT_RESTAURANT_PUSH_SUB_V1__=true;

function getPublicKey(){
  return window.JPT_VAPID_PUBLIC_KEY||document.querySelector('meta[name="jpt-vapid-public-key"]')?.content||'';
}
function base64ToUint8Array(base64){
  const pad='='.repeat((4-base64.length%4)%4);
  const raw=atob((base64+pad).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function getOutlet(){
  return String(window.activeOutlet||window.JPT_ACTIVE_OUTLET||localStorage.getItem('jpt_admin_outlet')||'').trim();
}
async function enable(){
  try{
    if(!('serviceWorker' in navigator)||!('PushManager' in window)) return {ok:false,reason:'push_unsupported'};
    if(!window.sb) return {ok:false,reason:'supabase_not_ready'};
    const key=getPublicKey();
    if(!key) return {ok:false,reason:'vapid_public_key_missing'};
    const outlet=getOutlet();
    if(!outlet) return {ok:false,reason:'outlet_missing'};
    const session=await window.sb.auth.getSession();
    if(!session.data?.session) return {ok:false,reason:'session_missing'};
    if(Notification.permission==='default'){
      const permission=await Notification.requestPermission();
      if(permission!=='granted') return {ok:false,reason:'notification_permission_'+permission};
    }
    if(Notification.permission!=='granted') return {ok:false,reason:'notification_permission_denied'};
    const registration=await navigator.serviceWorker.ready;
    let subscription=await registration.pushManager.getSubscription();
    if(!subscription){
      subscription=await registration.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:base64ToUint8Array(key)
      });
    }
    const r=await window.sb.rpc('restaurant_partner_register_push_subscription',{
      p_outlet_id:outlet,
      p_subscription:subscription.toJSON(),
      p_platform:/Android/i.test(navigator.userAgent)?'android':'web',
      p_app_version:'partner-v107-push-v1'
    });
    if(r.error) throw r.error;
    localStorage.setItem('jpt_restaurant_push_enabled','1');
    return {ok:true,endpoint:subscription.endpoint,outlet_id:outlet};
  }catch(e){
    console.warn('[JPT Restaurant Push] subscription:',e.message||e);
    return {ok:false,reason:e.message||'subscription_failed'};
  }
}
async function boot(){
  if(Notification.permission!=='granted') return {ok:false,reason:'permission_not_granted'};
  return enable();
}
window.JPTRestaurantPushSubscription={enable,boot,getOutlet};
})();