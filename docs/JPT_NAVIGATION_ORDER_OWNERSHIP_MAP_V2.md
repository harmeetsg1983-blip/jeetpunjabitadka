# JPT Navigation + Order Ownership Map V2

## Verified script order in admin.html
1. jpt-master-ui-layer-v5.js
2. visual/refinement layers
3. jpt-sponsor-manager-v2.js
4. jpt-sponsor-media-manager-v4.js
5. jpt-banner-control-center-v4.js
6. jpt-partner-final-touch-v10.js
7. jpt-partner-final-touch-v11.js
8. jpt-partner-final-touch-v12.js
9. jpt-partner-orders-ui-v1.js
10. jpt-partner-timing-manager-v1.js
11. jpt-partner-delivery-tracking-v2.js
12. jpt-partner-order-alert-v4.js

## Confirmed navigation conflict
- master-ui-v5 creates #jptMasterTopNav and #jptMasterBottomNav and delegates navigation to showPanel().
- final-touch-v10 later wraps window.showPanel().
- The V10 wrapper treats "home" specially by hiding all .panel elements and showing its own visual root.
- final-touch-v12 removes older visual bottom-navigation elements and maintains jptV10Bottom.
- Therefore multiple navigation owners coexist, while showPanel remains the shared command path.

## Confirmed order rendering conflict
- admin.html owns the original #orders panel and core orderAction/loadOrders functions.
- orders-ui-v1 hides the original .tablewrap and renders #jptOrdersOpsV1.
- delivery-tracking-v2 injects its UI into #jptOrdersOpsV1.
- order-alert-v4 adds a separate alert lifecycle around the existing order alarm.
- Therefore the data/action backend is one foundation, but the visible Orders surface and alert presentation have multiple owners.

## Safe implementation boundary
Do not replace showPanel(), orderAction(), Supabase calls, realtime subscriptions, or the existing order data model.

The next implementation should introduce one explicit command boundary for:
- navigation state
- active visual root
- Orders visual root
- order alert presentation

Existing business functions remain the source of truth.

## Runtime verification required
Before promoting anything to main:
- Home -> Orders -> Home
- Orders -> Menu -> Orders
- mobile 5-button navigation
- outlet switch while Orders is open
- new order alert
- Accept/Reject/Preparing/Ready/Out for Delivery/Completed
- refresh/polling and realtime
- Delivery Tracking injection
- back/navigation behavior

No GREEN claim until these are runtime-tested.


## Media + Settings ownership checkpoint — 30 Sep 2026
- admin.html still loads legacy writers alongside the controlled Banner Control V4: jpt-outlet-media-controller-v1.js, jpt-sponsor-manager-v2.js, jpt-sponsor-media-manager-v4.js, and jpt-banner-control-center-v4.js.
- Banner Control V4 explicitly hides the legacy Sponsor Manager V2 and Sponsor Media Manager V4 DOM owners; their files remain retained for rollback and historical data dependency audit.
- jpt-outlet-media-controller-v1 cannot yet be removed because current customer index.html still reads its records for the existing #heroTrack surface. The canonical #videoBanner reader separately rejects controller=jpt-outlet-media-v1 records.
- Customer media surfaces remain distinct: #heroTrack (legacy outlet-media surface), #videoBanner (media-hotfix-v4 canonical Home Hero), and #highlightGrid (controlled customer outlet showcase).
- No deletion, disablement, schema/RLS change, or customer order/menu change is authorized from this checkpoint.
- Safe next boundary: runtime-test the three customer media surfaces and Banner V4 E2E, then define migration/retirement of legacy writers only after their stored records and readers are proven non-dependent.


## Settings injector ownership checkpoint — 01 Oct 2026
- `admin.html` loads multiple Settings-related modules in sequence; the `#settings` element is a shared host, not a single feature owner.
- Central Owner gated media managers: Sponsor Manager V2 and Sponsor Media Manager V4 mount into Settings only after the existing `partner_access_is_central_owner` check.
- Banner Control Center V4 is the controlled visual owner for the outlet-banner surface and explicitly hides the legacy Sponsor Manager V2, Sponsor Media Manager V4, and Outlet Media V1 DOM owners when it mounts.
- Restaurant Partner Onboarding UI V2 remains a separate functional module with its own Central Owner check and approval/application workflow; it must not be hidden merely because media ownership is consolidated.
- Partner Timing Manager V1 remains a separate Settings functional module and writes timing settings for the active outlet; it must retain its own ownership until its backend contract is independently audited.
- Campaign Media Layer V4 is a separate campaign/creative workflow and is not equivalent to the outlet-banner control surface.
- Therefore a future Settings Hub should become a navigation/ownership shell over these verified functional modules, not a second implementation of their business logic. No existing module is authorized for deletion from this checkpoint.


## Sponsor Slot 1/2 persistence checkpoint — 01 Oct 2026
- Source audit found the active Banner Control Center V4 had collapsed sponsor persistence to Slot 1: its UI exposed no slot selector, every save wrote `schedule_json.slot=1`, and it deactivated all active rows in the table.
- This conflicted with the existing customer tracking runtime, which explicitly reads Slot 1 and Slot 2 separately from `checkout_sponsor_ads.schedule_json.slot`.
- Controlled fix: Banner Control Center V4 now exposes Slot 1/Slot 2, loads the selected slot's saved record, deactivates only the selected slot when replacing it, and persists the selected slot in `schedule_json`.
- No schema, RLS, Customer App ordering, or delivery/order business logic changed.
- Commit: `83f62ed30eae8d4429f91e4dea29153245e779b9`.
- Runtime persistence test remains required before GREEN: save Slot 1 + Slot 2, reopen Settings, verify both records and customer rendering, toggle/delete each independently, and verify outlet targeting/schedule behavior.
