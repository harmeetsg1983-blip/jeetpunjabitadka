/* JPT Outlet Branding + Single-Outlet Model V1 — additive only */
(function(){
'use strict';
const STYLE_ID='jpt-outlet-branding-v1-style';
function style(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement('style');s.id=STYLE_ID;
 s.textContent='.jpt-single-outlet #outletSelect{display:none!important}.jpt-brand-image{display:block;width:100%;height:100%;object-fit:cover;border-radius:inherit}.jpt-brand-hero{background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important}';
 document.head.appendChild(s);
}
async function apply(){
 style();
 const api=window.JPTPartnerAccess;let rows=[];
 try{rows=api?.getOutlets?.()||[]}catch(e){}
 const sel=document.getElementById('outletSelect');
 if(!rows.length&&sel)rows=[...sel.options].map(o=>({outlet_id:o.value}));
 document.documentElement.classList.toggle('jpt-single-outlet',rows.length===1);
 const id=sel?.value||rows[0]?.outlet_id||rows[0]?.code||'';
 if(!id||!window.sb)return;
 try{
  let q=await window.sb.from('outlets').select('code,outlet_id,name,logo_url,banner_url').eq('code',id).maybeSingle();
  if(q.error)return;
  let r=q.data;
  if(!r){q=await window.sb.from('outlets').select('code,outlet_id,name,logo_url,banner_url').eq('outlet_id',id).maybeSingle();if(q.error)return;r=q.data}
  if(!r)return;
  const name=r.name||r.code||id, code=r.code||r.outlet_id||id, logo=r.logo_url||'', banner=r.banner_url||'';
  for(const [x,v] of [['brandName',name],['heroName',name],['homeName',name],['heroId',code],['homeId',code]]){const e=document.getElementById(x);if(e)e.textContent=v}
  if(logo){const h='<img class="jpt-brand-image" src="'+logo.replace(/"/g,'&quot;')+'" alt="">';for(const x of ['brandLogo','storeSign']){const e=document.getElementById(x);if(e)e.innerHTML=h}}
  const hero=document.getElementById('hero');if(hero&&banner){hero.classList.add('jpt-brand-hero');hero.style.backgroundImage='linear-gradient(90deg,rgba(0,0,0,.88),rgba(0,0,0,.45)),url("'+banner.replace(/"/g,'&quot;')+'")'}
 }catch(e){console.warn('[JPT Outlet Branding V1]',e)}
}
function boot(){style();let n=0;const t=setInterval(()=>{apply();if(++n>=20)clearInterval(t)},500);const s=document.getElementById('outletSelect');if(s)s.addEventListener('change',()=>setTimeout(apply,150))}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();