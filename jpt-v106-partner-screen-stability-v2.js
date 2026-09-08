/* JPT V106 Partner Screen Stability V2
   Purpose: preserve Partner Orders scroll position when loadOrders() rebuilds the list.
   Does not replace order/payment logic.
*/
(function () {
  'use strict';

  if (window.__JPT_PARTNER_SCROLL_V2__) return;
  window.__JPT_PARTNER_SCROLL_V2__ = true;

  function getScroller(doc) {
    return doc.scrollingElement || doc.documentElement || doc.body;
  }

  function capture(doc) {
    const sc = getScroller(doc);
    return {
      x: window.scrollX || sc.scrollLeft || 0,
      y: window.scrollY || sc.scrollTop || 0
    };
  }

  function restore(doc, pos) {
    if (!pos) return;

    const sc = getScroller(doc);

    const apply = function () {
      try {
        window.scrollTo(pos.x, pos.y);
        sc.scrollLeft = pos.x;
        sc.scrollTop = pos.y;
      } catch (e) {}
    };

    requestAnimationFrame(function () {
      apply();
      requestAnimationFrame(function () {
        apply();
        setTimeout(apply, 80);
        setTimeout(apply, 250);
      });
    });
  }

  function install() {
    if (typeof window.loadOrders !== 'function') {
      setTimeout(install, 100);
      return;
    }

    if (window.loadOrders.__jptScrollWrapped) return;

    const original = window.loadOrders;

    async function stableLoadOrders() {
      const doc = document;
      const pos = capture(doc);

      try {
        return await original.apply(this, arguments);
      } finally {
        restore(doc, pos);
      }
    }

    stableLoadOrders.__jptScrollWrapped = true;
    stableLoadOrders.__jptOriginal = original;
    window.loadOrders = stableLoadOrders;

    console.log('[JPT V106] Partner scroll stability V2 active');
  }

  install();
})();
