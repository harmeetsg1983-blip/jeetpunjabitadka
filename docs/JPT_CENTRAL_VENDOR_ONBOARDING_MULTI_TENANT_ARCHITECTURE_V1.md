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


## Phase E backend-authority evidence audit — 01 Oct 2026
- Repository search confirms production Partner runtime depends on `partner_my_outlets` for authorized outlet discovery and on `partner-approve-restaurant` Edge Function for onboarding approval.
- Repository search did not find authoritative `CREATE POLICY`/RLS SQL for the `orders` table, nor an auditable server-side policy definition proving partner-specific cross-outlet denial.
- Existing client/runtime filters are therefore evidence of intended outlet scoping, not proof of authorization.
- No code change is authorized from this audit. Phase E remains YELLOW/BLOCKED pending backend policy/function evidence and a two-outlet negative-access runtime test.


## Phase F delivery-partner assignment source checkpoint — 01 Oct 2026
- Existing production-oriented delivery foundation uses server RPCs for offer snapshot, assignment response, active assignment snapshot, assignment status, location recording and location-sharing stop.
- The stronger pre-live delivery runtime (`JPT_Delivery_Partner_PreLive_V9.html`) uses these RPCs rather than client-only assignment writes; older V5/V6/V7 demo onboarding files are not treated as production authority.
- Partner-side delivery tracking uses `partner_delivery_tracking_snapshot(p_outlet_id)` as a least-privilege snapshot source, with the current outlet supplied by the Partner dashboard.
- Delivery assignment objects expose `outlet_id` to the rider UI, and the partner tracking UI is outlet-scoped at the RPC call.
- However, the repository does not contain the authoritative SQL/function bodies proving that offer selection, assignment response/status/location operations enforce the intended rider/outlet/order authorization server-side. Therefore Phase F is source-supported but not GREEN.
- Additional runtime/security gate required: an order from Outlet A must not be offered/accepted/tracked by an unauthorized rider or Partner context for Outlet B; assignment status/location operations must reject mismatched assignment ownership; completed assignment must stop active location sharing.
- No production code was changed in this checkpoint.


## Delivery earnings source checkpoint — 01 Oct 2026
- Delivery Partner UI calls `delivery_partner_earnings_summary` with a 30-day window in the audited runtime/foundation files.
- Some older UI variants additionally render a fixed `₹50` multiplier/text around the server-returned summary. This is presentation logic, not evidence of an approved production payout formula.
- Repository search did not establish an authoritative production payout/commission/GST/TDS formula or settlement ledger implementation.
- Therefore delivery earnings/payout is NOT GREEN and no fixed payout amount/formula should be copied into the production architecture.
- Existing architecture requirement remains: completed deliveries and earnings must be server-side source-of-truth, append-safe/auditable, with payout/commission/GST/TDS intentionally unresolved until the authoritative financial contract is available.
- No production code changed in this checkpoint.


## Delivery online/offline source checkpoint — 01 Oct 2026
- Delivery Partner V8/V9/V10/V11 foundations call the server RPC `delivery_partner_set_status` for both ONLINE and OFFLINE; UI state is updated only after the RPC succeeds.
- Going ONLINE starts offer polling; going OFFLINE stops offer polling. The audited source does not use a client-only boolean as the persistence mechanism.
- The authoritative function body/authorization contract for `delivery_partner_set_status` is not present in the repository, so approval gating and rider-availability enforcement cannot be independently proven from source alone.
- `delivery_partner_offer_snapshot` is the existing server snapshot used for offer polling; it must remain the source of eligible offers rather than client-side filtering.
- Therefore online/offline behavior is source-supported but NOT GREEN until runtime and backend authorization evidence confirms: unapproved rider cannot go online, offline rider receives no new offer, reconnect restores the real server state, and offer eligibility is correctly enforced.
- No production code changed in this checkpoint.


## Delivery onboarding → approval → ONLINE gate checkpoint — 01 Oct 2026
- Stronger Delivery Partner V9 source uses real Supabase phone OTP (`signInWithOtp` + `verifyOtp`) and reads the authenticated rider's `delivery_partners` record for status, active flag, onboarding completion and verification status.
- KYC/onboarding submission is server-RPC based (`delivery_partner_prepare_profile`, private KYC storage upload, `delivery_partner_submit_onboarding`) and requires live camera selfie capture in the audited V9 flow.
- Admin review bridge uses `delivery_partner_admin_queue` and `delivery_partner_admin_review`; the UI states approval enables ONLINE.
- ONLINE/OFFLINE then uses `delivery_partner_set_status` rather than a client-only flag.
- However, authoritative server function bodies/RLS for these approval/status RPCs are not available in the repository. Therefore the complete security gate is not independently proven and remains NOT GREEN.
- Required runtime/backend evidence: unverified/unapproved rider cannot set ONLINE; approved rider can; rejected/inactive rider cannot; phone session maps to exactly one authorized rider; offer snapshot cannot expose assignments to an unauthorized rider.
- No production code changed in this checkpoint.


