/* JPT Partner App — New Screen Read-Only Bridge
 * ISOLATED FEATURE BRANCH ONLY.
 * Never owns realtime, ringtone, audio, or order state transitions.
 */
(function(){
  'use strict';
  const API = {
    version: '1.0.0-readonly',
    getOrdersSnapshot(){
      try {
        const runtime = window.__JPTOrdersRuntime || window.JPTOrdersRuntime || null;
        const rows = runtime && Array.isArray(runtime.rows) ? runtime.rows : [];
        return rows.map(o => ({...o}));
      } catch (_) { return []; }
    },
    getManagedOutlets(){
      try {
        const list = window.JPTPartnerAccess?.getOutlets?.() || window.JPT_PARTNER_OUTLETS || [];
        return Array.isArray(list) ? list.map(o => ({...o})) : [];
      } catch (_) { return []; }
    },
    getState(){
      return Object.freeze({
        orders: this.getOrdersSnapshot(),
        outlets: this.getManagedOutlets()
      });
    }
  };
  Object.freeze(API);
  window.JPTNewScreenBridge = API;
})();
