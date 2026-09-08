/* JPT V106 Referral Module
   Isolated frontend module. Does NOT replace Customer Core/cart/payment logic.
   Backend RPCs expected:
   - jpt_referral_code(p_phone text)
   - jpt_referral_status(p_phone text, p_outlet_id text)
*/
(function () {
  "use strict";

  const SUPABASE_URL = "https://qrkbhrmxejtpvheplath.supabase.co";
  const SUPABASE_KEY =
    window.JPT_SUPABASE_PUBLISHABLE_KEY ||
    window.SUPABASE_ANON_KEY ||
    "";

  let client = null;
  let lastPhone = "";

  function $(id) {
    return document.getElementById(id);
  }

  function getOutletId() {
    try {
      return (
        window.JPT_OUTLET_ID ||
        localStorage.getItem("jpt_outlet_id") ||
        "JPT-001"
      );
    } catch (_) {
      return "JPT-001";
    }
  }

  function toast(message) {
    if (typeof window.toast === "function") {
      window.toast(message);
      return;
    }
    const el = document.createElement("div");
    el.textContent = message;
    el.style.cssText =
      "position:fixed;left:50%;bottom:25px;transform:translateX(-50%);" +
      "z-index:99999;padding:10px 14px;border-radius:10px;" +
      "background:#111;color:#fff;font-size:13px;";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  async function getClient() {
    if (client) return client;

    if (!SUPABASE_KEY || !window.supabase?.createClient) {
      throw new Error("Supabase client unavailable");
    }

    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return client;
  }

  async function rpc(name, args) {
    const sb = await getClient();
    const result = await sb.rpc(name, args);
    if (result.error) throw result.error;
    return result.data;
  }

  function captureIncomingReferral() {
    try {
      const ref = new URLSearchParams(location.search).get("ref");
      if (ref && ref.trim()) {
        const code = ref.trim();
        localStorage.setItem("JPT_REFERRAL_CODE", code);
        window.JPT_REFERRAL_CODE = code;
      } else {
        window.JPT_REFERRAL_CODE =
          localStorage.getItem("JPT_REFERRAL_CODE") || "";
      }
    } catch (_) {
      window.JPT_REFERRAL_CODE = "";
    }
  }

  async function refreshStatus() {
    const phoneInput = $("refPhone");
    const statusBox = $("refStatus");

    if (!statusBox) return;

    const phone = String(
      phoneInput?.value ||
        lastPhone ||
        $("phone")?.value ||
        ""
    ).replace(/\D/g, "");

    if (phone.length !== 10) {
      statusBox.textContent =
        "Enter your 10-digit mobile number to see referral progress.";
      return;
    }

    lastPhone = phone;

    try {
      const data = await rpc("jpt_referral_status", {
        p_phone: phone,
        p_outlet_id: getOutletId()
      });

      const row = Array.isArray(data) ? data[0] : data;

      if (!row) {
        statusBox.textContent = "Referral status unavailable.";
        return;
      }

      const count = Number(row.successful_count || 0);
      const rewardReady = !!row.reward_ready;
      const minOrder = Number(row.eligible_min || 180);

      statusBox.innerHTML =
        "<b>" +
        count +
        "/10 successful referrals</b><br>" +
        (rewardReady
          ? "🎉 Reward ready! Your FREE Chole Bhature will be added automatically on your next eligible order (₹" +
            minOrder +
            "+)."
          : "Share your referral link with friends. Each new referred customer who places a successful order counts toward your reward.");

      const code = row.referral_code || "";
      if (code) {
        const link =
          location.origin +
          location.pathname +
          "?ref=" +
          encodeURIComponent(code);

        const linkBox = $("refLink");
        const shareButton = $("refShare");

        if (linkBox) linkBox.value = link;
        if (shareButton) shareButton.dataset.link = link;
      }
    } catch (_) {
      statusBox.textContent =
        "Referral status could not be loaded right now.";
    }
  }

  async function getReferralLink() {
    const phone = String(
      $("refPhone")?.value ||
        $("phone")?.value ||
        ""
    ).replace(/\D/g, "");

    if (phone.length !== 10) {
      toast("Enter a valid 10-digit mobile number");
      return;
    }

    try {
      const code = await rpc("jpt_referral_code", {
        p_phone: phone
      });

      if (!code) throw new Error("No referral code returned");

      const link =
        location.origin +
        location.pathname +
        "?ref=" +
        encodeURIComponent(code);

      localStorage.setItem("JPT_REFERRAL_CODE", code);
      window.JPT_REFERRAL_CODE = code;
      lastPhone = phone;

      const linkBox = $("refLink");
      if (linkBox) linkBox.value = link;

      if (navigator.share) {
        try {
          await navigator.share({
            title: "Jeet Punjabi Tadka",
            text: "Order from Jeet Punjabi Tadka using my referral link:",
            url: link
          });
        } catch (_) {}
      } else {
        try {
          await navigator.clipboard.writeText(link);
          toast("Referral link copied. Share it with your friends.");
        } catch (_) {
          toast("Your referral link is ready to share.");
        }
      }

      await refreshStatus();
    } catch (_) {
      toast("Referral link could not be created right now");
    }
  }

  async function shareReferralLink() {
    const link =
      $("refShare")?.dataset.link ||
      $("refLink")?.value ||
      "";

    if (!link) {
      await getReferralLink();
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Jeet Punjabi Tadka",
          text: "Order from Jeet Punjabi Tadka using my referral link:",
          url: link
        });
        return;
      } catch (_) {}
    }

    try {
      await navigator.clipboard.writeText(link);
      toast("Referral link copied. Share it with your friends.");
    } catch (_) {
      location.href =
        "https://wa.me/?text=" +
        encodeURIComponent("Order from Jeet Punjabi Tadka: " + link);
    }
  }

  function mount() {
    if ($("jptReferralBox")) return;

    const anchor = $("homeOfferBar");
    if (!anchor || !anchor.parentNode) return;

    const box = document.createElement("section");
    box.id = "jptReferralBox";
    box.className = "royalOfferBar";

    box.innerHTML =
      '<div class="offerTitle">👥 Refer 10 Friends — Earn 1 FREE Chole Bhature</div>' +
      '<small>10 different referred customers must place successful orders. Reward applies automatically to your next eligible order of ₹180+.</small>' +
      '<input id="refPhone" class="input" inputmode="tel" maxlength="10" placeholder="Your 10-digit mobile" style="margin-top:9px">' +
      '<button id="refGet" type="button" class="pay" style="margin-top:8px">🔗 Get My Referral Link</button>' +
      '<input id="refLink" class="input" readonly placeholder="Your referral link" style="margin-top:8px">' +
      '<button id="refShare" type="button" class="pay" style="margin-top:8px">📤 Share Referral Link</button>' +
      '<div id="refStatus" style="font-size:12px;color:#ddd;margin-top:9px">Enter your mobile number to see referral progress.</div>';

    anchor.parentNode.insertBefore(box, anchor.nextSibling);

    $("refGet").addEventListener("click", getReferralLink);
    $("refShare").addEventListener("click", shareReferralLink);
    $("refPhone").addEventListener("input", refreshStatus);

    refreshStatus();
  }

  captureIncomingReferral();

  window.JPT_REFERRAL_REFRESH = refreshStatus;
  window.JPT_REFERRAL_CREATE = getReferralLink;
  window.JPT_REFERRAL_CODE =
    window.JPT_REFERRAL_CODE ||
    localStorage.getItem("JPT_REFERRAL_CODE") ||
    "";

  let attempts = 0;
  const timer = setInterval(() => {
    mount();
    attempts += 1;

    if ($("jptReferralBox") || attempts > 40) {
      clearInterval(timer);
    }
  }, 500);
})();
