/* JPT Partner Onboarding Dedupe V1
   Warns Central Owner before submitting an obvious duplicate pending application.
*/
(function(){
'use strict';
if(window.__JPT_PARTNER_ONBOARDING_DEDUPE_V1__)return;
window.__JPT_PARTNER_ONBOARDING_DEDUPE_V1__=true;
async function check(){
 const b=document.getElementById('jptObSave');if(!b||b.dataset.jptDedupe)return;b.dataset.jptDedupe='1';
 const old=b.onclick;
 b.onclick=async function(ev){
  const email=document.getElementById('jptObEmail')?.value.trim().toLowerCase()||'';
  if(email&&window.sb){
   try{
    const r=await window.sb.rpc('partner_list_applications');
    const hit=(r.data||[]).find(x=>String(x.owner_email||'').toLowerCase()===email&&['pending','approved'].includes(String(x.status||'').toLowerCase()));
    if(hit&&!confirm('An application already exists for this owner email. Continue anyway?'))return;
   }catch(e){}
  }
  return old?.call(this,ev);
 }
}
function boot(){let n=0;const t=setInterval(()=>{check();if(document.getElementById('jptObSave')?.dataset.jptDedupe||++n>40)clearInterval(t)},500)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();