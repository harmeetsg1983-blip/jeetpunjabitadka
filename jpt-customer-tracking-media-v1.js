/* JPT Customer Tracking Media V1
   Isolated media carousel for the post-checkout tracking screen only.
   Reads the existing public.campaigns table; no database/schema changes.
   Does not wrap or modify checkout/order lifecycle code.
*/
(function(){
'use strict';
if(window.__JPT_CUSTOMER_TRACKING_MEDIA_V1__)return;
window.__JPT_CUSTOMER_TRACKING_MEDIA_V1__=true;
const TABLE='campaigns';
const $=id=>document.getElementById(id);
const sb=()=>window.sb||window.supabaseClient||null;
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const outlet=()=>String(window.JPT_LAST_PLACED_ORDER?.outlet_id||window.JPT_CUSTOMER_OUTLET_ID||window.JPT_OUTLET_ID||localStorage.getItem('jpt_outlet_id')||new URLSearchParams(location.search).get('outlet')||'JPT-001');
let items=[],index=0,mediaTimer=null,refreshTimer=null,observer=null,active=false,lastOutlet='';
function addStyle(){
 if($('jptTrackMediaStyleV1'))return;
 const s=document.createElement('style');s.id='jptTrackMediaStyleV1';
 s.textContent='#jptTrackMediaV1{margin:14px 14px 22px;border:1px solid #d8ae42;border-radius:16px;overflow:hidden;background:#101010;color:#fff;box-shadow:0 5px 18px #0002}#jptTrackMediaV1[hidden]{display:none!important}.jpttm-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;color:#d8ae42;font-size:12px;font-weight:900}.jpttm-count{color:#aaa;font-size:10px}.jpttm-stage{position:relative;width:100%;height:clamp(170px,30vh,310px);background:#050505}.jpttm-stage img,.jpttm-stage video{display:block;width:100%;height:100%;object-fit:contain;background:#050505}.jpttm-empty{padding:24px 14px;text-align:center;color:#aaa;font-size:12px}.jpttm-sound{position:absolute;right:10px;bottom:10px;background:#111e;color:#f5d477;border:1px solid #d8ae42;border-radius:99px;padding:8px 12px;font-weight:900}.jpttm-label{position:absolute;left:10px;top:10px;background:#111d;color:#f5d477;border:1px solid #d8ae42;border-radius:8px;padding:5px 8px;font-size:10px;font-weight:900}';
 document.head.appendChild(s);
}
function mount(){
 const tracker=$('jptOrderTracker');if(!tracker)return null;
 let box=$('jptTrackMediaV1');if(!box){addStyle();box=document.createElement('section');box.id='jptTrackMediaV1';box.hidden=true;box.innerHTML='<div class="jpttm-head"><span>Offers & Videos</span><span class="jpttm-count" id="jpttmCount"></span></div><div class="jpttm-stage" id="jpttmStage"><div class="jpttm-empty">Loading offers…</div></div>';const summary=$('jptTrackOrderSummary');if(summary)summary.insertAdjacentElement('afterend',box);else tracker.appendChild(box);}
 return box;
}
function clearMediaTimer(){if(mediaTimer){clearTimeout(mediaTimer);mediaTimer=null}}
function showNext(){
 clearMediaTimer();const box=mount();if(!box||!active)return;
 const stage=$('jpttmStage'),count=$('jpttmCount');if(!stage)return;
 if(!items.length){box.hidden=false;stage.innerHTML='<div class="jpttm-empty">No current offers or videos.</div>';if(count)count.textContent='';return}
 index=((index%items.length)+items.length)%items.length;
 const x=items[index],schedule=x.schedule_json||{},type=String(schedule.media_kind||(x.video_url?'video':'image')).toLowerCase(),src=String((type==='video'?(x.video_url||x.banner_url):(x.banner_url||x.video_url)||''));
 if(count)count.textContent=(index+1)+' / '+items.length;
 if(!src){index=(index+1)%items.length;showNext();return}
 stage.innerHTML='<span class="jpttm-label">'+esc(x.title||x.sponsor_name||'Offer')+'</span>'+(type==='video'?'<video playsinline preload="metadata" controls></video>':'<img loading="eager" alt="Restaurant offer">');
 const el=stage.querySelector(type==='video'?'video':'img');el.src=src;
 if(type==='video'){
   el.muted=schedule.muted!==false;el.controls=true;el.playsInline=true;
   el.onended=()=>{index=(index+1)%items.length;showNext()};
   el.onerror=()=>{index=(index+1)%items.length;showNext()};
   el.play().catch(()=>{});
 }else{
   el.onerror=()=>{index=(index+1)%items.length;showNext()};
   mediaTimer=setTimeout(()=>{index=(index+1)%items.length;showNext()},11000);
 }
}
async function refresh(){
 const q=sb();if(!q||!active)return;
 const box=mount();if(!box)return;
 const id=outlet();lastOutlet=id;
 try{
  const r=await q.from(TABLE).select('id,outlet_id,title,active,start_at,end_at,priority,banner_url,video_url,schedule_json,created_at').eq('active',true).eq('outlet_id',id).order('priority',{ascending:false}).order('created_at',{ascending:false});
  if(r.error){console.warn('[JPT tracking media] media query failed',r.error.message);return}
  const now=Date.now();
  items=(r.data||[]).filter(x=>{
   if(x.start_at&&new Date(x.start_at).getTime()>now)return false;
   if(x.end_at&&new Date(x.end_at).getTime()<now)return false;
   const j=x.schedule_json||{};
   return String(x.outlet_id||'')===id && j.controller==='jpt-outlet-media-v1' && String(j.placement||'').toLowerCase()==='lower' && !!(x.video_url||x.banner_url);
  }).slice(0,5);
  index=0;showNext();
 }catch(e){console.warn('[JPT tracking media] refresh failed',e)}
}
function sync(){
 const tracker=$('jptOrderTracker'),box=mount();
 const visible=!!(tracker&&tracker.classList.contains('show'));
 if(visible&&!active){active=true;if(box)box.hidden=false;refresh();refreshTimer=setInterval(refresh,60000)}
 else if(!visible&&active){active=false;clearMediaTimer();if(refreshTimer){clearInterval(refreshTimer);refreshTimer=null}if(box)box.hidden=true}
}
function boot(){
 mount();sync();
 if(observer)observer.disconnect();
 observer=new MutationObserver(sync);
 observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
 setInterval(sync,1000);
 window.addEventListener('jpt:order-placed',()=>setTimeout(sync,0));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();