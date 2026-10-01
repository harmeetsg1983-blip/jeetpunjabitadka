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


## Canonical outlet identity checkpoint — 30 Sep 2026
- Banner Control Center V4 retains B01–B05 mappings only as legacy/display control IDs.
- Database operations in the audited V4 path use the outlet database code (outlet_id / code), not B04-style display IDs.
- V4 has a deterministic fallback control ID for outlets outside the five legacy mappings, so the fixed map is not by itself a 5-outlet database limit.
- Future onboarding must continue to treat the canonical outlet database identity as authoritative and must not require adding a new hard-coded B-code mapping for each new outlet.


## Phase I scale/security evidence boundary — 01 Oct 2026
- Repository audit found no independently verifiable idempotency implementation, audit-event/immutable audit-log implementation, backup/recovery procedure, or tenant_id contract in repository source.
- Existing source consistently treats Supabase RPC/RLS as the intended security boundary, but authoritative policy/function bodies are not available in this repository for independent verification.
- Existing client outlet filters are not counted as proof of server-side tenant isolation.
- Therefore Phase I scale/security readiness is YELLOW/BLOCKED for production sign-off. No client workaround, service-role bypass, or invented audit/backup mechanism is authorized from this evidence alone.
- Required future evidence: authoritative backend/RLS policies, idempotency strategy for transactional writes, auditable event/ledger path, backup/restore and recovery verification, and at least two-outlet negative-access testing.
- No production code changed.


## Banner V4 OFF stale-media guard checkpoint — 01 Oct 2026
- Source audit found a concrete stale-media path: Banner Control Center V4 could deactivate the canonical showcase campaign while leaving the legacy `outlets.banner_url` mapping populated.
- The active customer showcase reader falls back to `outlets.banner_url` when no active managed showcase campaign is available, so an OFF action could leave the previous banner visible.
- Controlled fix: when V4 turns a saved outlet banner OFF, it now clears `outlets.banner_url`; if that mapping clear fails, the campaign is restored active and the OFF operation reports failure.
- DELETE already had an explicit legacy mapping clear; this checkpoint aligns OFF with the same stale-media protection.
- Commit: `6583258fc6f9520eee4e10707bec59ce55eddeb8`.
- This is a source-level fix only. Banner save/render/delete E2E remains NOT GREEN until real runtime verification proves database state, customer rendering, OFF, Delete, storage cleanup, reopen persistence, and outlet isolation.
