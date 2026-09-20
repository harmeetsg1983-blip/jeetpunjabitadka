/* JPT Partner Dynamic Outlet Access Bridge V2 */
(function () {
  'use strict';
  const SELECTOR_ID = 'outletSelect';
  const OUTLET_KEY = 'jpt_admin_outlet';
  let authorized = [];
  let loading = false;

  function getSelect() { return document.getElementById(SELECTOR_ID); }

  function normalize(rows) {
    return (Array.isArray(rows) ? rows : [])
      .filter(row => row && row.outlet_id)
      .map(row => ({
        outlet_id: String(row.outlet_id),
        outlet_name: String(row.outlet_name || row.outlet_id),
        access_level: String(row.access_level || 'view')
      }));
  }

  function render(rows) {
    const select = getSelect();
    if (!select) return false;
    authorized = normalize(rows);
    if (!authorized.length) return false;

    const saved = localStorage.getItem(OUTLET_KEY) || '';
    const current = select.value || '';
    const selected =
      authorized.some(x => x.outlet_id === saved) ? saved :
      authorized.some(x => x.outlet_id === current) ? current :
      authorized[0].outlet_id;

    select.replaceChildren();
    authorized.forEach(outlet => {
      const option = document.createElement('option');
      option.value = outlet.outlet_id;
      option.textContent = outlet.outlet_name + ' (' + outlet.outlet_id + ')' +
        (outlet.access_level === 'view' ? ' — VIEW' : '');
      option.dataset.accessLevel = outlet.access_level;
      select.appendChild(option);
    });
    select.value = selected;

    if (typeof select.onchange === 'function') {
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    window.JPT_PARTNER_OUTLETS = authorized.slice();
    window.JPTPartnerAccess = {
      version: 'v2',
      authorizedOutlets: authorized.slice(),
      canAccess: id => authorized.some(x => x.outlet_id === id),
      getOutlets: () => authorized.slice(),
      reload: load
    };
    return true;
  }

  async function load() {
    if (loading) return authorized.slice();
    loading = true;
    try {
      if (!window.sb || typeof window.sb.rpc !== 'function') {
        throw new Error('Supabase client not ready');
      }
      const { data, error } = await window.sb.rpc('partner_my_outlets');
      if (error) throw error;
      render(data || []);
      return authorized.slice();
    } catch (error) {
      console.warn('[JPT Partner Access] reload failed safely:', error);
      return authorized.slice();
    } finally {
      loading = false;
    }
  }

  window.JPTPartnerAccess = {
    version: 'v2',
    authorizedOutlets: [],
    canAccess: () => false,
    getOutlets: () => [],
    reload: load
  };
})();
