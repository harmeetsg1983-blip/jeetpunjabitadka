/* JPT V107 — Delivery Partner Approval Bridge
   Additive-only.
   Does NOT replace admin.html.
   Does NOT touch customer app.
*/
(function () {
  'use strict';

  if (window.__JPT_DELIVERY_ADMIN_BRIDGE_V107__) return;
  window.__JPT_DELIVERY_ADMIN_BRIDGE_V107__ = true;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return {
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[c];
    });
  }

  function getRoot() {
    return document.querySelector('#jptFinalTouchHomeV10')
      || document.querySelector('.shell')
      || document.querySelector('.app');
  }

  function install() {
    if (!window.sb) return;

    if (document.getElementById('jptDeliveryApprovalV107')) return;

    var root = getRoot();
    if (!root) return;

    var box = document.createElement('section');
    box.id = 'jptDeliveryApprovalV107';

    box.style.cssText =
      'margin-top:14px;' +
      'background:#111;' +
      'border:1px solid #5a461b;' +
      'border-radius:18px;' +
      'padding:16px;' +
      'color:#fff;';

    box.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
        '<div>' +
          '<h3 style="margin:0;color:#d8ae42">🛵 Delivery Partner Approvals</h3>' +
          '<div style="font-size:11px;color:#999;margin-top:4px">Approve or reject rider onboarding requests.</div>' +
        '</div>' +
        '<button id="jptRiderRefreshV107" class="btn">↻ Refresh Riders</button>' +
      '</div>' +
      '<div id="jptRiderQueueV107" class="notice" style="margin-top:12px">Loading riders...</div>';

    root.appendChild(box);

    document
      .getElementById('jptRiderRefreshV107')
      .addEventListener('click', loadQueue);

    loadQueue();

    setInterval(function () {
      if (document.visibilityState !== 'hidden') {
        loadQueue();
      }
    }, 15000);
  }

  async function loadQueue() {
    var box = document.getElementById('jptRiderQueueV107');
    if (!box || !window.sb) return;

    box.textContent = 'Loading pending riders...';

    try {
      var result = await window.sb.rpc('delivery_partner_admin_queue');

      if (result.error) {
        box.innerHTML =
          '<div style="color:#ff9999">Error: ' +
          esc(result.error.message) +
          '</div>';
        return;
      }

      var rows = Array.isArray(result.data) ? result.data : [];

      if (!rows.length) {
        box.innerHTML =
          '<div style="color:#79e39b">✓ No pending delivery partners.</div>';
        return;
      }

      box.innerHTML = rows.map(function (r) {
        var id = r.delivery_partner_id || r.id;

        return (
          '<div style="' +
            'margin-top:10px;' +
            'padding:13px;' +
            'border:1px solid #3b321f;' +
            'border-radius:14px;' +
            'background:#0b0b0b;' +
          '">' +

            '<div style="font-weight:900;color:#d8ae42">' +
              esc(r.full_name || 'Unnamed Rider') +
            '</div>' +

            '<div style="font-size:12px;color:#bbb;margin-top:5px">' +
              'Phone: ' + esc(r.phone || '—') +
            '</div>' +

            '<div style="font-size:12px;color:#bbb">' +
              'Address: ' + esc(r.address || '—') +
            '</div>' +

            '<div style="font-size:11px;color:#777;margin-top:4px">' +
              'Submitted: ' + esc(r.submitted_at || '—') +
            '</div>' +

            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +

              '<button class="btn green" ' +
                'data-rider-action="approve" ' +
                'data-rider-id="' + esc(id) + '">' +
                '✓ APPROVE' +
              '</button>' +

              '<button class="btn red" ' +
                'data-rider-action="reject" ' +
                'data-rider-id="' + esc(id) + '">' +
                '✕ REJECT' +
              '</button>' +

            '</div>' +
          '</div>'
        );
      }).join('');

      box.querySelectorAll('[data-rider-action]').forEach(function (button) {

        button.addEventListener('click', async function () {

          var id = button.getAttribute('data-rider-id');
          var action = button.getAttribute('data-rider-action');

          if (action === 'approve') {

            if (!confirm('Approve this delivery partner?')) return;

            button.disabled = true;
            button.textContent = 'Approving...';

            var result = await window.sb.rpc(
              'delivery_partner_admin_review',
              {
                p_delivery_partner_id: id,
                p_decision: 'approve',
                p_reason: null
              }
            );

            if (result.error) {
              alert(result.error.message);
              button.disabled = false;
              button.textContent = '✓ APPROVE';
              return;
            }

            alert('Delivery partner approved.');
            await loadQueue();

          } else {

            var reason = prompt(
              'Reject reason (optional):',
              ''
            );

            button.disabled = true;
            button.textContent = 'Rejecting...';

            var resultReject = await window.sb.rpc(
              'delivery_partner_admin_review',
              {
                p_delivery_partner_id: id,
                p_decision: 'reject',
                p_reason: reason || null
              }
            );

            if (resultReject.error) {
              alert(resultReject.error.message);
              button.disabled = false;
              button.textContent = '✕ REJECT';
              return;
            }

            alert('Delivery partner rejected.');
            await loadQueue();
          }
        });
      });

    } catch (error) {

      box.innerHTML =
        '<div style="color:#ff9999">' +
        esc(error.message || 'Unable to load rider approvals.') +
        '</div>';
    }
  }

  function boot(tries) {

    if (
      window.sb &&
      getRoot()
    ) {
      install();
      return;
    }

    if (tries > 0) {
      setTimeout(function () {
        boot(tries - 1);
      }, 500);
    }
  }

  boot(40);

})();
