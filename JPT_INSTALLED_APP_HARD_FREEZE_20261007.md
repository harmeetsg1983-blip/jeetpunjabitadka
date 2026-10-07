# JPT INSTALLED APP — HARD FREEZE CONTRACT

Freeze date: 2026-10-07
Repository: harmeetsg1983-blip/jeetpunjabitadka
Frozen branch: jpt-installed-app-hard-freeze-20261007
Frozen source commit: 07ec879c26a1d69ce8d7b9ee6d938e9b3a59dc08

## HARD FREEZE
The installed JPT Partner PWA/mobile app working state is production-frozen.

DO NOT modify, overwrite, replace, refactor, or experimentally patch the installed-app order flow, Supabase realtime listeners, outlet routing, foreground/background alarm path, ringtone/audio path, or service-worker behavior from this frozen snapshot.

## Protected files
- admin.html
  SHA: 977b37cef566616e82091d8b721580913a6518bf
- jpt-unified-partner-orders-v1.js
  SHA: 6a109695d14fa1bfa0291e40f28335e801e03cb9
- jpt-partner-sw.js
  SHA: 1e52798ce664ee71740ac9b84878dff929ec25bf
- jpt-partner-access-bridge-v2.js
  SHA: 821ca1007289ddcdf53a7d20b5e19545b83bc6a1

## Current verified architecture at freeze
- Dynamic managed-outlet access is retained.
- Realtime order subscriptions are outlet-scoped.
- Each managed outlet has an independent Supabase Realtime channel.
- Existing foreground HTML-audio ringtone path is retained.
- Existing background/native Android alarm bridge path is retained.
- Partner PWA service-worker cache has been bumped to the frozen v20 generation.

## Future-change rule
Chrome/web-dashboard fixes, banners, UI work, tracking work, and new features MUST be developed in a separate branch/isolate and must not modify this frozen branch.

Any future production change must first be tested separately and explicitly approved before being merged into the installed-app production path.

## Scope
This freeze is specifically for the installed Partner PWA/mobile working state. Chrome/web-dashboard troubleshooting is out of scope for this frozen state.

## Important
This file is a repository freeze contract. It does not physically prevent a person with repository write access from changing files; it establishes the canonical snapshot that must be preserved.
