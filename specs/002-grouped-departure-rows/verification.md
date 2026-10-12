# Verification: Grouped departure rows

Date: 2026-10-12. Synthetic fixtures only. No OVAPI calls, live HA mutations,
source persistence, dependency changes, release bump or publication.

## Results

- `mise run check`: PASS (version relationships, TypeScript and ESLint).
- `mise run test`: PASS, 107 frontend tests and 25 Node version-guard tests.
  Coverage: 100% statements/lines/functions, 99.43% branches overall;
  every source file exceeds 95% lines/functions and 90% branches.
- `mise run browser`: PASS, 20 production-resource checks across phone/tablet
  and light/dark; grouped and original presentation, editor round-trip/keyboard,
  overflow, axe, no external requests and no browser storage.
- `mise exec -- lefthook run pre-commit`: PASS (frontend, Markdown, YAML,
  actionlint and staged secret checks).
- `mise exec -- dprint check`: PASS.
- `git diff --check`: PASS.
- Build regenerated `dist/lovelace-ovapi.js`; packaging check reports 16,409 bytes
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
gaps appended as T017 (final evidence) and T018 (PR/CI/review); both are completed.
All 19 implementation/convergence/review tasks are complete.

## Delivery

Delivered [PR #3](https://github.com/DevSecNinja/lovelace-ovapi/pull/3) from current
merged main. Implementation commit: `1b8de000754c0d557cf7a71230c8b46572c55238`.
Initial [CI run](https://github.com/DevSecNinja/lovelace-ovapi/actions/runs/38247860141)
passed all enabled jobs, including version/runtime contracts, shared lint and
production frontend/offline verification with the reproducible-bundle gate.

[Native GitHub Copilot review](https://github.com/DevSecNinja/lovelace-ovapi/pull/3#pullrequestreview-5490648532)
reported one low-severity Dutch singular/plural issue. Reproduced the failing
single-additional-cancellation case and fixed it with singular/plural labels in
`a4ac118a053852766346299c822b9015bf302573`; four EN/NL count-1/count-2 regressions
pass. Required local pre-commit/test/browser checks passed again; the production
bundle was regenerated, not hand-edited.

[Review-fix CI](https://github.com/DevSecNinja/lovelace-ovapi/actions/runs/38248431613)
passed all enabled jobs on that fix. The coordinator has the exact fix SHA and
regression evidence for replying to/resolving the review thread. Thread management
remains with the coordinator; no merge, release or live HA modification occurred.

## Latest-head review: explicit null configuration

The requested rereview found that explicit `null` for `max_routes` or
`display_mode` silently selected defaults, contrary to the new settings' types.
Reproduced both failures, then changed only these two defaults to apply when
undefined. Added direct-null and parsed YAML empty/`null`/`~` cases with exact
field-specific errors; explicit undefined and legacy `max_departures: null`
continue to default as before. Existing omitted-setting and zero-rejection tests
remain in place. No editor behavior, legacy configuration default or wire field
was changed.

- `mise exec -- npx vitest run tests/unit/model.test.ts --reporter=dot`: PASS,
  41 model tests after reproducing the two failures.
- `mise run test`: PASS, 107 frontend and 25 Node version-guard tests.
- `mise run browser`: PASS, 20 checks and regenerated 16,409-byte gzip bundle.

The rereview finding is summary-only; no new inline thread requires resolution.
The coordinator posts the fix/CI evidence as a top-level PR comment.
