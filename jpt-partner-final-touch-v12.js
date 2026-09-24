/* JPT PARTNER FINAL TOUCH V13 — CUSTOM OUTLET PICKER
   Fixes:
   1) Removes the native Android/Chrome white outlet popup.
   2) Replaces it with a black + gold custom outlet picker.
   3) Removes repeated DOM polling/rewrite to stop flicker.
   4) Keeps the existing #outletSelect value/change logic intact.
   No customer app, Supabase, orders, menu or business logic changes.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_FINAL_TOUCH_V13__) return;
  window.__JPT_PARTNER_FINAL_TOUCH_V13__=true;

  const ROOT='jptFinalTouchHomeV10';
  const BOTTOM='jptV10Bottom';
  const WRAP='jptV13OutletWrap';
  const TRIGGER='jptV13OutletTrigger';
  const POPUP='jptV13OutletPopup';

  function getOutlets(){
    try{
      const a=window.JPTPartnerAccess?.getOutlets?.();
      if(Array.isArray(a)) return a.filter(x=>x && (x.outlet_id || x.code));
    }catch(e){}
    return [];
  }

  function cleanupOldNav(){
    document.querySelectorAll('[id^="jptV"][id$="Bottom"]').forEach(el=>{
      if(el.id!==BOTTOM) el.remove();
    });
    document.getElementById('jptMasterBottomNav')?.remove();
    document.getElementById('jptMasterSubNav')?.remove();
    document.querySelectorAll(
      'nav[class*="jpt-v"],.jpt-v2-bottom,.jpt-v3-bottom,.jpt-v4-bottom,'+
      '.jpt-v5-bottom,.jpt-v6-bottom,.jpt-v7-bottom,.jpt-v8-bottom,.jpt-v9-bottom'
    ).forEach(el=>{
      if(el.id!==BOTTOM) el.remove();
    });
  }

  function styleDashboard(root){
    root?.querySelectorAll('.jpt-v9-action').forEach(el=>{
      el.style.setProperty('background','linear-gradient(145deg,#241b05,#0b0904)','important');
      el.style.setProperty('border','1.5px solid #e8b82f','important');
      el.style.setProperty('box-shadow','inset 0 0 16px rgba(232,184,47,.12),0 0 10px rgba(232,184,47,.18)','important');
      el.style.setProperty('outline','none','important');
    });
    root?.querySelectorAll('.jpt-v9-metric').forEach(el=>{
      el.style.setProperty('background','linear-gradient(145deg,#06150b,#030705)','important');
      el.style.setProperty('border','1px solid rgba(0,255,98,.34)','important');
      el.style.setProperty('box-shadow','inset 0 0 16px rgba(0,255,98,.045),0 0 9px rgba(0,255,98,.08)','important');
      el.style.setProperty('outline','none','important');
    });
    cleanupOldNav();

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

    const open=root?.querySelector('.jpt-v9-open');
    if(open) open.style.setProperty('margin-bottom','34px','important');
  }

  function buildPicker(select, host, rows){
    let wrap=document.getElementById(WRAP);
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id=WRAP;
      host.replaceChildren(wrap);
    }else{
      wrap.replaceChildren();
    }

    wrap.style.cssText=[
      'display:block',
      'width:100%',
      'position:relative',
      'z-index:10050'
    ].join(';');

    const trigger=document.createElement('button');
    trigger.type='button';
    trigger.id=TRIGGER;
    trigger.style.cssText=[
      'width:100%',
      'height:44px',
      'border:1.5px solid #e8b82f',
      'border-radius:12px',
      'background:linear-gradient(145deg,#161106,#050505)',
      'color:#f4c84e',
      'font-size:15px',
      'font-weight:900',
      'padding:0 42px 0 14px',
      'text-align:left',
      'position:relative',
      'box-sizing:border-box',
      'box-shadow:0 0 10px rgba(232,184,47,.16)',
      'cursor:pointer'
    ].join(';');

    const arrow=document.createElement('span');
    arrow.textContent='▾';
    arrow.style.cssText='position:absolute;right:14px;top:7px;font-size:24px;color:#e8b82f;pointer-events:none';
    trigger.appendChild(arrow);

    const popup=document.createElement('div');
    popup.id=POPUP;
    popup.style.cssText=[
      'display:none',
      'position:fixed',
      'left:18px',
      'right:18px',
      'top:50%',
      'transform:translateY(-50%)',
      'max-height:72vh',
      'overflow:auto',
      'background:#050505',
      'border:2px solid #d9a92b',
      'border-radius:18px',
      'box-shadow:0 18px 50px rgba(0,0,0,.75),0 0 22px rgba(232,184,47,.22)',
      'z-index:2147483647',
      'padding:8px'
    ].join(';');

    const backdrop=document.createElement('div');
    backdrop.style.cssText=[
      'display:none',
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,.68)',
      'z-index:2147483646'
    ].join(';');

    const title=document.createElement('div');
    title.textContent='CHANGE OUTLET';
    title.style.cssText='padding:10px 12px 8px;color:#e8b82f;font-weight:900;font-size:14px;letter-spacing:1px';
    popup.appendChild(title);

    function currentLabel(){
      const opt=select.options[select.selectedIndex];
      return opt?.textContent || 'Select Outlet';
    }

    function refreshTrigger(){
      const text=document.createElement('span');
      text.textContent=currentLabel();
      text.style.cssText='display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
      trigger.replaceChildren(text,arrow);
    }

    function close(){
      popup.style.display='none';
      backdrop.style.display='none';
    }

    function open(){
      popup.style.display='block';
      backdrop.style.display='block';
    }

    rows.forEach(row=>{
      const id=String(row.outlet_id||row.code||'');
      const name=String(row.outlet_name||row.name||id||'Outlet');
      const b=document.createElement('button');
      b.type='button';
      b.textContent=name+' • '+id;
      b.style.cssText=[
        'display:block',
        'width:100%',
        'min-height:58px',
        'border:0',
        'border-bottom:1px solid #30260e',
        'background:#080808',
        'color:#f4c84e',
        'padding:12px 14px',
        'font-size:16px',
        'font-weight:800',
        'text-align:left',
        'box-sizing:border-box'
      ].join(';');

      b.addEventListener('click',()=>{
        select.value=id;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        refreshTrigger();
        close();
      });

      popup.appendChild(b);
    });

    backdrop.addEventListener('click',close);
    trigger.addEventListener('click',()=>{
      if(popup.style.display==='block') close();
      else open();
    });

    if(select.dataset.jptV13Bound!=='1'){
  select.dataset.jptV13Bound='1';
  select.addEventListener('change',refreshTrigger);
    }
    select.style.setProperty('display','none','important');
    select.setAttribute('aria-hidden','true');

    wrap.appendChild(trigger);
    wrap.appendChild(backdrop);
    wrap.appendChild(popup);
    refreshTrigger();
  }

  async function boot(){
    try{
      if(window.JPTPartnerAccess?.reload) await window.JPTPartnerAccess.reload();
    }catch(e){
      console.warn('[JPT V13] access sync skipped:',e);
    }

    const root=document.getElementById(ROOT);
    if(!root) return;

    styleDashboard(root);

    const select=document.getElementById('outletSelect');
    const oldWrap=document.getElementById('jptV10OutletWrap');
    const rows=getOutlets();

    if(!select || !oldWrap || rows.length===0){
      if(oldWrap) oldWrap.style.setProperty('display','none','important');
      if(select) select.style.setProperty('display','none','important');
      return;
    }

    const fake=document.getElementById('jptV10OutletSelect');
    if(fake && fake!==select) fake.remove();

    buildPicker(select,oldWrap,rows);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
})();
