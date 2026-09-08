/* JPT V106 Partner Screen Stability V3
   Target: preserve the user's actual scroll container when Orders DOM is rebuilt.
   This is intentionally independent of window.loadOrders() so internal lexical
   calls and realtime callbacks are also covered.
*/
(function () {
  "use strict";

  if (window.__JPT_PARTNER_SCROLL_V3__) return;
  window.__JPT_PARTNER_SCROLL_V3__ = true;

  const tracked = new WeakMap();
  const recentUserScroll = new WeakMap();
  let restoreUntil = 0;

  function isScrollable(el) {
    if (!el || el === document) return false;
    const s = getComputedStyle(el);
    const oy = s.overflowY;
    const ox = s.overflowX;
    return (/(auto|scroll|overlay)/.test(oy) && el.scrollHeight > el.clientHeight + 2) ||
           (/(auto|scroll|overlay)/.test(ox) && el.scrollWidth > el.clientWidth + 2);
  }

  function addTracker(el) {
    if (!el || tracked.has(el)) return;

    const state = {
      top: el === window ? (window.scrollY || 0) : el.scrollTop,
      left: el === window ? (window.scrollX || 0) : el.scrollLeft
    };

    const onScroll = function () {
      // During the short restore window, don't overwrite the user's last
      // intentional position with the programmatic reset.
      if (Date.now() < restoreUntil) return;
      state.top = el === window ? (window.scrollY || 0) : el.scrollTop;
      state.left = el === window ? (window.scrollX || 0) : el.scrollLeft;
      recentUserScroll.set(el, Date.now());
    };

    if (el === window) window.addEventListener("scroll", onScroll, {passive:true});
    else el.addEventListener("scroll", onScroll, {passive:true});

    tracked.set(el, state);
  }

  function discover() {
    addTracker(window);
    addTracker(document.scrollingElement);
    addTracker(document.documentElement);
    addTracker(document.body);

    document.querySelectorAll("*").forEach(function (el) {
      if (isScrollable(el)) addTracker(el);
    });
  }

  function restoreAll() {
    restoreUntil = Date.now() + 500;

    tracked.forEach; // harmless marker for older engines

    // WeakMap cannot be iterated, so collect tracked elements separately.
  }

  const elements = [];
  const originalAddTracker = addTracker;
  function track(el) {
    if (!el || tracked.has(el)) return;
    const state = {
      top: el === window ? (window.scrollY || 0) : el.scrollTop,
      left: el === window ? (window.scrollX || 0) : el.scrollLeft
    };
    const onScroll = function () {
      if (Date.now() < restoreUntil) return;
      state.top = el === window ? (window.scrollY || 0) : el.scrollTop;
      state.left = el === window ? (window.scrollX || 0) : el.scrollLeft;
      recentUserScroll.set(el, Date.now());
    };
    if (el === window) window.addEventListener("scroll", onScroll, {passive:true});
    else el.addEventListener("scroll", onScroll, {passive:true});
    tracked.set(el, state);
    elements.push(el);
  }

  function scan() {
    track(window);
    track(document.scrollingElement);
    track(document.documentElement);
    track(document.body);
    document.querySelectorAll("*").forEach(function (el) {
      if (isScrollable(el)) track(el);
    });
  }

  function restore() {
    restoreUntil = Date.now() + 600;

    elements.forEach(function (el) {
      const state = tracked.get(el);
      if (!state) return;

      try {
        if (el === window) {
          window.scrollTo(state.left, state.top);
        } else {
          el.scrollLeft = state.left;
          el.scrollTop = state.top;
        }
      } catch (e) {}
    });

    requestAnimationFrame(function () {
      elements.forEach(function (el) {
        const state = tracked.get(el);
        if (!state) return;
        try {
          if (el === window) window.scrollTo(state.left, state.top);
          else {
            el.scrollLeft = state.left;
            el.scrollTop = state.top;
          }
        } catch (e) {}
      });
    });
  }

  scan();

  const observer = new MutationObserver(function (mutations) {
    let orderChanged = false;

    for (const m of mutations) {
      const t = m.target;
      if (!t) continue;

      if (
        t.id === "ordersList" ||
        (t.closest && t.closest("#ordersList"))
      ) {
        orderChanged = true;
        break;
      }
    }

    if (orderChanged) {
      scan();
      restore();
      setTimeout(restore, 50);
      setTimeout(restore, 180);
      setTimeout(restore, 400);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Capture the position immediately before common action clicks.
  document.addEventListener("click", function (e) {
    const btn = e.target && e.target.closest ? e.target.closest("button") : null;
    if (!btn) return;

    const text = String(btn.textContent || "").trim().toUpperCase();
    if (
      text === "READY" ||
      text === "ACCEPT" ||
      text === "START PREPARING" ||
      text === "PREPARING" ||
      text === "REJECT"
    ) {
      scan();
      elements.forEach(function (el) {
        const state = tracked.get(el);
        if (!state) return;
        state.top = el === window ? (window.scrollY || 0) : el.scrollTop;
        state.left = el === window ? (window.scrollX || 0) : el.scrollLeft;
      });
      restoreUntil = Date.now() + 1500;
    }
  }, true);

  console.log("[JPT V106] Partner scroll stability V3 active");
})();
