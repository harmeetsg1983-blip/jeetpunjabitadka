/* JPT Partner Dashboard Visual Refinement V2.1
   Additive-only polish layer.
   Does not replace dashboard logic, Supabase calls, orders, menu, offers or campaigns.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_VISUAL_V21__) return;
  window.__JPT_PARTNER_VISUAL_V21__ = true;

  const STYLE_ID='jpt-partner-visual-v21-style';
  if(document.getElementById(STYLE_ID)) return;

  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
/* ===== Premium visual refinement ===== */
html.jpt-brand-status-v2 .shell{
  max-width:1120px!important;
  padding-left:16px!important;
  padding-right:16px!important;
}
html.jpt-brand-status-v2 .hero{
  isolation:isolate;
  border-radius:22px!important;
  padding:20px!important;
}
html.jpt-brand-status-v2 .hero:after{
  content:"";
  position:absolute;
  inset:1px;
  border-radius:20px;
  pointer-events:none;
  border:1px solid rgba(255,255,255,.045);
  box-shadow:inset 0 0 35px rgba(255,255,255,.025);
  z-index:0;
}
html.jpt-brand-status-v2 #statusBox{
  backdrop-filter:blur(5px);
  -webkit-backdrop-filter:blur(5px);
}
html.jpt-brand-status-v2 #statusBox .grow{
  min-width:0;
}
html.jpt-brand-status-v2 #statusTitle{
  letter-spacing:.15px;
}
html.jpt-brand-status-v2 #statusToggle{
  transition:transform .18s ease,box-shadow .18s ease,background .18s ease;
}
html.jpt-brand-status-v2 #statusToggle:active{
  transform:scale(.97);
}
html.jpt-brand-status-v2 .grid>.card{
  min-height:104px;
  display:flex;
  flex-direction:column;
  justify-content:center;
}
html.jpt-brand-status-v2 .metric{
  line-height:1;
  letter-spacing:-.5px;
}
html.jpt-brand-status-v2 #home .card{
  min-height:130px;
}
html.jpt-brand-status-v2 #jptMasterBottomNav{
  border-color:#5b471b!important;
  box-shadow:
    0 12px 36px rgba(0,0,0,.68),
    0 0 18px rgba(216,174,66,.08)!important;
}
html.jpt-brand-status-v2 #jptMasterBottomNav button{
  transition:background .16s ease,color .16s ease,transform .16s ease;
}
html.jpt-brand-status-v2 #jptMasterBottomNav button.active{
  box-shadow:0 0 12px rgba(216,174,66,.18);
}
html.jpt-brand-status-v2 #jptMasterSubNav{
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
}

/* ===== Mobile: tighter reference-style composition ===== */
@media(max-width:760px){
  html.jpt-brand-status-v2 .top{
    padding:12px 12px 10px!important;
  }
  html.jpt-brand-status-v2 .brandrow{
    min-height:56px!important;
  }
  html.jpt-brand-status-v2 .brand{
    font-size:20px!important;
    line-height:1.08;
  }
  html.jpt-brand-status-v2 .sub{
    margin-top:4px!important;
    font-size:11px!important;
  }
  html.jpt-brand-status-v2 .controls{
    gap:8px!important;
    margin-top:9px!important;
  }
  html.jpt-brand-status-v2 .hero{
    min-height:0!important;
    padding:15px!important;
    margin-bottom:12px!important;
    border-radius:20px!important;
  }
  html.jpt-brand-status-v2 .hero h1{
    font-size:23px!important;
    line-height:1.12!important;
  }
  html.jpt-brand-status-v2 .hero p{
    margin-top:5px!important;
    font-size:13px!important;
  }
  html.jpt-brand-status-v2 #statusBox{
    min-height:0!important;
    margin-top:14px!important;
    padding:12px!important;
    gap:10px!important;
    border-radius:18px!important;
  }
  html.jpt-brand-status-v2 #statusBox .store{
    width:78px!important;
    height:78px!important;
    flex-basis:78px!important;
  }
  html.jpt-brand-status-v2 #statusTitle{
    font-size:18px!important;
    line-height:1.03!important;
  }
  html.jpt-brand-status-v2 #statusText{
    margin-top:6px!important;
    font-size:11px!important;
  }
  html.jpt-brand-status-v2 #statusToggle{
    min-width:101px!important;
    min-height:43px!important;
    padding:7px 9px!important;
    border-radius:13px!important;
    font-size:13px!important;
  }
  html.jpt-brand-status-v2 .grid{
    gap:9px!important;
  }
  html.jpt-brand-status-v2 .grid>.card{
    min-height:94px!important;
    padding:13px!important;
    border-radius:16px!important;
  }
  html.jpt-brand-status-v2 .metric{
    font-size:27px!important;
  }
  html.jpt-brand-status-v2 .muted{
    font-size:11px!important;
  }
  html.jpt-brand-status-v2 #home .two{
    gap:9px!important;
  }
  html.jpt-brand-status-v2 #home .card{
    min-height:118px!important;
    border-radius:16px!important;
  }
}

/* Small screens: keep the status controls readable without changing behavior */
@media(max-width:390px){
  html.jpt-brand-status-v2 #statusBox{
    gap:8px!important;
  }
  html.jpt-brand-status-v2 #statusBox .store{
    width:68px!important;
    height:68px!important;
    flex-basis:68px!important;
  }
  html.jpt-brand-status-v2 #statusTitle{
    font-size:16px!important;
  }
  html.jpt-brand-status-v2 #statusToggle{
    min-width:91px!important;
    font-size:12px!important;
  }
}

/* ===== Offline state keeps the same premium structure, changes only status lighting ===== */
html.jpt-brand-status-v2.jpt-offline #statusBox{
  box-shadow:
    0 0 10px var(--status-glow),
    inset 0 0 26px rgba(0,0,0,.38)!important;
}
`;
  document.head.appendChild(s);
})();
