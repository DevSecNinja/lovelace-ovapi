# Tasks: OVAPI dashboard cards

**Input**: `specs/001-dashboard-cards/{spec,plan,research,data-model}.md` and contracts.

## Phase 1: Setup

- [x] T001 Initialize pinned official Spec Kit and constitution in `.specify/`.
- [x] T002 Pin frontend/test tools and mise tasks in `package.json`, `.mise.toml`.
- [x] T003 Configure typecheck, lint, coverage and browser runners in root configs.

## Phase 2: Foundation

- [x] T004 Write contract/expiry/lifecycle tests in `tests/unit/`.
- [x] T005 Implement exact v1 validation in `src/contract.ts`.
- [x] T006 Implement shared ephemeral subscriptions in `src/subscription.ts`.

## Phase 3: US1 - Departure boards (P1)

**Independent test**: synthetic full replacement, filtering, status and expiry assertions.

- [x] T007 [US1] Write sorting/filtering and rendering tests in `tests/unit/model.test.ts`, `tests/components/cards.test.ts`.
- [x] T008 [US1] Implement validated config/time model in `src/model.ts`.
- [x] T009 [US1] Implement departure board and HA styles in `src/cards.ts`, `src/styles.ts`.
- [x] T010 [US1] Provide honest English/Dutch states in `src/localize.ts`.

## Phase 4: US2 - Commute (P1)

**Independent test**: walking, cancelled, stale, midnight/DST and local countdowns.

- [x] T011 [US2] Test and implement commute selection in `src/model.ts`, `tests/unit/model.test.ts`.
- [x] T012 [US2] Test and implement commute rendering in `src/cards.ts`, `tests/components/cards.test.ts`.

## Phase 5: US3 - Accessible delivery (P2)

**Independent test**: configure all options, load production resource and use keyboard.

- [x] T013 [US3] Test and implement editor in `src/editor.ts`, `tests/components/editor.test.ts`.
- [x] T014 [US3] Register cards and package HACS resource in `src/index.ts`, `hacs.json`.
- [x] T015 [US3] Run phone/tablet light/dark/a11y browser tests in `tests/browser/`.

## Final phase: Verification and delivery

- [x] T016 Document installation, policy boundaries and development in `README.md`.
- [x] T017 Align repository conventions and CI in `.github/workflows/`.
- [x] T018 Verify actual isolated HA/backend/card contract in `scripts/`, record evidence in `verification.md`.
- [x] T019 Execute convergence, finish artifacts and push reviewed implementation branch.

## Dependencies & Execution Order

Setup -> foundation -> US1/US2/US3 -> final verification. Shared card renderer makes
US1/US2 implementation sequential; their pure tests are independently executable.
Editor work and model tests could run in parallel, but this session implements
directly without delegation. Deliver incrementally and validate each layer before
full production-browser and actual-HA checks.
