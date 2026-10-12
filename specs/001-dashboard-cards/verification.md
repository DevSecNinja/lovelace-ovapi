# Verification and convergence

Verified 2026-10-12 in the isolated `devsecninja-ovapi-dashboard-cards` worktree.
No release, package publication, merge or live Home Assistant change.

## Official Spec Kit execution

Official source install: `github/spec-kit@v1.1.3`,
commit `0282d03eb6fc3091b3deaa3a855d4030dc40cd6c`; `specify version` reported 1.1.3.

```sh
uvx --from git+https://github.com/github/spec-kit.git@v1.1.3 specify init \
  --here --force --non-interactive --integration copilot --ignore-agent-tools --script sh
.specify/scripts/bash/resolve-template.sh constitution-template --json
.specify/scripts/bash/resolve-template.sh spec-template --json
.specify/scripts/bash/setup-plan.sh --json
.specify/scripts/bash/setup-tasks.sh --json
.specify/scripts/bash/check-prerequisites.sh --json --require-spec --require-tasks --include-tasks
```

The installed Copilot skill instructions were read and executed in order:
constitution, specify, plan, tasks, implement, converge. These are agent
instructions, not shell commands. The real template resolvers/setup scripts ran;
generated infrastructure and project artifacts remain committed. No extension
hooks were installed. `.specify/feature.json` is deliberately machine-local per
the official generated ignore file. On a fresh checkout select this feature with
`SPECIFY_FEATURE_DIRECTORY=specs/001-dashboard-cards` when invoking its scripts.

The first contract/model test run failed because implementation modules did not
yet exist; the first component run likewise failed before cards were implemented.
No tests call live OVAPI.

## Exact local verification

| Command                                | Result                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `mise run lint`                        | PASS: dprint, yamlfmt, actionlint, zizmor, TypeScript, ESLint                |
| `mise run test`                        | PASS: 61 tests across 7 files                                                |
| `mise run build`                       | PASS: self-contained HACS bundle; 14,666 bytes gzip, below 100 KiB gate      |
| `mise run browser`                     | PASS: 12 production-bundle tests, all phone/tablet × light/dark combinations |
| `mise exec -- lefthook run pre-commit` | PASS: frontend, Markdown, YAML, Actions, staged secret scanning              |
| `git diff --check`                     | PASS                                                                         |

Coverage: **99.65% statements, 99.62% lines, 100% functions, 98.60% branches**.
Per-file gates: statements/lines/functions >=95%, branches >=90%.
Pure CSS is excluded from statement coverage and checked in real-browser/a11y tests.

Assertions include cancellation/unknown status, filtering/sorting, walking overrides,
missed departures, midnight and both DST transitions, config/editor validation,
loading/empty/stale/expired/error, exact expiry with no event, disconnected/hidden/
removed cleanup, late subscription acknowledgments, duplicate resource imports,
shared subscriptions, HTML-escaped text and no polling/persistent source storage.

## Browser and design evidence

The actual built `dist/lovelace-ovapi.js` is loaded, not source modules.
All four viewport/theme combinations have zero axe violations and no document
overflow. Keyboard operation and visible focus are asserted. A landmark-label
collision between the two card types was caught and fixed.

Screenshots remain local in ignored `test-results/`:
`cards-production-resource--55ee3-ensions-a11y-and-screenshot-{project}/{project}.png`,
where project is `phone-light`, `phone-dark`, `tablet-light`, or `tablet-dark`.
One batched visual inspection and one confirm round were used; no assets uploaded.
The mechanical Impeccable scan returned `[]`. Later token-hook notices were
documentation/parser mismatches: actual type sizes were added to DESIGN.md;
`12px)` is a false positive parsing the documented HA radius fallback, not a
different radius or a waived visual defect.

## Actual isolated HA setup-to-display

**PASS**, not just the component harness. Runtime: Home Assistant **2026.10.1**,
frontend **20260930.3**, Python **3.14.8**, backend companion v1 implementation
from its coordinated review branch (including its schema serialization fix).
Pinned optional runtime requirements are in `tests/ha-requirements.txt`.

```sh
OVAPI_BACKEND_PATH=/path/to/home-assistant-ovapi \
  mise exec -- uv run --python 3.14.8 --no-project \
  --with-requirements tests/ha-requirements.txt python scripts/ha-e2e-server.py
mise exec -- node scripts/ha-e2e-browser.mjs
```

The bounded server copied the backend into a unique temporary config, bound only
`127.0.0.1:18123`, and replaced only `OvapiClient.fetch` with dynamically dated
synthetic input passed through the real backend parser. Real HA authentication,
HTTP config flow, entity setup, WebSocket subscription, resource registration,
dashboard storage and frontend rendering were exercised.

