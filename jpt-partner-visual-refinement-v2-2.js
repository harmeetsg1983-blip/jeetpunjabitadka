/* JPT Partner Dashboard Visual Refinement V2.2
   Final mobile polish layer — additive CSS only.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_VISUAL_V22__) return;
  window.__JPT_PARTNER_VISUAL_V22__=true;

  const id='jpt-partner-visual-v22-style';
  if(document.getElementById(id)) return;

  const s=document.createElement('style');
  s.id=id;
  s.textContent=`
/* Keep mobile toast clear of the fixed bottom navigation */
@media(max-width:760px){
  html.jpt-brand-status-v2 .toast{
    bottom:96px!important;
    max-width:calc(100vw - 36px)!important;
    text-align:center!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    box-shadow:0 8px 24px rgba(0,0,0,.45)!important;
  }

  /* Cleaner mobile outlet selector row */
  html.jpt-brand-status-v2 .controls{
    padding-bottom:1px;
    scrollbar-width:none;
  }
  html.jpt-brand-status-v2 .controls::-webkit-scrollbar{
    display:none;
  }
  html.jpt-brand-status-v2 #outletSelect{
    min-width:0!important;
    border-radius:13px!important;
  }
  html.jpt-brand-status-v2 #reloadBtn{
    border-radius:13px!important;
    min-height:43px!important;
  }

  /* Reference-style hero proportions */
  html.jpt-brand-status-v2 .hero{
    box-shadow:
      0 0 8px var(--status-glow),
      0 0 24px var(--status-soft),
      inset 0 0 42px rgba(0,0,0,.40)!important;
  }

  /* Slightly stronger brand/status separation */
  html.jpt-brand-status-v2 #statusBox{
    background:
      linear-gradient(90deg,var(--status-deep),rgba(0,0,0,.58))!important;
  }

  /* Keep bottom navigation visually attached to the app shell */
  html.jpt-brand-status-v2 #jptMasterBottomNav{
    left:8px!important;
    right:8px!important;
    bottom:8px!important;
  }
}

/* Single-outlet accounts: never reserve space for a hidden selector */
html.jpt-single-outlet .controls{
  gap:8px;
}
html.jpt-single-outlet #outletSelect{
  display:none!important;
}
`;
  document.head.appendChild(s);
})();
