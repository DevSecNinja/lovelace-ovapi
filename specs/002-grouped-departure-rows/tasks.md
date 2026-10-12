# Tasks: Grouped departure rows

**Input**: Design documents from `specs/002-grouped-departure-rows/`.
**Prerequisites**: spec, plan, research, data model and configuration contract.
**Tests**: Explicitly requested; deterministic assertions and production browser.
**Organization**: Three independently verifiable user stories; no new agents.

## Phase 1: Setup

- [x] T001 Inspect current merged main and restore missing locked tools from `.mise.toml` and `package-lock.json`.
- [x] T002 Complete Spec Kit spec, quality checklist and design in `specs/002-grouped-departure-rows/`.

## Phase 2: Foundational

- [x] T003 Define synthetic repeated routes in `tests/fixtures/boards.ts` and config/model tests in `tests/unit/model.test.ts`.
- [x] T004 Extend `src/model.ts` configuration with `display_mode: departures | grouped` (default departures) and `max_routes: integer 1-20 (default five)`; preserve all old defaults.

## Phase 3: User Story 1 - One row per route (Priority: P1)

**Goal**: Main departure plus three following times without hiding cancellation.
**Independent Test**: Five same-route events produce one row, three following
times, correct cancellation/status, deterministic DST and local-clock rollover.

- [x] T005 [US1] Add grouping/identity/time/filter/unknown/cancellation assertions in `tests/unit/model.test.ts` and `tests/components/cards.test.ts`.
- [x] T006 [US1] Implement immutable per-board grouping and exact-event deduplication in `src/model.ts`.
- [x] T007 [US1] Reuse row rendering with three following times and three cancellation notices plus additional count in `src/cards.ts`; add EN/NL copy in `src/localize.ts` and minimal wrapping styles in `src/styles.ts`.

## Phase 4: User Story 2 - Visible route limit (Priority: P1)

**Goal**: Show the soonest N route rows independently per favourite.
**Independent Test**: Six routes limited to three, filters before limit, next
noncancelled ordering and separate opposite directions/transport/boards.

- [x] T008 [US2] Verify limits, ordering/ties, per-board separation, filtering and legacy event count in `tests/unit/model.test.ts` and `tests/components/cards.test.ts`.
- [x] T009 [US2] Apply `max_routes` after grouping and use the active limit for sizing in `src/model.ts` and `src/cards.ts`.

## Phase 5: User Story 3 - Accessible opt-in editor (Priority: P2)

**Goal**: Clearly labelled mode and active limit without dropping inactive settings.
**Independent Test**: Round-trip mode/limits with keyboard, reject invalid values,
preserve old configs, and verify phone/tablet light/dark layout and accessibility.

- [x] T010 [US3] Add mode/limit round-trip and validation tests in `tests/components/editor.test.ts`.
- [x] T011 [US3] Add labelled display mode and route-count help to `src/editor.ts` and `src/localize.ts`, without changing commute presentation.
- [x] T012 [US3] Extend `tests/harness/main.ts` and `tests/browser/cards.spec.ts` for production grouped previews, a11y, editor keyboard operation and offline rollover.

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T013 Update `README.md` and `DESIGN.md` with configuration, route/cancellation semantics and unchanged contract.
- [x] T014 Run targeted/full gates, mechanical design detector and bounded screenshots; regenerate `dist/lovelace-ovapi.js`.
- [x] T015 Record convergence and results in `specs/002-grouped-departure-rows/verification.md`; run required pre-commit/test/browser before commit.
- [x] T016 Commit/push focused PR using `.github/PULL_REQUEST_TEMPLATE.md`, monitor CI and process coordinator-relayed native Copilot feedback.

## Dependencies & Execution Order

T001-T002 precede T003-T004. T005 precedes T006-T007; T006 requires T004.
T008 precedes T009 and requires grouping; T009 requires T007.
T010 precedes T011 and requires T004. T012 follows T007/T009/T011.
T013 follows implementation. T014 follows T012/T013, then T015 and T016.

## Parallel Opportunities

US1 model and rendering test files can be prepared independently; US2 per-board
component and pure ordering tests can be run together; US3 editor tests and browser
fixture work are independent after the model contract. Execute in this session;
no extra workers are necessary.

## Implementation Strategy

Build the grouped model/row as the MVP, then verify limits and editor round-trip.
Run narrow tests while implementing, then full coverage and production browser
gates. Use one batched visual inspection, one correction batch and at most one
confirmation; deliver one focused PR without release or live HA changes.

## Phase 7: Convergence

- [x] T017 Complete final full-suite/pre-commit validation and record exact results and bounded visual evidence in `specs/002-grouped-departure-rows/verification.md` per T014-T015 and SC-003/SC-004 (partial).
- [x] T018 Complete focused PR/CI delivery and coordinator-relayed native Copilot feedback, recording the outcome in `specs/002-grouped-departure-rows/verification.md` per T016 (partial).
