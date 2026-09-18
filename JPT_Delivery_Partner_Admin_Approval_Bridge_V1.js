/* JPT V106 — Delivery Partner Admin Approval Bridge V1
   Additive-only bridge. Does not replace existing admin.html logic.
*/
(function () {
  'use strict';

  function waitForAdmin(tries) {
    if (window.sb && document.querySelector('.tabs') && document.querySelector('#app')) {
      install();
      return;
    }
    if (tries > 0) setTimeout(function () { waitForAdmin(tries - 1); }, 500);
  }

  function install() {
    if (document.getElementById('jpt-delivery-riders-tab')) return;

    var tabs = document.querySelector('.tabs');
    var app = document.querySelector('#app');
    if (!tabs || !app) return;

    var tab = document.createElement('button');
    tab.id = 'jpt-delivery-riders-tab';
    tab.type = 'button';
    tab.textContent = '🛵 Riders';
    tab.style.cssText =
      'border:0;background:transparent;padding:10px 12px;cursor:pointer;font:inherit;';
    tabs.appendChild(tab);

    var pane = document.createElement('section');
    pane.id = 'delivery-riders';
    pane.style.cssText =
      'display:none;margin-top:16px;padding:14px;border-radius:14px;background:#111;color:#f5d27a;';
    pane.innerHTML =
      '<h2 style="margin:0 0 12px">Delivery Partner Approvals</h2>' +
      '<div id="jpt-rider-queue">Loading...</div>';
    app.appendChild(pane);

    tab.addEventListener('click', function () {
      document.querySelectorAll('#app > section').forEach(function (s) {
        if (s.id !== 'delivery-riders') s.style.display = 'none';
      });
      pane.style.display = 'block';
      loadQueue();
    });

    async function loadQueue() {
      var box = document.getElementById('jpt-rider-queue');
      box.textContent = 'Loading pending riders...';

      var result = await window.sb.rpc('delivery_partner_admin_queue');
      if (result.error) {
        box.innerHTML = '<div style="color:#ff8b8b">Error: ' +
          escapeHtml(result.error.message) + '</div>';
        return;
      }

      var rows = Array.isArray(result.data) ? result.data : [];
      if (!rows.length) {
        box.innerHTML = '<div>No pending delivery partners.</div>';
        return;
      }

      box.innerHTML = rows.map(function (r) {
        return '<div style="margin:10px 0;padding:12px;border:1px solid #5c4a22;border-radius:12px">' +
          '<div><b>' + escapeHtml(r.full_name || 'Unnamed') + '</b></div>' +
          '<div>Phone: ' + escapeHtml(r.phone || '—') + '</div>' +
          '<div>Address: ' + escapeHtml(r.address || '—') + '</div>' +
          '<div>Submitted: ' + escapeHtml(r.submitted_at || '—') + '</div>' +
          '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
          '<button data-action="approve" data-id="' + escapeAttr(r.delivery_partner_id || r.id) + '">APPROVE</button>' +
          '<button data-action="reject" data-id="' + escapeAttr(r.delivery_partner_id || r.id) + '">REJECT</button>' +
          '</div></div>';
      }).join('');

      box.querySelectorAll('button[data-action]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var id = b.getAttribute('data-id');
          var action = b.getAttribute('data-action');

          if (action === 'approve') {
            if (!confirm('Approve this delivery partner?')) return;
            var res = await window.sb.rpc('delivery_partner_admin_review', {
              p_delivery_partner_id: id,
              p_decision: 'approve',
              p_rejection_reason: null
            });
            if (res.error) alert(res.error.message);
            else { alert('Delivery partner approved.'); loadQueue(); }
          } else {
            var reason = prompt('Reject reason (optional):', '');
            var res2 = await window.sb.rpc('delivery_partner_admin_review', {
              p_delivery_partner_id: id,
              p_decision: 'reject',
              p_rejection_reason: reason || null
            });
            if (res2.error) alert(res2.error.message);
            else { alert('Delivery partner rejected.'); loadQueue(); }
          }
        });
      });
    }

    function escapeHtml(v) {
      return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);
      });
    }
    function escapeAttr(v) { return escapeHtml(v); }
  }

  waitForAdmin(30);
})();
