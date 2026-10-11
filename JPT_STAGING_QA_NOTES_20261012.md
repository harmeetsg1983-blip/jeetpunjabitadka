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
- Added a staging-only latest-request guard to `loadActive()`: if overlapping polling/realtime snapshot requests finish out of order, older responses are ignored so they cannot overwrite a newer assignment snapshot. RPC name/arguments and the assignment lifecycle remain unchanged; concurrency behavior still needs controlled live testing.
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

## 2026-10-12 — GPS callbacks bound to assignment identity
- Updated only `delivery-partner-app-v13-staging.html`.
- One-shot location upload now captures the assignment ID before the browser geolocation callback resolves, so a delayed callback cannot write a location against whichever assignment happens to be current later.
- Continuous watch callbacks capture the same assignment ID and only update the GPS status label if that assignment is still selected.
- When the active assignment changes, the old location watch/sharing is stopped before `current` is replaced; the new assignment can then start its own watch.
- Existing RPC names/arguments, order-state lifecycle, and ringtone/audio functions were not changed.
- Source-level checks passed: captured ID in one-shot upload; captured ID in watch upload; stale GPS UI writes suppressed; old watch stopped before assignment switch; order RPC names retained; ringtone constants retained.
- Not yet verified on a real device/browser or against live GPS permissions, database policies, or physical assignment transitions. Staging only; no production deployment.

## Controlled device test matrix — pending (do not claim passed)
1. With test assignment A active and location permission granted, confirm the GPS label changes from acquiring to shared/error and that the location RPC receives assignment A's ID.
2. Switch the test rider to assignment B while a location callback for A is delayed; confirm the delayed callback never updates B's GPS label and never submits B's ID for A's captured coordinates.
3. Confirm A's location watch is cleared and stop-sharing is requested for A before B becomes current; then confirm a new watch is created for B.
4. Deny location permission; confirm a readable permission/location-unavailable message appears and the screen remains responsive.
5. Temporarily simulate an RPC failure; confirm the GPS label reports the error, and order Accept/Ready transitions and ringtone behavior remain unchanged.
6. Repeat on a real Android device after a reload. Record browser/OS, assignment IDs (test IDs only), and outcomes before any deployment decision.

These are pending test instructions only; no live assignment, database, or physical-device result is implied.

## 2026-10-12 — Ignore stale GPS positions before RPC
- One-shot geolocation now checks that the originally captured assignment is still current before calling `delivery_partner_record_location`; otherwise it resolves false and exits.
- Continuous watch callbacks perform the same assignment-identity check before making the location RPC, so an already-queued callback from a cleared watch is dropped.
- Source checks passed: stale one-shot position dropped; stale watch position dropped before RPC; location RPC contract unchanged; order lifecycle and ringtone constants retained.
- This is source-level verification only. Device/browser and backend behavior remain untested; staging only.

## 2026-10-12 — More actionable GPS failure messages
- Added a small error-to-message helper for browser geolocation errors: permission denied, position unavailable, and timeout now display separate instructions in the GPS status label.
- Applied it to both one-shot location acquisition and continuous watch error callbacks.
- Source checks passed: all three error codes mapped; stale-assignment callback guard remains; `delivery_partner_record_location` RPC argument contract unchanged.
- Browser/device permission prompts and actual timeout behavior still require controlled Android testing. Staging only.

## 2026-10-12 — Active assignment refresh error recovery
- If `delivery_partner_assignment_snapshot` returns an error, the staging UI now shows a visible message in the existing status-action area instead of silently leaving the last state without explanation.
- The last known assignment is intentionally preserved on refresh failure; the app does not guess that the assignment ended. The next scheduled/manual refresh can retry, and a successful snapshot clears the warning.
- Source checks passed: warning is set on snapshot error; warning clears after a successful response; request-sequence guard remains; existing assignment/response RPC names and GPS/ringtone functions remain present.
- Source-level verification only. Polling cadence, live RPC failures and Android UI behavior require controlled device/backend tests. Staging only; no production deployment.

## 2026-10-12 — Handle thrown/network errors during active refresh
- Wrapped the active-assignment snapshot flow in `try/catch`, so rejected promises/network exceptions are handled like returned RPC errors and show the same visible recovery message.
- Kept the request sequence guard in both the success and catch paths, preventing a stale failed request from overwriting a newer result's message.
- On failure the last known assignment remains visible; the UI does not infer that the assignment ended.
- Source checks passed: thrown error handling, stale request suppression, recovery message, existing snapshot RPC and order/location RPC names retained.
- No browser/network simulation or device test performed. Staging only.

