/* JPT V106 — Royal Gold Scratch Manager V2
   SAFE ADDITIVE MODULE
   IMPORTANT: admin.html keeps its existing Golden Core.
   This module creates its own Supabase client using the same public
   browser configuration, so it does not depend on admin.html's private
   lexical variables (sb/currentOutlet).
*/
(function () {
  'use strict';

  const OUTLETS = [
    ['JPT-001', 'Jeet Punjabi Tadka'],
    ['SOP-002', 'Shan-e-Punjab'],
    ['PFA-003', 'Punjabi Food Adda'],
    ['NME-004', '99 Meal Express'],
    ['TOP-005', 'Taste of Punjab']
  ];

  let client = null;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function outletNames(ids) {
    return ids.map(function (id) {
      const x = OUTLETS.find(function (o) { return o[0] === id; });
      return x ? x[1] : id;
    }).join(', ');
  }

  function setMsg(t) {
    const x = document.getElementById('jptScratchMsg');
    if (x) x.textContent = t;
  }

  function selectedIds() {
    return Array.from(document.querySelectorAll('.jptScratchOutlet:checked'))
      .map(function (x) { return x.value; });
  }

  function getClient() {
    if (client) return client;
    if (!window.supabase || !window.JPT_SUPABASE_URL || !window.JPT_SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('Supabase browser configuration is not available.');
    }
    client = window.supabase.createClient(
      window.JPT_SUPABASE_URL,
      window.JPT_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
    return client;
  }

  async function loadRows() {
    const c = getClient();
    const r = await c.from('offers')
      .select('*')
      .in('outlet_id', OUTLETS.map(function (o) { return o[0]; }))
      .eq('scratch_enabled', true)
      .order('outlet_id')
      .order('id');
    if (r.error) throw r.error;
    return r.data || [];
  }

  function renderShell() {
    const old = document.getElementById('jptScratchManager');
    if (old) old.remove();

    const host = document.createElement('div');
    host.id = 'jptScratchManager';
    host.className = 'card';
    host.style.cssText = 'margin:10px 0;border:2px solid #8e6f2c;background:#100e09';

    host.innerHTML =
      '<h2 style="margin-bottom:6px">✨ Royal Gold Scratch Card — Partner Control</h2>' +
      '<div class="muted">Partner controls the live Scratch Card. Maximum order is inclusive: ₹220 is eligible; ₹221 is not.</div>' +

      '<div class="field"><label>Apply Scratch Offer To</label>' +
      '<div id="jptScratchOutlets" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"></div>' +
      '<div style="margin-top:8px"><button type="button" class="btn dark" id="jptScratchAll">Select All 5</button> <button type="button" class="btn dark" id="jptScratchNone">Clear</button></div></div>' +

      '<div class="grid">' +
      '<div class="field"><label>Discount %</label><input id="jptScratchPct" type="number" min="0" max="100" step="0.01" value="20"></div>' +
      '<div class="field"><label>Maximum discount ₹ (cap)</label><input id="jptScratchCap" type="number" min="0" step="0.01" value="40"></div>' +
      '<div class="field"><label>Minimum order ₹</label><input id="jptScratchMin" type="number" min="0" step="0.01" value="0"></div>' +
      '<div class="field"><label>Maximum eligible order ₹</label><input id="jptScratchMax" type="number" min="0" step="0.01" value="220"></div>' +
      '</div>' +

      '<div class="field"><label><input id="jptScratchActive" type="checkbox" checked> Scratch Card Active</label></div>' +
      '<div id="jptScratchMsg" class="msg"></div>' +
      '<button type="button" class="btn primary" id="jptScratchSave">💾 Save Scratch Configuration</button> ' +
      '<button type="button" class="btn dark" id="jptScratchReload">↻ Reload Live Configuration</button>' +
      '<div id="jptScratchLive" style="margin-top:12px"></div>';

    OUTLETS.forEach(function (o) {
      const label = document.createElement('label');
      label.style.cssText = 'display:flex;gap:7px;align-items:center;padding:9px;border:1px solid #3a301d;border-radius:9px;background:#0e0e0e';
      label.innerHTML = '<input type="checkbox" class="jptScratchOutlet" value="' + esc(o[0]) + '"> <span><b>' + esc(o[1]) + '</b><br><span class="small">' + esc(o[0]) + '</span></span>';
      host.querySelector('#jptScratchOutlets').appendChild(label);
    });

    document.getElementById('jptScratchAll').onclick = function () {
      document.querySelectorAll('.jptScratchOutlet').forEach(function (x) { x.checked = true; });
    };
    document.getElementById('jptScratchNone').onclick = function () {
      document.querySelectorAll('.jptScratchOutlet').forEach(function (x) { x.checked = false; });
    };
    document.getElementById('jptScratchSave').onclick = save;
    document.getElementById('jptScratchReload').onclick = load;

    const form = document.getElementById('offerForm');
    const offers = document.getElementById('offers');
    if (form) form.parentNode.insertBefore(host, form);
    else if (offers) offers.appendChild(host);
    else return;

    load();
  }

  async function load() {
    try {
      setMsg('Loading live Scratch configuration…');
      const rows = await loadRows();
      const live = document.getElementById('jptScratchLive');

      if (!rows.length) {
        if (live) live.innerHTML = '<div class="muted">No active Scratch configuration found. Set the values above and Save.</div>';
        setMsg('');
        return;
      }

      const first = rows[0];
      document.getElementById('jptScratchPct').value = Number(first.discount_value || 0);
      document.getElementById('jptScratchCap').value = Number(first.discount_amount || 0);
      document.getElementById('jptScratchMin').value = Number(first.min_order || 0);
      document.getElementById('jptScratchMax').value = first.max_order_amount == null ? '' : Number(first.max_order_amount);
      document.getElementById('jptScratchActive').checked = true;

      const ids = new Set(rows.map(function (r) { return r.outlet_id; }));
      document.querySelectorAll('.jptScratchOutlet').forEach(function (x) {
        x.checked = ids.has(x.value);
      });

      if (live) live.innerHTML =
        '<div class="status"><b>LIVE:</b> ' + esc(outletNames(Array.from(ids))) +
        '<br>Discount: <b>' + Number(first.discount_value || 0) + '%</b> · Cap: <b>₹' + Number(first.discount_amount || 0) +
        '</b> · Eligible: <b>₹' + Number(first.min_order || 0) + ' to ₹' +
        (first.max_order_amount == null ? 'No maximum' : Number(first.max_order_amount)) + '</b></div>';

      setMsg('');
    } catch (e) {
      setMsg('Load failed: ' + (e.message || e));
    }
  }

  async function save() {
    const ids = selectedIds();
    const pct = Number(document.getElementById('jptScratchPct').value || 0);
    const cap = Number(document.getElementById('jptScratchCap').value || 0);
    const min = Number(document.getElementById('jptScratchMin').value || 0);
    const rawMax = document.getElementById('jptScratchMax').value.trim();
    const max = rawMax === '' ? null : Number(rawMax);
    const active = document.getElementById('jptScratchActive').checked;

    if (!ids.length) return setMsg('Select at least one outlet.');
    if (!(pct > 0 && pct <= 100)) return setMsg('Discount % must be between 0 and 100.');
    if (!(cap > 0)) return setMsg('Maximum discount must be greater than 0.');
    if (!(min >= 0)) return setMsg('Minimum order must be 0 or more.');
    if (max !== null && (!(max >= 0) || max < min)) return setMsg('Maximum eligible order must be >= minimum order.');

    const btn = document.getElementById('jptScratchSave');
    btn.disabled = true;
    setMsg('Saving…');

    try {
      const c = getClient();

      // Disable existing Scratch rows only for the selected outlets.
      const off = await c.from('offers').update({
        active: false,
        is_active: false,
        scratch_enabled: false,
        updated_at: new Date().toISOString()
      }).in('outlet_id', ids).eq('scratch_enabled', true);

      if (off.error) throw off.error;

      for (const outletId of ids) {
        const code = 'JPT-SCRATCH-' + outletId;
        const title = 'Royal Gold Scratch Card — ' + pct + '% OFF';

        const existing = await c.from('offers')
          .select('id')
          .eq('outlet_id', outletId)
          .eq('code', code)
          .maybeSingle();

        if (existing.error) throw existing.error;

        const row = {
          outlet_id: outletId,
          title: title,
          code: code,
          discount_type: 'percentage',
          discount_value: pct,
          discount_amount: cap,
          min_order: min,
          max_order_amount: max,
          active: active,
          is_active: active,
          scratch_enabled: active,
          updated_at: new Date().toISOString()
        };

        const r = existing.data && existing.data.id
          ? await c.from('offers').update(row).eq('id', existing.data.id).eq('outlet_id', outletId)
          : await c.from('offers').insert(row);

        if (r.error) throw r.error;
      }

      setMsg('Saved successfully for: ' + outletNames(ids));
      await load();
    } catch (e) {
      setMsg('Save failed: ' + (e.message || e));
    } finally {
      btn.disabled = false;
    }
  }

  function boot() {
    function ready() {
      if (!window.supabase || !window.JPT_SUPABASE_URL || !window.JPT_SUPABASE_PUBLISHABLE_KEY) {
        setTimeout(ready, 300);
        return;
      }
      if (!document.getElementById('offers')) {
        setTimeout(ready, 300);
        return;
      }

      const old = document.getElementById('v106ScratchSetup');
      if (old) old.style.display = 'none';

      renderShell();
    }

    ready();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
