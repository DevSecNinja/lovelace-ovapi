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
