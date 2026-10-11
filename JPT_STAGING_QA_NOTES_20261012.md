# JPT Staging QA Notes — 12 Oct 2026

## Scope checked
- Branch: `jpt-customer-tracking-screen-safe-20261012`
- Customer tracking media bridge: `customer-order-tracking-v106-v2.js`
- Tracking lower media carousel: `jpt-customer-tracking-media-v1.js`
- Customer home sponsor slider: `jpt-customer-sponsor-slider-v1.js`
- Isolated Delivery Partner V13 staging copy: `delivery-partner-app-v13-staging.html`

## Completed in this pass
- Corrected a stale header comment in `jpt-customer-tracking-media-v1.js`: it reads `public.campaigns`, not `checkout_sponsor_ads`. This was comment-only; no runtime behavior changed.
- Confirmed the tracking bridge maps all five outlet codes to their own welcome-banner asset as a fallback when no eligible campaign or outlet banner is present.
- Confirmed the lower tracking carousel is outlet-scoped and filters for active campaigns whose `schedule_json.controller` is `jpt-outlet-media-v1` and `placement` is `lower`.
- Reviewed Delivery Partner V13 staging sections and identified its existing flow boundaries: verification/onboarding, delivery offer response, assignment snapshot, pickup/out-for-delivery/delivered transitions, and GPS location flow remain in the staging copy. These handlers were not modified in this pass.
- Updated only the Delivery Partner V13 staging navigation presentation: the header control now reflects HOME/BACK according to the selected section; bottom navigation marks the active section and includes navigation semantics; bottom navigation respects the device safe-area inset and uses equal-width buttons. The `show(id)` navigation helper was the only app JavaScript function changed in this pass; order assignment, status RPCs, GPS, polling, and audio functions were not edited.
- Improved only Delivery Partner V13 offer/current-delivery presentation: the offer card has an explicit ACTION REQUIRED label, clearer ACCEPT OFFER/REJECT OFFER button labels, a more readable stacked details panel, and a polite live region; current status and GPS status have accessible live-region semantics, and action buttons have a 44px minimum height. This pass changed HTML/CSS markup only; offer response, assignment lifecycle, polling, GPS, and audio functions were not modified.
- Added a dedicated customer-address panel to the current delivery card, using address fields returned by the existing assignment snapshot when present. Updated the staging Maps button to use the supplied customer/delivery address and show a clear message when no address is available, rather than silently opening a generic Bidar destination. No database query, status transition, GPS, or audio logic was changed.
- Fixed stale Delivery Partner UI handling in staging: an empty offer snapshot now clears the previous offer and stops its offer ringtone; an empty active-assignment snapshot hides the current-delivery card, resets its display, and stops location tracking for the previous assignment. The previous assignment is retained long enough for the existing stop-location RPC to receive its ID before local state is cleared. Assignment selection from array snapshots is restricted to accepted/picked-up/out-for-delivery statuses. These changes are in the isolated V13 staging copy only; no RPC definitions or production code were changed.
- Strengthened staging delivery-status synchronization: after the existing `delivery_assignment_status` RPC succeeds, the UI no longer assumes the requested next status is already authoritative when the RPC response omits a status field. It reloads `delivery_partner_assignment_snapshot` and renders the server snapshot, with explicit syncing/current-status feedback. The status RPC contract remains unchanged; live backend timing still needs device testing.
- Added a staging-only guard for delivery status transitions: rapid repeated taps on PICK UP / OUT FOR DELIVERY / MARK DELIVERED are ignored while the existing `delivery_assignment_status` RPC is in flight; the button is temporarily disabled, the UI shows progress, server-returned status remains authoritative when provided, and RPC failures show an inline retry message. The RPC name and argument contract are unchanged. Device/live testing is still pending.
- Fixed a staging-only stale-offer race in the Accept/Reject UI: if polling replaces or clears the displayed offer while a response RPC is in flight, the `finally` cleanup now always releases the button-busy state; it preserves the inline retry message only when the same offer remains visible. RPC name/arguments and assignment lifecycle are unchanged.
- Added in-flight feedback for staging Delivery Partner Accept/Reject actions: both buttons disable during the existing response RPC, the card shows SENDING/Accepting/Rejecting feedback, and a failed response leaves the offer visible with an inline retry message. The RPC name and argument contract are unchanged; this is not a live-device test.
- Added isolated sponsor-slider media error handling: if an image/video fails to load, the slider advances after a short delay when another item exists; with a single broken item, the sponsor surface hides instead of remaining blank. This is limited to the staging branch.
- Added a customer tracking celebration overlay for the `accepted` and `delivered` order status transitions: animated multicolour/gold ribbons, thumbs-up/celebration icon, outlet-specific copy, order number, and a delivery-complete help option. It is deduplicated per order/status in local storage and does not change the order state or write feedback to the database. The customer's explicit `I RECEIVED MY ORDER` confirmation also triggers the delivered celebration after the existing RPC succeeds.

## Important verification limits
- This was a source review only. No browser/device execution or live end-to-end order was performed.
- Raw GitHub SVG fetch/rendering and outlet-switch behavior still require a real browser/device check.
- Delivery Partner GPS permissions, anonymous-session/RPC authorization, push registration, and assignment lifecycle still require a controlled test account/device.
- Do not infer that inactive outlets are launch-ready: existing outlet statuses were intentionally left unchanged.

## Safety boundaries
- No changes to production `main`, order-write/checkout flow, production order lifecycle, service workers, or ringtone/audio engine.
- No database schema or RLS changes.
- Do not merge or deploy this staging branch without explicit approval and successful controlled testing.
