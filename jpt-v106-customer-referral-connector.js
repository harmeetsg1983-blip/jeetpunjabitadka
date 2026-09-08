/* JPT V106 Customer Referral Connector
   Loads the already-committed referral-v106.js module and safely carries
   ?ref=... through the native Supabase orders INSERT without replacing
   Customer Core/cart/payment/placeOrder code.
*/
(function () {
  "use strict";

  const REFERRAL_SCRIPT = "./referral-v106.js";
  const SUPABASE_REST = "/rest/v1/orders";

  function currentReferralCode() {
    try {
      return (
        window.JPT_REFERRAL_CODE ||
        localStorage.getItem("JPT_REFERRAL_CODE") ||
        ""
      ).trim();
    } catch (_) {
      return "";
    }
  }

  function isOrdersInsert(url, init) {
    try {
      const method = String(init?.method || "GET").toUpperCase();
      if (method !== "POST") return false;
      const u = new URL(String(url), location.href);
      return u.pathname.endsWith(SUPABASE_REST);
    } catch (_) {
      return false;
    }
  }

  function installFetchBridge() {
    if (window.__JPT_V106_REFERRAL_FETCH_BRIDGE__) return;
    if (typeof window.fetch !== "function") return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async function (input, init) {
      if (!isOrdersInsert(input, init)) {
        return originalFetch(input, init);
      }

      const code = currentReferralCode();
      if (!code || !init?.body) {
        return originalFetch(input, init);
      }

      try {
        const raw = typeof init.body === "string" ? init.body : null;
        if (!raw) return originalFetch(input, init);

        const parsed = JSON.parse(raw);
        let changed = false;

        const patchRow = (row) => {
          if (!row || typeof row !== "object" || Array.isArray(row)) return;
          if (!Object.prototype.hasOwnProperty.call(row, "referral_code")) {
            row.referral_code = code;
            changed = true;
          }
        };

        if (Array.isArray(parsed)) parsed.forEach(patchRow);
        else patchRow(parsed);

        if (!changed) return originalFetch(input, init);

        const nextInit = Object.assign({}, init, {
          body: JSON.stringify(parsed)
        });

        return originalFetch(input, nextInit);
      } catch (_) {
        // Never block a normal order because of the referral bridge.
        return originalFetch(input, init);
      }
    };

    window.__JPT_V106_REFERRAL_FETCH_BRIDGE__ = true;
  }

  function loadReferralModule() {
    if (document.querySelector('script[data-jpt-referral-loader="v106"]')) {
      return;
    }

    const s = document.createElement("script");
    s.src = REFERRAL_SCRIPT;
    s.async = false;
    s.dataset.jptReferralLoader = "v106";
    document.head.appendChild(s);
  }

  // Install the order bridge immediately, then load the UI/status module.
  installFetchBridge();
  loadReferralModule();
})();
