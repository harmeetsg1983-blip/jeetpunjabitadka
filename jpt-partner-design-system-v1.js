/* JPT Restaurant Partner Design System V1
   Additive visual layer only.
   Does not replace existing dashboard logic, IDs, panels, Supabase calls or navigation.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_DESIGN_V1__) return;
  window.__JPT_PARTNER_DESIGN_V1__=true;

  const style=document.createElement('style');
  style.id='jpt-partner-design-v1';
  style.textContent=`
  :root{
    --jpt-gold:#d8ae42;
    --jpt-gold2:#f6d779;
    --jpt-green:#31d978;
    --jpt-green2:#8affb5;
    --jpt-red:#ef5350;
    --jpt-bg:#050505;
    --jpt-card:#101010;
    --jpt-card2:#151515;
    --jpt-line:#332817;
    --jpt-text:#f8f8f8;
    --jpt-muted:#9b9b9b;
  }

  html,body{
    background:
      radial-gradient(circle at 50% -10%,rgba(216,174,66,.10),transparent 34%),
      linear-gradient(180deg,#050505 0%,#090909 48%,#050505 100%)!important;
  }

  body{
    letter-spacing:.01em;
  }

  .top{
    background:rgba(7,7,7,.94)!important;
    border-bottom:1px solid rgba(216,174,66,.28)!important;
    box-shadow:0 8px 28px rgba(0,0,0,.42)!important;
    backdrop-filter:blur(14px);
  }

  .brandrow{
    min-height:48px;
  }

  .logo{
    width:48px!important;
    height:48px!important;
    border-radius:15px!important;
    border:1px solid var(--jpt-gold)!important;
    box-shadow:
      0 0 12px rgba(216,174,66,.22),
      inset 0 0 14px rgba(216,174,66,.08)!important;
    overflow:hidden;
  }

  .logo img{
    display:block;
  }

  .brand{
    color:var(--jpt-gold2)!important;
    text-shadow:0 0 14px rgba(216,174,66,.20);
    letter-spacing:.02em;
  }

  .sub{
    color:#aaa!important;
  }

  .controls{
    scrollbar-width:none;
  }

  .controls::-webkit-scrollbar{
    display:none;
  }

  .select,.btn,.input,.area{
    border-color:#44361f!important;
    background:linear-gradient(180deg,#181818,#111)!important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
  }

  .btn{
    transition:
      transform .16s ease,
      border-color .16s ease,
      box-shadow .16s ease,
      background .16s ease;
  }

  .btn:hover{
    border-color:rgba(216,174,66,.68)!important;
    box-shadow:0 0 16px rgba(216,174,66,.12);
  }

  .btn:active{
    transform:scale(.98);
  }

  .btn.gold{
    background:linear-gradient(180deg,#f3d16f,#c8942d)!important;
    border-color:#f0cc63!important;
    box-shadow:
      0 5px 18px rgba(216,174,66,.18),
      inset 0 1px 0 rgba(255,255,255,.35);
  }

  .shell{
    max-width:1180px!important;
    padding-top:16px!important;
  }

  .hero{
    position:relative;
    overflow:hidden;
    min-height:210px;
    border-color:rgba(216,174,66,.38)!important;
    background:
      linear-gradient(120deg,rgba(8,8,8,.92),rgba(28,21,8,.82)),
      radial-gradient(circle at 90% 10%,rgba(216,174,66,.18),transparent 34%)!important;
    box-shadow:
      0 16px 42px rgba(0,0,0,.38),
      inset 0 0 45px rgba(216,174,66,.035)!important;
  }

  .hero:after{
    content:"";
    position:absolute;
    left:0;right:0;bottom:0;
    height:2px;
    background:linear-gradient(90deg,transparent,var(--jpt-gold),transparent);
    opacity:.8;
  }

  .hero h1{
    color:var(--jpt-gold2)!important;
    font-size:clamp(23px,4vw,32px)!important;
    letter-spacing:-.02em;
  }

  .hero p{
    color:#bdbdbd!important;
  }

  .status{
    border-radius:17px!important;
    backdrop-filter:blur(8px);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
  }

  .status.online{
    border-color:rgba(49,217,120,.65)!important;
    background:
      linear-gradient(90deg,rgba(13,67,36,.74),rgba(7,19,12,.84))!important;
    box-shadow:
      0 0 18px rgba(49,217,120,.13),
      inset 0 0 22px rgba(49,217,120,.045);
  }

  .status.offline{
    border-color:rgba(239,83,80,.58)!important;
    background:
      linear-gradient(90deg,rgba(72,15,15,.70),rgba(18,7,7,.84))!important;
    box-shadow:0 0 18px rgba(239,83,80,.10);
  }

  .store{
    width:78px!important;
    height:78px!important;
    border-radius:16px!important;
    border-color:rgba(216,174,66,.65)!important;
    box-shadow:
      0 0 18px rgba(216,174,66,.12),
      inset 0 0 16px rgba(216,174,66,.05);
    overflow:hidden;
  }

  .store img{
    display:block;
  }

  #statusTitle{
    font-size:16px;
  }

  .grid>.card{
    border-color:#2e261a!important;
    background:
      linear-gradient(145deg,rgba(23,23,23,.98),rgba(11,11,11,.98))!important;
    box-shadow:
      0 8px 22px rgba(0,0,0,.24),
      inset 0 1px 0 rgba(255,255,255,.025)!important;
  }

  .grid>.card:hover{
    border-color:rgba(216,174,66,.30)!important;
  }

  .metric{
    color:var(--jpt-gold2)!important;
    text-shadow:0 0 12px rgba(216,174,66,.13);
  }

  .card{
    border-color:#2d271d!important;
  }

  .tabs{
    padding:6px!important;
    border:1px solid #2d261a;
    border-radius:16px;
    background:rgba(10,10,10,.76);
    box-shadow:0 8px 22px rgba(0,0,0,.20);
  }

  .tabs .btn{
    border-radius:12px!important;
  }

  .tabs .btn.gold{
    box-shadow:0 0 15px rgba(216,174,66,.13);
  }

  .panel>.card,
  .panel .card{
    box-shadow:
      0 10px 30px rgba(0,0,0,.22),
      inset 0 1px 0 rgba(255,255,255,.018);
  }

  .panel h3,
  .panel h2{
    color:#f0f0f0;
  }

  .panel h3:first-letter{
    color:var(--jpt-gold2);
  }

  .notice{
    border-color:#39301f!important;
    background:linear-gradient(145deg,#151515,#0d0d0d)!important;
  }

  .tablewrap{
    border:1px solid #2b251b;
    border-radius:14px;
    margin-top:10px;
  }

  .table th{
    background:#17130c;
    color:var(--jpt-gold2)!important;
  }

  .table td{
    background:rgba(10,10,10,.42);
  }

  .itemrow{
    border-bottom-color:#28231a!important;
  }

  .thumb{
    border-color:#45371e!important;
    box-shadow:0 4px 14px rgba(0,0,0,.25);
  }

  .offerbox{
    border-color:rgba(216,174,66,.42)!important;
    background:
      linear-gradient(145deg,rgba(30,23,10,.96),rgba(14,14,14,.96))!important;
  }

  .price{
    color:var(--jpt-gold2)!important;
  }

  .tag{
    border-color:#514324!important;
    background:#17140e;
  }

  .modal{
    backdrop-filter:blur(8px);
  }

  .modalbox{
    border-color:rgba(216,174,66,.38)!important;
    box-shadow:
      0 24px 70px rgba(0,0,0,.70),
      0 0 30px rgba(216,174,66,.06)!important;
  }

  .toast{
    box-shadow:0 8px 24px rgba(0,0,0,.45)!important;
  }

  @media(max-width:760px){
    .top{
      padding:10px!important;
    }

    .brand{
      font-size:16px!important;
    }

    .shell{
      padding:10px 10px 108px!important;
    }

    .hero{
      min-height:190px;
      padding:14px!important;
      border-radius:17px!important;
    }

    .status{
      margin-top:11px!important;
      padding:11px!important;
    }

    .store{
      width:62px!important;
      height:62px!important;
      border-radius:14px!important;
    }

    .grid{
      gap:8px!important;
    }

    .grid>.card{
      padding:12px!important;
      border-radius:14px!important;
    }

    .metric{
      font-size:22px!important;
    }

    .panel>.card{
      padding:12px!important;
      border-radius:15px!important;
    }

    .rowactions{
      gap:7px!important;
    }

    .rowactions .btn{
      min-height:42px;
    }
  }
  `;
  document.head.appendChild(style);

  document.documentElement.classList.add('jpt-partner-design-v1');
})();
