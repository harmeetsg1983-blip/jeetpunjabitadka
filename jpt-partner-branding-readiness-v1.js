/* JPT Partner Branding Readiness V1
   Additive only. Does not change database schema or existing save logic.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_BRANDING_READINESS_V1__) return;
  window.__JPT_PARTNER_BRANDING_READINESS_V1__=true;

  function toast(msg){
    try{
      const t=document.getElementById('toast');
      if(t){t.textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',2200);return;}
    }catch(e){}
    alert(msg);
  }

  async function check(){
    try{
      const sb=window.sb;
      const outlet=window.activeOutlet||document.getElementById('outletSelect')?.value||'';
      if(!sb||!outlet) return;
      const {data,error}=await sb.from('outlets').select('code,name,logo_url,banner_url,address,phone,contact_name').eq('code',outlet).maybeSingle();
      if(error||!data) return;

      const panel=document.getElementById('jptOutletBrandingPanel')||document.getElementById('jptOutletBranding');
      if(!panel) return;

      let box=document.getElementById('jptBrandingReadiness');
      if(!box){
        box=document.createElement('div');
        box.id='jptBrandingReadiness';
        box.style.cssText='margin:10px 0;padding:10px;border:1px solid #3a3a3a;border-radius:12px;background:#111;font-size:12px';
        panel.prepend(box);
      }
      const checks=[
        ['Restaurant name',!!String(data.name||'').trim()],
        ['Contact name',!!String(data.contact_name||'').trim()],
        ['Phone',!!String(data.phone||'').trim()],
        ['Address',!!String(data.address||'').trim()],
        ['Logo',!!String(data.logo_url||'').trim()],
        ['Banner',!!String(data.banner_url||'').trim()]
      ];
      const done=checks.filter(x=>x[1]).length;
      box.innerHTML='<b style="color:#d8ae42">Branding readiness</b> — '+done+'/'+checks.length+
        ' completed<br><span style="color:#aaa">'+
        checks.map(x=>(x[1]?'✓ ':'○ ')+x[0]).join(' &nbsp; ')+'</span>';
    }catch(e){}
  }

  function boot(){
    setTimeout(check,1200);
    setInterval(check,15000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
