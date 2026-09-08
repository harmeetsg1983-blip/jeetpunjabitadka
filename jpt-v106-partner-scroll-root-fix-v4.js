/* JPT V106 — Partner Scroll Root Fix V4
   Root-targeted fix: keeps the user's visible order anchored while the
   payment-verification module rebuilds/inserts content into #ordersList.
   Does not replace order, payment, alarm, menu, or Supabase logic.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_SCROLL_ROOT_V4__) return;
  window.__JPT_PARTNER_SCROLL_ROOT_V4__=true;

  const list = document.getElementById('ordersList');
   if(!list) {
  setTimeout(function(){ location.reload(); }, 0);
  return;
}

// V5 ROOT FIX:
try {
  if(typeof orderTimer !== 'undefined' && orderTimer){
    clearInterval(orderTimer);
    orderTimer=null;
    console.log('[JPT V106] Native 3-second orderTimer stopped');
  }
} catch(e) {
  console.warn('[JPT V106] Could not clear native orderTimer', e);
}

let locked=false;
let anchor=null; 
  function scroller(){
    return document.scrollingElement || document.documentElement || document.body;
  }

  function capture(){
    const sc=scroller();
    const cards=Array.from(list.querySelectorAll('.order'));
    if(!cards.length) {
      anchor=null;
      return;
    }

    const viewportTop=window.scrollY || sc.scrollTop || 0;
    let best=null;
    let bestDelta=Infinity;

    cards.forEach(function(card){
      const r=card.getBoundingClientRect();
      const top=window.scrollY + r.top;
      const d=Math.abs(top-viewportTop-24);
      if(d<bestDelta){ bestDelta=d; best=card; }
    });

    if(best){
      anchor={
        orderNo:(best.innerText.match(/\bJPT-\d{5,}\b/i)||[])[0] || '',
        offset:best.getBoundingClientRect().top
      };
    }
  }

  function restore(){
    if(!anchor) return;
    const cards=Array.from(list.querySelectorAll('.order'));
    let card=null;

    if(anchor.orderNo){
      card=cards.find(function(x){
        return String(x.innerText||'').toUpperCase().includes(String(anchor.orderNo).toUpperCase());
      });
    }

    if(!card) return;

    const now=card.getBoundingClientRect().top;
    const delta=now-anchor.offset;

    if(Math.abs(delta)>1){
      locked=true;
      window.scrollBy(0,delta);
      locked=false;
    }
  }

  // Capture immediately before status/action buttons can trigger a render.
  document.addEventListener('click',function(e){
    const b=e.target && e.target.closest ? e.target.closest(
      '[data-po-ready],[data-po-prep],[data-po-accept],[data-po-reject]'
    ) : null;
    if(b) capture();
  },true);

  // Capture ordinary user scrolling as well.
  window.addEventListener('scroll',function(){
    if(!locked) capture();
  },{passive:true});

  const observer=new MutationObserver(function(mutations){
    let relevant=false;
    for(const m of mutations){
      const t=m.target;
      if(t===list || (t && t.closest && t.closest('#ordersList'))){
        relevant=true;
        break;
      }
    }
    if(!relevant) return;

    // The payment gate and order renderer both mutate this list asynchronously.
    restore();
    requestAnimationFrame(restore);
    setTimeout(restore,30);
    setTimeout(restore,120);
    setTimeout(restore,300);
  });

  observer.observe(list,{childList:true,subtree:true});

  // Initial anchor after the first render.
  setTimeout(capture,100);
  setTimeout(capture,500);

  console.log('[JPT V106] Partner scroll root fix V4 active');
})();
