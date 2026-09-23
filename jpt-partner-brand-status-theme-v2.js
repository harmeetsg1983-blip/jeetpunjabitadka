/* JPT Partner Brand + Dynamic Online/Offline Theme V2 — additive only
   Final visual direction:
   - Same dashboard structure for every outlet
   - Outlet-specific logo/name/banner
   - ONLINE = green illuminated theme
   - OFFLINE = red illuminated theme
   - Existing orders/menu/offers/campaigns logic is not replaced
*/
(function(){
'use strict';

const STYLE_ID='jpt-partner-brand-status-theme-v2-style';
const ROOT_CLASS='jpt-brand-status-v2';
let lastOutlet='';

function esc(v){
  return String(v??'').replace(/[&<>"']/g,function(c){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
  });
}

function injectStyle(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
:root.${ROOT_CLASS}{
  --status:#23e85b;
  --status-deep:#063015;
  --status-border:#20a94a;
  --status-glow:rgba(35,232,91,.46);
  --status-soft:rgba(35,232,91,.18);
  --status-text:#dfffe8;
}
:root.${ROOT_CLASS}.jpt-offline{
  --status:#ff3038;
  --status-deep:#3a0709;
  --status-border:#c5262c;
  --status-glow:rgba(255,48,56,.48);
  --status-soft:rgba(255,48,56,.18);
  --status-text:#ffe2e3;
}

/* Global premium shell */
.${ROOT_CLASS} body,
.${ROOT_CLASS} .app{
  background:#050505!important;
}
.${ROOT_CLASS} .top{
  background:linear-gradient(180deg,#090909,#050505)!important;
  border-bottom:1px solid #4a3a16!important;
  box-shadow:0 3px 18px rgba(0,0,0,.55);
}
.${ROOT_CLASS} .brandrow{min-height:60px}
.${ROOT_CLASS} #brandLogo{
  width:58px!important;height:58px!important;
  flex:0 0 58px;
  border-radius:50%!important;
  overflow:hidden;
  border:2px solid #d8ae42!important;
  background:#050505!important;
  box-shadow:0 0 16px rgba(216,174,66,.18);
}
.${ROOT_CLASS} #brandLogo img{
  width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;
}
.${ROOT_CLASS} .brand{
  color:#f1c95c!important;
  font-size:22px!important;
  font-weight:950!important;
}
.${ROOT_CLASS} .sub{color:#aaa!important}
.${ROOT_CLASS} .controls{margin-top:10px}
.${ROOT_CLASS} .select,
.${ROOT_CLASS} .btn{
  border-color:#4a3a18!important;
  background:#111!important;
}
.${ROOT_CLASS} .select:focus,
.${ROOT_CLASS} .btn:focus{outline-color:#d8ae42}

/* Main status/banner panel */
.${ROOT_CLASS} .hero{
  position:relative!important;
  overflow:hidden!important;
  min-height:230px;
  padding:18px!important;
  border:2px solid var(--status-border)!important;
  border-radius:18px!important;
  background-color:var(--status-deep)!important;
  background-size:cover!important;
  background-position:center!important;
  box-shadow:
    0 0 8px var(--status-glow),
    0 0 28px var(--status-soft),
    inset 0 0 45px rgba(0,0,0,.38)!important;
}
.${ROOT_CLASS} .hero:before{
  content:"";
  position:absolute;
  inset:0;
  z-index:0;
  background:
    linear-gradient(90deg,
      var(--status-soft) 0%,
      rgba(0,0,0,.20) 36%,
      rgba(0,0,0,.70) 100%),
    linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.48));
  pointer-events:none;
}
.${ROOT_CLASS} .hero>*{position:relative;z-index:1}
.${ROOT_CLASS} .hero h1{
  margin:0;
  color:#fff!important;
  font-size:26px!important;
  font-weight:950!important;
  text-shadow:0 2px 12px #000;
}
.${ROOT_CLASS} .hero p{
  color:#eee!important;
  font-weight:800;
  text-shadow:0 1px 7px #000;
}

/* Status card */
.${ROOT_CLASS} #statusBox{
  margin-top:16px!important;
  min-height:112px;
  display:flex;
  align-items:center;
  gap:14px;
  padding:12px!important;
  border:2px solid var(--status-border)!important;
  border-radius:16px!important;
  background:
    linear-gradient(90deg,
      var(--status-deep),
      rgba(0,0,0,.52))!important;
  box-shadow:
    0 0 10px var(--status-glow),
    inset 0 0 26px rgba(0,0,0,.36)!important;
}
.${ROOT_CLASS} #statusBox .store{
  width:92px!important;height:92px!important;
  flex:0 0 92px;
  border-radius:50%!important;
  overflow:hidden;
  background:#050505!important;
  border:2px solid #d8ae42!important;
  box-shadow:0 0 14px rgba(216,174,66,.20);
}
.${ROOT_CLASS} #statusBox .store img{
  width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;
}
.${ROOT_CLASS} #statusTitle{
  color:#fff!important;
  font-size:26px!important;
  line-height:1.05;
  font-weight:1000!important;
  text-transform:uppercase;
  text-shadow:0 2px 12px #000;
}
.${ROOT_CLASS} #statusText{
  color:#fff!important;
  font-size:14px!important;
  font-weight:700;
  margin-top:5px;
}
.${ROOT_CLASS} #statusToggle{
  margin-left:auto;
  min-width:132px;
  min-height:48px;
  border:2px solid var(--status)!important;
  border-radius:14px!important;
  color:#fff!important;
  background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.42))!important;
  box-shadow:0 0 15px var(--status-glow)!important;
  font-weight:1000!important;
}

