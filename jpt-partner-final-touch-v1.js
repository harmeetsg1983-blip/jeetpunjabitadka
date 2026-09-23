/* JPT PARTNER FINAL TOUCH V1
   One-file visual finishing layer for the Restaurant Partner Dashboard.
   Purpose: bring the Home screen toward the supplied reference-app design
   without replacing Supabase/order/menu/business logic.

   SAFE DESIGN:
   - Does not alter database schema.
   - Does not replace reloadAll/loadMenu/loadOrders/etc.
   - Reuses existing live IDs so current dashboard logic can keep updating them.
   - Uses the outlet's existing logo_url/banner_url when available.
   - Generates a premium fallback promotional banner when no banner asset exists.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_FINAL_TOUCH_V1__) return;
  window.__JPT_PARTNER_FINAL_TOUCH_V1__=true;

  const CSS_ID='jptFinalTouchStyleV1';
  const ROOT_ID='jptFinalTouchHomeV1';

  function addStyle(){
    if(document.getElementById(CSS_ID)) return;
    const s=document.createElement('style');
    s.id=CSS_ID;
    s.textContent=`
/* ===== JPT FINAL TOUCH V1 ===== */
#${ROOT_ID}{display:block;background:#050505;color:#fff;padding-bottom:88px}
.jpt-ft-header{position:relative;overflow:hidden;margin:-12px -12px 12px;padding:14px 12px 12px;background:
 radial-gradient(circle at 15% 0%,rgba(216,174,66,.18),transparent 32%),
 radial-gradient(circle at 88% 20%,rgba(216,174,66,.10),transparent 35%),
 linear-gradient(135deg,#080808,#151108 55%,#050505);border-bottom:1px solid #5d4719}
.jpt-ft-headrow{display:flex;align-items:center;gap:10px}
.jpt-ft-menu{width:42px;height:42px;border:1px solid #76591d;border-radius:12px;display:grid;place-items:center;color:#e7bd4c;font-size:23px;background:#0b0b0b}
.jpt-ft-logo{width:58px;height:58px;border-radius:50%;object-fit:cover;border:2px solid #e7bd4c;box-shadow:0 0 18px rgba(231,189,76,.28);background:#090909}
.jpt-ft-title{flex:1;min-width:0}
.jpt-ft-title b{display:block;color:#f0c74f;font-size:20px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.jpt-ft-title span{display:block;color:#aaa;font-size:10px;letter-spacing:.9px;margin-top:2px}
.jpt-ft-bell{width:42px;height:42px;border:1px solid #76591d;border-radius:12px;background:#0b0b0b;color:#f0c74f;font-size:20px}
.jpt-ft-context{margin-top:8px;color:#d8ae42;font-size:11px;font-weight:850;text-align:center;letter-spacing:.5px}
.jpt-ft-banner{position:relative;min-height:178px;border:2px solid #6c5018;border-radius:18px;overflow:hidden;margin:12px 0;background:#0a0906;box-shadow:0 0 22px rgba(216,174,66,.12)}
.jpt-ft-banner.has-image{background-size:cover;background-position:center}
.jpt-ft-banner:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.18) 62%,rgba(0,0,0,.55))}
.jpt-ft-banner-content{position:relative;z-index:2;padding:24px 20px;max-width:72%}
.jpt-ft-banner-kicker{color:#e7bd4c;font-size:11px;font-weight:900;letter-spacing:1.5px}
.jpt-ft-banner h2{margin:5px 0 3px;font-family:Georgia,serif;color:#fff;font-size:27px;line-height:1.03}
.jpt-ft-banner p{margin:5px 0;color:#eee;font-size:12px;line-height:1.4}
.jpt-ft-banner .jpt-ft-goldline{width:75px;height:3px;background:#e7bd4c;margin:10px 0;border-radius:3px}
.jpt-ft-foodmark{position:absolute;right:14px;bottom:9px;z-index:2;font-size:64px;filter:drop-shadow(0 5px 10px #000)}
.jpt-ft-dots{position:absolute;z-index:3;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:6px}
.jpt-ft-dots i{width:7px;height:7px;border-radius:50%;background:#777}.jpt-ft-dots i:first-child{background:#e7bd4c}
.jpt-ft-status{border-radius:18px!important;padding:15px!important;margin:10px 0!important;box-shadow:0 0 20px rgba(25,220,90,.12)}
.jpt-ft-status .store{width:68px!important;height:68px!important;border-radius:50%!important}
.jpt-ft-status #statusTitle{font-size:20px!important;font-weight:950!important}
.jpt-ft-metrics{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px!important;margin:10px 0!important}
.jpt-ft-metric{background:linear-gradient(145deg,#151515,#0b0b0b);border:1px solid #4b3a17;border-radius:15px;padding:12px 9px;min-height:88px;text-align:center;box-shadow:inset 0 0 20px rgba(216,174,66,.025)}
.jpt-ft-metric .num{font-size:25px;font-weight:950;color:#f0c74f}
.jpt-ft-metric .lbl{font-size:10px;color:#bbb;margin-top:3px}
.jpt-ft-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}
.jpt-ft-action{border:1px solid #4a3a19;border-radius:14px;background:linear-gradient(145deg,#151515,#0b0b0b);color:#fff;min-height:78px;padding:9px 5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-weight:800;font-size:10px}
.jpt-ft-action b{font-size:23px;color:#f0c74f}
.jpt-ft-orders{display:flex;align-items:center;justify-content:space-between;gap:10px;background:linear-gradient(90deg,#e7bd4c,#b8871e);color:#111;border-radius:13px;padding:13px 15px;margin:10px 0;font-weight:950;box-shadow:0 5px 18px rgba(216,174,66,.2)}
.jpt-ft-orders button{border:0;background:transparent;color:#111;font-weight:950;font-size:14px}
.jpt-ft-section-title{display:flex;justify-content:space-between;align-items:center;margin:16px 2px 8px}
.jpt-ft-section-title b{font-size:17px;color:#f0c74f}
.jpt-ft-section-title span{font-size:10px;color:#888}
.jpt-ft-bottom{position:fixed;left:10px;right:10px;bottom:10px;z-index:90;background:rgba(8,8,8,.96);border:1px solid #4b3a17;border-radius:18px;padding:7px;display:grid;grid-template-columns:repeat(5,1fr);box-shadow:0 8px 35px #000}
.jpt-ft-bottom button{border:0;background:transparent;color:#aaa;border-radius:13px;padding:8px 3px;font-size:9px;font-weight:800}
.jpt-ft-bottom button.active{background:#e7bd4c;color:#111}
.jpt-ft-bottom b{display:block;font-size:18px;margin-bottom:2px}
@media(max-width:760px){
 .jpt-ft-metrics{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 .jpt-ft-actions{grid-template-columns:repeat(4,minmax(0,1fr))}
 .jpt-ft-banner{min-height:190px}
 .jpt-ft-banner h2{font-size:24px}
}
@media(min-width:900px){
 #${ROOT_ID}{max-width:1100px;margin:auto}
 .jpt-ft-banner{min-height:230px}
}
`;
    document.head.appendChild(s);
  }

  function esc(v){
    return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function panel(name){
    if(typeof window.showPanel==='function') window.showPanel(name);
    else document.querySelector('[data-panel="'+name+'"]')?.click();
  }

  async function getOutlet(){
    const code=String(window.activeOutlet||document.getElementById('outletSelect')?.value||localStorage.getItem('jpt_admin_outlet')||'');
    let data=null;
    try{
      if(window.sb&&code){
        const r=await window.sb.from('outlets')
          .select('code,name,logo_url,banner_url,status,is_active,accepting_orders')
          .eq('code',code).maybeSingle();
        data=r.data||null;
      }
    }catch(e){}
    return data||{code,name:document.getElementById('heroName')?.textContent||'Jeet Punjabi Tadka'};
  }

  function metric(id,label,icon){
    const src=document.getElementById(id);
    return `<div class="jpt-ft-metric"><div class="num">${esc(src?.textContent||'—')}</div><div class="lbl">${icon} ${esc(label)}</div></div>`;
  }

  function build(outlet){
    const oldHome=document.getElementById('home');
    const oldHero=document.getElementById('hero');
    const oldGrid=document.querySelector('.grid');

    if(!oldHome||!oldHero||!oldGrid)return;

    let root=document.getElementById(ROOT_ID);
    if(!root){
      root=document.createElement('div');
      root.id=ROOT_ID;
      oldHome.parentNode.insertBefore(root,oldHome);
    }

    const logo=outlet.logo_url||'';
    const banner=outlet.banner_url||'';
    const name=outlet.name||'Jeet Punjabi Tadka';
    const code=outlet.code||'';

    root.innerHTML=`
      <div class="jpt-ft-header">
        <div class="jpt-ft-headrow">
          <div class="jpt-ft-menu">☰</div>
          <img class="jpt-ft-logo" src="${esc(logo)}" onerror="this.style.display='none'">
          <div class="jpt-ft-title"><b>${esc(name)}</b><span>RESTAURANT PARTNER APP • ${esc(code)}</span></div>
          <button class="jpt-ft-bell" onclick="showPanel('orders')">🔔</button>
        </div>
        <div class="jpt-ft-context">${esc(name)} • ${esc(code)}</div>
      </div>

      <div class="jpt-ft-banner ${banner?'has-image':''}" ${banner?`style="background-image:url('${esc(banner)}')"`:''}>
        <div class="jpt-ft-banner-content">
          <div class="jpt-ft-banner-kicker">AUTHENTIC PUNJABI TASTE • BIDAR</div>
          <h2>${esc(name)}<br>KA ASLI SWAAD</h2>
          <div class="jpt-ft-goldline"></div>
          <p>Good Food • Great Mood • Happy Customers</p>
        </div>
        <div class="jpt-ft-foodmark">🍛</div>
        <div class="jpt-ft-dots"><i></i><i></i><i></i><i></i><i></i></div>
      </div>

      <div id="jptFinalStatusHost"></div>

      <div class="jpt-ft-section-title"><b>Today at your outlet</b><span>LIVE</span></div>
      <div class="jpt-ft-metrics">
        ${metric('ordersCount','Orders Today','🧾')}
        ${metric('menuCount','Menu Items','🍽️')}
        ${metric('offerCount','Active Offers','🏷️')}
        ${metric('campaignCount','Campaigns','📣')}
      </div>

      <div class="jpt-ft-section-title"><b>Quick Actions</b><span>Manage your restaurant</span></div>
      <div class="jpt-ft-actions">
        <button class="jpt-ft-action" onclick="showPanel('orders')"><b>🧾</b>Orders</button>
        <button class="jpt-ft-action" onclick="showPanel('menu')"><b>🍽</b>Menu Manager</button>
        <button class="jpt-ft-action" onclick="showPanel('images')"><b>🖼</b>Images</button>
        <button class="jpt-ft-action" onclick="showPanel('offers')"><b>🏷</b>Offers</button>
        <button class="jpt-ft-action" onclick="showPanel('campaigns')"><b>📣</b>Campaigns</button>
        <button class="jpt-ft-action" onclick="showPanel('finance')"><b>▥</b>Finance</button>
        <button class="jpt-ft-action" onclick="showPanel('reports')"><b>▤</b>Reports</button>
        <button class="jpt-ft-action" onclick="showPanel('settings')"><b>⚙</b>Settings</button>
      </div>

      <div class="jpt-ft-orders">
        <span>🧾 View Open Orders</span>
        <button onclick="showPanel('orders')">Open Orders →</button>
      </div>

      <div id="jptFinalOldHomeBridge"></div>
    `;

    const status=oldHero.querySelector('#statusBox');
    if(status){
      status.classList.add('jpt-ft-status');
      const host=root.querySelector('#jptFinalStatusHost');
      host.appendChild(status);
    }

    // Preserve the existing live metric IDs by moving their source cards off-screen
    // instead of cloning IDs. Existing application code can still update them.
    oldGrid.style.position='absolute';
    oldGrid.style.left='-100000px';
    oldGrid.style.width='1px';
    oldGrid.style.height='1px';
    oldGrid.style.overflow='hidden';
    oldGrid.style.opacity='0';

    oldHome.style.display='none';
    oldHero.style.display='none';

    let bottom=document.getElementById('jptFinalBottomNav');
    if(!bottom){
      bottom=document.createElement('nav');
      bottom.id='jptFinalBottomNav';
      bottom.className='jpt-ft-bottom';
      bottom.innerHTML=`
        <button class="active" data-ft-panel="home"><b>⌂</b>Home</button>
        <button data-ft-panel="orders"><b>🧾</b>Orders</button>
        <button data-ft-panel="menu"><b>☰</b>Menu</button>
        <button data-ft-panel="offers"><b>🏷</b>Offers</button>
        <button data-ft-panel="settings"><b>⚙</b>Settings</button>`;
      document.body.appendChild(bottom);
      bottom.querySelectorAll('button').forEach(b=>{
        b.onclick=()=>{
          bottom.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
          b.classList.add('active');
          const p=b.dataset.ftPanel;
          if(p==='home') window.scrollTo({top:0,behavior:'smooth'});
          else panel(p);
        };
      });
    }

    updateStatus();
  }

  function updateStatus(){
    const live=document.getElementById('statusBox');
    const host=document.getElementById('jptFinalStatusHost');
    if(!live||!host)return;
    if(live.parentElement!==host)host.appendChild(live);
    const online=live.classList.contains('online');
    live.classList.toggle('online',online);
    live.classList.toggle('offline',!online);
  }

  async function refresh(){
    try{
      const outlet=await getOutlet();
      build(outlet);
      updateStatus();
    }catch(e){console.warn('JPT Final Touch:',e)}
  }

  function boot(){
    addStyle();
    setTimeout(refresh,1800);
    // Rebuild only when the active outlet changes; do not interfere with polling.
    const sel=document.getElementById('outletSelect');
    if(sel)sel.addEventListener('change',()=>setTimeout(refresh,1200));
    window.addEventListener('jpt:outlet-changed',()=>setTimeout(refresh,800));
    window.addEventListener('jpt:outlet-data-refreshed',()=>setTimeout(refresh,800));
    window.addEventListener('jpt:branding-updated',()=>setTimeout(refresh,1000));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
