/* JPT Partner Access Manager V1
   Additive module. Does not rewrite existing admin.html.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_ACCESS_MANAGER_V1__) return;
  window.__JPT_PARTNER_ACCESS_MANAGER_V1__=true;

  function esc(v){
    return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
  function getSB(){
    return window.sb || window.supabaseClient || window.supabase || null;
  }
  function host(){
    return document.querySelector('#settingsPanel') ||
           document.querySelector('[data-panel="settings"]') ||
           document.querySelector('#settings') ||
           document.querySelector('.settings-panel');
  }
  async function isCentral(){
    const sb=getSB(); if(!sb) return false;
    try{
      const r=await sb.rpc('partner_access_is_central_owner');
      return !r.error && r.data===true;
    }catch(e){ return false; }
  }
  async function load(){
    const sb=getSB(); if(!sb) throw new Error('Supabase client not ready');
    const [a,o]=await Promise.all([
      sb.rpc('partner_list_accounts'),
      sb.from('outlets').select('code,name,is_active').order('name')
    ]);
    if(a.error) throw a.error;
    if(o.error) throw o.error;
    return {accounts:a.data||[],outlets:o.data||[]};
  }
  function renderRows(data){
    const rows=data.accounts||[];
    const outlets=data.outlets||[];
    const opts=outlets.map(o=>`<option value="${esc(o.code)}">${esc(o.name||o.code)} (${esc(o.code)})</option>`).join('');
    const body=rows.map(p=>{
      const ids=Array.isArray(p.outlet_ids)?p.outlet_ids:[];
      const chips=ids.length?ids.map(x=>`<span class="jpt-pa-chip">${esc(x)}</span>`).join(' '):'<span style="opacity:.6">No outlet</span>';
      return `<div class="jpt-pa-row">
        <div><b>${esc(p.display_name||p.email||p.user_id)}</b><small>${esc(p.email||'')} · ${esc(p.role||'')} · ${esc(p.status||'')}</small></div>
        <div>${chips}</div>
        <button class="jpt-pa-revoke" data-user="${esc(p.user_id)}" data-email="${esc(p.email||'')}">Revoke</button>
      </div>`;
    }).join('');
    return {opts,body};
  }
  async function mount(){
    const h=host(); if(!h || document.getElementById('jptPartnerAccessManager')) return;
    if(!(await isCentral())) return;
    const box=document.createElement('section');
    box.id='jptPartnerAccessManager';
    box.innerHTML=`
      <div class="jpt-pa-card">
        <div class="jpt-pa-head">
          <div><h3>Partner Access</h3><p>Assign outlet access to existing partner login accounts.</p></div>
          <button id="jptPaRefresh">Refresh</button>
        </div>
        <div class="jpt-pa-form">
          <input id="jptPaEmail" type="email" placeholder="Partner login email">
          <select id="jptPaOutlet"><option value="">Select outlet</option></select>
          <select id="jptPaLevel"><option value="manage">Manage</option><option value="view">View only</option></select>
          <button id="jptPaAssign">ASSIGN OUTLET</button>
        </div>
        <div id="jptPaMsg"></div>
        <div class="jpt-pa-list-title">Current Partner Access</div>
        <div id="jptPaList">Loading...</div>
      </div>`;
    h.appendChild(box);

    const style=document.createElement('style');
    style.textContent=`
      #jptPartnerAccessManager{margin-top:18px}
      .jpt-pa-card{background:linear-gradient(180deg,#151515,#0d0d0d);border:1px solid rgba(212,175,55,.35);border-radius:18px;padding:16px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.28)}
      .jpt-pa-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .jpt-pa-head h3{margin:0 0 4px;color:#d4af37}.jpt-pa-head p{margin:0;opacity:.7;font-size:12px}
      .jpt-pa-form{display:grid;grid-template-columns:1.5fr 1.2fr .8fr auto;gap:8px;margin-top:14px}
      .jpt-pa-form input,.jpt-pa-form select{min-height:42px;border-radius:10px;border:1px solid #444;background:#111;color:#fff;padding:0 10px}
      .jpt-pa-form button,#jptPaRefresh,.jpt-pa-revoke{min-height:42px;border:1px solid #d4af37;background:#17130a;color:#f4d77b;border-radius:10px;padding:0 13px;font-weight:700}
      .jpt-pa-list-title{margin:18px 0 8px;color:#d4af37;font-weight:800}
      .jpt-pa-row{display:grid;grid-template-columns:1.3fr 1.7fr auto;gap:10px;align-items:center;border-top:1px solid #292929;padding:11px 0}
      .jpt-pa-row small{display:block;opacity:.6;margin-top:3px}.jpt-pa-chip{display:inline-block;border:1px solid rgba(212,175,55,.35);border-radius:999px;padding:4px 8px;margin:2px;font-size:11px}
      .jpt-pa-revoke{min-height:34px;border-color:#733;background:#210f0f;color:#ffb0b0}
      #jptPaMsg{margin-top:9px;font-size:12px;min-height:18px}
      @media(max-width:700px){.jpt-pa-form{grid-template-columns:1fr}.jpt-pa-row{grid-template-columns:1fr}.jpt-pa-revoke{width:100%}}
    `;
    document.head.appendChild(style);

    async function refresh(){
      const list=document.getElementById('jptPaList');
      try{
        const data=await load();
        const x=renderRows(data);
        document.getElementById('jptPaOutlet').innerHTML='<option value="">Select outlet</option>'+x.opts;
        list.innerHTML=x.body||'<div style="opacity:.6">No partner accounts found.</div>';
        list.querySelectorAll('.jpt-pa-revoke').forEach(btn=>btn.onclick=async()=>{
          if(!confirm('Revoke all outlet access for this partner?')) return;
          const current=await load();
          const p=current.accounts.find(x=>x.user_id===btn.dataset.user);
          for(const outlet of (p?.outlet_ids||[])){
            const r=await getSB().rpc('partner_revoke_outlet_access',{p_user_id:btn.dataset.user,p_outlet_id:outlet});
            if(r.error) throw r.error;
          }
          await refresh();
        });
      }catch(e){list.textContent=e.message||'Unable to load partner access.';}
    }
    document.getElementById('jptPaRefresh').onclick=refresh;
    document.getElementById('jptPaAssign').onclick=async()=>{
      const msg=document.getElementById('jptPaMsg');
      const email=document.getElementById('jptPaEmail').value.trim();
      const outlet=document.getElementById('jptPaOutlet').value;
      const level=document.getElementById('jptPaLevel').value;
      if(!email||!outlet){msg.textContent='Partner email and outlet are required.';return;}
      msg.textContent='Assigning...';
      try{
        const r=await getSB().rpc('partner_grant_outlet_access',{p_email:email,p_outlet_id:outlet,p_access_level:level});
        if(r.error) throw r.error;
        msg.textContent='Outlet access assigned successfully.';
        document.getElementById('jptPaEmail').value='';
        await refresh();
      }catch(e){msg.textContent=e.message||'Assignment failed.';}
    };
    await refresh();
  }
  function boot(){
    let n=0;
    const t=setInterval(async()=>{
      try{await mount();}catch(e){}
      if(document.getElementById('jptPartnerAccessManager')||++n>40) clearInterval(t);
    },500);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();
