# Approach B — Isolated Order-State Controller

Status: **development scaffold; not wired into production runtime**.

This branch adds a dependency-injected controller and Node.js tests for per-order locking, server-authoritative transition checks, post-action reconciliation, and Realtime event race handling.

## Explicitly not changed
- `admin.html`
- `jpt-unified-partner-orders-v1.js`
- Customer app, Supabase schema/RPC/RLS
- ringtone assets, ringtone engine, native Android alert behavior
- UI, order cards, coupon, countdown, and navigation

## Integration gate
Do not load this module in production or merge it as a behavior fix until a separate integration change safely delegates transitions and Realtime events to it while preserving the existing audio owner. Run `node --test tests/jpt-order-state-controller-v1.test.cjs`, syntax checks, production gate, then real Android APK/device E2E tests.

The current production gate's ringtone integrity mismatch is independent and remains unresolved; do not bypass or rewrite its expected checksum.