## 2026-10-12 — Ignore out-of-order offer snapshots
- Added an independent monotonically increasing request counter to `loadOffer()`. If overlapping offer snapshot calls return out of order, only the newest response may update the offer card or trigger/stop the offer ringtone.
- Stale failures are also ignored so an older request cannot log misleading errors after a newer result has arrived.
- Existing `delivery_partner_offer_snapshot` and `delivery_assignment_respond` RPC contracts are unchanged; the existing ringtone transition logic remains unchanged.
- Source checks passed: request counter, stale success suppression, stale error suppression, RPC names and ringtone logic retained.
- This is source-level verification only. Real Realtime/polling races and ringtone behavior require controlled browser/device testing. Staging only.

## 2026-10-12 — Do not report status synced when refresh failed
- Found a UI truthfulness issue in the staging delivery status handler: after the status RPC succeeded, `loadActive()` could catch a refresh failure internally, return no result, and the caller would still report the old current status as synced.
- `loadActive()` now returns an explicit boolean for current snapshot success/failure (including stale requests); the status handler checks it and reports that confirmation is unverified if refresh fails.
- No status transition RPC names/arguments were changed. Existing offer response/location RPCs and ringtone constants remain present.
- Source checks passed: explicit refresh result, status handler checks result, no false synced message on failed refresh, existing lifecycle RPC retained.
- This closes a source-level false-confirmation path only; real RPC outcomes and Android behavior still require controlled testing. Staging only.


## 2026-10-12 — Mobile overflow hardening and lifecycle preservation audit
- Targeted the delivery partner V13 staging UI only: constrained the main content to viewport width, allowed flex-row children to shrink/wrap long identifiers and address text, and constrained button widths with safe text wrapping. This is intended to reduce accidental horizontal overflow on narrow phones without changing layout sections or workflow handlers.
- Post-commit source checks passed: main width guard; flex child shrink/wrapping; button width/wrapping; Accept and Reject handlers remain; delivery status and offer snapshot RPC calls remain unchanged; both ringtone asset constants remain; failed confirmation refresh still cannot report a synced status.
- Static source inspection only: horizontal scrolling must still be checked on a narrow Android viewport with long outlet/order/address values. No live backend or device test was run. Staging only; no production deployment.


## 2026-10-12 — Prevent staging from registering the production delivery service worker
- Audit found the V13 staging HTML registered `delivery-partner-sw.js`, whose shell and notification-click targets reference the non-staging `delivery-partner-app.html`. To avoid staging tests installing/updating a worker with production app paths, removed that registration from the staging HTML only and removed the push-subscription helper script from this staging page.
- Added an explicit staging notice: foreground offer alerts only; push notifications and service-worker installation are disabled until an isolated staging worker is reviewed. Foreground Accept/Reject, offer ringtone functions, delivery status RPC and refresh-confirmation guard remain in the page.
- Post-change source checks passed: production worker not registered by this staging page; push helper not loaded; notice present; foreground offer handlers/ringtone functions retained; delivery status RPC and failed-refresh guard retained; mobile layout guards retained.
- This is a staging isolation safeguard, not a production change. Browser storage may already contain an older service worker from a prior visit; this edit does not unregister existing workers. Verify staging in a clean browser profile/device before any E2E test. Push notification behavior is deliberately not covered by this staging build.


## 2026-10-12 — Shared-origin service-worker risk: test-environment gate
- Follow-up audit confirms the staging HTML no longer registers the production worker, and its manifest start URL/ID correctly point to `delivery-partner-app-v13-staging.html`.
- Important limitation: this staging URL shares the same GitHub Pages origin and repository-root path scope as the existing `delivery-partner-sw.js`. That worker's scope is `./`, its shell includes `delivery-partner-app.html`, and its fetch handler cache-first checks same-origin GET requests and caches other same-origin GET responses. Therefore, a browser profile that already has the production worker installed may still have staging navigation intercepted/controlled by that worker even though the staging page itself does not register it.
- Safety gate: do not validate the staging app from the installed production PWA or a browser profile that has this site's worker installed. Use a clean browser profile/device with no existing service worker for this origin, and verify the page is not controlled by a service worker before exercising test assignments. If isolation cannot be established, stop; do not unregister the worker on a normal production profile because that could affect the live app.
- Manifest static checks passed (staging manifest linked; staging start_url and id correct). Worker-scope audit confirms the shared-origin risk described above. No production worker, manifest, app, backend, or database was modified. Device/browser verification remains pending.


## 2026-10-12 — Runtime warning for an already-installed service worker
- Added a staging-only runtime guard that checks `navigator.serviceWorker.controller` on load and on `controllerchange`. If the staging page is controlled by an existing worker, it reveals an assertive safety warning, hides the staging install CTA, and blocks the install prompt with an explanation.
- This guard detects an existing controller; it does not unregister it or attempt to change production browser state. The staging page still does not register the production worker and does not load the push-subscription helper.
- Post-change source checks passed: warning markup, controller detection, warning visibility toggle, install CTA hide/block, controller-change recheck, no production worker registration, delivery status RPC retained, foreground ringtone functions retained.
- Limitation: source checks do not prove behavior in a browser. Clean-profile device validation and real order/GPS tests remain pending; do not install or test from a profile showing the warning.
