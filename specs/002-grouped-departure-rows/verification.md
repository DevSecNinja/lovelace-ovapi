# Verification: Grouped departure rows

Date: 2026-10-12. Synthetic fixtures only. No OVAPI calls, live HA mutations,
source persistence, dependency changes, release bump or publication.

## Results

- `mise run check`: PASS (version relationships, TypeScript and ESLint).
- `mise run test`: PASS, 100 frontend tests and 25 Node version-guard tests.
  Coverage: 100% statements/lines/functions, 99.43% branches overall;
  every source file exceeds 95% lines/functions and 90% branches.
- `mise run browser`: PASS, 20 production-resource checks across phone/tablet
  and light/dark; grouped and original presentation, editor round-trip/keyboard,
  overflow, axe, no external requests and no browser storage.
- `mise exec -- lefthook run pre-commit`: PASS (frontend, Markdown, YAML,
  actionlint and staged secret checks).
- `mise exec -- dprint check`: PASS.
- `git diff --check`: PASS.
- Build regenerated `dist/lovelace-ovapi.js`; packaging check reports 16,368 bytes
  gzip, within the existing 100 KiB limit. Wire contract and lifecycle module unchanged.

Initial model/UI tests failed before implementation as expected. An early browser
run paused all timers and blocked axe's asynchronous scanner; using a fixed wall
clock with running timers corrected the test harness. All final checks passed.

No new actual HA E2E or local Python/HA metadata check was run: this change
preserves v1 and the pinned environment. The production component harness is not
a substitute claim for the prior isolated actual HA verification in feature 001.

## Behavior evidence

| Requirement         | Evidence                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-001, FR-006, US3 | Old config stays individual; mode and independent limits round-trip; defaults and 1/20 boundaries asserted; invalid values rejected.                               |
| FR-002, US1/AC2     | Transport, line and destination tuple; case/edge whitespace normalization shared with filters; opposite directions and entities separate.                          |
| FR-003, US2         | Filters before grouping/limit; expected/scheduled instants; elapsed filtering; noncancelled ranking and deterministic ties.                                        |
| FR-004              | Five route events yield one main plus exactly three following times; distinct same-minute vehicles preserved; identical events removed, conflicting IDs preserved. |
| FR-005              | Mixed/only cancellations with bounded clock-time notices and remaining count; unknown main/following status retained; no cancelled countdowns.                     |
| FR-007, FR-008      | Local rollover/rounding/DST/midnight; stale/empty/error; exact expiry and hidden/disconnected/detached erasure; no extra subscription calls.                       |
| SC-004              | Phone 390px/tablet 1024px in both themes; extra 240px card-container overflow assertion; axe and keyboard focus/controls pass.                                     |

## Bounded visual review

Inspected grouped phone/tablet light/dark screenshots in one batch, then editor
phone-light/tablet-dark evidence. Clear hierarchy, no clipped destinations or
time collisions; no visual corrective edits required. The final full browser run
regenerated the same evidence without additional polish iterations.

Local ignored evidence (never committed or uploaded):

- `test-results/cards-grouped-production-r-22862-on-themes-and-accessibility-phone-light/grouped.png`
- `test-results/cards-grouped-production-r-22862-on-themes-and-accessibility-phone-dark/grouped.png`
- `test-results/cards-grouped-production-r-22862-on-themes-and-accessibility-tablet-light/grouped.png`
- `test-results/cards-grouped-production-r-22862-on-themes-and-accessibility-tablet-dark/grouped.png`
- `test-results/cards-grouped-editor-round-a8607-d-legacy-limit-preservation-phone-light/grouped-editor.png`
- `test-results/cards-grouped-editor-round-a8607-d-legacy-limit-preservation-tablet-dark/grouped-editor.png`

Impeccable mechanical detector: one advisory false positive on the unchanged
`var(--ha-card-border-radius, 12px)` fallback. The scanner parses `12px)` instead
of the documented `12px` card fallback in DESIGN.md. No suppression or unrelated
styling change was made.

## Spec Kit convergence

Official installed 1.1.3 helpers used for specification template resolution,
planning, tasks, implementation prerequisites and convergence. No extension hooks
configured. Reviewed 8 functional requirements, 5 success criteria, 10 acceptance
scenarios, 5 plan decisions and all 5 constitution principles against current code.
No missing, contradictory or unrequested functionality. Two low-severity delivery
gaps appended as T017 (final evidence, completed) and T018 (PR/CI/review, pending).

## Delivery

Focused PR/CI and native GitHub Copilot review are pending. The coordinator requests
the review and relays feedback; this branch must not be merged or published here.
