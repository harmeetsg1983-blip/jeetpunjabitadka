(function(){
'use strict';
if(window.__JPT_SPONSOR_ENTERPRISE_UI__) return;
window.__JPT_SPONSOR_ENTERPRISE_UI__=true;

function addStyle(){
  if(document.getElementById('jptSponsorEnterpriseCss')) return;
  const s=document.createElement('style');
  s.id='jptSponsorEnterpriseCss';
  s.textContent=[
    '#jptSponsorManager .jpt-enterprise-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:18px;margin-bottom:14px;border:1px solid rgba(212,175,55,.28);border-radius:18px;background:linear-gradient(120deg,#181818,#0b0b0b)}',
    '#jptSponsorManager .jpt-enterprise-head h3{margin:0;color:#f4d77a;font-size:20px}',
    '#jptSponsorManager .jpt-enterprise-head p{margin:6px 0 0;color:#999;font-size:12px;line-height:1.5}',
    '#jptSponsorManager .jpt-enterprise-badge{white-space:nowrap;color:#9ff0c0;border:1px solid rgba(80,220,140,.35);border-radius:999px;padding:7px 10px;font-size:10px;font-weight:900}',
    '#jptSponsorManager .jpt-enterprise-toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between;margin:16px 0 10px;flex-wrap:wrap}',
    '#jptSponsorManager .jpt-enterprise-search{width:280px;max-width:100%;box-sizing:border-box;background:#090909;color:#fff;border:1px solid #51401f;border-radius:10px;padding:10px}',
    '#jptSponsorManager .jpt-enterprise-section{border:1px solid #282828;border-radius:16px;padding:14px;margin-top:12px;background:#0d0d0d}',
    '#jptSponsorManager .jpt-enterprise-section-title{font-size:11px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;color:#f4d77a;margin-bottom:10px}',
    '#jptSponsorManager .jpt-enterprise-library .jpt-sm-item{border:1px solid #292929!important;border-radius:14px!important;background:#111;margin-top:9px;transition:.15s}',
    '#jptSponsorManager .jpt-enterprise-library .jpt-sm-item:hover{border-color:rgba(212,175,55,.65)!important;transform:translateY(-1px)}',
    '@media(max-width:700px){#jptSponsorManager .jpt-enterprise-head{flex-direction:column}.jpt-enterprise-search{width:100%!important}}'
  ].join('\n');
  document.head.appendChild(s);
}

function enhance(){
  const box=document.getElementById('jptSponsorManager');
  if(!box) return false;
  addStyle();
  if(!box.querySelector('.jpt-enterprise-head')){
    const old=box.querySelector('h3');
    const head=document.createElement('div');
    head.className='jpt-enterprise-head';
    head.innerHTML='<div><h3>📢 Sponsor Campaign Command Center</h3><p>Central campaign operations for Delivery Partner and Customer Tracking. Create, target, schedule, publish and control sponsor media from one professional workspace.</p></div><div class="jpt-enterprise-badge">● CENTRAL CONTROL ACTIVE</div>';
    if(old && old.closest('.jpt-sm')) old.closest('.jpt-sm').insertBefore(head,old.closest('.jpt-sm').firstChild);
  }
  const list=box.querySelector('.jpt-sm-list');
  if(list && !box.querySelector('.jpt-enterprise-toolbar')){
    const toolbar=document.createElement('div');
    toolbar.className='jpt-enterprise-toolbar';
    toolbar.innerHTML='<div><b>Campaign Library</b><div class="jpt-sm-note">Live inventory, targeting and activation controls</div></div><input class="jpt-enterprise-search" placeholder="Search sponsor, title or outlet">';
    list.parentNode.insertBefore(toolbar,list);
    const search=toolbar.querySelector('input');
    search.addEventListener('input',function(){
      const q=this.value.trim().toLowerCase();
      box.querySelectorAll('.jpt-sm-item').forEach(function(row){
        row.style.display=!q || row.textContent.toLowerCase().includes(q)?'':'none';
      });
    });
  }
  const workspace=box.querySelector('.jpt-sm-tabs');
  if(workspace && !workspace.previousElementSibling?.classList.contains('jpt-enterprise-section-title')){
    const t=document.createElement('div');
    t.className='jpt-enterprise-section-title';
    t.textContent='Campaign Workspace';
    workspace.parentNode.insertBefore(t,workspace);
  }
  return true;
}

function boot(){
  let tries=0;
  const timer=setInterval(function(){
    if(enhance() || ++tries>120) clearInterval(timer);
  },500);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();