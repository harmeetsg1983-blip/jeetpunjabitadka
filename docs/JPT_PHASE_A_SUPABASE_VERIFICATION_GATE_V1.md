# JPT Phase A — Supabase Verification Gate V1

Date: 2026-09-30
Branch: jpt-central-app-architecture-v1
Main: unchanged

## Result

Repository audit confirms that the repository does NOT contain the complete authoritative Supabase SQL/RLS definitions required to safely implement the new production onboarding schema from source alone.

### What is present
- Client-side references to existing tables/RPCs.
- Existing partner application UI.
- Existing Central Owner checks.
- Existing partner outlet authorization calls.
- Existing delivery partner RPC calls.
- One scratch SQL file containing unrelated offer/outlet iteration logic.

### What is not present as authoritative source
- Full CREATE TABLE definition for restaurant_partner_applications.
- Full CREATE TABLE definition for partner access mapping.
- Full CREATE TABLE definition for menu_items/categories/menu_item_images.
- Full RLS policy definitions.
- Full definition of partner_my_outlets.
- Full definition of partner_access_is_central_owner.
- Full definition of partner_list_applications.
- Full definition of partner_set_application_status.
- Full implementation source of partner-approve-restaurant.
- Full delivery assignment SQL/function definitions.

## Important safety conclusion

Do not create guessed SQL, guessed RLS, guessed columns, or guessed Edge Function behavior to make the UI appear functional.

The current production source already depends on server-side contracts. Replacing or duplicating those contracts without the authoritative definitions could break existing customer/order/partner behavior or weaken outlet isolation.

## Production onboarding remains planned

The intended real workflow remains:
Central Owner -> create/approve restaurant -> outlet provisioning -> menu PDF/manual builder -> draft review -> publish -> secure partner account -> outlet-scoped access -> restaurant operations.

But implementation is gated on authoritative backend definitions.

## Existing UI limitation

The current restaurant onboarding module is an application/approval UI. It is not yet the complete production onboarding and menu provisioning system.

## Required next artifact/source

Before implementation, obtain the authoritative Supabase definitions/export for:
1. outlets
2. restaurant_partner_applications
3. partner/user/outlet access
4. categories
5. menu_items
6. menu_item_images
7. orders/order_items
8. delivery assignments
9. relevant RLS policies
10. relevant RPCs/Edge Functions
11. storage buckets and policies for menu/PDF/media

## No production code changed

This phase created documentation only. Main branch was not modified.


## Phase G Central Owner reporting backend authority audit — 01 Oct 2026
- Repository search did not locate authoritative `CREATE FUNCTION`/RPC implementation for sales aggregate reporting, `sales_summary`, or a dedicated central-owner report/finance aggregate.
- Repository search also did not locate authoritative `CREATE POLICY` definitions for `orders` or `outlets` that would independently prove central-owner aggregate authorization.
- `partner_access_is_central_owner` is present and used by UI visibility/role checks, but this does not itself constitute a reporting-data authorization contract.
- The legacy `jpt-v106-partner-operations-v2.js` ALL-OUTLETS sales view is client-side aggregation over `orders`; it is not established as an authoritative backend report and is not evidenced as active in `admin.html`.
- Conclusion: Central Owner aggregate reporting remains YELLOW/BLOCKED. Do not implement or expose aggregate financial reporting as authoritative until backend report/RPC + authorization evidence is available.
- No production code changed.
