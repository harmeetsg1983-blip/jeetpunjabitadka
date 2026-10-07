/* JPT Partner App — New Screen UI
 * Isolated UI only. No realtime subscription, audio, ringtone, or order mutation.
 */
(function(){
  'use strict';
  const bridge = window.JPTNewScreenBridge;
  const UI = {
    mount(target){
      const root = typeof target === 'string' ? document.querySelector(target) : target;
      if (!root) return false;
      const state = bridge ? bridge.getState() : {orders:[], outlets:[]};
      root.innerHTML = '';
      const title = document.createElement('div');
      title.className = 'jpt-new-screen-title';
      title.textContent = 'New Screen';
      const meta = document.createElement('div');
      meta.className = 'jpt-new-screen-meta';
      meta.textContent = state.outlets.length + ' managed outlet(s) · ' + state.orders.length + ' visible order(s)';
      root.append(title, meta);
      return true;
    }
  };
  window.JPTNewScreenUI = UI;
})();
