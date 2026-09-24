/* JPT PARTNER FINAL TOUCH V12
   CONTROLLED FINAL UI LAYER

   Keeps existing business logic untouched.

   FIXES:
   1. Online / Offline button uses existing toggleStatus()
   2. Outlet switch uses existing #outletSelect
   3. Custom Black + Gold outlet popup
   4. Dark Green metric cards
   5. Gold Quick Action cards
   6. Clean Gold bottom navigation
   7. No repeating DOM rewrite loop
*/
(function(){
  'use strict';

  if(window.__JPT_PARTNER_FINAL_TOUCH_V13_FINAL__) return;
  window.__JPT_PARTNER_FINAL_TOUCH_V13_FINAL__=true;

  const ROOT='jptFinalTouchHomeV10';
  const BOTTOM='jptV10Bottom';
  const WRAP='jptV13OutletWrap';
  const TRIGGER='jptV13OutletTrigger';
  const POPUP='jptV13OutletPopup';
  const BACKDROP='jptV13OutletBackdrop';

  function getOutlets(){
    try{
      const rows=window.JPTPartnerAccess?.getOutlets?.();

      if(Array.isArray(rows)){
        return rows.filter(x=>x && (x.outlet_id || x.code));
      }
    }catch(e){}

    return [];
  }

  /* --------------------------------------------------
     DARK GREEN METRIC CARDS
  -------------------------------------------------- */

  function applyGreenMetrics(root){
    if(!root) return;

    root.querySelectorAll('.jpt-v9-metric').forEach(card=>{
      card.style.setProperty(
        'background',
        'linear-gradient(145deg,#092313,#041108)',
        'important'
      );

      card.style.setProperty(
        'border',
        '1.5px solid rgba(63,180,91,.55)',
        'important'
      );

      card.style.setProperty(
        'box-shadow',
        'inset 0 0 18px rgba(50,180,80,.10),0 0 10px rgba(50,180,80,.08)',
        'important'
      );

      card.style.setProperty(
        'outline',
        'none',
        'important'
      );

      const num=card.querySelector('.num');

      if(num){
        num.style.setProperty(
          'color',
          '#79e39b',
          'important'
        );
      }

      const label=card.querySelector('.lbl');

      if(label){
        label.style.setProperty(
          'color',
          '#b7d8bd',
          'important'
        );
      }
    });
  }

  /* --------------------------------------------------
     GOLD QUICK ACTIONS
  -------------------------------------------------- */

  function applyGoldActions(root){
    if(!root) return;

    root.querySelectorAll('.jpt-v9-action').forEach(card=>{
      card.style.setProperty(
        'background',
        'linear-gradient(145deg,#241b05,#0b0904)',
        'important'
      );

      card.style.setProperty(
        'border',
        '1.5px solid #e8b82f',
        'important'
      );

      card.style.setProperty(
        'box-shadow',
        'inset 0 0 16px rgba(232,184,47,.12),0 0 12px rgba(232,184,47,.20)',
        'important'
      );

      card.style.setProperty(
        'outline',
        'none',
        'important'
      );
    });
  }

  /* --------------------------------------------------
     CLEAN BOTTOM NAVIGATION
  -------------------------------------------------- */

  function applyBottom(root){
    const bottom=document.getElementById(BOTTOM);

    if(!bottom) return;

    bottom.style.setProperty(
      'border',
      '1.5px solid #e8b82f',
      'important'
    );

    bottom.style.setProperty(
      'outline',
      'none',
      'important'
    );

    bottom.style.setProperty(
      'box-shadow',
      '0 0 16px rgba(232,184,47,.22)',
      'important'
    );

    bottom.style.setProperty(
      'background',
      '#050505',
      'important'
    );

    bottom.style.setProperty(
      'border-radius',
      '20px',
      'important'
    );

    bottom.style.setProperty(
      'bottom',
      '12px',
      'important'
    );

    bottom.style.setProperty(
      'z-index',
      '9999',
      'important'
    );

    bottom.style.setProperty(
      'margin',
      '0',
      'important'
    );

    bottom.querySelectorAll('button').forEach(btn=>{
      btn.style.setProperty(
        'border',
        '0',
        'important'
      );

      btn.style.setProperty(
        'outline',
        'none',
        'important'
      );

      btn.style.setProperty(
        'box-shadow',
        btn.classList.contains('active')
          ? '0 0 18px rgba(240,198,77,.35)'
          : 'none',
        'important'
      );
    });

    const open=root?.querySelector('.jpt-v9-open');

    if(open){
      open.style.setProperty(
        'margin-bottom',
        '34px',
        'important'
      );
    }
  }

  /* --------------------------------------------------
     OUTLET POPUP
     BLACK + GOLD
  -------------------------------------------------- */

  function closeOutletPopup(){
    const popup=document.getElementById(POPUP);
    const backdrop=document.getElementById(BACKDROP);

    if(popup) popup.style.display='none';
    if(backdrop) backdrop.style.display='none';

    document.body.style.overflow='';
  }

  function openOutletPopup(){
    const popup=document.getElementById(POPUP);
    const backdrop=document.getElementById(BACKDROP);

    if(!popup || !backdrop) return;

    popup.style.display='block';
    backdrop.style.display='block';

    document.body.style.overflow='hidden';
  }

  function buildOutletPicker(select,host,rows){

    if(!select || !host || !rows.length) return;

    let wrap=document.getElementById(WRAP);

    if(!wrap){
      wrap=document.createElement('div');
      wrap.id=WRAP;
    }

    wrap.replaceChildren();

    wrap.style.cssText=[
      'display:block',
      'width:100%',
      'position:relative',
      'z-index:10050',
      'box-sizing:border-box'
    ].join(';');

    /* Trigger */

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

    arrow.style.cssText=[
      'position:absolute',
      'right:14px',
      'top:7px',
      'font-size:24px',
      'line-height:28px',
      'color:#e8b82f',
      'pointer-events:none'
    ].join(';');

    trigger.appendChild(arrow);

    /* Backdrop */

    const backdrop=document.createElement('div');

    backdrop.id=BACKDROP;

    backdrop.style.cssText=[
      'display:none',
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,.78)',
      'z-index:2147483646'
    ].join(';');

    /* Popup */

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
      'box-shadow:0 18px 50px rgba(0,0,0,.85),0 0 24px rgba(232,184,47,.25)',
      'z-index:2147483647',
      'padding:8px',
      'box-sizing:border-box'
    ].join(';');

    /* Header */

    const title=document.createElement('div');

    title.textContent='CHANGE OUTLET';

    title.style.cssText=[
      'padding:12px',
      'color:#e8b82f',
      'font-weight:900',
      'font-size:14px',
      'letter-spacing:1px',
      'border-bottom:1px solid #30260e',
      'margin-bottom:4px'
    ].join(';');

    popup.appendChild(title);

    function currentLabel(){

      const opt=select.options[select.selectedIndex];

      return opt?.textContent || 'Select Outlet';
    }

    function refreshTrigger(){

      const text=document.createElement('span');

      text.textContent=currentLabel();

      text.style.cssText=[
        'display:block',
        'white-space:nowrap',
        'overflow:hidden',
        'text-overflow:ellipsis',
        'padding-right:4px'
      ].join(';');

      trigger.replaceChildren(text,arrow);
    }

    rows.forEach(row=>{

      const id=String(
        row.outlet_id ||
        row.code ||
        ''
      );

      const name=String(
        row.outlet_name ||
        row.name ||
        id ||
        'Outlet'
      );

      if(!id) return;

      const optionButton=document.createElement('button');

      optionButton.type='button';

      optionButton.textContent=name+' • '+id;

      optionButton.style.cssText=[
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
        'box-sizing:border-box',
        'cursor:pointer'
      ].join(';');

      optionButton.addEventListener('click',async function(){

        select.value=id;

        /*
          IMPORTANT:
          Existing admin.html change handler remains
          the source of truth.
        */

        select.dispatchEvent(
          new Event('change',{
            bubbles:true
          })
        );

        refreshTrigger();

        closeOutletPopup();
      });

      popup.appendChild(optionButton);
    });

    backdrop.addEventListener(
      'click',
      closeOutletPopup
    );

    trigger.addEventListener(
      'click',
      function(){

        const popup=document.getElementById(POPUP);

        if(
          popup &&
          popup.style.display==='block'
        ){
          closeOutletPopup();
        }else{
          openOutletPopup();
        }
      }
    );

    /*
      Keep original select hidden.
      It still remains functional underneath.
    */

    select.style.setProperty(
      'display',
      'none',
      'important'
    );

    select.setAttribute(
      'aria-hidden',
      'true'
    );

    if(select.dataset.jptV13Bound!=='1'){

      select.dataset.jptV13Bound='1';

      select.addEventListener(
        'change',
        refreshTrigger
      );
    }

    wrap.appendChild(trigger);
    wrap.appendChild(backdrop);
    wrap.appendChild(popup);

    /*
      Replace ONLY the old outlet wrapper contents.
    */

    host.replaceChildren(wrap);

    refreshTrigger();
  }

  /* --------------------------------------------------
     STATUS BUTTON
  -------------------------------------------------- */

  function wireStatusButton(){

    const button=document.getElementById(
      'jptV9StatusToggle'
    );

    if(!button) return;

    if(button.dataset.jptStatusBound==='1'){
      return;
    }

    button.dataset.jptStatusBound='1';

    button.addEventListener(
      'click',
      async function(){

        try{

          /*
            Use the existing admin business logic.
          */

          if(typeof toggleStatus==='function'){

            await toggleStatus();

          }else{

            const old=document.getElementById(
              'statusToggle'
            );

            if(old){
              old.click();
            }
          }

          syncStatus();

        }catch(e){

          console.warn(
            '[JPT V13] status toggle failed',
            e
          );
        }
      }
    );
  }

  /* --------------------------------------------------
     STATUS VISUAL SYNC
  -------------------------------------------------- */

  function syncStatus(){

    const oldStatus=document.getElementById(
      'statusBox'
    );

    const visual=document.getElementById(
      'jptV9Status'
    );

    const title=document.getElementById(
      'jptV9StatusTitle'
    );

    const sub=document.getElementById(
      'jptV9StatusSub'
    );

    const button=document.getElementById(
      'jptV9StatusToggle'
    );

    if(!oldStatus || !visual) return;

    const online=
      oldStatus.classList.contains('online');

    visual.classList.toggle(
      'online',
      online
    );

    visual.classList.toggle(
      'offline',
      !online
    );

    if(title){

      title.textContent=
        online
          ? 'RESTAURANT IS ONLINE'
          : 'RESTAURANT IS OFFLINE';
    }

    if(sub){

      sub.textContent=
        document.getElementById(
          'statusText'
        )?.textContent ||
        (
          online
            ? 'Orders incoming'
            : 'Not receiving orders'
        );
    }

    if(button){

      button.textContent=
        online
          ? 'Mark Offline'
          : 'Mark Online';

      button.style.setProperty(
        'border',
        online
          ? '1px solid #8e3030'
          : '1px solid #27733e',
        'important'
      );

      button.style.setProperty(
        'color',
        online
          ? '#ff8b8b'
          : '#79e39b',
        'important'
      );
    }
  }

  /* --------------------------------------------------
     MAIN BOOT
  -------------------------------------------------- */

  async function boot(){

    try{

      if(
        window.JPTPartnerAccess?.reload
      ){
        await window.JPTPartnerAccess.reload();
      }

    }catch(e){

      console.warn(
        '[JPT V13] access sync skipped:',
        e
      );
    }

    const root=document.getElementById(
      ROOT
    );

    if(!root) return;

    /*
      Remove duplicate older visual navigation.
    */

    document.querySelectorAll(
      '[id^="jptV"][id$="Bottom"]'
    ).forEach(el=>{

      if(el.id!==BOTTOM){
        el.remove();
      }
    });

    document.getElementById(
      'jptMasterBottomNav'
    )?.remove();

    document.getElementById(
      'jptMasterSubNav'
    )?.remove();

    /*
      Apply visual layers.
    */

    applyGreenMetrics(root);
    applyGoldActions(root);
    applyBottom(root);

    /*
      Outlet control.
    */

    const select=document.getElementById(
      'outletSelect'
    );

    const oldWrap=document.getElementById(
      'jptV10OutletWrap'
    );

    const rows=getOutlets();

    if(
      select &&
      oldWrap &&
      rows.length
    ){

      oldWrap.style.setProperty(
        'display',
        'block',
        'important'
      );

      buildOutletPicker(
        select,
        oldWrap,
        rows
      );

    }else{

      if(oldWrap){

        oldWrap.style.setProperty(
          'display',
          'none',
          'important'
        );
      }

      if(select){

        select.style.setProperty(
          'display',
          'none',
          'important'
        );
      }
    }

    /*
      Status control.
    */

    wireStatusButton();
    syncStatus();
  }

  /* --------------------------------------------------
     EVENT HOOKS
     NO REPEATING DOM POLLING
  -------------------------------------------------- */

  if(
    !window.__JPT_V13_EVENTS_BOUND_FINAL__
  ){

    window.__JPT_V13_EVENTS_BOUND_FINAL__=true;

    window.addEventListener(
      'jpt:outlet-data-refreshed',
      function(){

        setTimeout(
          boot,
          250
        );
      }
    );

    window.addEventListener(
      'jpt:outlet-changed',
      function(){

        setTimeout(
          boot,
          250
        );
      }
    );

    window.addEventListener(
      'jpt:branding-updated',
      function(){

        setTimeout(
          boot,
          400
        );
      }
    );
  }

  /*
    Initial boot.
  */

  if(
    document.readyState==='loading'
  ){

    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {once:true}
    );

  }else{

    boot();
  }

})();
