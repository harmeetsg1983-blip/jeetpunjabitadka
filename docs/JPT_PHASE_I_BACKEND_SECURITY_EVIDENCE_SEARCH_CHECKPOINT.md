# JPT Phase I — Backend Security Evidence Search Checkpoint

Date: 01 Oct 2026
Branch: jpt-central-app-architecture-v1

## Scope
Audit the controlled repository for executable evidence that a Partner authorized for outlet A is rejected by the backend when attempting to read or write outlet B data.

## Findings
- The current controlled branch HEAD is the previously locked two-outlet negative-access evidence checkpoint.
- GitHub Actions workflows provide protected-baseline, source-marker, JavaScript syntax, and repository-scope validation.
- The audited workflows do not contain a two-account/two-outlet Supabase negative-access test.
- Repository code search did not surface an authoritative CREATE POLICY definition proving outlet isolation.
- Repository code search did not surface authoritative delivery/order partner RPC function bodies that independently prove tenant authorization.
- The supabase directory contains scratch SQL (including V106_ROYAL_SCRATCH.sql), but no independently auditable production RLS/function policy source establishing the required cross-outlet rejection behavior.
- Client-side filters such as selected outlet_id and partner_my_outlets remain intended scoping mechanisms, not proof of server authorization.

## Status
Cross-outlet isolation: NOT GREEN.

## Required evidence before GREEN
1. Two distinct outlet identities/accounts.
2. Positive own-outlet read access for each account.
3. Negative cross-outlet read attempts.
4. Negative cross-outlet write/status attempts.
5. Server-side rejection evidence for those attempts.
6. Equivalent delivery/order/menu/financial access checks where applicable.

## Change safety
No production application code, Supabase schema, RLS policy, or business logic was changed by this checkpoint.
