# JPT / FOOD CART — CENTRAL VENDOR ONBOARDING & MULTI-TENANT ARCHITECTURE V1

Status: DESIGN / ARCHITECTURE LOCK — NO PRODUCTION CODE CHANGE
Date: 2026-09-30

## 1. Core objective
The Central Restaurant Partner/Admin App must allow the Central Owner/Admin to onboard and operate new restaurants without requiring direct GitHub, Supabase Dashboard, SQL editor, or other technical administration for routine operations.

The system must scale from the current small outlet set to hundreds or approximately 1,000+ outlets without creating a separate codebase or rebuilding the app per outlet.

## 2. Central Owner capabilities
A protected Central Owner area should provide:
- Add new restaurant/outlet
- Restaurant name and business profile
- Contact number
- Address and restaurant location
- Service area / delivery area
- Business onboarding status
- Approval / rejection / suspend / reactivate
- Restaurant logo and banner
- Menu PDF upload
- Manual menu item creation
- Menu category management
- Dish image upload/replacement
- Item price, availability and timing
- Restaurant-specific settings
- Restaurant-specific order access
- Restaurant-specific notification/ringtone configuration
- Delivery-partner assignment/configuration
- Sales/order dashboard
- Daily/weekly/monthly sales summaries
- Secure financial record access
- Outlet-level audit history

Routine operations must not require GitHub or Supabase Dashboard.

## 3. Vendor / Restaurant Partner experience
Each approved restaurant receives its own restricted Partner App/account.

Authentication:
- Central system provisions the restaurant account.
- Contact number can be the primary login identifier, subject to secure verification/authentication.
- Restaurant partner must only see data and controls belonging to its authorized outlet(s).
- Central Owner/Admin features, other outlets, and central financial/admin controls remain hidden and access-controlled.

Partner-facing modules:
- Orders
- New-order notification
- Order timer
- Accept / reject / prepare / ready / delivery workflow
- Menu
- Items
- Categories
- Images
- Restaurant profile
- Outlet status / accepting orders
- Sales summary
- Daily / weekly / monthly order and sales history
- Relevant delivery status

The partner app should reuse the same approved business/order engine but enforce outlet-level authorization.

## 4. Menu onboarding
Central Owner workflow:
1. Create restaurant/outlet.
2. Enter restaurant profile.
3. Upload menu PDF OR add items manually.
4. Extract/enter categories and items.
5. Add/edit prices.
6. Upload/crop/replace dish images.
7. Set item availability.
8. Review complete menu.
9. Approve/publish menu.
10. Restaurant partner receives access to its menu and operations.

Future enhancement:
- PDF menu extraction/OCR can prefill categories/items/prices.
- Human review remains required before publishing extracted menu data.
- No automatic extraction should silently publish incorrect prices/items.

## 5. Outlet isolation
Every business record must have a tenant/outlet ownership boundary.

Examples:
- outlet_id / tenant_id on restaurant data
- outlet-scoped menu
- outlet-scoped orders
- outlet-scoped order items
- outlet-scoped sponsor/campaign data where applicable
- outlet-scoped delivery assignments
- outlet-scoped sales summaries

A partner must never be able to query or mutate another outlet's records.

Central Owner can view authorized aggregate data across outlets.

## 6. Order notification ownership
When an order belongs to Outlet A:
- Outlet A's authorized partner session receives the order notification.
- Outlet A's configured ringtone/alert is used.
- Outlet B/C/etc. must not receive that order alert.
- Central Owner may have a separate optional monitoring/notification policy, but the restaurant's operational alert is owned by that restaurant.

This must be enforced by server-side authorization/data routing, not only by hiding UI elements.

## 7. Delivery routing
Delivery should be outlet-aware.

For an order from Outlet A:
- Delivery assignment is associated with that order/outlet.
- Delivery partner sees only authorized delivery jobs.
- Pickup location is Outlet A's configured location.
- Delivery destination is the customer's order address/location.
- Delivery workflow remains independent per order.
- A delivery partner should not be redirected to another outlet's pickup location because of shared/global UI state.

Future routing layer can support:
- nearest/eligible delivery partner
- availability
- service area
- assignment
- reassignment
- pickup
- delivery status
- location tracking
- delivery earnings

## 8. Sales and financial records
Two visibility levels are required.

### Central Owner
- Per-outlet sales
- Aggregate sales
- Order counts
- Daily/weekly/monthly summaries
- Financial transaction records
- Audit history

### Restaurant Partner
- Its own orders
- Its own gross sales/order totals
- Daily/weekly/monthly summaries
- Its own transaction/settlement records when settlement is implemented

Financial data must be append-safe/auditable and should not depend on client-side calculations as the authoritative source.

## 9. Delivery Partner earnings
Delivery Partner should eventually have:
- Completed orders
- Earnings per order
- Daily earnings
- Weekly earnings
- Monthly earnings
- Order count
- Delivery history
- Settlement/payout status

Exact payout formula, per-km rates, incentives, commissions, TDS/GST handling, and settlement rules are intentionally NOT locked in this V1 architecture and will be a separate payout/settlement specification.

