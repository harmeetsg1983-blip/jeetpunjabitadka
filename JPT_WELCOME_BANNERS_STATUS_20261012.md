# Five Outlet Welcome Banners — 12 Oct 2026

## Assets
- `assets/outlet-welcome-banners/jpt-welcome-jeet-punjabi-tadka.svg` — JPT-001
- `assets/outlet-welcome-banners/jpt-welcome-shan-e-punjab.svg` — SOP-002
- `assets/outlet-welcome-banners/jpt-welcome-punjabi-food-adda.svg` — PFA-003
- `assets/outlet-welcome-banners/jpt-welcome-99-meal-express.svg` — NME-004
- `assets/outlet-welcome-banners/jpt-welcome-taste-of-punjab.svg` — TOP-005

## Database setup
- Five active, outlet-scoped `public.jpt_sponsor_campaigns` rows created for `surface=customer_home`, `slider_group=primary`, `outlet_scope=selected`, `display_seconds=11`.
- Five corresponding `public.campaigns` rows created using the existing `customer_outlet_showcase` / `FIRST` placement shape for tracking compatibility.
- No schema or RLS changes were made. No outlet status was changed; the four inactive outlets remain inactive.
- Existing production customer sponsor slider reads `jpt_sponsor_campaigns`. It refreshes every 60 seconds; the staging branch also refreshes immediately on `jpt:outlet-changed` and prioritizes the URL's selected outlet.

## Safety / verification
- Code changes are on `jpt-customer-tracking-screen-safe-20261012`; production `main` was not changed.
- Database rows were queried after insertion and all five active, outlet-scoped records were confirmed.
- Real-device rendering, image fetching from the raw GitHub URLs, and outlet switching still require browser/device verification. Do not describe this as end-to-end tested.
