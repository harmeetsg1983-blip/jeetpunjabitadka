/* JPT Delivery Sponsor Slider V3 — reliable outlet context */
(function(){
'use strict';
if(window.__JPT_DELIVERY_SPONSOR_SLIDER_V3__)return;
window.__JPT_DELIVERY_SPONSOR_SLIDER_V3__=true;
const TABLE='delivery_partner_sponsor_ads';
function sb(){return window.sb||window.supabaseClient||null}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function getOutlet(){return window.JPT_DELIVERY_OUTLET_ID||window.JPT_OUTLET_ID||window.activeOutlet||localStorage.getItem('jpt_delivery_outlet')||localStorage.getItem('jpt_outlet_id')||new URLSearchParams(location.search).get('outlet')||''}
function ensure(){
 let e=document.getElementById('jptDeliverySponsor');if(e)return e;
 const s=document.createElement('style');s.id='jptDeliverySponsorCssV4';s.textContent='#jptDeliverySponsor{position:relative;margin:12px 0 16px;display:grid;gap:14px}.jpt-ds-destination{position:relative;border-radius:22px;padding:2px;background:linear-gradient(135deg,#2ee879,#d8aa45,#2ee879);box-shadow:0 0 28px rgba(49,197,107,.28),0 0 55px rgba(216,170,69,.14)}.jpt-ds-label{padding:8px 12px 6px;color:#f4d77a;font-size:11px;font-weight:900;letter-spacing:.8px}.jpt-ds-inner{position:relative;min-height:240px;border-radius:20px;overflow:hidden;background:#070707}.jpt-ds-slide{position:absolute;inset:0;opacity:0;transition:opacity .65s ease}.jpt-ds-slide.on{opacity:1}.jpt-ds-slide img,.jpt-ds-slide video{width:100%;height:100%;object-fit:contain;object-position:center;background:#070707;display:block}.jpt-ds-sound{position:absolute;right:9px;bottom:9px;z-index:5;border:1px solid #d8aa45;background:#111d;color:#f4d77a;border-radius:99px;padding:6px 9px;font-weight:900}.jpt-ds-dots{position:absolute;left:50%;bottom:9px;transform:translateX(-50%);display:flex;gap:5px;z-index:3}.jpt-ds-dot{width:6px;height:6px;border-radius:50%;background:#ffffff77}.jpt-ds-dot.on{background:#f4d77a;box-shadow:0 0 8px #f4d77a}@media(max-width:520px){.jpt-ds-inner{min-height:220px}}';
 document.head.appendChild(s);
 e=document.createElement('section');e.id='jptDeliverySponsor';
 e.innerHTML='<div class="jpt-ds-destination" data-destination="DELIVERY-TOP"><div class="jpt-ds-label">DELIVERY PARTNER — TOP BANNER</div><div class="jpt-ds-inner"><div id="jptDsTopSlides"></div><div id="jptDsTopDots" class="jpt-ds-dots"></div></div></div><div class="jpt-ds-destination" data-destination="DELIVERY-LOWER"><div class="jpt-ds-label">DELIVERY PARTNER — LOWER BANNER</div><div class="jpt-ds-inner"><div id="jptDsLowerSlides"></div><div id="jptDsLowerDots" class="jpt-ds-dots"></div></div></div>';
 const home=document.getElementById('home');(home?.firstElementChild?.parentNode||document.querySelector('main')||document.body).insertBefore(e,home?.firstElementChild||null);return e;
}
async function load(){
 const c=sb();if(!c)return[];
 const r=await c.from(TABLE).select('id,media_url,media_type,video_url,title,sponsor_name,target_all_live,outlet_ids,is_active,starts_at,ends_at,sort_order,schedule_json').eq('is_active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
 if(r.error)return[];
 const now=Date.now(),outlet=String(getOutlet()||'');
 return(r.data||[]).filter(x=>(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now)&&(x.target_all_live||(outlet&&Array.isArray(x.outlet_ids)&&x.outlet_ids.includes(outlet))));
}
async function start(){
 const el=ensure(),configs=[
  {dest:'DELIVERY-TOP',slides:el.querySelector('#jptDsTopSlides'),dots:el.querySelector('#jptDsTopDots')},
  {dest:'DELIVERY-LOWER',slides:el.querySelector('#jptDsLowerSlides'),dots:el.querySelector('#jptDsLowerDots')}
 ];
 let state=configs.map(()=>({idx:0,timer:null,lastKey:''}));
 function stopTimer(s){if(s.timer){clearTimeout(s.timer);s.timer=null}}
 function renderOne(rows,cfg,s){
  stopTimer(s);
  const items=rows.slice();
  s.idx=Math.min(s.idx,Math.max(0,items.length-1));
  cfg.slides.innerHTML=items.map((x,i)=>{const sj=x.schedule_json||{},type=String(x.media_type||sj.media_kind||'image').toLowerCase(),src=type==='video'?(x.video_url||x.media_url):(x.media_url||x.banner_url);return '<div class="jpt-ds-slide '+(i===s.idx?'on':'')+'" data-id="'+esc(x.id)+'">'+(type==='video'?'<video autoplay muted playsinline preload="auto" src="'+esc(src||'')+'"></video>':'<img src="'+esc(src||'')+'" alt="'+esc(x.sponsor_name||x.title||'Sponsor')+'">')+'</div>'}).join('');
  cfg.dots.innerHTML=items.map((x,i)=>'<i class="jpt-ds-dot '+(i===s.idx?'on':'')+'"></i>').join('');
  const showNext=()=>{if(!items.length)return;cfg.slides.children[s.idx]?.classList.remove('on');cfg.dots.children[s.idx]?.classList.remove('on');s.idx=(s.idx+1)%items.length;cfg.slides.children[s.idx]?.classList.add('on');cfg.dots.children[s.idx]?.classList.add('on');bindCurrent(items,cfg,s)};
  const bindCurrent=(arr,cfg2,st)=>{
    cfg2.slides.querySelectorAll('video').forEach(v=>{v.onended=null;v.onerror=null;});
    const x=arr[st.idx];if(!x)return;
    const slide=cfg2.slides.children[st.idx],v=slide?.querySelector('video');
    if(v){v.muted=true;v.playsInline=true;v.onended=showNext;v.onerror=showNext;const b=document.createElement('button');b.className='jpt-ds-sound';b.textContent='🔇';b.onclick=()=>{v.muted=!v.muted;b.textContent=v.muted?'🔇':'🔊';v.play().catch(()=>{})};slide.appendChild(b);v.play().catch(()=>{});}
    else st.timer=setTimeout(showNext,10000);
  };
  bindCurrent(items,cfg,s);
 }
 async function refresh(){
  const rows=await load();
  for(let n=0;n<configs.length;n++){
   const cfg=configs[n],s=state[n],dest=cfg.dest;
   const routed=rows.filter(x=>{const d=String((x.schedule_json||{}).central_media_destination||'');if(d)return d===dest;return dest==='DELIVERY-TOP';});
   const key=routed.map(x=>[x.id,x.media_url,x.video_url,x.title,x.sponsor_name,x.is_active,x.starts_at,x.ends_at,x.sort_order,(x.outlet_ids||[]).join(',')].join('~')).join('|');
   if(key===s.lastKey)continue;s.lastKey=key;s.idx=0;renderOne(routed,cfg,s);
  }
 }
 await refresh();setInterval(refresh,5000);
}
function boot(){const t=setInterval(()=>{if(document.getElementById('home')&&sb()){clearInterval(t);start()}},700)}boot();
})();
