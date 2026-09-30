# JPT PHASE A — BACKEND CONTRACT EVIDENCE GATE V2

Date: 30-09-2026
Repository: harmeetsg1983-blip/jeetpunjabitadka
Source branch audited: main
Controlled work branch: jpt-central-app-architecture-v1

## Purpose

Record what the current repository actually proves about the backend contracts needed for real multi-tenant restaurant onboarding. This document is evidence only. It does not invent schema, RLS, RPC, trigger, Edge Function, or Storage policy definitions.

## Verified client-side contracts

### Partner authorization
The live admin source calls:
- partner_my_outlets
- partner access is outlet-scoped in the client
- current admin.html supports outlet_id/code and outlet_name/name response variants.

### Restaurant onboarding
jpt-restaurant-partner-onboarding-ui-v2.js:
- writes applications to restaurant_partner_applications
- invokes Edge Function partner-approve-restaurant with application_id
- existing UI describes approval as creating Outlet ID + Partner access.

This proves client dependency only. It does NOT prove the server implementation or exact database columns.

### Menu
Current source reads/writes:
- outlets
- categories
- menu_items
- menu_item_images
- offers
- campaigns

Observed outlet scoping is present in client queries. Exact database constraints/RLS remain server-side verification items.

### Delivery
Current source references:
- delivery_partner_offer_snapshot
- delivery_assignment_respond
- delivery_partner_assignment_snapshot
- delivery_assignment_status
- delivery_partner_record_location
- delivery_partner_earnings_summary

These are existing client dependencies. Their authoritative SQL/RPC definitions are not present in the repository audit.

## Search result

Repository search for:
- CREATE TABLE restaurant_partner_applications
- CREATE TABLE outlets
- CREATE POLICY menu_items
- complete function definitions
did not return authoritative schema/RLS definitions.

The repository contains supabase/V106_ROYAL_SCRATCH.sql, but that file is a feature-specific scratch-card migration and is not a complete production schema/RLS export.

## Engineering decision

DO NOT:
- invent table columns
- invent RLS policies
- create replacement RPCs with guessed signatures
- recreate the approval Edge Function from client assumptions
- bypass RLS from client code
- build fake onboarding buttons that only change UI state.

## Required authoritative source before production onboarding writes

Obtain one of:
1. Supabase schema/migration export covering the required tables and RLS;
2. authoritative SQL migration history from the production project;
3. authoritative definitions for the required RPCs/Edge Functions and Storage policies.

Minimum contracts to verify:
outlets;
restaurant_partner_applications;
partner/user/outlet access;
categories;
menu_items;
menu_item_images;
orders/order_items;
delivery assignments;
RLS policies;
partner_my_outlets and related RPCs;
partner-approve-restaurant;
menu/PDF/media Storage buckets and policies.

## Next safe implementation boundary

Once authoritative backend definitions are available:
1. map exact columns and constraints;
2. map Central Owner versus Partner permissions;
3. design real onboarding transaction flow;
4. implement Central Owner onboarding additively on the controlled branch;
5. implement PDF/manual menu ingestion only against verified contracts;
6. test at least two outlets and prove cross-outlet isolation;
7. only then consider promotion toward main.

No production file on main is changed by this evidence-gate work.


## Banner V4 runtime gate — 30 Sep 2026
The controlled source path now has an explicit runtime verification matrix. This is a test plan, not a GREEN claim.

1. Select NME-004 in Banner Control V4 and upload an image.
2. Confirm successful publish message and campaign record uses outlet_id=NME-004, campaign_type=media, surface=customer_outlet_showcase, active=true, and storage metadata.
3. Open Customer App and confirm the NME-004 card renders that managed media.
4. Switch to another outlet and confirm NME-004 media does not remain stale.
5. Refresh/reopen and confirm the published state persists.
6. Turn the NME-004 banner OFF and confirm the customer surface no longer treats that campaign as active.
7. Delete it and confirm the campaign is inactive, outlets.banner_url is cleared, and storage cleanup succeeds or reports a cleanup failure explicitly.
8. Repeat with video and verify video preview plus customer rendering.
9. Repeat the identity test using B04 in the UI while all database operations remain on canonical NME-004.
10. Only after these checks pass may the Customer Outlet Showcase surface be considered GREEN.


## Sponsor Media V4 Slot persistence source checkpoint — 30 Sep 2026
- Manager V4 persists the selected slot as `schedule_json.slot` using the selected value 1 or 2.
- Refresh reads `schedule_json.slot` and reconstructs separate Slot 1 and Slot 2 lists; the customer runtime uses the same field to render the two slots.
- Save also persists `storage_bucket` and `storage_path`; delete attempts storage cleanup after the database row is deleted.
- Source evidence therefore resolves the earlier Slot-2 source gap. It does not prove runtime persistence, RLS authorization, customer rendering, or storage cleanup success.
- Runtime gate remains: save Slot 1, refresh/reopen; save Slot 2, refresh/reopen; verify both customer slots; toggle each; delete each; verify media-file cleanup; test image and video.
- No schema/RLS change is authorized from this source checkpoint.
