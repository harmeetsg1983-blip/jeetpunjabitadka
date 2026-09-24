/* JPT PARTNER FINAL TOUCH V11 — FINAL CORRECTION
   Only fixes the three remaining UI issues on top of V10:
   1) Quick Action tiles forced to dark-gold/yellow.
   2) Bottom navigation forced to one clean bright-gold border and separated from content.
   3) Central/multi-outlet users get a visible outlet switcher; single-outlet users do not.
   No business/database logic is replaced.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_FINAL_TOUCH_V11__) return;
  window.__JPT_PARTNER_FINAL_TOUCH_V11__=true;
  const ROOT='jptFinalTouchHomeV10';

  function getOutlets(){
    try{
      const rows=window.JPTPartnerAccess?.getOutlets?.();
      if(Array.isArray(rows)) return rows.filter(x=>x&&x.outlet_id);
    }catch(e){}
    return [];
  }

  function applyGoldActions(root){
    if(!root) return;
    root.querySelectorAll('.jpt-v9-action').forEach(card=>{
      card.style.setProperty('background','linear-gradient(145deg,#241b05,#0b0904)','important');
      card.style.setProperty('border','1.5px solid #e8b82f','important');
      card.style.setProperty('box-shadow','inset 0 0 16px rgba(232,184,47,.12),0 0 12px rgba(232,184,47,.22)','important');
      card.style.setProperty('outline','none','important');
    });
  }

  function applyBottom(root){
    const bottom=document.getElementById('jptV10Bottom');
    if(!bottom) return;
    // One border only. Remove visual outlines/shadows that can look like a second line.
    bottom.style.setProperty('border','1.5px solid #e8b82f','important');
    bottom.style.setProperty('outline','none','important');
    bottom.style.setProperty('box-shadow','0 0 16px rgba(232,184,47,.28)','important');
    bottom.style.setProperty('background','#050505','important');
    bottom.style.setProperty('bottom','12px','important');
    bottom.style.setProperty('z-index','9999','important');
    bottom.style.setProperty('margin','0','important');
    bottom.querySelectorAll('button').forEach(btn=>{
      btn.style.setProperty('border','0','important');
      btn.style.setProperty('outline','none','important');
      btn.style.setProperty('box-shadow',btn.classList.contains('active')?'0 0 18px rgba(240,198,77,.35)':'none','important');
    });
    // Prevent the Open Orders bar from visually touching/meeting the fixed nav.
    const open=root?.querySelector('.jpt-v9-open');
    if(open){
      open.style.setProperty('margin-bottom','30px','important');
    }
  }

  function wireOutletSwitch(root){
    const wrap=document.getElementById('jptV10OutletWrap');
    const select=document.getElementById('jptV10OutletSelect');
    if(!wrap||!select) return;
    const rows=getOutlets();
    if(rows.length<=1){
      wrap.classList.remove('show');
      return;
    }
    wrap.classList.add('show');
    const current=String(window.activeOutlet||document.getElementById('outletSelect')?.value||localStorage.getItem('jpt_admin_outlet')||'');
    select.innerHTML=rows.map(r=>{
      const id=String(r.outlet_id||'');
      const name=String(r.outlet_name||id);
      return '<option value="'+id.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">'+name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+' • '+id.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</option>';
    }).join('');
    if(current) select.value=current;
    if(select.dataset.jptV11Bound!=='1'){
      select.dataset.jptV11Bound='1';
      select.addEventListener('change',async function(){
        const code=this.value;
        if(!code) return;
        window.activeOutlet=code;
        localStorage.setItem('jpt_admin_outlet',code);
        const original=document.getElementById('outletSelect');
        if(original){
          original.value=code;
          original.dispatchEvent(new Event('change',{bubbles:true}));
        }else{
          window.dispatchEvent(new CustomEvent('jpt:outlet-changed',{detail:{outlet_id:code}}));
        }
      });
    }
  }

  function apply(){
    const root=document.getElementById(ROOT);
    if(!root) return;
    applyGoldActions(root);
    applyBottom(root);
    wireOutletSwitch(root);
  }

  function boot(){
    setTimeout(apply,800);
    
    window.addEventListener('jpt:outlet-changed',()=>setTimeout(apply,500));
    window.addEventListener('jpt:outlet-data-refreshed',()=>setTimeout(apply,500));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
