# JPT Phase A — Current Data Contract Map V1

Date: 2026-09-30
Branch: jpt-central-app-architecture-v1
Production main: unchanged

## 1. Contract status

This map is based only on source code currently visible in the repository. Supabase server-side definitions that are not stored in the repository were NOT assumed.

Therefore:
- client-side table/RPC usage is verified;
- exact SQL definitions, column constraints, RLS policies, triggers and Edge Function internals require direct Supabase source/access before implementation is declared production-ready.

## 2. Outlet contract

Verified client usage:
- table: `outlets`
- identity field used by current application: `outlet_id`
- customer menu loads one outlet with `outlets.outlet_id`
- partner authorization returns outlet identity through `partner_my_outlets`
- current partner context uses `window.JPT_OUTLET_ID` and `window.activeOutlet`

Observed outlet fields in source include restaurant metadata such as:
- name
- cuisine
- address/location-related information
- branding/media-related values

Exact database schema is NOT inferred beyond fields directly observed in source.

## 3. Menu contract

### Categories
Verified:
- table: `categories`
- outlet-scoped using `outlet_id`
- observed fields: `id`, `name`, `sort_order`, `is_active`

### Menu items
Verified:
- table: `menu_items`
- outlet-scoped using `outlet_id`
- observed reads use `id`, `name`, `price`, `sort_order`, `available`, `featured`, `is_deleted`, `category`, and other existing row fields.

### Menu images
Verified:
- table: `menu_item_images`
- outlet-scoped using `outlet_id`
- observed fields: `menu_item_id`, `item_name`, `image_url`

### Important implementation rule
The new Central Owner onboarding Menu Builder must write to these existing production menu foundations after the exact write contracts are verified. It must NOT create a second menu model.

## 4. Partner authorization contract

Verified:
- RPC: `partner_my_outlets`
- RPC usage exists in:
  - `admin.html`
  - `jpt-partner-access-bridge-v2.js`
  - `jpt-partner-login-context-v1.js`
  - `jpt-single-outlet-ui-v1.js`

Verified central-owner check:
- RPC: `partner_access_is_central_owner`

Existing onboarding RPCs:
- `partner_list_applications`
- `partner_set_application_status`

Approval path:
- Edge Function: `partner-approve-restaurant`

### Security conclusion
Partner outlet authorization already exists as a server-facing contract. The new onboarding system must connect approved partner accounts to this same authorization mechanism rather than inventing a UI-only outlet restriction.

## 5. Restaurant partner application contract

Verified client writes:
- table: `restaurant_partner_applications`
- current application payload includes:
  - `restaurant_name`
  - `owner_name`
  - `owner_email`
  - `owner_phone`
  - `address`
  - `logo_url`
  - `banner_url`
  - `notes`

Current UI is application/approval oriented. It is NOT yet the complete restaurant onboarding/menu provisioning workflow requested by the owner.

## 6. Orders contract

Verified:
- table: `orders`
- current order rows contain/use `id`, `order_no`, `outlet_id`, `status`, `created_at`, `total`
- current partner order updates scope by outlet, e.g. `orders.update(...).eq('id',id).eq('outlet_id',currentOutlet)`
- current order alert/realtime system is already present and must be preserved.

## 7. Delivery contract

Verified RPCs used by existing delivery partner apps:
- `delivery_partner_offer_snapshot`
- `delivery_assignment_respond`
- `delivery_partner_assignment_snapshot`
- `delivery_assignment_status`
- `delivery_partner_set_status`

Observed delivery offer data includes:
- assignment/order identity
- outlet identity
- pickup address / restaurant address
- customer delivery information in active assignment flows

This confirms an existing delivery foundation, but does NOT by itself prove the complete future nearest-rider/service-area/routing engine.

## 8. Finance/reporting contract

Current Admin Finance & Settlement UI is outlet-scoped and derives existing order/report figures from the selected outlet.

