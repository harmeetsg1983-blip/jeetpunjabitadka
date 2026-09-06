/* Jeet Punjabi Tadka V106 — temporary manual payment verification gate.
   IMPORTANT: this does NOT contact Google Pay and does NOT fake payment success.
   Restaurant staff must verify the real merchant payment before confirming.
*/
(function(){
  'use strict';

  function supabaseClient(){
    try{
      if(window.supabase && window.JPT_SUPABASE_URL && window.JPT_SUPABASE_PUBLISHABLE_KEY){
        return window.supabase.createClient(window.JPT_SUPABASE_URL,window.JPT_SUPABASE_PUBLISHABLE_KEY);
      }
    }catch(e){ console.error('JPT payment gate: Supabase init failed',e); }
    return null;
  }

  var sb=null, hooked=new WeakSet();

  function isOrderCard(el){
    return el && el.classList && el.classList.contains('order');
  }

  function readOrderNo(card){
    var text=card.innerText||'';
    var m=text.match(/\bJPT-\d{5,}\b/i);
    return m ? m[0].toUpperCase() : '';
  }

  function hasCod(card){
    return /\bCOD\b|cash\s*on\s*delivery/i.test(card.innerText||'');
  }

  async function fetchVerified(orderNo){
    if(!sb || !orderNo) return false;
    var r=await sb.from('orders').select('payment_verified,payment,payment_verified_at,payment_verification_method').eq('order_no',orderNo).maybeSingle();
    if(r.error){ console.warn('JPT payment gate read:',r.error.message); return false; }
    return !!r.data && r.data.payment_verified===true;
  }

  async function markVerified(orderNo){
    if(!sb || !orderNo) throw new Error('Payment system unavailable');
    var r=await sb.from('orders').update({
      payment_verified:true,
      payment_verified_at:new Date().toISOString(),
      payment_verification_method:'manual_merchant_check'
    }).eq('order_no',orderNo);
    if(r.error) throw new Error(r.error.message);
  }

  function findAcceptButtons(card){
    return Array.prototype.slice.call(card.querySelectorAll('button')).filter(function(b){
      return /accept\s*order/i.test((b.innerText||'').trim());
    });
  }

  function ensureGate(card){
    if(!isOrderCard(card) || hooked.has(card)) return;
    hooked.add(card);

    var orderNo=readOrderNo(card);
    if(!orderNo) return;

    var bar=document.createElement('div');
    bar.className='jpt-payment-gate';
    bar.style.cssText='margin:10px 0;padding:11px;border:1px solid #d8ae42;border-radius:12px;background:#17130a;color:#fff;font-size:12px';
    bar.innerHTML='<b style="color:#f4d77a">PAYMENT VERIFICATION</b><div class="jpt-pg-status" style="margin-top:5px">Checking payment status…</div><button type="button" class="jpt-pg-btn" style="margin-top:8px;width:100%;padding:10px;border:0;border-radius:9px;background:#f4d77a;color:#111;font-weight:900">VERIFY PAYMENT MANUALLY</button>';
    var status=bar.querySelector('.jpt-pg-status');
    var btn=bar.querySelector('.jpt-pg-btn');
    card.insertBefore(bar,card.firstChild);

    function lock(){
      findAcceptButtons(card).forEach(function(b){
        b.disabled=true;
        b.style.opacity='.45';
        b.title='Verify the real merchant payment first';
      });
    }
    lock();

    async function refresh(){
      var verified=await fetchVerified(orderNo);
      if(verified){
        status.textContent='Payment verified and recorded. ACCEPT is unlocked.';
        status.style.color='#7be19a';
        btn.disabled=true;
        btn.textContent='✓ PAYMENT VERIFIED';
        findAcceptButtons(card).forEach(function(b){ b.disabled=false; b.style.opacity='1'; b.title=''; });
      }else{
        status.textContent=hasCod(card)
          ? 'COD order detected. Launch mode is UPI-only; do not accept COD.'
          : 'Not verified. Check the real merchant payment for the exact order amount.';
        status.style.color='#f4d77a';
        lock();
      }
    }

    btn.addEventListener('click',async function(){
      var ok=window.confirm('Confirm that you checked the REAL merchant payment and the received amount exactly matches this order. Continue?');
      if(!ok) return;
      btn.disabled=true;
      try{
        await markVerified(orderNo);
        await refresh();
      }catch(e){
        btn.disabled=false;
        status.textContent='Could not save verification: '+e.message;
        status.style.color='#ff9b91';
      }
    });

    refresh();
  }

  function scan(){
    document.querySelectorAll('.order').forEach(ensureGate);
  }

  function boot(){
    sb=supabaseClient();
    scan();
    new MutationObserver(scan).observe(document.body,{subtree:true,childList:true});
    setInterval(scan,2000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
