/* JPT PARTNER FINAL TOUCH V12 — CONSOLIDATED FINAL CORRECTION
   Only fixes:
   1) 8 Quick Action tiles = dark yellow/gold.
   2) Bottom navigation = one physical gold border, no duplicate/old nav layers.
   3) Central/multi-outlet users = visible outlet selector; single-outlet users = hidden.
   No business, Supabase, order, menu or customer logic changes.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_FINAL_TOUCH_V12__) return;
  window.__JPT_PARTNER_FINAL_TOUCH_V12__=true;

  const ROOT='jptFinalTouchHomeV10';
  const BOTTOM='jptV10Bottom';

  function outlets(){
    try{
      const a=window.JPTPartnerAccess?.getOutlets?.();
      if(Array.isArray(a)) return a.filter(x=>x && (x.outlet_id || x.code));
    }catch(e){}
    return [];
  }

  function removeOldBottomLayers(){
    document.querySelectorAll('[id^="jptV"][id$="Bottom"]').forEach(el=>{
      if(el.id!==BOTTOM) el.remove();
    });
    // Master UI V5 also creates a mobile bottom nav; remove it so only one nav remains.
    document.getElementById('jptMasterBottomNav')?.remove();
    document.getElementById('jptMasterSubNav')?.remove();
    document.querySelectorAll('nav[class*="jpt-v"], .jpt-v2-bottom,.jpt-v3-bottom,.jpt-v4-bottom,.jpt-v5-bottom,.jpt-v6-bottom,.jpt-v7-bottom,.jpt-v8-bottom,.jpt-v9-bottom').forEach(el=>{
      if(el.id!==BOTTOM) el.remove();
    });
  }

  function apply(root){
    if(!root) return;

    // 8 Quick Action tiles — dark yellow/gold only.
    root.querySelectorAll('.jpt-v9-action').forEach(el=>{
      el.style.setProperty('background','linear-gradient(145deg,#241b05,#0b0904)','important');
      el.style.setProperty('border','1.5px solid #e8b82f','important');
      el.style.setProperty('box-shadow','inset 0 0 16px rgba(232,184,47,.12),0 0 10px rgba(232,184,47,.18)','important');
      el.style.setProperty('outline','none','important');
    });

    removeOldBottomLayers();

    const bottom=document.getElementById(BOTTOM);
    if(bottom){
      // No shadow/outline that can visually read as a second border.
      bottom.style.setProperty('border','1.5px solid #d9a92b','important');
      bottom.style.setProperty('outline','none','important');
      bottom.style.setProperty('box-shadow','none','important');
      bottom.style.setProperty('background','#050505','important');
      bottom.style.setProperty('border-radius','20px','important');
      bottom.style.setProperty('padding','7px','important');
      bottom.querySelectorAll('button').forEach(btn=>{
        btn.style.setProperty('border','0','important');
        btn.style.setProperty('outline','none','important');
      });
    }

    const open=root.querySelector('.jpt-v9-open');
    if(open) open.style.setProperty('margin-bottom','34px','important');

    // Use the real existing #outletSelect so the existing access/reload flow remains authoritative.
    const original=document.getElementById('outletSelect');
    const wrap=document.getElementById('jptV10OutletWrap');
    if(!original || !wrap) return;
    const rows=outlets();
    if(rows.length<=1){
      original.style.removeProperty('display');
      original.closest('.jpt-v9-controls')?.style?.setProperty('display','none','important');
      wrap.classList.remove('show');
      return;
    }
    // Keep the existing authorized selector visible in the new header.
    const controls=original.closest('.jpt-v9-controls');
    if(controls){
      controls.style.setProperty('display','flex','important');
      controls.style.setProperty('width','100%','important');
      controls.style.setProperty('margin','8px 0 0','important');
    }
    original.style.setProperty('display','block','important');
    original.style.setProperty('width','100%','important');
    original.style.setProperty('max-width','100%','important');
    original.style.setProperty('height','40px','important');
    original.style.setProperty('border','1.5px solid #e8b82f','important');
    original.style.setProperty('border-radius','12px','important');
    original.style.setProperty('background','#070707','important');
    original.style.setProperty('color','#f4c84e','important');
    original.style.setProperty('font-weight','900','important');
    wrap.classList.remove('show');
    wrap.style.setProperty('display','none','important');
  }

  function boot(){
    const run=()=>apply(document.getElementById(ROOT));
    setTimeout(run,700);
    setInterval(run,1200);
    window.addEventListener('jpt:outlet-changed',()=>setTimeout(run,300));
    window.addEventListener('jpt:outlet-data-refreshed',()=>setTimeout(run,300));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
