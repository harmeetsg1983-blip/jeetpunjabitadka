/* JPT V106 CUSTOMER MENU RUNTIME FIX — V6 SAFE BASELINE
   IMPORTANT:
   The production index.html already contains the complete native
   Supabase menu loader, original items state, render(), cartState,
   change(), cartRows(), images, offers and outlet switching.

   This file is intentionally non-invasive.
   It prevents the previous recovery bridges from replacing/interfering
   with the native Customer App runtime.

   No database writes. No menu mutations. No cart replacement.
*/
(function(){
'use strict';
document.documentElement.setAttribute('data-jpt-v106-runtime','native-baseline-v6');
})();
/* JPT V106 — ROYAL GOLD SCRATCH V7 SAFE BRIDGE
   Isolated Scratch-only compatibility layer.
   Does not replace Customer Golden Core, menu, cart, images, video,
   orders, payment, outlet switching, or Supabase menu writes.
*/
(function(){
'use strict';

var MARK='data-jpt-v106-scratch-v7';
if(document.documentElement.getAttribute(MARK)) return;
document.documentElement.setAttribute(MARK,'1');

function list(){
  try{
    return (typeof offers!=='undefined' && Array.isArray(offers)) ? offers : [];
  }catch(e){
    return [];
  }
}

function num(v,d){
  var n=Number(v);
  return Number.isFinite(n) ? n : d;
}

function isScratch(o){
  return !!o && (
    o.scratch_enabled===true ||
    o.is_scratch===true ||
    String(o.offer_type||'').toLowerCase()==='scratch' ||
    /scratch/i.test(String(o.title||'')) ||
    /scratch/i.test(String(o.code||''))
  );
}

function active(o){
  try{
    return typeof activeWindow==='function' ? activeWindow(o) : true;
  }catch(e){
    return true;
  }
}

function minOrder(o){
  return Math.max(
    0,
    num(o.min_order ?? o.min_order_amount ?? o.minimum_order,0)
  );
}

function maxOrder(o){
  var v=o.max_order_amount ??
        o.maximum_order ??
        o.max_order ??
        o.max_order_value;

  if(v===null || v===undefined || v==='') return null;

  var n=num(v,null);
  return n===null ? null : Math.max(0,n);
}

function pct(o){
  return Math.max(
    0,
    num(
      o.discount_value ??
      o.value ??
      o.discount_percent ??
      o.discount,
      0
    )
  );
}

function cap(o,subtotal){
  var v=o.max_discount ??
        o.discount_cap ??
        o.max_discount_amount ??
        o.discount_amount;

  if(v===null || v===undefined || v==='') return subtotal;

  return Math.max(0,num(v,subtotal));
}

/* Scratch configuration only */
window.getScratchOffers=function(){
  return list()
    .filter(function(o){
      return isScratch(o) && active(o) && pct(o)>0;
    })
    .sort(function(a,b){
      return minOrder(a)-minOrder(b) || pct(a)-pct(b);
    });
};

/* Scratch eligibility + discount calculation */
window.scratchRewardForCart=function(c){
  var subtotal=Math.max(
    0,
    num(c && c.subtotal,0)
  );

  var rows=window.getScratchOffers().filter(function(o){
    var min=minOrder(o);
    var max=maxOrder(o);

    return subtotal>=min &&
      (max===null || subtotal<=max);
  });

  if(!rows.length){
    return {
      offer:null,
      discount:0
    };
  }

  var o=rows[rows.length-1];

  var raw=Math.round(
    subtotal*pct(o)/100
  );

  return {
    offer:o,
    discount:Math.min(
      raw,
      cap(o,subtotal),
      subtotal
    )
  };
};

/* ONE customer-facing Royal Gold Scratch Card */
window.renderScratch=function(c){
  var body=document.getElementById('scratchBody');
  if(!body) return;

  if(
    typeof selectedPromo!=='undefined' &&
    selectedPromo &&
    selectedPromo.source==='scratch'
  ){
    body.innerHTML=
      '<div class="scratch royal-gold">'+
      '<div class="royal-sweep"></div>'+
      '<div class="confetti">🎊 ✨ 🎉 ✨ 🎊</div>'+
      '<div class="ribbon">🎀</div>'+
      '<h2>CONGRATULATIONS!</h2>'+
      '<div class="amount">'+
      String(selectedPromo.discount_amount||0)+
      ' OFF</div>'+
      '<div style="color:#bbb">'+
      'Royal Gold scratch reward applied.'+
      '</div>'+
      '</div>';

    return;
  }

  var rows=window.getScratchOffers();
  var reward=window.scratchRewardForCart(c||{});
  var configured=rows.length;

  var label=reward.offer
    ? 'SCRATCH & REVEAL'
    : 'NOT CONFIGURED';

  var details=reward.offer
    ? (
        pct(reward.offer)+
        '% OFF • Up to '+
        money(
          cap(
            reward.offer,
            Number(c && c.subtotal || 0)
          )
        )
      )
    : (
        configured
          ? 'Add items to unlock your Scratch Card.'
          : 'Scratch offer is not configured for this outlet yet.'
      );

  body.innerHTML=
    '<div class="scratch royal-gold">'+
    '<div class="royal-sweep"></div>'+
    '<div class="ribbon">🎁</div>'+
    '<h2>Royal Gold Scratch Card</h2>'+
    '<div style="color:#bbb;margin:5px 0">'+
    details+
    '</div>'+
    '<button '+
    (reward.offer ? '' : 'disabled')+
    ' onclick="revealScratch()">'+
    label+
    '</button>'+
    '</div>';
};

/* Reveal and apply Scratch reward */
window.revealScratch=function(){
  var c=typeof calc==='function'
    ? calc()
    : {subtotal:0};

  var r=window.scratchRewardForCart(c);

  if(!r.offer){
    var configured=window.getScratchOffers().length;

    if(typeof toast==='function'){
      toast(
        configured
          ? 'Add items to unlock the configured scratch offer.'
          : 'Scratch offer is not configured for this outlet.'
      );
    }

    return;
  }

  var o=r.offer;

  selectedPromo=Object.assign({},o,{
    discount_percent:pct(o),
    max_discount:cap(o,c.subtotal),
    min_order:minOrder(o),
    max_order_amount:maxOrder(o),
    discount_amount:r.discount,
    source:'scratch'
  });

  if(typeof renderCheckout==='function'){
    renderCheckout();
  }

  if(typeof toast==='function'){
    toast(
      '✨ Royal Gold unlocked: '+
      money(r.discount)+
      ' OFF'
    );
  }
};

/* Remove Scratch rows from the normal Offer/Campaign display */
function scrubScratchOfferChips(){
  var root=document.getElementById('offerBody');
  if(!root) return;

  root.querySelectorAll('.offerChip').forEach(function(el){
    if(/scratch/i.test(el.textContent||'')){
      el.remove();
    }
  });
}

/* Safely refresh Scratch after native checkout rendering */
function hookRenderCheckout(){
  if(typeof renderCheckout!=='function'){
    return false;
  }

  if(renderCheckout.__jptV7){
    return true;
  }

  var original=renderCheckout;

  window.renderCheckout=function(){
    var result=original.apply(this,arguments);

    try{
      window.renderScratch(
        typeof calc==='function'
          ? calc()
          : {}
      );
    }catch(e){}

    scrubScratchOfferChips();

    return result;
  };

  window.renderCheckout.__jptV7=true;

  return true;
}

/* Wait for native Customer Core without replacing it */
var tries=0;

var timer=setInterval(function(){
  tries++;

  hookRenderCheckout();
  scrubScratchOfferChips();

  if(tries>120){
    clearInterval(timer);
  }
},250);

if(document.readyState!=='loading'){
  setTimeout(function(){
    hookRenderCheckout();
    scrubScratchOfferChips();
  },0);
}else{
  document.addEventListener(
    'DOMContentLoaded',
    function(){
      hookRenderCheckout();
      scrubScratchOfferChips();
    }
  );
}

})();
