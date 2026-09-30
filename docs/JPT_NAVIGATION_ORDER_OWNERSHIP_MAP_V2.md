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
