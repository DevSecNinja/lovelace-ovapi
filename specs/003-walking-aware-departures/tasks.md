# Tasks: Walking-aware departures

**Input**: This directory's spec, plan, research, data model and configuration contract.

## Phase 1: Setup

- [x] T001 Confirm current main and reproduce walking semantics in `src/model.ts`, `src/cards.ts`, `src/editor.ts`; restore missing pinned dependencies.
- [x] T002 Resolve official Spec Kit templates and document the narrowed assumption in `specs/003-walking-aware-departures/`.

## Phase 2: Foundation

- [x] T003 Add synthetic combined-route fixtures and red walking-mode regressions in `tests/fixtures/boards.ts`, `tests/unit/model.test.ts`, `tests/components/cards.test.ts`.

## Phase 3: US1 - Walking-aware choices (P1)

**Independent test**: 2/8/14/20/26 departures, walk7 => leave1 and following7/13/19,
with at least three routes, modes/directions separate and filters before limits.

- [x] T004 [US1] Add `time_mode: departure | leave`, default departure, rejecting explicit null/invalid values in `src/model.ts`; share catchable selection with commute.
- [x] T005 [US1] Render explicit primary/following leave times and walking context in `src/cards.ts`, `src/localize.ts`, `src/styles.ts`; preserve departure and commute defaults.

## Phase 4: US2 - Configuration (P1)

**Independent test**: Mode switches and override omitted/set/clear/zero survive
save/reopen; feed picker excludes diagnostics, retains unavailable originals.

- [x] T006 [US2] Cover configuration/editor mode defaults, walking precedence, inactive-value preservation and feed-only candidates in `tests/components/editor.test.ts`, `tests/unit/model.test.ts`.
- [x] T007 [US2] Add orthogonal time selector and applicable optional walking override/help in `src/editor.ts`, `src/localize.ts`, preserving existing checkbox echo logic.

## Phase 5: US3 - Safe timing and lifecycle (P1)

**Independent test**: Stale/error/unavailable/expired/cancelled or unreachable
candidates never give unsafe instructions, including clock and lifecycle edges.

- [x] T008 [US3] Pass one render instant through source reads and time calculations in `src/cards.ts`, `src/subscription.ts`; preserve irreversible expiry.
- [x] T009 [US3] Assert delay/unknown, duplicate/collision, clock/lifecycle and no-extra-subscription cases in `tests/unit/model.test.ts`, `tests/components/cards.test.ts`.
- [x] T010 [US3] Extend production harness and browser proof for grouped/individual leave, EN/NL, phone/tablet, themes, keyboard and axe in `tests/harness/main.ts`, `tests/browser/`.

## Final Phase: Verification and delivery

- [x] T011 Document defaults, precedence, zero/clear and time semantics in `README.md`, `DESIGN.md` and feature artifacts.
- [x] T012 Run required pre-commit/test/browser gates and regenerate `dist/lovelace-ovapi.js`; send artifact hash/head to backend peer.
- [x] T013 Record actual isolated HA combined-feed authenticated WS and native editor save/reopen proof in `specs/003-walking-aware-departures/verification.md`; screenshots remain ignored.
- [x] T014 Run convergence, create/push focused Conventional Commit and PR using `.github/PULL_REQUEST_TEMPLATE.md`; report head for parent-managed native Copilot review.

## Dependencies & Execution Order

T001/T002 -> T003 -> T004 -> T005. T006 follows T003 and precedes T007.
T008 follows T004/T005; T009 follows T008. T010 follows T005/T007/T009.
T011 follows implementation; T012 follows T010/T011 and creates a verified
candidate commit so the peer can pin source and bundle. T013 follows T012 and peer
runtime readiness; T014 records final evidence and opens the PR after T013.

## Parallel Opportunities

US1 model and component regression files can be written independently. US2 editor
tests can proceed beside US1 model work. US3 unit/lifecycle/browser assertions use
separate files once implementation is ready. The actual HA backend peer prepares
its isolated runtime independently; no additional frontend agents are needed.

## Implementation Strategy

Small verified increments: red fixture/model/render tests, selection/rendering,
editor and precedence, lifecycle/browser, then final joint HA evidence and PR.
US1 is the minimum functional increment; all stories are required before delivery.

## Phase 6: Convergence

- [x] T015 Complete and record the joint actual-HA combined-feed authenticated
      WebSocket/native editor proof in `specs/003-walking-aware-departures/verification.md`
      per FR-007, SC-005 and T013 (partial). Offline production-browser evidence is
      complete but is not a substitute for native HA; no remaining product-code gap.

T015 closes the existing T013 evidence obligation, not additional product scope.

## Review follow-up

- [x] T016 Refresh `specs/003-walking-aware-departures/verification.md` with the
      corrected backend exact-origin harness guard and repeated dual-HA proof;
      keep the reviewed frontend source and bundle unchanged.
