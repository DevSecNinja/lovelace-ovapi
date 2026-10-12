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
actual HA check; T019 is the final review-branch delivery step.
No empty convergence phase or invented work was appended.

Remaining operational constraints: no official releases; HACS sees the default
branch only after review/merge. The inherited shared-lint workflow requires
`security-events: write` on its caller job even with uploads disabled; all other
jobs remain read-only. Optional standalone macOS media-library warnings are
unrelated to the verified OVAPI path.
