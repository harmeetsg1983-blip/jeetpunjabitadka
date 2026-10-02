(function(){'use strict';
if(window.__JPT_DELIVERY_PUSH_SUB_V1__) return;
window.__JPT_DELIVERY_PUSH_SUB_V1__=true;

function getPublicKey(){
  return window.JPT_VAPID_PUBLIC_KEY||document.querySelector('meta[name="jpt-vapid-public-key"]')?.content||'';
}

function base64ToUint8Array(base64){
  const pad='='.repeat((4-base64.length%4)%4);
  const raw=atob((base64+pad).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}

async function boot(){
  try{
    if(!('serviceWorker' in navigator)||!('PushManager' in window)) return {ok:false,reason:'push_unsupported'};
    const key=getPublicKey();
    if(!key) return {ok:false,reason:'vapid_public_key_missing'};
    if(!window.sb) return {ok:false,reason:'supabase_not_ready'};

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

    const token=JSON.stringify(subscription.toJSON());
    const r=await window.sb.rpc('delivery_partner_register_push_subscription',{
      p_push_token:token
    });
    if(r.error) throw r.error;

    return {ok:true,endpoint:subscription.endpoint};
  }catch(e){
    console.warn('JPT delivery push subscription:',e.message||e);
    return {ok:false,reason:e.message||'subscription_failed'};
  }
}

window.JPTDeliveryPushSubscription={boot};
})();