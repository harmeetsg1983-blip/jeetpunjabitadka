# JPT V106 — Royal Gold Launch

This is an additive patch to the existing Jeet Punjabi Tadka production source. It does not create a new app or replace the existing menu.

Included:
- Royal Gold Scratch & Reveal styling with metallic-gold reward amount and sweep animation.
- Reward data comes only from active outlet-configured scratch offers.
- No hardcoded ₹40 reward fallback in the customer calculation.
- Five supported configured slabs: 20% up to ₹40, 30% up to ₹60, 40% up to ₹80, 50% up to ₹100, 60% up to ₹120.
- Admin offer editor fields for maximum discount and Royal Gold Scratch flag.
- Admin one-tap setup for the five V106 scratch slabs for the selected outlet.
- Existing menu, categories, prices, cart, WhatsApp, UPI, multi-outlet and order-save compatibility are preserved.

Supabase:
Run `supabase/V106_ROYAL_SCRATCH.sql` once in the SAME Supabase project used by the live menu.

Verification gate:
Source-level validation is not a live verification. After the workflow completes, test a real customer order and the Royal Gold Scratch flow on the deployed site.
