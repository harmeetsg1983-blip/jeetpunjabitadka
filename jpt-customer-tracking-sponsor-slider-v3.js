/* JPT Customer Tracking Sponsor Slider V4
   Two sponsor slots. Each slot can contain multiple images/videos.
   Images: 10 seconds max. Videos: next starts after ended.
   Existing checkout_sponsor_ads table; no schema changes.
*/
(function(){
'use strict';
if(window.__JPT_CUSTOMER_TRACKING_SPONSOR_SLIDER_V4__)return;
window.__JPT_CUSTOMER_TRACKING_SPONSOR_SLIDER_V4__=true;
const TABLE='checkout_sponsor_ads';
const sb=()=>window.sb||window.supabaseClient||null;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const outlet=()=>String(window.JPT_CUSTOMER_OUTLET_ID||window.JPT_OUTLET_ID||window.outletId||localStorage.getItem('jpt_outlet_id')||new URLSearchParams(location.search).get('outlet')||'JPT-001');
function mount(){
 if(document.getElementById('jptCustomerSponsorV4'))return;
 const st=document.createElement('style');st.textContent='#jptCustomerSponsorV4{display:none;margin:10px auto;width:min(760px,calc(100% - 20px));gap:10px;grid-template-columns:1fr 1fr}#jptCustomerSponsorV4.on{display:grid}.jpt-sv4{position:relative;height:150px;border:1px solid #d8ae42;border-radius:16px;overflow:hidden;background:#050505;box-shadow:0 0 18px rgba(216,174,66,.18)}.jpt-sv4 img,.jpt-sv4 video{width:100%;height:100%;object-fit:cover;display:block}.jpt-sv4-sound{position:absolute;right:8px;bottom:8px;border:1px solid #d8ae42;background:#111d;color:#f4d77a;border-radius:99px;padding:6px 9px;font-weight:900;z-index:3}.jpt-sv4-label{position:absolute;left:8px;top:8px;background:#111c;color:#f4d77a;border:1px solid #d8ae42;border-radius:8px;padding:4px 7px;font-size:9px;font-weight:900;z-index:3}@media(max-width:520px){#jptCustomerSponsorV4{grid-template-columns:1fr}.jpt-sv4{height:135px}}';document.head.appendChild(st);
 const e=document.createElement('section');e.id='jptCustomerSponsorV4';e.innerHTML='<div id="jptSponsorSlot1" class="jpt-sv4"><span class="jpt-sv4-label">SPONSOR 1</span></div><div id="jptSponsorSlot2" class="jpt-sv4"><span class="jpt-sv4-label">SPONSOR 2</span></div>';
 document.body.appendChild(e);
 const place=()=>{
   const modal=document.getElementById('modal'),tracker=document.getElementById('jptOrderTracker');
   const checkout=!!modal?.classList.contains('show'),tracking=!!tracker?.classList.contains('show');
   e.classList.toggle('on',checkout||tracking);
   if(checkout){const sheet=modal?.querySelector('.sheet');const first=sheet?.querySelector('.box');if(sheet&&first)e.parentNode!==sheet&&sheet.insertBefore(e,first)}
   else if(tracking){const top=tracker?.querySelector('.jpt-track-top');if(tracker&&top)e.parentNode!==tracker&&top.insertAdjacentElement('afterend',e)}
 };
 new MutationObserver(place).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});setInterval(place,1000);place();
 return e;
}
async function start(){
 const host=mount(),slots=[host.querySelector('#jptSponsorSlot1'),host.querySelector('#jptSponsorSlot2')];
 let timers=[null,null],indexes=[0,0];
 async function refresh(){
  const q=sb();if(!q)return;
  const r=await q.from(TABLE).select('id,media_url,media_type,video_url,title,sponsor_name,target_all_live,outlet_ids,is_active,starts_at,ends_at,sort_order,schedule_json').eq('is_active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
  if(r.error)return;
  const now=Date.now(),id=outlet();
  const rows=(r.data||[]).filter(x=>(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now)&&(x.target_all_live||(id&&Array.isArray(x.outlet_ids)&&x.outlet_ids.includes(id))));
  const grouped=[1,2].map(n=>rows.filter(x=>Number(x.schedule_json?.slot||0)===n));
  grouped.forEach((items,n)=>{
   const h=slots[n];if(!items.length){h.innerHTML='<span class="jpt-sv4-label">SPONSOR '+(n+1)+'</span>';h.style.display='none';return}
   h.style.display='block';indexes[n]=0;if(timers[n])clearTimeout(timers[n]);
   const show=()=>{
    const x=items[indexes[n]%items.length],s=x.schedule_json||{},type=String(x.media_type||s.media_kind||'image').toLowerCase(),src=type==='video'?(x.video_url||x.media_url):(x.media_url||x.banner_url);
    h.innerHTML='<span class="jpt-sv4-label">SPONSOR '+(n+1)+'</span>'+ (type==='video'?'<video autoplay playsinline preload="auto"></video>':'<img alt="Sponsor banner">');
    const el=h.querySelector(type==='video'?'video':'img');if(!el||!src)return;
    el.src=src;
    if(type==='video'){
      el.muted=s.muted!==false;el.controls=false;el.playsInline=true;
      el.onended=()=>{indexes[n]=(indexes[n]+1)%items.length;show()};
      el.onerror=()=>{indexes[n]=(indexes[n]+1)%items.length;show()};
      const b=document.createElement('button');b.className='jpt-sv4-sound';b.textContent=el.muted?'🔇':'🔊';b.onclick=()=>{el.muted=!el.muted;b.textContent=el.muted?'🔇':'🔊';el.play().catch(()=>{})};h.appendChild(b);el.play().catch(()=>{});
    }else timers[n]=setTimeout(()=>{indexes[n]=(indexes[n]+1)%items.length;show()},10000);
   };show();
  });
 }
 await refresh();setInterval(refresh,60000);
}
function boot(){const t=setInterval(()=>{if(sb()){clearInterval(t);start()}},700)}boot();
})();