## 10. Data safety
Financial and operational data requires:
- Server-side authorization
- Tenant/outlet isolation
- Immutable/auditable transaction records where appropriate
- Unique order identifiers
- Idempotent order/financial writes
- Created/updated timestamps
- Audit events for sensitive changes
- Backup/recovery strategy
- Role-based access
- No client-only trust for price, quantity, outlet ownership, or earnings
- Separate operational records from derived dashboard summaries

## 11. Roles
Initial conceptual roles:
- Central Owner
- Central Admin/Operations
- Restaurant Owner/Partner
- Restaurant Staff (future)
- Delivery Partner
- Customer

Each role receives least-privilege access.

## 12. Scalability principle
Adding Outlet #6, #7, #8 or #1000 should be a data/configuration operation, not a source-code rebuild.

The application remains one platform.
Outlet identity, permissions, menu, branding, locations, orders and configuration are data-driven.

## 13. Important separation
Do NOT merge the Central Owner UI with the Restaurant Partner UI.

Central Owner:
- onboarding
- approvals
- outlet management
- cross-outlet visibility
- platform operations
- aggregate reporting

Restaurant Partner:
- only its authorized restaurant operations

Delivery Partner:
- only its authorized delivery jobs and earnings

## 14. Current JPT implementation impact
For the current JPT dashboard:
- Existing customer menu/cart/checkout/order flow remains protected.
- Existing core orderAction/Supabase order foundation remains protected.
- New onboarding architecture should be additive.
- No immediate SQL/RLS rewrite should be made merely to create the UI.
- Before implementation, the production data model must be mapped against these tenant boundaries.

## 15. Next engineering phases
Phase A — Architecture/data contract
Phase B — Central Owner Outlet Onboarding
Phase C — Menu Import + Manual Menu Builder
Phase D — Partner Account Provisioning + outlet-scoped login
Phase E — Outlet-scoped Orders/Alerts
Phase F — Delivery Partner outlet-aware assignment
Phase G — Sales/financial reporting
Phase H — payout/settlement specification (later)
Phase I — scale/security/load testing

## 16. Non-negotiable safety rule
No production feature is declared GREEN until the access boundary is tested with at least two different outlets and cross-outlet access is proven blocked.

No financial feature is declared GREEN until server-side source-of-truth, auditability, and reconciliation behavior are verified.


## Onboarding source-contract checkpoint — 01 Oct 2026
- Current onboarding UI creates a `restaurant_partner_applications` record and uses the existing `partner-approve-restaurant` Edge Function for approval.
- The approval Edge Function is the authoritative boundary for Outlet ID creation and Partner access, but its implementation is not present in the repository source available to this audit.
- Existing partner sessions resolve authorized outlets through `partner_my_outlets`; the access bridge stores/uses the returned canonical `outlet_id` values.
- Therefore the scalable onboarding UI must not invent outlet IDs, partner-access rows, authentication provisioning, or RLS policies on the client.
- Phase B/D implementation remains blocked until the authoritative Edge Function/data-contract source is available. The current UI may be treated as an application workflow, not as proof that full automated onboarding/account provisioning is production-complete.


## Partner account / login evidence checkpoint — 01 Oct 2026
- Current Partner runtime obtains the authenticated Supabase session and then resolves authorized outlets through `partner_my_outlets`.
- The dynamic access bridge uses the returned canonical `outlet_id` values and `access_level`; local storage only remembers the selected authorized outlet and is not treated as the authorization source.
- Role/permission UI hides Central Owner-only controls for outlet partners, but this is presentation control; server-side authorization remains authoritative.
- Repository evidence does not establish a production contact-number OTP provisioning flow for restaurant partners, nor the implementation of account creation inside `partner-approve-restaurant`.
- Therefore Phase D must reuse the existing authenticated session + `partner_my_outlets` contract and must not invent client-side account provisioning or authorization.
- Required backend evidence before declaring Phase D complete: partner account provisioning contract, contact/OTP authentication contract, outlet-access assignment contract, role/access policy, and two-outlet cross-access test.


## Phase E outlet-scoped Orders/Alerts source checkpoint — 01 Oct 2026
- Core Partner order reads are filtered by `activeOutlet`; status mutations in `orderAction` are scoped by both order ID and `outlet_id`.
- Realtime order subscriptions in `admin.html` use an `outlet_id=eq.<activeOutlet>` filter for INSERT/UPDATE events.
- Partner Orders UI V1 also queries orders by the selected outlet and delegates mutations to the existing `orderAction` rather than creating a second write path.
- Delivery Tracking V2 requests its tracking snapshot with the active outlet ID and listens to delivery assignment changes as an auxiliary view.
- Order Alert V4 persists the alerted order's `outlet_id` and rechecks the order status before restoring an alert; however, the repository does not provide the server-side authorization/RLS definition proving that a malicious or mis-scoped realtime/client request can never cross outlet boundaries.
- Therefore Phase E is source-supported for client-side outlet scoping but is NOT GREEN. Required verification: two distinct partner accounts/outlets, new orders on each, alert isolation, order-list isolation, mutation isolation, refresh/reconnect isolation, and server-side cross-outlet denial.
