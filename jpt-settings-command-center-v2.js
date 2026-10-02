/* JPT Partner Settings Command Center V2
   One-click settings hub for the existing partner dashboard.
   Presentation/navigation layer only: no schema changes.
*/
(function(){
'use strict';
if(window.__JPT_SETTINGS_COMMAND_CENTER_V2__)return;
window.__JPT_SETTINGS_COMMAND_CENTER_V2__=true;

const cssId='jptSettingsCenterV2Css', rootId='jptSettingsCenterV2';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");

const groups=[
 {key:'outlet',icon:'🏪',title:'Outlet & Branding',desc:'Restaurant identity, contact details, logo and banner.',targets:['jptOutletBrandingManagerV1']},
 {key:'timing',icon:'⏰',title:'Timings & Schedule',desc:'Opening, closing and weekly closed-day schedule.',targets:['jptTimingManagerV1']},
 {key:'sponsor',icon:'📢',title:'Sponsor Ads',desc:'Delivery Partner and Customer Tracking sponsor advertisements.',targets:['jptBannerControlV3','jptSponsorManager','jptSponsorMediaManagerV4']},
 {key:'media',icon:'🎬',title:'Outlet Media & Banners',desc:'Customer-facing outlet banners, images, videos and scheduling.',panel:'campaigns',targets:['jptOutletMediaV1']},
 {key:'campaign',icon:'🎯',title:'Campaigns & Offers',desc:'Discount campaigns, Today Offer and customer media scheduling.',panel:'campaigns',targets:['jptCampaignV4']},
 {key:'menu',icon:'🍽️',title:'Menu & Images',desc:'Jump directly to professional Menu Management and image tools.',panel:'menu',targets:['jptCentralMenuPro']},
 {key:'access',icon:'🔐',title:'Partner Access & Onboarding',desc:'Outlet access, onboarding and partner permission controls.',targets:['jptPartnerOnboardPanel']},
 {key:'system',icon:'⚙️',title:'Dashboard System',desc:'Refresh the current outlet context and return to the dashboard home.',panel:'home',targets:[]}
];

function addCss(){
 if(document.getElementById(cssId))return;
 const s=document.createElement('style');s.id=cssId;
 s.textContent=[
  '#jptSettingsCenterV2{background:#090909;color:#fff;border:1px solid #30291c;border-radius:22px;padding:16px;box-shadow:0 18px 55px #0008}',
  '#jptSettingsCenterV2 .sc-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}',
  '#jptSettingsCenterV2 h2{margin:0;color:#f4d77a;font-size:22px}#jptSettingsCenterV2 .sc-sub{margin:4px 0 0;color:#999;font-size:11px}',
  '#jptSettingsCenterV2 .sc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
  '#jptSettingsCenterV2 .sc-card{background:#141414;color:#fff;border:1px solid #353535;border-radius:15px;padding:14px;text-align:left;min-height:105px}',
  '#jptSettingsCenterV2 .sc-card:hover{border-color:#d4af37}#jptSettingsCenterV2 .sc-icon{font-size:22px}#jptSettingsCenterV2 .sc-title{font-weight:950;margin-top:7px;color:#f4d77a}#jptSettingsCenterV2 .sc-desc{font-size:10px;color:#999;margin-top:5px;line-height:1.35}',
  '#jptSettingsCenterV2 .sc-back{background:#171717;color:#fff;border:1px solid #444;border-radius:10px;padding:9px 12px;font-weight:900}',
  '#jptSettingsCenterV2 .sc-work{display:none}#jptSettingsCenterV2 .sc-work.active{display:block}.jpt-sc-target-hidden{display:none!important}',
  '@media(max-width:700px){#jptSettingsCenterV2 .sc-grid{grid-template-columns:1fr}.jpt-sc-target{border-radius:16px!important}}'
 ].join('');
 document.head.appendChild(s);
}

function panelSwitch(id){
 if(typeof window.showPanel==='function')window.showPanel(id);
}

function targetLabel(id){
 const map={
  jptOutletBrandingManagerV1:'Outlet Branding',
  jptTimingManagerV1:'Outlet Timings',
  jptBannerControlV3:'Sponsor Advertisement Manager',
  jptSponsorManager:'Sponsor Ads',
  jptSponsorMediaManagerV4:'Sponsor Media',
  jptOutletMediaV1:'Outlet Media & Banners',
  jptCampaignV4:'Campaign Builder',
  jptCentralMenuPro:'Menu Management',
  jptPartnerOnboardingUIV2:'Partner Onboarding',
  jptPartnerPermissionUIV1:'Partner Permissions'
 };
 return map[id]||id;
}

function locate(group){
 for(const id of group.targets){const el=document.getElementById(id);if(el)return el}
 return null;
}

function openGroup(group){
 if(group.panel)panelSwitch(group.panel);
 const root=document.getElementById(rootId);if(!root)return;
 const work=root.querySelector('.sc-work');
 work.innerHTML='<button class="sc-back" type="button">← Back to Settings</button><div class="notice" style="margin:10px 0">Opening '+esc(group.title)+'…</div>';
 work.classList.add('active');
 root.querySelector('.sc-grid')?.classList.add('jpt-sc-target-hidden');
 root.querySelector('.sc-head')?.classList.add('jpt-sc-target-hidden');
 const show=()=>{
  if(group.panel==='menu'){
   panelSwitch('menu');
   work.innerHTML='<button class="sc-back" type="button">← Back to Settings</button><div class="notice" style="margin:10px 0">Menu Management is ready. Use the menu workspace directly.</div>';
   document.getElementById('jptCentralMenuPro')?.scrollIntoView({behavior:'smooth',block:'start'});
   work.querySelector('.sc-back').onclick=closeGroup;
   return true;
  }
  const el=locate(group);
  if(!el)return false;
  el.style.display='';
  work.innerHTML='<button class="sc-back" type="button">← Back to Settings</button><div class="notice" style="margin:10px 0">Direct control opened below. The existing manager DOM is preserved; no controls were rebuilt.</div>';
  work.querySelector('.sc-back').onclick=closeGroup;
  setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),50);
  return true;
 };
 if(!show()){
  const started=Date.now();
  const t=setInterval(()=>{if(show()||Date.now()-started>5000)clearInterval(t)},200);
 }
}

