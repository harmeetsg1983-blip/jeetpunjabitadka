/* JPT Customer Tracking Sponsor Slider V2 — outlet targeting + tracking placement */
(function(){
'use strict';
if(window.__JPT_CUSTOMER_TRACKING_SPONSOR_SLIDER_V2__)return;
window.__JPT_CUSTOMER_TRACKING_SPONSOR_SLIDER_V2__=true;
const TABLE='checkout_sponsor_ads';
function sb(){return window.sb||window.supabaseClient||null}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function getOutlet(){
 const q=new URLSearchParams(location.search).get('outlet');if(q)return q;
 for(const k of ['jpt_outlet_id','jpt_delivery_outlet','outlet_id']){try{const v=localStorage.getItem(k);if(v)return v}catch(e){}}
 return window.JPT_CUSTOMER_OUTLET_ID||'JPT-001';
}
function mount(){
 if(document.getElementById('jptCustomerSponsor'))return;
 const s=document.createElement('style');s.id='jptCustomerSponsorCssV2';s.textContent=`#jptCustomerSponsor{position:relative;margin:10px auto 12px;width:min(760px,calc(100% - 20px));border-radius:22px;padding:2px;background:linear-gradient(135deg,#2ee879,#d8aa45,#2ee879);box-shadow:0 0 30px rgba(49,197,107,.25),0 0 58px rgba(216,170,69,.14);overflow:hidden}.jpt-cs-inner{position:relative;height:205px;border-radius:20px;overflow:hidden;background:#050505}.jpt-cs-glow{position:absolute;inset:-40%;background:radial-gradient(circle at 15% 50%,rgba(49,197,107,.28),transparent 36%),radial-gradient(circle at 88% 18%,rgba(216,170,69,.22),transparent 34%);pointer-events:none}.jpt-cs-slide{position:absolute;inset:0;opacity:0;transition:opacity .65s ease}.jpt-cs-slide.on{opacity:1}.jpt-cs-slide img{width:100%;height:100%;object-fit:cover}.jpt-cs-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.20),transparent 45%,rgba(0,0,0,.15))}.jpt-cs-dots{position:absolute;bottom:9px;left:50%;transform:translateX(-50%);display:flex;gap:5px;z-index:4}.jpt-cs-dot{width:6px;height:6px;border-radius:50%;background:#fff7}.jpt-cs-dot.on{background:#f4d77a;box-shadow:0 0 8px #f4d77a}@media(max-width:520px){.jpt-cs-inner{height:190px}}`;document.head.appendChild(s);
 const el=document.createElement('section');el.id='jptCustomerSponsor';el.innerHTML='<div class="jpt-cs-inner"><div class="jpt-cs-glow"></div><div id="jptCsSlides"></div><div id="jptCsDots" class="jpt-cs-dots"></div></div>';
 const tracker=document.getElementById('jptOrderTracker');
 const video=document.getElementById('videoBanner');
 const anchor=tracker||video||document.querySelector('main')||document.body.firstElementChild;
 if(anchor&&anchor.parentNode) anchor.parentNode.insertBefore(el,anchor); else document.body.appendChild(el);
}
async function start(){
 mount();const el=document.getElementById('jptCustomerSponsor'),slides=el.querySelector('#jptCsSlides'),dots=el.querySelector('#jptCsDots');let idx=0,timer;
 async function refresh(){
  const r=await sb().from(TABLE).select('id,media_url,title,sponsor_name,target_all_live,outlet_ids,is_active,starts_at,ends_at,sort_order').eq('is_active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});if(r.error)return;
  const now=Date.now(),outlet=String(getOutlet()||'');
  const rows=(r.data||[]).filter(x=>(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now)&&(x.target_all_live||(outlet&&Array.isArray(x.outlet_ids)&&x.outlet_ids.includes(outlet))));
  slides.innerHTML=rows.map((x,i)=>`<div class="jpt-cs-slide ${i===0?'on':''}"><img src="${esc(x.media_url)}" alt="${esc(x.sponsor_name||x.title||'Sponsor')}"><div class="jpt-cs-shade"></div></div>`).join('');dots.innerHTML=rows.map((x,i)=>`<i class="jpt-cs-dot ${i===0?'on':''}></i>`).join('');idx=0;clearInterval(timer);if(rows.length>1)timer=setInterval(()=>{const ss=slides.children;if(!ss.length)return;ss[idx]?.classList.remove('on');dots.children[idx]?.classList.remove('on');idx=(idx+1)%ss.length;ss[idx]?.classList.add('on');dots.children[idx]?.classList.add('on')},5000);
 }
 await refresh();setInterval(refresh,60000);
}
function boot(){const t=setInterval(()=>{if(sb()){clearInterval(t);start()}},700)}
boot();
})();