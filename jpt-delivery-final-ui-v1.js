
/* JPT DELIVERY PARTNER — FINAL UI OVERLAY V1
   SAFE ADDITIVE UI LAYER
   Does not replace Supabase/RPC/backend functions.
*/
(function(){
'use strict';
if(window.__JPT_DELIVERY_FINAL_UI_V1__) return;
window.__JPT_DELIVERY_FINAL_UI_V1__ = true;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sbx=()=>window.sb||window.supabaseClient||null;

function css(){
 if(document.getElementById('jptFinalUiCss')) return;
 const s=document.createElement('style'); s.id='jptFinalUiCss';
 s.textContent=`
 #jptFinalUI{position:relative;z-index:20;max-width:720px;margin:0 auto;padding:10px 14px 92px;
   background:linear-gradient(180deg,#050505,#0b0b0b);color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
 #jptFinalUI *{box-sizing:border-box}
 .jpt-head{display:flex;align-items:center;gap:12px;padding:8px 0 12px}
 .jpt-avatar{width:58px;height:58px;border-radius:50%;border:1px solid #d8ae42;object-fit:cover;background:#111}
 .jpt-brand{flex:1;text-align:center}.jpt-brand b{display:block;font-size:18px;color:#f5d477;letter-spacing:.4px}.jpt-brand small{color:#aaa;letter-spacing:2px}.jpt-sardar-logo{width:34px;height:34px;margin:0 auto 2px;filter:drop-shadow(0 0 7px rgba(245,212,119,.55))}.jpt-sardar-logo svg{width:100%;height:100%;display:block}
 .jpt-icon{width:48px;height:48px;border-radius:14px;border:1px solid #4d3a19;background:#101010;color:#f5d477;font-size:24px}
 .jpt-banner{position:relative;margin:8px 0 15px;padding:1px;border-radius:20px;background:#e0b33f;
   box-shadow:0 0 10px rgba(224,179,63,.82),0 0 25px rgba(224,179,63,.48),0 0 44px rgba(224,179,63,.20)}
 .jpt-banner-in{position:relative;height:190px;border-radius:19px;overflow:hidden;background:#070707}
 .jpt-slide{position:absolute;inset:0;opacity:0;transition:opacity .65s ease}.jpt-slide.on{opacity:1}
 .jpt-slide img{width:100%;height:100%;display:block;object-fit:cover}
 .jpt-dots{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:5px;z-index:4}
 .jpt-dot{width:7px;height:7px;border-radius:50%;background:#777}.jpt-dot.on{background:#f5d477;box-shadow:0 0 9px #f5d477}
 .jpt-online{border:1px solid #1cff7a;border-radius:20px;padding:16px;
   background:linear-gradient(145deg,#061b10,#07110b);box-shadow:0 0 14px rgba(28,255,122,.65),0 0 32px rgba(28,255,122,.20);margin-bottom:14px}
 .jpt-online-row{display:flex;align-items:center;gap:12px}.jpt-online strong{font-size:23px;color:#35ff8b}
 .jpt-online small{display:block;color:#aaa;margin-top:3px}
 .jpt-toggle{margin-left:auto;min-width:118px;padding:12px 14px;border-radius:13px;border:1px solid #1cff7a;background:#103d25;color:#70ffa8;font-weight:900}
 .jpt-card{background:linear-gradient(145deg,#121212,#090909);border:1px solid #3e3019;border-radius:18px;padding:14px;margin:12px 0}
 .jpt-title{font-size:18px;font-weight:900;color:#f5d477;margin-bottom:10px}
 .jpt-order{border:1px solid #4d3a19;border-radius:15px;padding:13px;background:#0c0c0c}
 .jpt-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}
 .jpt-btn{padding:12px;border-radius:12px;border:1px solid #57431e;background:#181818;color:#fff;font-weight:800}
 .jpt-btn.gold{background:linear-gradient(180deg,#f4d37a,#c89228);color:#111;border:0}
 .jpt-btn.green{background:#123c25;border-color:#2b8d52;color:#70ffa8}
 .jpt-nav{position:fixed;left:0;right:0;bottom:0;z-index:100;background:#080808f5;border-top:1px solid #4a3818;padding:8px;display:flex;justify-content:center;gap:7px}
 .jpt-nav button{flex:1;max-width:150px;padding:10px;border-radius:11px;border:1px solid #4b391b;background:#141414;color:#eee;font-weight:800}
 @media(max-width:520px){.jpt-banner-in{height:175px}.jpt-brand b{font-size:18px}.jpt-online strong{font-size:20px}.jpt-toggle{min-width:104px}}
 `;
 document.head.appendChild(s);
}

function getOutlet(){
 return window.JPT_DELIVERY_OUTLET_ID||window.JPT_OUTLET_ID||localStorage.getItem('jpt_delivery_outlet')||localStorage.getItem('jpt_outlet_id')||'';
}

function build(){
 if(document.getElementById('jptFinalUI')) return;
 css();
 const old=document.getElementById('home');
 if(!old) return;
 old.style.display='none';

 const root=document.createElement('div'); root.id='jptFinalUI';
 root.innerHTML=`
 <div class="jpt-head">
   <button class="jpt-icon" id="jptMenu">☰</button>
   <div class="jpt-brand">
     <div class="jpt-sardar-logo" aria-label="Sardar silhouette logo">
       <svg viewBox="0 0 64 64" role="img" aria-hidden="true">
         <path d="M32 8c-10 0-18 7-18 16 0 4 1 7 3 10-4 3-7 8-8 14h46c-1-6-4-11-8-14 2-3 3-6 3-10 0-9-8-16-18-16z" fill="none" stroke="#f5d477" stroke-width="3"/>
         <path d="M17 24c2-8 8-12 15-12s13 4 15 12M22 28c3 3 6 4 10 4s7-1 10-4M27 37h10M20 48c4-4 8-6 12-6s8 2 12 6" fill="none" stroke="#f5d477" stroke-width="3" stroke-linecap="round"/>
         <circle cx="27" cy="25" r="1.7" fill="#f5d477"/>
         <circle cx="37" cy="25" r="1.7" fill="#f5d477"/>
       </svg>
     </div>
     <b>JEET PUNJABI TADKA</b>
     <small>DELIVERY PARTNER</small>
   </div>
   <button class="jpt-icon" id="jptBell">🔔</button>
 </div>
 <div class="jpt-banner"><div class="jpt-banner-in"><div id="jptSlides"></div><div id="jptDots" class="jpt-dots"></div></div></div>
 <div class="jpt-online">
   <div class="jpt-online-row">
     <div><strong id="jptOnlineText">ONLINE</strong><small id="jptOnlineSub">Orders incoming</small></div>
     <button id="jptOnlineBtn" class="jpt-toggle">GO OFFLINE</button>
   </div>
 </div>
 <div id="jptOfferCard" class="jpt-card" style="display:none">
   <div class="jpt-title">🔔 NEW DELIVERY OFFER</div>
   <div id="jptOfferText" class="jpt-order">Waiting for offer…</div>
   <div class="jpt-actions"><button id="jptAccept" class="jpt-btn green">ACCEPT</button><button id="jptReject" class="jpt-btn">REJECT</button></div>
 </div>
 <div id="jptCurrentCard" class="jpt-card" style="display:none">
   <div class="jpt-title">📦 CURRENT DELIVERY</div>
   <div id="jptCurrentText" class="jpt-order">Assignment</div>
   <div class="jpt-actions"><button id="jptNext" class="jpt-btn gold">NEXT STEP</button><button id="jptMaps" class="jpt-btn">📍 OPEN MAPS</button></div>
 </div>
 <div class="jpt-card">
   <div class="jpt-title">📊 Partner Dashboard</div>
   <div class="jpt-order"><span>Today / Current activity</span><div id="jptEarnings">Loading…</div></div>
 </div>
 `;
 root.insertAdjacentHTML('beforeend',`<div class="jpt-nav">
   <button id="jptHomeBtn">Home</button><button id="jptOnboardBtn">Onboard</button><button id="jptEarnBtn">Earnings</button><button id="jptToolsBtn">Tools</button>
 </div>`);
 old.parentNode.insertBefore(root,old);

 document.getElementById('jptOnlineBtn').onclick=async()=>{
   const online=document.getElementById('jptOnlineText').textContent==='ONLINE';
   if(online){ if(window.setOffline) await window.setOffline(); setOnlineVisual(false); }
   else { if(window.setOnline) await window.setOnline(); setOnlineVisual(true); }
 };
 document.getElementById('jptAccept').onclick=()=>window.respondOffer&&window.respondOffer(true);
 document.getElementById('jptReject').onclick=()=>window.respondOffer&&window.respondOffer(false);
 document.getElementById('jptNext').onclick=()=>window.nextDeliveryStatus&&window.nextDeliveryStatus();
 document.getElementById('jptMaps').onclick=()=>window.openMaps&&window.openMaps();
 document.getElementById('jptOnboardBtn').onclick=()=>window.show&&window.show('profile');
 document.getElementById('jptEarnBtn').onclick=()=>window.show&&window.show('history');
 document.getElementById('jptToolsBtn').onclick=()=>window.show&&window.show('tools');
 document.getElementById('jptHomeBtn').onclick=()=>window.show&&window.show('home');
 document.getElementById('jptMenu').onclick=()=>alert('Partner menu');
 document.getElementById('jptBell').onclick=()=>document.getElementById('jptOfferCard').scrollIntoView({behavior:'smooth'});
 loadBanners();
 setInterval(loadBanners,60000);
 setInterval(syncUi,1500);
 syncUi();
}

function setOnlineVisual(on){
 document.getElementById('jptOnlineText').textContent=on?'ONLINE':'OFFLINE';
 document.getElementById('jptOnlineSub').textContent=on?'Orders incoming':'You are offline';
 document.getElementById('jptOnlineBtn').textContent=on?'GO OFFLINE':'GO ONLINE';
}

async function loadBanners(){
 const slides=document.getElementById('jptSlides'),dots=document.getElementById('jptDots'),c=sbx();
 if(!slides||!c)return;
 const r=await c.from('delivery_partner_sponsor_ads').select('id,media_url,title,sponsor_name,target_all_live,outlet_ids,is_active,starts_at,ends_at,sort_order').eq('is_active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
 if(r.error)return;
 const now=Date.now(),out=String(getOutlet());
 const rows=(r.data||[]).filter(x=>(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now)&&(x.target_all_live||(out&&Array.isArray(x.outlet_ids)&&x.outlet_ids.includes(out))));
 slides.innerHTML=rows.map((x,i)=>`<div class="jpt-slide ${i===0?'on':''}"><img src="${esc(x.media_url)}" alt="${esc(x.sponsor_name||x.title||'Advertisement')}"></div>`).join('');
 dots.innerHTML=rows.map((x,i)=>`<i class="jpt-dot ${i===0?'on':''}"></i>`).join('');
 let idx=0;
 clearInterval(window.__jptBannerTimer);
 if(rows.length>1) window.__jptBannerTimer=setInterval(()=>{
   const ss=slides.children;if(!ss.length)return;
   ss[idx]?.classList.remove('on');dots.children[idx]?.classList.remove('on');
   idx=(idx+1)%ss.length;ss[idx]?.classList.add('on');dots.children[idx]?.classList.add('on');
 },1000);
}

function syncUi(){
 const st=document.getElementById('statusPill');
 if(st) setOnlineVisual(st.textContent==='ONLINE');
 const offer=document.getElementById('offer');
 const oc=document.getElementById('jptOfferCard');
 if(offer&&oc){
   const hidden=offer.classList.contains('hidden');
   oc.style.display=hidden?'none':'block';
   const ot=document.getElementById('offerText');
   const jo=document.getElementById('jptOfferText');
   if(ot&&jo)jo.textContent=ot.textContent+' • '+(document.getElementById('offerDetails')?.textContent||'');
 }
 const cur=document.getElementById('current'),cc=document.getElementById('jptCurrentCard');
 if(cur&&cc){
   const hidden=cur.classList.contains('hidden');
   cc.style.display=hidden?'none':'block';
   const ct=document.getElementById('currentStatus'),co=document.getElementById('currentOrder');
   document.getElementById('jptCurrentText').textContent=(co?.textContent||'')+' • '+(ct?.textContent||'');
   document.getElementById('jptNext').textContent=document.getElementById('nextBtn')?.textContent||'NEXT STEP';
 }
 const e=document.getElementById('earnings'); if(e)document.getElementById('jptEarnings').textContent=e.textContent;
}

function boot(){const t=setInterval(()=>{if(document.getElementById('home')&&sbx()){clearInterval(t);build()}},250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
