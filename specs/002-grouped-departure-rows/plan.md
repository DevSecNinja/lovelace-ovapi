# Implementation Plan: Grouped departure rows

**Branch**: `devsecninja-grouped-departure-rows` | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-grouped-departure-rows/spec.md`.

## Summary

Extend the existing pure time/filter model with per-board grouping. Add opt-in
`display_mode: grouped` and `max_routes`; leave `max_departures` unchanged.
Reuse the existing row, status, locale and timer paths. Three following usable
departures and bounded clock-time cancellation notices fit below the destination.

## Technical Context

**Language/Version**: TypeScript 6.0.3, repo-local Node 22.23.3.
**Primary Dependencies**: Existing Lit 3.3.3 and Vite 8.3.4; no new dependencies.
**Storage**: Existing ephemeral board memory, with no new retained model state.
**Testing**: Vitest model/component coverage, production Playwright and axe.
**Target Platform**: HA modern browsers; phone/tablet, light/dark, English/Dutch.
**Project Type**: HACS frontend resource.
**Performance Goals**: Sort/filter once per board render, linear grouping, at most
20 route rows, three following entries and three cancellation notices per row.
**Constraints**: Existing <=29-minute expiry, no requests/persistence/logs,
unchanged v1 wire contract and commute selection, no version bump.
**Scale/Scope**: Existing <=12 entities and <=5000 departures per snapshot.

## Constitution Check

Pre-research and post-design: PASS. All five principles hold. Grouping produces
only render-local references to validated v1 data and inherits cleanup unchanged.
No new actual HA E2E is required for this frontend-only contract-preserving change;
use the production component harness honestly and retain prior isolated HA evidence.
No constitutional exception, shared CI change or backend dependency.

## Project Structure

### Documentation (this feature)

`specs/002-grouped-departure-rows/`: spec, plan, research, data model, configuration
contract, quickstart, tasks and final verification evidence.

### Source Code (repository root)

- `src/model.ts`: mode/limits, shared normalization, deterministic grouping.
- `src/cards.ts`: reuse row rendering for grouped and individual presentations.
- `src/editor.ts`, `src/localize.ts`, `src/styles.ts`: mode-specific labelled
  controls and restrained HA-native secondary information.
- `tests/unit/model.test.ts`, `tests/components/`: focused behavior assertions.
- `tests/fixtures/`, `tests/harness/main.ts`, `tests/browser/cards.spec.ts`:
  synthetic repeated-route fixture and production accessibility/visual coverage.
- `README.md`, `DESIGN.md`, `dist/lovelace-ovapi.js`: docs and rebuilt artifact.

**Structure Decision**: Extend incumbent files and helpers; no new runtime layer.

## Complexity Tracking

No violations. Separate route limits avoid silently reinterpreting old settings.
