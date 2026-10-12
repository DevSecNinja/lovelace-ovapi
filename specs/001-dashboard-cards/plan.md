# Implementation Plan: OVAPI dashboard cards

**Branch**: `devsecninja-ovapi-dashboard-cards` | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-dashboard-cards/spec.md`.

## Summary

Two Lit custom elements share a validated in-memory HA WebSocket subscription per
connection/entity. Local timers handle countdown/expiry only. One bundled ES module,
HA-native CSS variables, English/Dutch labels, accessible configuration editor.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (ESLint-compatible), Node 22.23.3 pinned with repo-local mise.
**Primary Dependencies**: Lit 3.3.3; Vite 8.3.4 bundling.
**Storage**: Expiring memory only; user dashboard configuration belongs to HA.
**Testing**: Vitest 5.0.3, happy-dom, Playwright 1.64.0 and axe.
**Target Platform**: HA-supported modern browsers on phone/tablet.
**Project Type**: HACS Lovelace resource.
**Performance Goals**: One subscription per distinct board per connection; zero
network calls from countdowns; bounded rendered rows; bundle under 100 KiB gzip.
**Constraints**: Retention <=29min, no upstream fixtures, no live HA mutation.
**Scale/Scope**: Two cards, one editor, <=12 favourites per card and <=20 visible rows.

## Constitution Check

Pre-research and post-design: PASS. No source persistence, public upstream calls,
quality-scale claims, live HA changes or publication. Explicit lifecycle/time tests
and actual isolated HA evidence required. No constitutional exceptions.

## Project Structure

```text
src/
  contract.ts       # backend-owned v1 validation and types
  subscription.ts   # shared ephemeral subscription and expiry
  model.ts          # config, filtering, sorting, time calculations
  localize.ts       # EN/NL labels and HA-localized times
  cards.ts          # departure and commute custom elements
  editor.ts         # accessible visual configuration
  styles.ts         # HA-theme-aware card styles
  index.ts          # resource and card-picker registration
tests/
  unit/            # deterministic contracts/time/lifecycle
  components/      # rendering/editor assertions
  browser/         # production bundle, dimensions, a11y, evidence
  fixtures/        # synthetic boards only
  harness/         # offline component host, not HA E2E
scripts/           # packaging and isolated HA verification
dist/lovelace-ovapi.js
```

## Complexity Tracking

Shared subscription state is necessary to avoid duplicate listeners and cached
payloads when both cards show the same favourite. No state-management dependency.

## Scoped follow-up: stable favourite selection

Branch `devsecninja-stable-favourite-selection`, based on merged main
`bcfede3f24a7bef0cd071794116fe7764d483ef0`. This repairs US3 rather than introducing
a new feature or configuration/contract version. Grouped rows and both limits
remain unchanged.

Reproduce with native clicks in the production-bundle harness before changing
the editor. Sort picker candidates by immutable entity ID independently of saved
order; use Lit keyed `repeat` and `live` checked properties. Read the current
draft for each toggle, reject the thirteenth selection without storing it, and
retain an empty draft with the existing validation boundary. Ignore equivalent
HA echoes of the last accepted config (including reordered object keys), but
accept different external configs and clear stale errors. Never emit invalid
drafts. No general state-management layer or new dependency is needed.
The echo comparison canonicalizes object keys at every nesting level, including
objects in arrays; array order and changed nested values remain significant.

Extend browser and component regressions for label/Space, rapid native clicks,
row identity/focus, config feedback/reopen, limits, missing/unavailable sensors,
English/Dutch and unrelated HA refreshes. Reuse the bounded actual HA harness
for native Lovelace dialog feedback when the optional runtime is available;
keep it explicitly distinct from the synthetic component host.

Constitution check: all five principles retained; no backend contract, source
retention, live HA, upstream requests, release or permission changes.

## Scoped follow-up: station coverage explanations

Branch `devsecninja-station-coverage-indicator`, based on merged main
`e3d8a5cd4f5430ac07c8279c02cb51e7e78a3069`. Extend this feature's honest-state
requirements rather than creating a new presentation or configuration version.
Coordinate the optional additive v1 contract and synthetic fixtures with the
backend owner before finalizing validation.

Whitelist the small coverage record separately in `BoardView` when unavailable
so source payloads remain discarded. Reuse the existing single subscription
deadline timer at the earliest live/metadata deadline and the existing render
clock guard; no polling timer, HTTP, dependency or persistence. Local metadata
expiry removes counts/dates along with departures and leaves only a generic
expired-coverage reason. All lifecycle cleanup clears that reason too.

Reuse native `.message`/`.warning` text and `role=status`. Add EN/NL copy for partial
verified/selected quay counts, unavailable/expired metadata, failed metadata
refresh and no quays matching selected transport modes. Complete nonzero boards
keep their existing presentation. Ordinary stale suppresses commute advice.
Do not alter editor identity, config echoes, grouping, picker/version handling
or release numbers.

Constitution check: all five principles retained. Static membership metadata
and live departures have distinct deadlines; no source-data retention exception.
Expired metadata cannot extend or revive source data. Verification includes
producer-shaped fixtures, per-file coverage, production bundle/browser/axe and a
joint isolated HA run with the backend, never live HA or live OVAPI.
