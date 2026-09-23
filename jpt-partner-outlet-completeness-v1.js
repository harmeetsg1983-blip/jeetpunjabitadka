/* JPT Partner Outlet Completeness V1
   Visual-only completeness indicator for the active outlet.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_OUTLET_COMPLETENESS_V1__) return;
  window.__JPT_PARTNER_OUTLET_COMPLETENESS_V1__=true;

  async function render(){
    try{
      const sb=window.sb;
      const code=window.activeOutlet||document.getElementById('outletSelect')?.value||'';
      if(!sb||!code) return;
      const {data,error}=await sb.from('outlets')
        .select('name,address,phone,contact_name,logo_url,banner_url')
        .eq('code',code).maybeSingle();
      if(error||!data) return;

      const host=document.querySelector('.hero');
      if(!host) return;
      let el=document.getElementById('jptOutletCompleteness');
      if(!el){
        el=document.createElement('div');
        el.id='jptOutletCompleteness';
        el.style.cssText='margin-top:10px;padding:8px 10px;border-radius:10px;font-size:11px';
        host.appendChild(el);
      }

      const fields=[data.name,data.address,data.phone,data.contact_name,data.logo_url,data.banner_url];
      const count=fields.filter(v=>String(v||'').trim()).length;
      const ok=count===fields.length;
      el.style.border='1px solid '+(ok?'#27733e':'#604d1c');
      el.style.background=ok?'#092313':'#171207';
      el.style.color=ok?'#79e39b':'#d8ae42';
      el.innerHTML=(ok?'✓ Outlet profile complete':'○ Outlet profile '+count+'/'+fields.length+' complete')+
        '<span style="color:#999"> — Settings → Outlet Branding</span>';
    }catch(e){}
  }

  function boot(){setTimeout(render,1300);setInterval(render,20000);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
