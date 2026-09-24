/* JPT PARTNER VISUAL SKIN V2
   VISUAL-ONLY SAFE LAYER

   IMPORTANT:
   - Does NOT change Supabase/backend logic.
   - Does NOT change loadMenu/loadOrders/loadOffers/loadCampaigns.
   - Does NOT replace showPanel().
   - Does NOT change customer app.
   - Does NOT move/delete functional controls.
   - Only changes the appearance of the already-working Partner Dashboard.
*/
(function(){
  'use strict';

  if(window.__JPT_PARTNER_VISUAL_SKIN_V2__) return;
  window.__JPT_PARTNER_VISUAL_SKIN_V2__=true;

  const css = `
    /* =========================================================
       1. MAIN BLACK + GOLD BASE
       ========================================================= */
    body,
    #jptFinalTouchHomeV10{
      background:#050505!important;
      color:#fff!important;
    }

    /* =========================================================
       2. HEADER / SARDAR LOGO AREA
       Existing V10 logo and artwork are preserved.
       ========================================================= */
    #jptFinalTouchHomeV10 .jpt-v9-head{
      background:linear-gradient(180deg,#050505 0%,#090806 100%)!important;
      border-bottom:1px solid rgba(231,182,47,.55)!important;
      box-shadow:0 8px 28px rgba(0,0,0,.78)!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-logo{
      border-color:#e8bd43!important;
      box-shadow:0 0 10px rgba(232,189,67,.32),0 0 24px rgba(232,189,67,.14)!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-brand b,
    #jptFinalTouchHomeV10 .jpt-v9-context{
      color:#f2c84f!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-brand span{
      color:#a9a9a9!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-bell{
      border:1.5px solid #b98a24!important;
      background:#080808!important;
      color:#f4c84e!important;
      box-shadow:0 0 12px rgba(232,184,47,.18)!important;
    }

    /* =========================================================
       3. OUTLET SELECTOR
       Black + Gold only. No white selector.
       ========================================================= */
    #jptFinalTouchHomeV10 #jptV10OutletSelect,
    #jptFinalTouchHomeV10 #jptV13OutletTrigger,
    #jptFinalTouchHomeV10 select{
      background:#090909!important;
      color:#f2c84f!important;
      border:1.5px solid #e0b83f!important;
      box-shadow:
        0 0 8px rgba(224,184,63,.28),
        inset 0 0 12px rgba(224,184,63,.035)!important;
    }

    #jptFinalTouchHomeV10 .jpt-v10-outlet-wrap,
    #jptFinalTouchHomeV10 #jptV13OutletWrap{
      background:transparent!important;
    }

    /* =========================================================
       4. CHOLE BHATURE POSTER
       Existing V10 poster/image is intentionally untouched.
       Only border/lighting is styled.
       ========================================================= */
    #jptFinalTouchHomeV10 .jpt-v9-poster{
      border:2px solid #d9ad35!important;
      box-shadow:
        0 0 12px rgba(238,190,55,.30),
        0 0 28px rgba(238,190,55,.12),
        inset 0 0 22px rgba(0,0,0,.60)!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-poster:before{
      border-color:rgba(255,210,76,.78)!important;
    }

    /* =========================================================
       5. ONLINE / OFFLINE STATUS
       Strong green online / strong red offline.
       Thin inner line is preserved.
       ========================================================= */
    #jptFinalTouchHomeV10 .jpt-v9-status{
      border-width:2px!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-status.online{
      background:
        radial-gradient(circle at 8% 50%,rgba(0,255,98,.22),transparent 44%),
        #041008!important;
      border-color:#00ff62!important;
      box-shadow:
        0 0 10px rgba(0,255,98,.98),
        0 0 28px rgba(0,255,98,.76),
        0 0 58px rgba(0,255,98,.42),
        inset 0 0 32px rgba(0,255,98,.12)!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-status.offline{
      background:
        radial-gradient(circle at 8% 50%,rgba(255,35,48,.22),transparent 44%),
        #120304!important;
      border-color:#ff2638!important;
      box-shadow:
        0 0 10px rgba(255,38,56,.98),
        0 0 28px rgba(255,38,56,.76),
        0 0 58px rgba(255,38,56,.42),
        inset 0 0 32px rgba(255,38,56,.12)!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-status:after{
      border-width:1px!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-status.online .jpt-v9-status-title{
      color:#62ff9a!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-status.offline .jpt-v9-status-title{
      color:#ff6976!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-status-logo-wrap:before{
      border-width:3px!important;
    }

    /* =========================================================
       6. FOUR LARGE METRIC BOXES
       DARK GREEN + GREEN LIGHT, slightly softer than status box.
       ========================================================= */
    #jptFinalTouchHomeV10 .jpt-v9-metrics .jpt-v9-metric{
      background:
        radial-gradient(circle at 50% 0%,rgba(0,255,98,.105),transparent 62%),
        linear-gradient(145deg,#092214,#06140c 58%,#040806)!important;
      border:1.25px solid #18c95c!important;
      border-radius:16px!important;
      box-shadow:
        inset 0 0 16px rgba(0,255,98,.075),
        0 0 9px rgba(0,255,98,.14)!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-metric .num{
      color:#70ff9e!important;
      text-shadow:0 0 9px rgba(0,255,98,.24)!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-metric .lbl{
      color:#c9ddd0!important;
    }

    /* =========================================================
       7. EIGHT QUICK ACTION BOXES
       DARK GOLD + BRIGHT YELLOW/GOLD BORDER LIGHT.
       ========================================================= */
    #jptFinalTouchHomeV10 .jpt-v9-actions .jpt-v9-action{
      min-height:88px!important;
      border:1.25px solid #efc33e!important;
      border-radius:15px!important;
      background:
        radial-gradient(circle at 50% 15%,rgba(255,210,67,.10),transparent 58%),
        linear-gradient(145deg,#241b05,#0b0904 70%,#070604)!important;
      color:#fff!important;
      box-shadow:
        inset 0 0 15px rgba(232,184,47,.11),
        0 0 10px rgba(232,184,47,.25),
        0 0 22px rgba(232,184,47,.07)!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-action b{
      color:#f7ce51!important;
      text-shadow:0 0 8px rgba(247,206,81,.20)!important;
    }

    /* =========================================================
       8. BOTTOM FIVE-OPTION NAV
       Bright yellow/gold rounded outer glow.
       Existing click/function logic is untouched.
       ========================================================= */
    #jptFinalTouchHomeV10 .jpt-v9-bottom{
      background:#050505!important;
      border:2px solid #efc43f!important;
      border-radius:20px!important;
      box-shadow:
        0 0 20px rgba(0,0,0,.95),
        0 0 18px rgba(239,196,63,.52),
        0 0 34px rgba(239,196,63,.20)!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-bottom button{
      color:#a9a9a9!important;
      border-radius:14px!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-bottom button.active{
      background:#f2c64d!important;
      color:#111!important;
      box-shadow:
        0 0 12px rgba(242,198,77,.45),
        0 0 24px rgba(242,198,77,.18)!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-bottom b{
      color:inherit!important;
    }

    /* =========================================================
       9. SMALL THIN GOLD LINES / SECTIONS
       ========================================================= */
    #jptFinalTouchHomeV10 .jpt-v9-section{
      border-color:rgba(231,182,47,.18)!important;
    }

    #jptFinalTouchHomeV10 .jpt-v9-section b{
      color:#f0c64d!important;
    }

    /* Mobile tuning: preserve the existing layout, only visual. */
    @media(max-width:760px){
      #jptFinalTouchHomeV10 .jpt-v9-metric{
        border-width:1.25px!important;
      }

      #jptFinalTouchHomeV10 .jpt-v9-action{
        border-width:1.25px!important;
      }

      #jptFinalTouchHomeV10 .jpt-v9-bottom{
        border-width:2px!important;
      }
    }
  `;

  function apply(){
    if(document.getElementById('jptPartnerVisualSkinV2Style')) return;

    const style=document.createElement('style');
    style.id='jptPartnerVisualSkinV2Style';
    style.textContent=css;
    document.head.appendChild(style);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',apply,{once:true});
  }else{
    apply();
  }
})();
