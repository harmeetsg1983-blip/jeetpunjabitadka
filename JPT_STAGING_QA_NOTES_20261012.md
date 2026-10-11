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
- Added isolated sponsor-slider media error handling: if an image/video fails to load, the slider advances after a short delay when another item exists; with a single broken item, the sponsor surface hides instead of remaining blank. This is limited to the staging branch.

## Important verification limits
- This was a source review only. No browser/device execution or live end-to-end order was performed.
- Raw GitHub SVG fetch/rendering and outlet-switch behavior still require a real browser/device check.
- Delivery Partner GPS permissions, anonymous-session/RPC authorization, push registration, and assignment lifecycle still require a controlled test account/device.
- Do not infer that inactive outlets are launch-ready: existing outlet statuses were intentionally left unchanged.

## Safety boundaries
- No changes to production `main`, order-write/checkout flow, production order lifecycle, service workers, or ringtone/audio engine.
- No database schema or RLS changes.
- Do not merge or deploy this staging branch without explicit approval and successful controlled testing.
