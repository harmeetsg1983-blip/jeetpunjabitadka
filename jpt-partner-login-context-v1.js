/* JPT Partner Login Context V1 */
(function(){
'use strict';
if(window.__JPT_PARTNER_LOGIN_CONTEXT_V1__)return;
window.__JPT_PARTNER_LOGIN_CONTEXT_V1__=true;
async function sync(){
 try{
  const s=await window.sb?.auth?.getSession?.(),u=s?.data?.session?.user;if(!u)return;
  window.JPT_PARTNER_USER_ID=u.id;window.JPT_PARTNER_EMAIL=u.email||'';
  const r=await window.sb.rpc('partner_my_outlets');
  const rows=Array.isArray(r.data)?r.data:[];
  window.JPT_PARTNER_OUTLET_COUNT=rows.length;
  if(rows.length===1)window.JPT_OUTLET_ID=String(rows[0].outlet_id||rows[0].code||'');
 }catch(e){}
}
function boot(){setTimeout(sync,800);setInterval(sync,15000)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();