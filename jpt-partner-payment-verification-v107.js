/* JPT Partner Payment Verification V107
   Scoped to the exact visible order id + authorized outlet context.
   This UI never verifies payment automatically: a staff member must confirm
   the real merchant receipt and exact amount before recording manual verification.
*/
(function () {
  'use strict';
  const seen = new WeakSet();
  const pending = new WeakSet();

  function outletId(card) {
    const text = String(card?.innerText || '');
    const match = text.match(/OUTLET:\s*.*?\(([A-Z0-9_-]+)\)/i);
    return match ? match[1] : String(localStorage.getItem('jpt_admin_outlet') || '');
  }

  function notice(card, message, color) {
    let box = card.querySelector(':scope > .jpt-payment-verification-v107');
    if (!box) {
      box = document.createElement('section');
      box.className = 'jpt-payment-verification-v107';
      box.style.cssText = 'margin:10px 0;padding:10px 12px;border:1px solid #806622;border-radius:10px;background:#17130a;color:#f5e5b0;font-size:12px;line-height:1.45';
      const actions = card.querySelector('.jpt-actions');
      card.insertBefore(box, actions || null);
    }
    box.style.borderColor = color || '#806622';
    box.textContent = message;
    return box;
  }

  async function inspect(card) {
    if (!card || pending.has(card)) return;
    const id = String(card.getAttribute('data-order-card') || '');
    const outlet = outletId(card);
    if (!/^\d+$/.test(id) || !outlet) return;
    pending.add(card);
    try {
      const sb = window.sb;
      if (!sb?.from) return;
      const result = await sb.from('orders')
        .select('id,order_no,status,payment,payment_verified,total,outlet_id')
        .eq('id', Number(id)).eq('outlet_id', outlet).maybeSingle();
      if (result.error) {
        notice(card, 'PAYMENT STATUS: Could not verify with server. Refresh Orders before retrying.');
        return;
      }
      const order = result.data;
      if (!order) {
        notice(card, 'PAYMENT STATUS: Order is no longer available in this outlet. Refresh Orders.');
        return;
      }
      const method = String(order.payment || '').toUpperCase();
      const box = notice(card, '', '#806622');
      box.replaceChildren();
      const heading = document.createElement('b');
      heading.textContent = 'PAYMENT • ' + method + ' • ' + String(order.order_no || ('#' + id));
      box.appendChild(heading);
      const detail = document.createElement('div');
      detail.style.marginTop = '4px';
      box.appendChild(detail);

      if (method === 'COD') {
        detail.textContent = 'Cash on Delivery — online payment verification is not required.';
        box.style.borderColor = '#397b50';
        return;
      }
      if (order.payment_verified === true) {
        detail.textContent = 'Online payment is marked verified in the server record.';
        box.style.borderColor = '#397b50';
        return;
      }
      detail.textContent = 'Not verified. Check the real merchant payment and confirm the received amount is ₹' +
        Number(order.total || 0).toLocaleString('en-IN', {maximumFractionDigits: 2}) + '.';
      box.style.borderColor = '#b78b22';
      if (String(order.status).toLowerCase() !== 'new') {
        detail.textContent += ' Current server status: ' + String(order.status).toUpperCase() + '.';
        return;
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'CONFIRM REAL PAYMENT RECEIVED';
      button.style.cssText = 'display:block;width:100%;margin-top:9px;padding:11px 8px;border:0;border-radius:8px;background:#e0b743;color:#17120a;font-weight:900;';
      button.addEventListener('click', async function () {
        const promptText = 'Only continue after checking the REAL merchant account.\n\nOrder: ' +
          String(order.order_no || id) + '\nAmount expected: ₹' +
          Number(order.total || 0).toLocaleString('en-IN', {maximumFractionDigits: 2}) +
          '\n\nDid you personally confirm the received payment and exact amount?';
        if (!window.confirm(promptText)) return;
        button.disabled = true;
        button.textContent = 'VERIFYING…';
        try {
          const update = await sb.from('orders').update({
            payment_verified: true,
            payment_verified_at: new Date().toISOString(),
            payment_verification_method: 'manual_merchant_check'
          }).eq('id', Number(id))
            .eq('outlet_id', outlet)
            .eq('status', 'new')
            .eq('payment', 'UPI')
            .eq('payment_verified', false)
            .select('id,order_no,payment_verified,status')
            .maybeSingle();
          if (update.error) throw update.error;
          if (!update.data || update.data.payment_verified !== true) {
            throw new Error('No order was updated. Refresh Orders and check the latest server state.');
          }
          detail.textContent = 'Payment verification recorded for this exact order. You can now tap ACCEPT ORDER.';
          button.remove();
          box.style.borderColor = '#397b50';
          try { window.toast?.('Payment verification saved. Tap ACCEPT ORDER to continue.'); } catch (_) {}
        } catch (error) {
          button.disabled = false;
          button.textContent = 'CONFIRM REAL PAYMENT RECEIVED';
          detail.textContent = 'Could not record verification: ' + String(error?.message || error);
        }
      });
      box.appendChild(button);
    } catch (error) {
      notice(card, 'PAYMENT STATUS: ' + String(error?.message || error));
    } finally {
      pending.delete(card);
    }
  }

  function scan() {
    document.querySelectorAll('.jpt-order-card[data-order-card]').forEach(card => {
      if (seen.has(card)) return;
      seen.add(card);
      inspect(card);
    });
  }

  function boot() {
    scan();
    new MutationObserver(scan).observe(document.body, {childList: true, subtree: true});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) scan(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