## Delivery offer → assignment checkpoint — 01 Oct 2026
- Delivery Partner runtime polls the server RPC `delivery_partner_offer_snapshot`; it does not construct offers from client order data.
- Rider response uses `delivery_assignment_respond` with the assignment ID and accept/reject decision.
- Active assignment state is read from `delivery_partner_assignment_snapshot`; delivery status transitions use `delivery_assignment_status`.
- Restaurant Partner delivery bridge uses `delivery_offer_next` to request an offer for a specific order and reports whether an eligible ONLINE rider received it; this is server-RPC based rather than client-side rider selection.
- The audited UI keeps outlet/order identifiers from the server response and does not invent assignment IDs.
- However, authoritative RPC bodies/RLS are still absent from the repository. Therefore server-side eligibility, outlet isolation, duplicate acceptance/race handling, and unauthorized assignment access are NOT independently proven and remain blocked from GREEN.
- Required runtime/backend evidence: rider A cannot see/accept B's assignment; assignment must remain tied to its order/outlet; only eligible ONLINE/approved riders receive offers; concurrent acceptance cannot create duplicate active assignment; status transitions and completed delivery remain rider/assignment scoped.
- No production code changed in this checkpoint.


## Delivery location lifecycle checkpoint — 01 Oct 2026
- Active Delivery Partner assignment starts periodic GPS submission through `delivery_partner_record_location` using the server-returned assignment ID; audited variants use roughly 10–15 second intervals and send latitude/longitude/accuracy.
- Assignment completion calls the client stop-location path (`delivery_partner_stop_location_sharing` in V10/V11), while the stronger V8/V9 flow stops its local timer on delivered status; therefore UI/runtime stop behavior exists but exact server stop semantics require backend evidence.
- Delivery status transitions are server-RPC based through `delivery_assignment_status`, not client-only state.
- Maps navigation uses the current server-provided customer address rather than inventing an assignment.
- Authoritative RPC bodies/RLS are absent from the repository, so rider-to-assignment authorization, outlet isolation, location-write authorization, and guaranteed server-side location stop after completion are NOT independently proven. This remains NOT GREEN.
- Required evidence: unauthorized rider cannot write location for another assignment; rider cannot write after completion; completed assignment stops server-side sharing; location records remain tied to the correct assignment/outlet/order; offline/ended assignment cannot continue location writes.
- No production code changed in this checkpoint.


## Delivery earnings / financial authority checkpoint — 01 Oct 2026
- Delivery Partner UI calls server RPC `delivery_partner_earnings_summary` for a 30-day summary; earnings are therefore not generated from the rider's local order list.
- Some older delivery UI variants display a fixed `₹50` multiplier in presentation text. This is explicitly treated as legacy presentation and is NOT an approved production payout formula.
- Repository search found no authoritative production payout/commission/GST/TDS/settlement ledger implementation that can be independently verified from source.
- The current Restaurant Partner Finance panel intentionally states that delivery/settlement payout is not invented or estimated and calculates operational order figures from the selected outlet's live order rows.
- Financial status remains NOT GREEN. No payout formula, commission, GST, TDS, settlement amount, or rider earnings calculation should be invented or copied from conceptual/legacy UI.
- Required evidence before financial GREEN: authoritative server-side source of truth, append-safe/auditable ledger, outlet/order/rider linkage, reconciliation path, defined payout/commission/tax rules, and negative-access tests.
- No production code changed in this checkpoint.


