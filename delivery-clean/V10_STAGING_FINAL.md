# DELIVERY PARTNER CLEAN V10 — STAGING FINAL

This branch is isolated from production. It is based on the known-good production commit `826abcaf581b9008d96a3ece0a2c43c8fa907201`.

## Scope
- Clean delivery controller
- Single alert owner
- Realtime/broadcast/poll deduplication
- GPS lifecycle
- Server-truth lifecycle
- Push contract
- Real E2E verification gate
- Read-only backend verification

## Production protection
Do not merge this branch into main until the real E2E gate passes.

Protected production files:
- admin.html
- jpt-unified-partner-orders-v1.js
- jpt-partner-sw.js
- jpt-partner-access-bridge-v2.js
- production ringtone engine
- customer/order flow

## Final real test
Fresh order -> one assignment -> one offer -> accept -> server refresh -> GPS -> out_for_delivery -> delivered -> GPS stop -> one earning -> late-event resurrection check -> push verification.

## Current backend audit
At the latest audit:
- riders: 1
- device sessions: 1
- push tokens: 0
- assignments: 0
- GPS rows: 0
- earnings: 0

Therefore the real runtime gate remains pending until a fresh assignment is generated and executed.

## Rule
No simulated result may be reported as live production success.