No new payout formula is introduced by this map.

The conceptual finance HTML prototype is NOT treated as production data contract.

## 9. Missing server-side verification before implementation

The following must be verified from actual Supabase definitions before production writes are implemented:
1. Full `outlets` schema and unique constraints.
2. Full `restaurant_partner_applications` schema.
3. `partner-approve-restaurant` Edge Function behavior and returned partner/outlet/access identifiers.
4. `partner_my_outlets` function definition and security model.
5. RLS policies for outlets/categories/menu_items/menu_item_images/orders/order_items.
6. Exact menu insert/update/delete permissions for partner and Central Owner roles.
7. Storage bucket/path/RLS rules for menu images and PDF menu files.
8. Existing order/order_items relationship and server-side validation.
9. Delivery assignment table/function ownership rules.
10. Any audit/event tables already available.

## 10. Production onboarding flow to implement after verification

Central Owner:
1. Create restaurant application/outlet.
2. Enter restaurant/contact/location details.
3. Upload PDF menu OR choose manual menu builder.
4. Parse/import menu only as a draft.
5. Review categories/items/prices/images.
6. Correct imported data manually.
7. Publish menu.
8. Approve restaurant.
9. Provision/authenticate partner account.
10. Attach partner to the approved outlet.
11. Verify partner sees only authorized outlet data.
12. Verify outlet can receive/manage its own orders.

Vendor:
1. Secure authentication/OTP.
2. Authorized outlet context.
3. Orders + notification/ringtone.
4. Menu/category/item/image controls.
5. Restaurant profile/settings.
6. Own sales/order reporting.
7. No Central Owner controls.

## 11. Verification gate

No feature is GREEN until:
- real database write/read is verified;
- errors are handled;
- refresh/session persistence works;
- at least two outlets are tested;
- cross-outlet access is blocked;
- customer menu remains unchanged;
- existing order flow remains unchanged;
- partner notification is limited to the authorized outlet;
- no placeholder/demo data is used.

## 12. Next action

Before creating the new onboarding UI/module, obtain and map the actual Supabase SQL/RLS/Edge Function definitions. Then implement the Central Owner onboarding and Menu Builder as an additive production workflow using the verified contracts.


## Phase C menu onboarding source baseline — 01 Oct 2026
- Existing Partner menu management reads/writes the outlet-scoped `menu_items` table and uses `categories` plus `menu_item_images` for category and image mapping.
- Existing Customer runtime reads `menu_items` filtered by canonical `outlet_id`, active `categories`, and outlet-scoped `menu_item_images`; this is the existing customer-facing menu contract and must remain the single runtime source.
- Existing Partner menu operations include item creation, price/category/availability/featured edits, category create/edit/activate/deactivate, and dish-image upload/mapping through the existing `menu-images` bucket.
- Existing image mapping writes both `menu_item_images` and, where supported, `menu_items.image_url`; no replacement menu schema is authorized from this audit.
- Phase C should therefore add onboarding/import tooling around these existing contracts rather than creating a second menu model.
- PDF/OCR extraction is not yet evidenced as a production backend capability in the repository. It must remain a future prefill/review workflow until its authoritative implementation and permissions are available.


## PDF menu import evidence checkpoint — 01 Oct 2026
- Repository search found no authoritative production implementation for PDF menu upload, PDF parsing/OCR, extracted menu-item staging, human review/publish, or related backend permissions.
- Therefore PDF upload/import must not be represented as a working production feature yet.
- The supported current Phase C path is the existing manual menu management contract: outlet-scoped categories, menu items, prices/availability, and menu-item image mapping.
- When PDF import is implemented, it must stage extracted data for human review before publishing into the existing menu contracts; it must not silently write extracted prices/items directly into the live customer menu.
- Required future evidence: storage contract for PDFs, extraction service/Edge Function, staging data contract, validation/review workflow, publish transaction, authorization/RLS, error handling, and audit trail.