## Phase G operational finance/reporting source checkpoint — 01 Oct 2026
- Current `admin.html` Finance panel loads live order rows for the selected outlet and derives operational figures: order count, gross order value, discounts and net after discounts. The UI explicitly states that cross-outlet rows are not loaded and that delivery/settlement payout is not estimated.
- Current Reports panel derives New / In Progress / Completed / Cancelled counts from the same selected-outlet order rows.
- Repository evidence does not establish a separate authoritative accounting/settlement ledger behind these figures. Therefore these panels should be treated as operational reporting, not final financial settlement/accounting.
- No cross-outlet aggregate financial reporting should be added until a central-owner reporting contract and authoritative backend source are evidenced.
- Phase G financial GREEN gate remains unmet: authoritative server-side financial source, immutable/auditable ledger, reconciliation, refund/adjustment handling, outlet/rider linkage, and permission/RLS evidence are still required.
- No production code changed in this checkpoint.


## Phase G backend finance/settlement evidence search checkpoint — 01 Oct 2026
- Repository search for `sales_summary`, `financial_ledger`, `settlement`, `ledger`, `refund`, `adjustment`, `commission`, `tax/GST/TDS`, and `payout` found no independently auditable production financial ledger or settlement source of truth.
- `admin.html` remains operational order-row reporting only.
- `JPT_Restaurant_Partner_Large_Model_Finance_Settlement_V2.html` contains a conceptual settlement/finance model with example/hard-coded figures and UI placeholders; it is not evidence of a production backend ledger and must not be copied as production financial logic.
- Refund/cancellation policy text documents customer-facing policy context, but does not establish a transactional refund ledger or authoritative settlement implementation.
- Therefore Phase G financial/settlement implementation remains BLOCKED/YELLOW pending authoritative backend schema/RPC/function/RLS evidence and reconciliation tests.
- No production code changed.


## Phase F delivery lifecycle source-chain checkpoint — 01 Oct 2026
- Delivery runtime source chain is present for offer → rider response → active assignment → status progression → location writes → location-stop → earnings summary.
- Offer discovery uses server RPC `delivery_partner_offer_snapshot`; rider response uses `delivery_assignment_respond`; active assignment uses `delivery_partner_assignment_snapshot`; status transitions use `delivery_assignment_status`.
- Location lifecycle uses `delivery_partner_record_location` during an active assignment and `delivery_partner_stop_location_sharing` on completion in the stronger audited V9/V11 flow.
- Restaurant Partner delivery bridge uses server-side offer/assignment functions rather than client-created assignment IDs.
- This confirms the client-side lifecycle wiring, but does NOT prove server authorization, outlet isolation, race handling, or post-completion location rejection because authoritative RPC bodies/RLS policies are not present in the repository evidence.
- Required runtime/security gate remains: unauthorized rider cannot see/accept another rider's assignment; assignment remains tied to order/outlet; concurrent acceptance cannot create duplicate active assignment; unauthorized location writes are rejected; completed assignments cannot continue location writes; only eligible approved ONLINE riders receive offers.
- No production code changed.


## Phase F server-authority evidence search checkpoint — 01 Oct 2026
- Repository search for delivery RPC/function definitions and RLS policy definitions did not locate authoritative `CREATE FUNCTION` / `CREATE POLICY` bodies for the delivery lifecycle RPCs.
- Client source proves the intended RPC contract names and parameters, but cannot prove the underlying authorization or tenant-isolation behavior.
- Delivery admin approval bridge also calls server RPCs (`delivery_partner_admin_queue`, `delivery_partner_admin_review`); their server authorization bodies are not independently available in repository source.
- Therefore no client-side workaround, service-role bypass, or new duplicate delivery backend has been introduced.
- Phase F security authority remains YELLOW/BLOCKED until authoritative backend function/RLS definitions or controlled runtime evidence are available.
- No production code changed.


## Phase G sales/reporting source checkpoint — 01 Oct 2026
- Active `admin.html` Finance/Reports source derives figures from the selected outlet's live `orders` rows; it does not load a separate sales/settlement aggregate.
- Gross is derived from each loaded row's `subtotal`, falling back through `total`, `grand_total`, or `amount`; discounts are summed from `discount`; status counts are derived from the same rows.
- The active source explicitly labels these as outlet-scoped operational figures and does not claim settlement/payout authority.
- A separate legacy `jpt-v106-partner-operations-v2.js` contains an `ALL OUTLETS` sales presentation path, but it is not evidenced as loaded by the active `admin.html`; it must not be promoted into the production Central Finance source without a fresh source/backend audit.
- The conceptual `JPT_Restaurant_Partner_Large_Model_Finance_Settlement_V2.html` remains non-production and contains example figures.
- Phase G operational reporting source is therefore identified; final financial reporting/settlement remains blocked by missing authoritative backend ledger/RPC/RLS evidence.
- No production code changed.
