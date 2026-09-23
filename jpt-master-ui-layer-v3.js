/* JPT MASTER UI FINISHING LAYER V3
   Safe additive layer:
   - Does NOT replace admin.html
   - Does NOT touch Supabase/order/menu logic
   - Uses existing showPanel() only
*/
(function () {
  'use strict';

  if (window.__JPT_MASTER_UI_V1__) return;
  window.__JPT_MASTER_UI_V1__ = true;

  const style = document.createElement('style');
  style.textContent = `
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
    @media(max-width:760px){
      .tabs{display:none !important}
      #jptMasterBottomNav{display:grid}
      .shell{padding-bottom:105px !important}
    }
  `;
  document.head.appendChild(style);

  const nav = document.createElement('nav');
  nav.id = 'jptMasterBottomNav';
  nav.setAttribute('aria-label','Partner dashboard navigation');

  const items = [
    ['home','⌂','Home'],
    ['orders','🛎','Orders'],
    ['menu','☰','Menu'],
    ['offers','％','Offers'],
    ['settings','⚙','Settings']
  ];

  items.forEach(([panel, icon, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.masterPanel = panel;
    b.innerHTML = '<span style="display:block;font-size:16px;line-height:18px">'+icon+'</span>'+label;
    b.addEventListener('click', () => {
      if (typeof window.showPanel === 'function') window.showPanel(panel);
      nav.querySelectorAll('button').forEach(x =>
        x.classList.toggle('active', x.dataset.masterPanel === panel)
      );
      window.scrollTo({top:0, behavior:'smooth'});
    });
    nav.appendChild(b);
  });

  document.body.appendChild(nav);

  function applyMobileTabVisibility(){
    const mobile = window.matchMedia('(max-width:760px)').matches;
    document.querySelectorAll('.tabs').forEach(el => {
      el.style.display = mobile ? 'none' : '';
    });
  }

  window.addEventListener('resize', applyMobileTabVisibility);
  applyMobileTabVisibility();

  function sync(){
    const active = document.querySelector('.panel.active');
    const id = active ? active.id : 'home';
    nav.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.dataset.masterPanel === id)
    );
  }

  const observer = new MutationObserver(sync);
  const main = document.querySelector('main');
  if (main) observer.observe(main, {subtree:true, attributes:true, attributeFilter:['class']});

  sync();
})();
