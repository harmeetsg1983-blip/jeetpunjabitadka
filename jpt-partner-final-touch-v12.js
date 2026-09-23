/* JPT PARTNER FINAL TOUCH V12 — ANTI-FLICKER CORRECTION
   Keeps the V12 visual fixes but removes the repeating 1.2s DOM rewrite
   that can cause visible blinking/flicker on mobile.
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
    document.getElementById('jptMasterBottomNav')?.remove();
    document.getElementById('jptMasterSubNav')?.remove();
    document.querySelectorAll(
      'nav[class*="jpt-v"], .jpt-v2-bottom,.jpt-v3-bottom,.jpt-v4-bottom,'+
      '.jpt-v5-bottom,.jpt-v6-bottom,.jpt-v7-bottom,.jpt-v8-bottom,.jpt-v9-bottom'
    ).forEach(el=>{
      if(el.id!==BOTTOM) el.remove();
    });
  }

  function apply(){
    const root=document.getElementById(ROOT);
    if(!root) return false;

    root.querySelectorAll('.jpt-v9-action').forEach(el=>{
      el.style.setProperty('background','linear-gradient(145deg,#241b05,#0b0904)','important');
      el.style.setProperty('border','1.5px solid #e8b82f','important');
      el.style.setProperty('box-shadow','inset 0 0 16px rgba(232,184,47,.12),0 0 10px rgba(232,184,47,.18)','important');
      el.style.setProperty('outline','none','important');
    });

    removeOldBottomLayers();

    const bottom=document.getElementById(BOTTOM);
    if(bottom){
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

    const original=document.getElementById('outletSelect');
    const wrap=document.getElementById('jptV10OutletWrap');
    if(!original || !wrap) return true;

    const rows=outlets();
    if(rows.length<=1){
      wrap.classList.remove('show');
      wrap.style.setProperty('display','none','important');
      original.style.setProperty('display','none','important');
      return true;
    }

    const fake=document.getElementById('jptV10OutletSelect');
    if(fake && fake!==original) fake.remove();

    wrap.classList.add('show');
    wrap.style.setProperty('display','block','important');
    wrap.style.setProperty('width','100%','important');

    if(original.parentElement!==wrap) wrap.appendChild(original);

    original.style.setProperty('display','block','important');
    original.style.setProperty('width','100%','important');
    original.style.setProperty('max-width','100%','important');
    original.style.setProperty('height','40px','important');
    original.style.setProperty('border','1.5px solid #e8b82f','important');
    original.style.setProperty('border-radius','12px','important');
    original.style.setProperty('background','#070707','important');
    original.style.setProperty('color','#f4c84e','important');
    original.style.setProperty('font-weight','900','important');
    return true;
  }

  async function boot(){
    try{
      if(window.JPTPartnerAccess?.reload) await window.JPTPartnerAccess.reload();
    }catch(e){
      console.warn('[JPT V12 anti-flicker] access sync skipped:',e);
    }

    // Run only a few startup checks, then STOP. No repeating DOM rewrite.
    [0,500,1200,2000].forEach(ms=>{
      setTimeout(apply,ms);
    });

    window.addEventListener('jpt:outlet-changed',()=>setTimeout(apply,300));
    window.addEventListener('jpt:outlet-data-refreshed',()=>setTimeout(apply,300));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
