# JPT Phase A — Data & Onboarding Audit V1

Date: 2026-09-30
Controlled branch: jpt-central-app-architecture-v1
Production main: NOT MODIFIED

## Purpose
Verify what already exists before implementing the production-grade Central Owner -> Restaurant Partner onboarding flow.

## Verified existing foundation

### Partner outlet authorization
- `partner_my_outlets` is already used by the live partner access/context layers.
- `admin.html` exposes `JPTPartnerAccess` and derives authorized outlets from this RPC.
- `jpt-partner-login-context-v1.js` reads the authenticated Supabase session and partner outlet authorization.
- `jpt-partner-outlet-context-v1.js` keeps a single authorized outlet selected after login/refresh.
- This is an existing foundation and must be preserved.

### Existing Central Owner onboarding UI
`jpt-restaurant-partner-onboarding-ui-v2.js` already provides:
- New Restaurant application form
- Restaurant name
- Owner name
- Owner email
- Owner phone
- Address
- Logo URL
- Banner URL
- Notes
- Application list
- Approve / reject / suspend / re-approve presentation
- Central Owner check through `partner_access_is_central_owner`
- Application listing through `partner_list_applications`
- Status changes through `partner_set_application_status`
- Approval calls the `partner-approve-restaurant` Edge Function.

### Existing validation
`jpt-partner-onboarding-validation-v1.js` validates:
- Restaurant name
- Owner name
- Email format
- Phone presence

## Verified gaps against the new production requirement

The current onboarding UI does NOT yet provide the complete required workflow:
1. PDF menu upload and processing/review.
2. Manual menu builder inside Central Owner onboarding.
3. Category creation/editing during onboarding.
4. Menu item creation/editing during onboarding.
5. Item price and availability management during onboarding.
6. Menu item image upload/mapping during onboarding.
7. Review-before-publish menu workflow.
8. Clear production-grade restaurant partner account provisioning flow after approval.
9. Explicit partner role + outlet access lifecycle UI tied to the approved restaurant.
10. End-to-end proof that a newly onboarded outlet can immediately operate its own orders/menu without code changes.
11. Two-outlet isolation verification for the new onboarding path.
12. Complete audit trail for onboarding actions.

## Existing menu foundation

The Customer App already reads:
- `outlets`
- `menu_items`
- `categories`
- `menu_item_images`
- `offers`

All are outlet-scoped in the observed customer menu queries.

The existing `admin.html` also contains live menu/order/outlet functionality. The new onboarding system must integrate with this foundation rather than creating a parallel menu database/model.

## Delivery foundation

Existing delivery partner code already uses secure authenticated sessions/phone OTP and RPCs including:
- `delivery_partner_offer_snapshot`
- `delivery_assignment_respond`
- `delivery_partner_assignment_snapshot`
- `delivery_assignment_status`

Existing offer snapshots expose outlet/pickup information. This is a foundation, not proof that the complete future multi-outlet routing model is production-complete.

## Financial foundation

Existing Admin Finance & Settlement UI is outlet-scoped and explicitly avoids inventing payout/settlement figures. This is preserved.

Payout/commission/GST/TDS formulas are intentionally NOT defined by this audit.

## Production implementation boundary

Do NOT:
- modify Customer App
- replace the existing menu/cart/checkout/order flow
- rewrite `orderAction`
- rewrite Supabase/RLS without a proven schema/security gap
- copy the conceptual finance model as production
- create button-only/demo onboarding
- declare a feature GREEN because its UI renders

Do:
- map the exact current data contract first
- reuse existing outlet/menu/order/delivery foundations
- add missing onboarding capabilities as real connected functionality
- use authenticated role/outlet authorization for partner access
- verify the complete flow with at least two outlets before GREEN

## Next controlled implementation step

Build the data-contract checklist for:
- outlet
- restaurant partner/application
- partner user/access
- menu category
- menu item
- menu image
- order/order items
- delivery assignment/pickup
- sales/reporting
- onboarding audit events

Only after the current schema/functions are mapped should the production Central Owner onboarding module be implemented.