function closeGroup(){
 const root=document.getElementById(rootId);if(!root)return;
 root.querySelector('.sc-work').classList.remove('active');
 root.querySelector('.sc-work').innerHTML='';
 root.querySelector('.sc-grid').classList.remove('jpt-sc-target-hidden');
 root.querySelector('.sc-head').classList.remove('jpt-sc-target-hidden');
}

function mount(){
 const settings=document.getElementById('settings');
 if(!settings||document.getElementById(rootId))return false;
 addCss();
 const root=document.createElement('div');root.id=rootId;
 root.innerHTML='<div class="sc-head"><div><h2>Settings Command Center</h2><div class="sc-sub">One click opens the setting category you need. No long scrolling.</div></div><button class="sc-back" id="scHome">← Dashboard</button></div><div class="sc-grid"></div><div class="sc-work"></div>';
 const grid=root.querySelector('.sc-grid');
 groups.forEach(g=>{
  const b=document.createElement('button');b.type='button';b.className='sc-card';b.innerHTML='<div class="sc-icon">'+g.icon+'</div><div class="sc-title">'+esc(g.title)+'</div><div class="sc-desc">'+esc(g.desc)+'</div>';b.onclick=()=>openGroup(g);grid.appendChild(b);
 });
 root.querySelector('#scHome').onclick=()=>panelSwitch('home');
 settings.prepend(root);
 return true;
}

function boot(){
 let n=0;
 const t=setInterval(()=>{if(mount())clearInterval(t);if(++n>120)clearInterval(t)},250);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();