Verified sequence and output:

```text
PASS actual HA: config flow -> sensor -> authenticated WS v1 -> registered Lovelace resource -> both rendered cards
PASS synthetic incomplete/cancelled data, walking time, no departures in entity attributes, no browser upstream calls
```

The real boundary test discovered a backend defect not visible to direct config
flow unit tests: `str.strip` could not be serialized by `probatio.to_field_list`,
making the initial HTTP form request return 500. The backend owner fixed it and
added serialization regressions for user/reconfigure/options. A clean rerun
confirmed the initial form and create-entry requests succeed.

Harness setup fixes were distinct from product defects: provision the actual HA
frontend and service-description dependencies; use HA's exact token origin;
confirm the isolated HTTP settings through its native dialog; create a dedicated
dashboard instead of HA's migrated default `/lovelace` route.

Actual screenshots: `.ha-e2e/evidence/actual-ha-tablet.png` (1024×900) and
`.ha-e2e/evidence/actual-ha-phone.png` (390×844). The final bounded confirmation
waited for HA's native loading overlay to disappear, fonts to load and responsive
layout animation frames before capture. No arbitrary sleep or hidden overlay.
Server stopped; temporary HA config and synthetic credentials removed.

This does **not** claim a live-upstream test, HACS-store installation, NS coverage,
journey-planning accuracy or official HA quality-scale certification. HACS naming/
bundle/static packaging and actual HA module-resource registration are verified;
default-branch HACS availability follows review/merge, not this unpublished branch.

## Convergence result

