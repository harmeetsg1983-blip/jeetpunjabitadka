/* JPT V106 — Royal Gold Scratch Manager
   Safe additive module.
   Uses the existing admin Supabase client (sb) and currentOutlet.
   Live offers schema:
   discount_type, discount_value, discount_amount, min_order,
   max_order_amount, active, is_active, scratch_enabled, outlet_id.
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

  function waitForAdmin(done, tries) {
    tries = tries || 0;
    if (window.sb && document.getElementById('offers') && window.currentOutlet !== undefined) {
      done();
      return;
    }
    if (tries > 120) return;
    setTimeout(function () { waitForAdmin(done, tries + 1); }, 250);
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function toast(t) {
    if (typeof window.msg === 'function') window.msg(t);
    else alert(t);
  }

  function outletNames(ids) {
    return ids.map(function(id){
      const x = OUTLETS.find(function(o){ return o[0] === id; });
      return x ? x[1] : id;
    }).join(', ');
  }

  async function loadScratchRows() {
    const r = await sb.from('offers')
      .select('*')
      .in('outlet_id', OUTLETS.map(function(o){return o[0];}))
      .eq('scratch_enabled', true)
      .order('outlet_id')
      .order('id');
    if (r.error) throw r.error;
    return r.data || [];
  }

  function render() {
    const host = document.getElementById('jptScratchManager');
    if (!host) return;

    host.innerHTML =
      '<div class="card" style="margin:10px 0;border:2px solid #8e6f2c;background:#100e09">' +
        '<h2 style="margin-bottom:6px">✨ Royal Gold Scratch Card — Partner Control</h2>' +
        '<div class="muted">Partner controls the live Scratch Card. Maximum order is inclusive: ₹220 is eligible; ₹221 is not.</div>' +

        '<div class="field"><label>Apply Scratch Offer To</label>' +
          '<div id="jptScratchOutlets" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"></div>' +
          '<div style="margin-top:8px">' +
            '<button type="button" class="btn dark" id="jptScratchAll">Select All 5</button> ' +
            '<button type="button" class="btn dark" id="jptScratchNone">Clear</button>' +
          '</div>' +
        '</div>' +

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
        '<div id="jptScratchLive" style="margin-top:12px"></div>' +
      '</div>';

    const box = document.getElementById('jptScratchOutlets');
    OUTLETS.forEach(function(o){
      const wrap = document.createElement('label');
      wrap.style.cssText = 'display:flex;gap:7px;align-items:center;padding:9px;border:1px solid #3a301d;border-radius:9px;background:#0e0e0e';
      wrap.innerHTML = '<input type="checkbox" class="jptScratchOutlet" value="' + esc(o[0]) + '"> <span><b>' + esc(o[1]) + '</b><br><span class="small">' + esc(o[0]) + '</span></span>';
      box.appendChild(wrap);
    });

    document.getElementById('jptScratchAll').onclick = function(){
      document.querySelectorAll('.jptScratchOutlet').forEach(function(x){x.checked=true;});
    };
    document.getElementById('jptScratchNone').onclick = function(){
      document.querySelectorAll('.jptScratchOutlet').forEach(function(x){x.checked=false;});
    };
    document.getElementById('jptScratchSave').onclick = save;
    document.getElementById('jptScratchReload').onclick = load;

    load();
  }

  function setMsg(t) {
    const x = document.getElementById('jptScratchMsg');
    if (x) x.textContent = t;
  }

  async function load() {
    try {
      setMsg('Loading live Scratch configuration…');
      const rows = await loadScratchRows();
      const live = document.getElementById('jptScratchLive');
      if (!rows.length) {
        if (live) live.innerHTML = '<div class="muted">No active Scratch configuration found.</div>';
        setMsg('');
        return;
      }

      const first = rows[0];
      document.getElementById('jptScratchPct').value = Number(first.discount_value || 0);
      document.getElementById('jptScratchCap').value = Number(first.discount_amount || 0);
      document.getElementById('jptScratchMin').value = Number(first.min_order || 0);
      document.getElementById('jptScratchMax').value = first.max_order_amount == null ? '' : Number(first.max_order_amount);
      document.getElementById('jptScratchActive').checked = true;

      const ids = new Set(rows.map(function(r){return r.outlet_id;}));
      document.querySelectorAll('.jptScratchOutlet').forEach(function(x){x.checked=ids.has(x.value);});

      if (live) live.innerHTML =
        '<div class="status"><b>LIVE:</b> ' + esc(outletNames(Array.from(ids))) +
        '<br>Discount: <b>' + Number(first.discount_value || 0) + '%</b> · Cap: <b>₹' + Number(first.discount_amount || 0) +
        '</b> · Eligible: <b>₹' + Number(first.min_order || 0) + ' to ₹' +
        (first.max_order_amount == null ? 'No maximum' : Number(first.max_order_amount)) + '</b></div>';

      setMsg('');
    } catch(e) {
      setMsg('Load failed: ' + (e.message || e));
    }
  }

  async function save() {
    const selected = Array.from(document.querySelectorAll('.jptScratchOutlet:checked')).map(function(x){return x.value;});
    const pct = Number(document.getElementById('jptScratchPct').value || 0);
    const cap = Number(document.getElementById('jptScratchCap').value || 0);
    const min = Number(document.getElementById('jptScratchMin').value || 0);
    const maxRaw = document.getElementById('jptScratchMax').value;
    const max = maxRaw === '' ? null : Number(maxRaw);
    const active = document.getElementById('jptScratchActive').checked;

    if (!selected.length) return setMsg('Select at least one outlet.');
    if (!(pct > 0 && pct <= 100)) return setMsg('Discount % must be between 0 and 100.');
    if (!(cap >= 0)) return setMsg('Maximum discount must be 0 or more.');
    if (!(min >= 0)) return setMsg('Minimum order must be 0 or more.');
    if (max !== null && (!(max >= 0) || max < min)) return setMsg('Maximum eligible order must be >= minimum order.');

    const btn = document.getElementById('jptScratchSave');
    btn.disabled = true;
    setMsg('Saving…');

    try {
      /* First disable ALL existing Scratch rows for these selected outlets.
         This prevents old 30/40/50/60 slabs from remaining active. */
      const off = await sb.from('offers').update({
        active: false,
        is_active: false,
        scratch_enabled: false,
        updated_at: new Date().toISOString()
      }).in('outlet_id', selected).eq('scratch_enabled', true);

      if (off.error) throw off.error;

      for (const outletId of selected) {
        const title = 'Royal Gold Scratch Card — ' + pct + '% OFF';
        const code = 'JPT-SCRATCH-' + outletId;
        const existing = await sb.from('offers')
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

        let r;
        if (existing.data && existing.data.id) {
          r = await sb.from('offers').update(row).eq('id', existing.data.id).eq('outlet_id', outletId);
        } else {
          r = await sb.from('offers').insert(row);
        }
        if (r.error) throw r.error;
      }

      setMsg('Saved successfully for: ' + outletNames(selected));
      await load();
      if (typeof window.loadOffers === 'function') window.loadOffers();
    } catch(e) {
      setMsg('Save failed: ' + (e.message || e));
    } finally {
      btn.disabled = false;
    }
  }

  function boot() {
    waitForAdmin(function(){
      if (document.getElementById('jptScratchManager')) return;

      const old = document.getElementById('v106ScratchSetup');
      if (old) old.style.display = 'none';

      const host = document.createElement('div');
      host.id = 'jptScratchManager';
      const form = document.getElementById('offerForm');
      const offers = document.getElementById('offers');
      if (form) form.parentNode.insertBefore(host, form);
      else if (offers) offers.appendChild(host);
      else return;

      render();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