/* Metric cards: keep same data, give them premium dashboard finish */
.${ROOT_CLASS} .grid>.card{
  background:linear-gradient(145deg,#151515,#0d0d0d)!important;
  border:1px solid #4a3a18!important;
  box-shadow:inset 0 0 18px rgba(216,174,66,.025);
}
.${ROOT_CLASS} .metric{color:#f1c95c!important}

/* Tabs/action cards */
.${ROOT_CLASS} .tabs .btn{
  border:1px solid #4a3a18!important;
  background:#111!important;
  color:#eee!important;
  font-weight:850;
}
.${ROOT_CLASS} .tabs .btn.gold{
  background:linear-gradient(180deg,#f3cc61,#c99528)!important;
  color:#111!important;
  border-color:#f4d06b!important;
  box-shadow:0 0 12px rgba(216,174,66,.18);
}

/* Home cards */
.${ROOT_CLASS} #home .card{
  background:linear-gradient(145deg,#141414,#0c0c0c)!important;
  border:1px solid #3d321b!important;
}
.${ROOT_CLASS} #homeMessage{
  border-color:var(--status-border)!important;
  background:linear-gradient(90deg,var(--status-soft),rgba(0,0,0,.18))!important;
  box-shadow:0 0 10px var(--status-soft);
}

/* Offline/online state is visible beyond the banner */
.${ROOT_CLASS}.jpt-offline .hero h1,
.${ROOT_CLASS}.jpt-offline .hero p{color:#fff!important}
.${ROOT_CLASS}.jpt-offline .metric{color:#f1c95c!important}

/* Responsive mobile layout */
@media(max-width:760px){
  .${ROOT_CLASS} .brand{font-size:19px!important}
  .${ROOT_CLASS} #brandLogo{width:54px!important;height:54px!important;flex-basis:54px}
  .${ROOT_CLASS} .hero{
    min-height:270px;
    padding:14px!important;
  }
  .${ROOT_CLASS} .hero h1{font-size:22px!important}
  .${ROOT_CLASS} #statusBox{
    min-height:128px;
    gap:9px;
    padding:10px!important;
  }
  .${ROOT_CLASS} #statusBox .store{
    width:76px!important;height:76px!important;flex-basis:76px;
  }
  .${ROOT_CLASS} #statusTitle{font-size:19px!important}
  .${ROOT_CLASS} #statusText{font-size:12px!important}
  .${ROOT_CLASS} #statusToggle{
    min-width:102px;
    min-height:44px;
    padding:8px 10px!important;
  }
}
`;

  document.head.appendChild(s);
}

function findActiveOutletId(){
  const sel=document.getElementById('outletSelect');
  return String(sel?.value||'').trim();
}

async function fetchOutlet(){
  const id=findActiveOutletId();
  if(!id || !window.sb) return null;

  let r=await window.sb.from('outlets')
    .select('code,outlet_id,name,logo_url,banner_url,accepting_orders,is_active,phone')
    .eq('code',id).maybeSingle();

  if(r.error || !r.data){
    r=await window.sb.from('outlets')
      .select('code,outlet_id,name,logo_url,banner_url,accepting_orders,is_active,phone')
      .eq('outlet_id',id).maybeSingle();
  }
  if(r.error) return null;
  return r.data||null;
}

function applyStatus(on){
  document.documentElement.classList.add(ROOT_CLASS);
  document.documentElement.classList.toggle('jpt-offline',!on);

  const box=document.getElementById('statusBox');
  if(box){
    box.classList.toggle('online',on);
    box.classList.toggle('offline',!on);
  }

  const hero=document.getElementById('hero');
  if(hero){
    hero.style.borderColor=on?'#20a94a':'#c5262c';
  }
}

function applyOutlet(row){
  if(!row) return;

  const name=row.name||row.code||row.outlet_id||'Outlet';
  const code=row.code||row.outlet_id||'';
  const logo=row.logo_url||'';
  const banner=row.banner_url||'';

  const ids={
    brandName:name,
    heroName:name,
    homeName:name,
    heroId:code,
    homeId:code
  };
  Object.keys(ids).forEach(id=>{
    const e=document.getElementById(id);
    if(e)e.textContent=ids[id];
  });

  const meta=document.getElementById('brandMeta');
  if(meta)meta.textContent=(row.phone||'')+' • Partner Dashboard V107';

  if(logo){
    const safe=esc(logo);
    const img='<img src="'+safe+'" alt="'+esc(name)+'">';
    const a=document.getElementById('brandLogo');
    const b=document.getElementById('storeSign');
    if(a)a.innerHTML=img;
    if(b)b.innerHTML=img;
  }

  const hero=document.getElementById('hero');
  if(hero){
    if(banner){
      hero.style.backgroundImage=
        'linear-gradient(90deg,rgba(0,0,0,.82),rgba(0,0,0,.40)),url("'+esc(banner)+'")';
    }else{
      hero.style.backgroundImage='';
    }
  }

  applyStatus(!!(row.accepting_orders && row.is_active));
}

async function refresh(){
  injectStyle();
  const id=findActiveOutletId();
  if(!id)return;
  const row=await fetchOutlet();
  if(row){
    lastOutlet=id;
    applyOutlet(row);
  }else{
    /* If the row is not readable here, preserve the existing dashboard state. */
    const box=document.getElementById('statusBox');
    const on=!!box && box.classList.contains('online') && !box.classList.contains('offline');
    applyStatus(on);
  }
}

function boot(){
  injectStyle();

  let tries=0;
  const timer=setInterval(async()=>{
    await refresh();
    if(++tries>=50)clearInterval(timer);
  },600);

  const sel=document.getElementById('outletSelect');
  if(sel){
    sel.addEventListener('change',()=>{
      setTimeout(refresh,250);
      setTimeout(refresh,1200);
    });
  }

  const status=document.getElementById('statusBox');
  if(status){
    const observer=new MutationObserver(()=>{
      const on=status.classList.contains('online') && !status.classList.contains('offline');
      applyStatus(on);
    });
    observer.observe(status,{attributes:true,attributeFilter:['class']});
  }

  /* Poll only the small outlet record, not the dashboard datasets. */
  setInterval(async()=>{
    const id=findActiveOutletId();
    if(id)await refresh();
  },10000);
}

document.readyState==='loading'
  ?document.addEventListener('DOMContentLoaded',boot)
  :boot();

})();
