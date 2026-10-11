# JPT Safe Staging Handoff — 12 Oct 2026

## Safety boundary
- Work is isolated on branch `jpt-customer-tracking-screen-safe-20261012`.
- Production `main` was not modified.
- No Supabase schema, RLS policy, order insert, order status, realtime order listener, or ringtone files were changed.
- Do not merge/deploy until browser/device testing passes.

## Customer tracking screen
- `index.html` now loads `customer-order-tracking-v106-v2.js?v=20261012-screen1`.
- `index.html` loads `jpt-customer-tracking-media-v1.js?v=20261012-media1` after the tracking bridge.
- Tracking bridge uses existing `jpt:order-placed` event and existing `get_customer_order` RPC.
- Outlet top media now accepts existing legacy `customer_outlet_showcase/FIRST` campaigns and the existing `jpt-outlet-media-v1` controller's `top` placement.
- Top media rotates image items after ~11 seconds; videos advance on ended and include a sound toggle.
- Lower tracking media reads existing `campaigns` records written by `jpt-outlet-media-v1`, filters the outlet's `lower` placement, displays up to five items, rotates images after ~11 seconds and advances videos when ended. Video sound follows `schedule_json.muted`.

## Partner media manager
- `jpt-outlet-media-controller-v1.js` staging copy now includes JPT-001 and says Five-Outlet; the existing main file remains untouched.

## Delivery Partner staging
- New `delivery-partner-app-v13-staging.html` copied from `delivery-partner-app-no-otp-v12.html`.
- Added Home navigation, WhatsApp Support, and corrected icon filenames to existing `jpt-delivery-partner-icon-192.png` and `jpt-delivery-partner-icon-512.png`.
- Added `delivery-partner-v13-staging.webmanifest` with staging start_url.
- Order/assignment lifecycle handlers were copied without intended logic changes.

## Manual test checklist before promotion
1. Open the staging customer app from the branch deployment or a local test server; verify no JS console errors.
2. Place a test order only in a test environment. Confirm the tracking screen opens from the current `jpt:order-placed` event and shows the correct outlet/order number.
3. Verify top banner uses only the selected outlet's active top media and rotates correctly.
4. Verify lower media uses only the selected outlet's active lower media; test 1–5 images/videos, mute setting, video ended, missing media, and slow network.
5. Verify WhatsApp help uses the expected business number; confirm the manager has access to that WhatsApp inbox.
6. Open the V13 delivery staging page. Check icons/manifest, Home navigation, online/offline, offer accept/reject, pickup, out-for-delivery and delivered in a test backend.
7. Confirm no changes to production `main`; only after these pass should a reviewed PR be considered.
8. After screen and Delivery Partner staging are accepted, start the separately scoped order-flow recovery audit.

## Known limitations / not yet verified
- This work has been statically checked through GitHub file reads and branch comparison, not run in a real browser/device or against a live test Supabase project.
- Customer map/rider coordinates, assignment RPC responses, actual media storage URLs, and manager permissions still need end-to-end verification.
- The lower media layer uses existing campaign records with `schedule_json.controller=jpt-outlet-media-v1` and `placement=lower`; no new database columns or policies were added.
