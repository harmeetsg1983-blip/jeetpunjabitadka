/* JPT — DUAL-BAR PARTNER NAVIGATION V1
   Presentation/navigation only. Does not touch Supabase, orders, menu data or RPCs.
*/
(function(){
  'use strict';
  if(window.__JPT_DUAL_BAR_NAV__) return;
  window.__JPT_DUAL_BAR_NAV__=true;

  function setBottomActive(panel){
    document.querySelectorAll('.jpt-bottom-item').forEach(btn=>{
      btn.classList.toggle('is-active',btn.dataset.bottomPanel===panel);
    });
  }

  function go(panel){
    if(typeof window.showPanel==='function'){
      window.showPanel(panel);
    }else{
      document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===panel));
    }
    setBottomActive(panel);
    if(panel==='orders'){
      const tabs=document.querySelectorAll('.jpt-status-tab');
      const active=document.querySelector('.jpt-status-tab.is-active');
      if(!active && tabs[0]) tabs[0].classList.add('is-active');
    }
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function bind(){
    document.querySelectorAll('.jpt-bottom-item').forEach(btn=>{
      btn.addEventListener('click',()=>go(btn.dataset.bottomPanel));
    });

    document.querySelectorAll('.jpt-status-tab').forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.querySelectorAll('.jpt-status-tab').forEach(x=>x.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });

    document.querySelectorAll('.tabs .btn[data-panel]').forEach(btn=>{
      btn.addEventListener('click',()=>setBottomActive(btn.dataset.panel));
    });

    const activePanel=document.querySelector('.panel.active');
    if(activePanel) setBottomActive(activePanel.id);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
