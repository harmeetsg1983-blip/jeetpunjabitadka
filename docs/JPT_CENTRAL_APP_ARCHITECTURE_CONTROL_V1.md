# JPT Central App Architecture Control — V1

Status: AUDIT BASELINE ONLY
Branch: jpt-central-app-architecture-v1
Date: 2026-09-30

## Purpose
Create a safe architecture checkpoint before changing the live Partner Dashboard. This document records verified ownership findings from main.

## Verified active core
- admin.html is the active Partner Dashboard source.
- Core order persistence/action logic remains in admin.html.
- Existing Supabase order/realtime/polling foundation is preserved.

## Current rendering ownership
### Navigation / Home
- jpt-master-ui-layer-v5 adds grouped top/mobile navigation.
- jpt-partner-final-touch-v10 hides the original top/tabs/home surfaces and creates the V9/V10 visual home layer.
- jpt-partner-final-touch-v12 removes older duplicate visual bottom-navigation elements and applies the V13 outlet picker correction.

### Orders
- admin.html contains the original orders table and orderAction/accept/reject/preparing/ready/out_for_delivery/completed actions.
- jpt-partner-orders-ui-v1 hides the original orders table and renders the operational card UI.
- jpt-partner-delivery-tracking-v2 injects delivery assignment information into the V1 Orders UI.
- jpt-partner-order-alert-v4 owns the newer order-alert/ringtone lifecycle and wraps/coordinates the existing alarm.
- jpt-partner-timing-manager-v1 is a separate Settings timing module.

### Media / sponsor
- jpt-sponsor-manager-v2, jpt-sponsor-media-manager-v4, and jpt-banner-control-center-v4 are all loaded by admin.html.
- Banner Control Center V4 explicitly hides older sponsor-manager surfaces before mounting its own UI.
- Sponsor Media Manager V4 stores an image duration of 10 seconds in schedule_json.
- Banner/media ownership must be consolidated before changing playback behavior.

## Safety rules for next implementation
1. Do not modify core order persistence, Supabase/RLS, menu/cart/checkout, or existing sound mapping without a verified defect.
2. Do not continue the old failed banner experiment chain.
3. Do not remove a loaded layer until its replacement ownership is proven.
4. No feature is GREEN until runtime behavior is tested.
5. Prefer one owner per visual surface and one owner per business action.
6. Keep the main branch untouched until a controlled change is verified.

## Next engineering target
Design and implement a single-owner Order Command Center/navigation architecture on this branch, preserving the existing orderAction/backend foundation. First target: navigation + order-surface ownership, then runtime verification.