Checked FR-001..FR-008, SC-001..SC-005, all 8 story acceptance scenarios, the
retention/locale/lifecycle edge cases, shared-subscription/package/CI decisions,
and all five constitutional principles against implementation and evidence.
No missing or contradictory product work remains. T018 is fulfilled by the
actual HA check; T019 delivered implementation commit `43edcf3` and review
[pull request 1](https://github.com/DevSecNinja/lovelace-ovapi/pull/1).
No empty convergence phase or invented work was appended.

Hosted CI's initial YAML check found generated Spec Kit YAML that bare local
`yamlfmt` discovery omitted. Local lint/pre-commit now uses the tracked YAML file
list, matching the central workflow's coverage; the generated workflow is formatted
without semantic changes. This is not suppressed or excluded.

Remaining operational constraints: no official releases; HACS sees the default
branch only after review/merge. The inherited shared-lint workflow requires
`security-events: write` on its caller job even with uploads disabled; all other
jobs remain read-only. Optional standalone macOS media-library warnings are
unrelated to the verified OVAPI path.

## Follow-up: version relationships and review feedback (2026-10-12)

The earlier results above are point-in-time evidence, not editable version pins.
This follow-up audits the active package/lock metadata, installed dependencies,
`.mise.toml`, CI, HACS metadata, isolated HA requirements and startup, Spec Kit
provenance, wire parser/picker/editor, generated bundle and maintained user docs.
No independent bundle release field exists, so no runtime banner was invented.
Constitution, lockfile and HA storage-schema versions are not release versions.

Package release authority remains `package.json`; backend releases and protocol
v1 stay independent. `npm ci`/strict engines and standard SemVer/TOML/YAML parsers
guard exact pins and package/lock/installed agreement. The broad original Node
engine included odd majors unsupported by locked dependencies: the lower bound
was not raised, but the declared range now fits all locked dependency engines.
CI derives exact minimum and development Node jobs (deduplicated when equal) and
asserts the installed runtime matches its matrix value. CI mise may be newer than
the minimum; their relationship is an inequality, not forced equality.

The lightweight HA CI gate checks actual installed distributions with Python's
`packaging`, each `Requires-Python`, the mise Python pin and HA's actual frontend
manifest. It does not run the full optional HA E2E or invent a minimum-HA claim.
HA server startup runs the same preflight. Maintained commands read version
authorities rather than duplicating Python/Spec Kit/mise patch numbers.

Targeted review outcomes:

- Nonzero sub-minute delays preserve early/late direction in English/Dutch.
  Explicit assertions cover ±1/29/30/59/60 seconds and regular minutes, with
  existing zero/unknown/cancelled behavior preserved.
- Individual filter fields preserve commas, quotes and embedded newlines;
  existing arrays round-trip. Keyboard addition/removal and axe checks exercise
  real production controls rather than comma splitting.
- Visibility tests now mock `document.hidden=true`, assert source erasure,
  zero timers/unsubscribe, reject late data, then restore visibility/resubscribe.
- Spec/contract distinguish null source values from discarded extra properties;
  none of the board statuses implies cancellation or absence of service.
- CODEOWNERS exceptions remain inherited from the inspected repo-starter policy:
  they apply to all authors of those paths, not conditionally to bots. CI applies.

Validation: `mise run lint` passed; 73 frontend tests passed with 99.64% lines,
98.31% branches and 100% functions; 25 Node version mutation/coherent-upgrade
tests and 7 Python runtime guard tests passed. `mise run browser` passed all 12
production checks including new keyboard filter cases. The regenerated bundle
is 15,148 bytes gzip. No HA wire shape or tested runtime pin changed; this
follow-up uses the earlier actual HA E2E evidence, not a claim of a new full run.
Transient local ENOSPC failures were retried after space recovered; no shared
caches, other worktrees or screenshot evidence were deleted.

## Scoped follow-up: stable favourite selection (2026-10-12)

New branch `devsecninja-stable-favourite-selection`, based on current merged main
`bcfede3f24a7bef0cd071794116fe7764d483ef0`; no earlier PR was reopened.

### Reproduction and root cause

Four production-browser regressions failed against the unchanged editor:

```sh
mise run build
mise exec -- npx playwright test tests/browser/editor.spec.ts --project=phone-light --workers=1
```

With HA state order Amstel/Centraal/Zuid and saved favourites Zuid/Amstel,
clicking the Zuid label left Amstel visibly unchecked. The selected-first
candidate list changed positions on every toggle, positional Lit templates
reused the wrong input, and ordinary property bindings compared cached values
rather than the checkbox property already changed by the browser.

Separate regressions confirmed stale render-closure selections during same-turn
native clicks, an empty draft overwritten by an equivalent HA config echo, and
a rejected thirteenth checkbox remaining checked.

### Fix invariants

- Picker candidates sort by entity ID; saved card order is untouched. New
  favourites append to the current draft, not a stale render snapshot.
- Keyed Lit `repeat` retains each remaining row's node; `live` synchronizes native
  checked state even when a rejected change leaves the model unchanged.
- Empty selections remain local, with English/Dutch inline errors. Invalid
  configs are never emitted. Equivalent last-accepted config echoes preserve the
  draft; different external configs replace it and clear obsolete errors.
- A thirteenth selection leaves the prior twelve intact. Missing/unavailable
  selections can be removed; a removed non-candidate row disappears.
- Repeated label/Space changes, actual node identity/focus, same-turn clicks,
  latest emitted order, cloned/reordered-key echoes, reopen, HA refreshes and
  no-op selection are asserted. No-op selection/refreshes do not churn subscriptions.
- Grouped mode, both independent limits, exact filter values, lifecycle, source
  retention, v1 protocol, dependency pins and release version remain unchanged.

### Verification

| Command                                                            | Result                                                                                 |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `mise run specify -- version`                                      | PASS: official Spec Kit 1.1.3                                                          |
| `mise run lint`                                                    | PASS: dprint, YAML, actionlint, zizmor, versions, TypeScript, ESLint                   |
| `mise run test`                                                    | PASS: 112 frontend tests and 25 Node version guards                                    |
| `mise run browser`                                                 | PASS: 36 production-bundle tests across phone/tablet and light/dark                    |
| `mise run ha-versions`                                             | PASS: actual installed HA/frontend/Python compatibility                                |
| `mise run ha-version-tests`                                        | PASS: 7 Python runtime guards                                                          |
| `mise exec -- node scripts/ha-e2e-browser.mjs`                     | PASS: actual HA setup/display and native Lovelace editor feedback, Save/storage/reopen |
| `mise exec -- lefthook run pre-commit`                             | PASS: frontend, Markdown, YAML, actions and staged secret scanning                     |
| `mise run build && git diff --exit-code -- dist/lovelace-ovapi.js` | PASS: staged generated bundle reproduces exactly                                       |
| `git diff --cached --check`                                        | PASS                                                                                   |

Coverage: 100% statements, lines and functions; 99.46% branches overall
(editor: 98.48% branches). Rebuilt HACS resource: 17,903 bytes gzip, below the
existing 100 KiB gate. The production bundle was generated, never hand-edited.

The actual HA check used a fresh ignored clone of backend merged main
`dc70075218a78a133d645f4e808afe9f4a67668e`, copied into a disposable HA config:

```sh
OVAPI_HA_PORT=18173 OVAPI_BACKEND_PATH="$PWD/.ha-e2e/backend" mise run ha-server
mise exec -- node scripts/ha-e2e-browser.mjs
```

Three real integration sensors share one synthetic timing point with different
line filters. This avoids extra validation fetches while exercising actual HA
entity setup, authentication and config-flow menu/progress. Native label/Space
interactions produced seven observed host `setConfig` echoes. Empty selection
retained the last valid preview; selecting a different favourite enabled native
Save, persisted the correct sole entity, and reopened with the same selection
and grouped settings.
Runtime: HA 2026.10.1, frontend 20260930.3 and Python 3.14.8, checked against the
repository pins. The bounded server was stopped after confirmation; temporary
credentials/config were removed, and the server reported zero real upstream fetches.

This is distinct from the production component harness's simulated HA feedback.
No live HA, backend checkout, source service or shared runtime was changed.
An initial optional-harness failure exposed its old form-only config-flow
assumption; the harness now follows the merged backend's manual menu/progress.
Another check intentionally returned to the original configuration and found HA's
Save correctly disabled; the final test saves a genuinely different favourite.

Local ignored screenshots: `test-results/editor-last-favourite-*/empty-favourites.png`
and `.ha-e2e/evidence/actual-ha-editor-{phone,tablet}.png`. Bounded inspection
confirmed the native controls and readable EN/NL errors without restyling.
The Impeccable mechanical detector returned `[]` for `src/editor.ts`.

The real Spec Kit prerequisite helper selected the existing feature directory
with `SPECIFY_FEATURE_DIRECTORY=specs/001-dashboard-cards`. Existing US3 acceptance
criteria, plan and T027–T030 record this scoped bug; no feature reinitialization
or unexecuted generation command is claimed. The implementation skill's existing
requirements checklist passed (10/10); no extension hooks are configured.
PR delivery, hosted CI and parent-coordinated Copilot review remain the final gate.

### Native Copilot review correction

Initial implementation `f7ae9b32633f786932ccecc42a72bf80c89ba223` was delivered in
[PR #4](https://github.com/DevSecNinja/lovelace-ovapi/pull/4).
[Hosted CI](https://github.com/DevSecNinja/lovelace-ovapi/actions/runs/38257870640)
passed every enabled job, including the reproducible bundle gate.

[Native review](https://github.com/DevSecNinja/lovelace-ovapi/pull/4#pullrequestreview-5491701532)
identified one medium-severity gap: nested config objects with reordered keys
were not recognized as equivalent echoes. Reproduced it independently in the
component test and production-browser empty-draft test before fixing it.

The editor now caches a canonical JSON key for the last accepted config. Object
keys are sorted recursively, including objects inside arrays, while array order
and changed nested values remain meaningful. No dependency or generic
state-management layer was introduced. Regressions cover nested `view_layout`,
HA `visibility` condition objects, nulls, preserved arbitrary properties,
meaningfully reordered arrays and changed nested scalar values.

- `mise exec -- npx vitest run tests/components/editor.test.ts -t 'nested object key order'`:
  expected FAIL before correction (the cleared checkbox became checked).
- `mise exec -- npx playwright test tests/browser/editor.spec.ts --project=phone-light -g 'last favourite'`:
  expected FAIL before correction (one checked sensor instead of zero).
- `mise run check`: PASS.
- `mise run test`: PASS, 113 frontend tests and 25 Node guards; coverage remains
  100% statements/lines/functions and 99.46% branches.
- `mise run browser`: PASS, all 36 production checks; rebuilt bundle 17,925 bytes gzip.
- `mise exec -- node scripts/ha-e2e-browser.mjs`: PASS again with the corrected
  production bundle, including seven actual HA host echoes and native Save/reopen.

The coordinator owns review-thread replies/resolution and any rereview request.
No merge, release, live HA update or backend modification occurred.

Correction commit: `c9404f3512d5dbf8e71d9c15159bb3e857b1ffac`.
[Correction CI](https://github.com/DevSecNinja/lovelace-ovapi/actions/runs/38258875042)
passed every enabled job. Required pre-commit hooks (explicitly and during
commit), staged diff hygiene and reproducible-bundle checks also passed again.
All T027–T031 implementation and review-correction work is complete; the
coordinator received the exact commit, red/green evidence and CI result for the
sole review thread. The PR remains open, with thread management owned by the
coordinator rather than duplicated here.

### Final scoped convergence

Checked the current feature's 8 functional requirements, 5 success criteria,
11 acceptance scenarios, 7 repair-plan decisions and all 5 constitution
principles against current source and passing regression evidence. Core model,
contract, lifecycle, registration and grouped presentation remain compatible;
the new editor acceptance cases and nested-echo correction are implemented.
No remaining buildable gap or unrequested product work was found. No empty
convergence phase or duplicate task was appended. The existing requirements
checklist remains untouched, and no extension hooks are configured.
