/* JPT Delivery Sponsor Slider V1 */
(function(){
'use strict';
if(window.__JPT_DELIVERY_SPONSOR_SLIDER_V1__)return;
window.__JPT_DELIVERY_SPONSOR_SLIDER_V1__=true;
const TABLE='delivery_partner_sponsor_ads';
function sb(){return window.sb||window.supabaseClient||null}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function ensure(){
 if(document.getElementById('jptDeliverySponsor'))return document.getElementById('jptDeliverySponsor');
 const s=document.createElement('style');s.id='jptDeliverySponsorCss';s.textContent=`
 #jptDeliverySponsor{position:relative;margin:12px 0 16px;border-radius:22px;padding:2px;background:linear-gradient(135deg,#2ee879,#d8aa45,#2ee879);box-shadow:0 0 28px rgba(49,197,107,.28),0 0 55px rgba(216,170,69,.14)}
 .jpt-ds-inner{position:relative;min-height:190px;border-radius:20px;overflow:hidden;background:#070707}
 .jpt-ds-glow{position:absolute;inset:-35%;background:radial-gradient(circle at 20% 50%,rgba(49,197,107,.28),transparent 38%),radial-gradient(circle at 85% 20%,rgba(216,170,69,.20),transparent 34%);pointer-events:none}
 .jpt-ds-slide{position:absolute;inset:0;opacity:0;transition:opacity .65s ease;display:grid;place-items:center}
 .jpt-ds-slide.on{opacity:1}.jpt-ds-slide img{width:100%;height:100%;object-fit:cover;display:block}
 .jpt-ds-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.28),transparent 45%,rgba(0,0,0,.18))}
 .jpt-ds-dots{position:absolute;left:50%;bottom:9px;transform:translateX(-50%);display:flex;gap:5px;z-index:3;max-width:80%;overflow:hidden}
 .jpt-ds-dot{width:6px;height:6px;border-radius:50%;background:#ffffff77}.jpt-ds-dot.on{background:#f4d77a;box-shadow:0 0 8px #f4d77a}
 @media(max-width:520px){.jpt-ds-inner{min-height:175px}}
 `;
 document.head.appendChild(s);
 const el=document.createElement('section');el.id='jptDeliverySponsor';el.innerHTML='<div class="jpt-ds-inner"><div class="jpt-ds-glow"></div><div id="jptDsSlides"></div><div id="jptDsDots" class="jpt-ds-dots"></div></div>';
 const home=document.getElementById('home');(home?.firstElementChild?.parentNode||document.querySelector('main')||document.body).insertBefore(el,home?.firstElementChild||null);
 return el;
}
async function load(){
 const r=await sb().from(TABLE).select('id,media_url,title,sponsor_name,target_all_live,outlet_ids,is_active,starts_at,ends_at,sort_order').eq('is_active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
 if(r.error)return[];
 const now=Date.now();return (r.data||[]).filter(x=>(x.target_all_live||true)&&(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now));
}
async function start(){
 const el=ensure();const slides=el.querySelector('#jptDsSlides'),dots=el.querySelector('#jptDsDots');let rows=[],idx=0,timer;
 async function refresh(){
  rows=await load();slides.innerHTML=rows.map((x,i)=>`<div class="jpt-ds-slide ${i===0?'on':''}"><img src="${esc(x.media_url)}" alt="${esc(x.sponsor_name||x.title||'Sponsor')}"><div class="jpt-ds-shade"></div></div>`).join('');
  dots.innerHTML=rows.map((x,i)=>`<i class="jpt-ds-dot ${i===0?'on':''}"></i>`).join('');
  idx=0;clearInterval(timer);if(rows.length>1)timer=setInterval(()=>{const ss=slides.children;if(!ss.length)return;ss[idx]?.classList.remove('on');dots.children[idx]?.classList.remove('on');idx=(idx+1)%ss.length;ss[idx]?.classList.add('on');dots.children[idx]?.classList.add('on')},5000);
 }
 await refresh();setInterval(refresh,60000);
}
function boot(){const t=setInterval(()=>{if(document.getElementById('home')&&sb()){clearInterval(t);start()}},700)}
boot();
})();