/* JPT MASTER UI FINISHING LAYER V4
   Safe additive navigation layer:
   - Keeps all existing admin panels and functions intact
   - Uses existing showPanel() only
   - Groups navigation without deleting functionality
*/
(function () {
  'use strict';

  if (window.__JPT_MASTER_UI_V4__) return;
  window.__JPT_MASTER_UI_V4__ = true;

  const style = document.createElement('style');
  style.textContent = `
    /* Hide original 11-tab navigation; functionality remains in admin.html */
    .tabs{display:none !important}

    #jptMasterTopNav{
      display:flex;
      flex-wrap:wrap;
      gap:7px;
      margin:0 0 14px;
      padding:8px;
      background:rgba(12,12,12,.92);
      border:1px solid #3d321b;
      border-radius:14px;
    }
    #jptMasterTopNav button,
    #jptMasterTopNav .jptNavGroup > button{
      border:1px solid #3d321b;
      background:#171717;
      color:#ddd;
      border-radius:10px;
      padding:9px 12px;
      font-weight:800;
      cursor:pointer;
    }
    #jptMasterTopNav button:hover,
    #jptMasterTopNav .jptNavGroup > button:hover{
      border-color:#d8ae42;
    }
    #jptMasterTopNav .jptNavGroup{position:relative}
    #jptMasterTopNav .jptNavMenu{
      display:none;
      position:absolute;
      top:calc(100% + 6px);
      left:0;
      min-width:180px;
      z-index:9500;
      padding:6px;
      background:#111;
      border:1px solid #3d321b;
      border-radius:12px;
      box-shadow:0 12px 30px rgba(0,0,0,.55);
    }
    #jptMasterTopNav .jptNavGroup.open .jptNavMenu{display:grid;gap:5px}
    #jptMasterTopNav .jptNavMenu button{
      width:100%;
      text-align:left;
      border:0;
      background:#1b1b1b;
      padding:9px 10px;
    }

    #jptMasterBottomNav{
      display:none;
      position:fixed;
      left:10px; right:10px; bottom:10px;
      z-index:9000;
      background:rgba(12,12,12,.97);
      border:1px solid #3d321b;
      border-radius:16px;
      padding:7px;
      box-shadow:0 10px 35px rgba(0,0,0,.55);
      grid-template-columns:repeat(5,1fr);
      gap:5px;
      backdrop-filter:blur(10px);
    }
    #jptMasterBottomNav button{
      border:0;
      background:transparent;
      color:#aaa;
      border-radius:11px;
      padding:8px 3px;
      font-size:10px;
      font-weight:800;
      cursor:pointer;
    }
    #jptMasterBottomNav button.active{
      background:#d8ae42;
      color:#111;
    }

    #jptMasterSubNav{
      display:none;
      position:fixed;
      left:10px; right:10px; bottom:92px;
      z-index:9001;
      background:rgba(12,12,12,.98);
      border:1px solid #3d321b;
      border-radius:14px;
      padding:7px;
      grid-template-columns:repeat(2,1fr);
      gap:6px;
      box-shadow:0 10px 35px rgba(0,0,0,.55);
    }
    #jptMasterSubNav.open{display:grid}
    #jptMasterSubNav button{
      border:1px solid #3d321b;
      background:#181818;
      color:#ddd;
      border-radius:10px;
      padding:10px 6px;
      font-size:11px;
      font-weight:800;
    }

    .shell{padding-bottom:105px !important}

    @media(max-width:760px){
      #jptMasterTopNav{display:none}
      #jptMasterBottomNav{display:grid}
    }
  `;
  document.head.appendChild(style);

  function go(panel){
    if (typeof window.showPanel === 'function') window.showPanel(panel);
    document.querySelectorAll('#jptMasterTopNav button[data-panel],#jptMasterSubNav button[data-panel]').forEach(b=>{
      b.classList.toggle('gold', b.dataset.panel === panel);
    });
    document.querySelectorAll('#jptMasterBottomNav button').forEach(b=>{
      const group=b.dataset.masterGroup;
      b.classList.toggle('active', group === panel || (group==='menu' && ['menu','categories','images'].includes(panel)) || (group==='offers' && ['offers','today','campaigns'].includes(panel)));
    });
    document.getElementById('jptMasterSubNav')?.classList.remove('open');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function makeButton(label,panel){
    const b=document.createElement('button');
    b.type='button'; b.textContent=label; b.dataset.panel=panel;
    b.addEventListener('click',()=>go(panel));
    return b;
  }

  const originalTabs=document.querySelector('.tabs');
  const top=document.createElement('nav');
  top.id='jptMasterTopNav';
  top.setAttribute('aria-label','Partner dashboard grouped navigation');

  top.appendChild(makeButton('Home','home'));
  top.appendChild(makeButton('Orders','orders'));

  function addGroup(label,items){
    const wrap=document.createElement('div');
    wrap.className='jptNavGroup';
    const trigger=document.createElement('button');
    trigger.type='button';
    trigger.textContent=label+' ▾';
    const menu=document.createElement('div');
    menu.className='jptNavMenu';
    items.forEach(([name,panel])=>menu.appendChild(makeButton(name,panel)));
    trigger.addEventListener('click',(e)=>{
      e.stopPropagation();
      document.querySelectorAll('.jptNavGroup').forEach(x=>{if(x!==wrap)x.classList.remove('open')});
      wrap.classList.toggle('open');
    });
    wrap.appendChild(trigger); wrap.appendChild(menu); top.appendChild(wrap);
  }

  addGroup('Menu',[['Menu Items','menu'],['Categories','categories'],['Images','images']]);
  addGroup('Offers & Marketing',[['Offers','offers'],['Today Offer','today'],['Campaigns','campaigns']]);
  top.appendChild(makeButton('Finance','finance'));
  top.appendChild(makeButton('Reports','reports'));
  top.appendChild(makeButton('Settings','settings'));

  if (originalTabs && originalTabs.parentNode) originalTabs.parentNode.insertBefore(top,originalTabs);
  else document.body.prepend(top);

  document.addEventListener('click',()=>document.querySelectorAll('.jptNavGroup').forEach(x=>x.classList.remove('open')));

  const bottom=document.createElement('nav');
  bottom.id='jptMasterBottomNav';
  bottom.setAttribute('aria-label','Partner dashboard mobile navigation');

  const bottomItems=[
    ['home','⌂','Home'],
    ['orders','🛎','Orders'],
    ['menu','☰','Menu'],
    ['offers','％','Offers'],
    ['settings','⚙','Settings']
  ];
  bottomItems.forEach(([group,icon,label])=>{
    const b=document.createElement('button');
    b.type='button'; b.dataset.masterGroup=group;
    b.innerHTML='<span style="display:block;font-size:16px;line-height:18px">'+icon+'</span>'+label;
    b.addEventListener('click',()=>{
      if(group==='menu' || group==='offers'){
        sub.innerHTML='';
        const items=group==='menu'
          ? [['Menu Items','menu'],['Categories','categories'],['Images','images']]
          : [['Offers','offers'],['Today Offer','today'],['Campaigns','campaigns']];
        items.forEach(([name,panel])=>sub.appendChild(makeButton(name,panel)));
        sub.classList.toggle('open');
      } else go(group);
    });
    bottom.appendChild(b);
  });
  document.body.appendChild(bottom);

  const sub=document.createElement('nav');
  sub.id='jptMasterSubNav';
  sub.setAttribute('aria-label','Grouped mobile navigation');
  document.body.appendChild(sub);

  function sync(){
    const active=document.querySelector('.panel.active');
    const id=active ? active.id : 'home';
    document.querySelectorAll('#jptMasterTopNav button[data-panel]').forEach(b=>b.classList.toggle('gold',b.dataset.panel===id));
    document.querySelectorAll('#jptMasterBottomNav button').forEach(b=>{
      const group=b.dataset.masterGroup;
      b.classList.toggle('active',group===id || (group==='menu' && ['menu','categories','images'].includes(id)) || (group==='offers' && ['offers','today','campaigns'].includes(id)));
    });
  }

  const main=document.querySelector('main');
  if(main){
    new MutationObserver(sync).observe(main,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  sync();
})();
