# Verification: Walking-aware departures

## Scope and provenance

Date: 2026-10-13. Current main was fetched and confirmed at
`eb99055cfa592305012535829250a97af966130c`; implementation candidate:
`989266688e788863db64be3d923ed9a57f9be589`.

The latest user clarification narrowed the work to optional walking-aware
**departures**, not a commute redesign. Neither card's default changed.
`time_mode: leave` works with either individual or grouped rows. The editor now
hides the walking field when it has no effect and explains override precedence,
clearing and explicit zero. Backend WebSocket v1 and feed identity are unchanged.

Production artifact: `dist/lovelace-ovapi.js`.
SHA256: `299636dd37b6e8ea673d2b56fe9d85d5a6aa8cc00867b166454776b74aac442a`.
Packaging guard reports 19,838 bytes gzip (below 100 KiB).

## Reproduction and automated results

Initial current-main model/component/editor baseline: 86 passed. New regressions
failed before implementation: 11 failures exposed ignored walking/time mode,
unreachable first vehicles and missing leave labels. No backend change was needed.

| Command                                | Result                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `mise run test`                        | PASS: 242 unit/component cases plus 25 version-guard cases; 100% statements/functions/lines and 99.6% branches |
| `mise exec -- npm run check`           | PASS: versions, TypeScript and ESLint                                                                          |
| `mise run browser`                     | PASS: production build/package guards and 48 browser cases                                                     |
| `mise exec -- lefthook run pre-commit` | PASS: frontend, Markdown, YAML, actions and staged secret checks                                               |
| `mise exec -- dprint check`            | PASS                                                                                                           |
| `git diff --check`                     | PASS                                                                                                           |
| `mise run ha-versions`                 | PASS: pinned HA/frontend/Python compatibility; not full HA E2E                                                 |
| `mise run ha-version-tests`            | PASS: 7 runtime guard tests                                                                                    |

Hosted PR checks at candidate `9892666` also passed: frontend/offline verification,
runtime/version contracts and all six enabled shared lint jobs. Seven unrelated
shared jobs were intentionally skipped by existing repository configuration.
Run: <https://github.com/DevSecNinja/lovelace-ovapi/actions/runs/38375570137>.

The first expanded browser run exposed a synthetic harness fixture-ID mismatch;
it was corrected before the successful full run. This was not a production
failure. No test result is claimed from the failed run.

Coverage includes at least three routes within a single feed, repeat vehicles,
opposite destinations/modes, exact duplicate vs colliding events, normalized
intersecting filters before limits, default and boundary limits, omitted/null/
invalid settings, individual/grouped presentations and unchanged commute defaults.
Walk zero/seven/override, per-feed settings, clearing, delayed and unknown facts,
exact leave boundaries, midnight/DST and local clock progression are asserted.

Component tests verify one `Date.now()` per render across multiple feed reads,
irreversible observed source/metadata expiry after clock rollback, stale/error/
unavailable/cancelled/no-catchable states, hidden/pagehide/disconnect/detach cleanup,
and no additional route subscriptions. Model grouping never stores source data.
Feed-only picker tests include unmarked diagnostics and unavailable original feeds.
Existing checkbox identity, invalid draft and HA echo regressions still pass.

## Browser and visual evidence

Production browser matrix: 390x844 and 1024x768, light/dark, EN/NL, reduced motion,
keyboard focus, axe and 240px card-width overflow. No browser upstream requests or
storage writes. New screenshots wait for no launch screen, `document.fonts.ready`
and stable card/editor geometry; the component host is explicitly not actual HA.

Ignored local evidence under `test-results/`:

- `leave-walking-aware-groupe-1c3ef-rrow-widths-and-no-requests-*/leave-routes.png`
- `leave-time-display-is-orth-5e09f-ero-and-defaults-round-trip-*/leave-editor.png`

Bounded visual inspection checked phone-light routes, tablet-dark Dutch routes
and phone-dark Dutch editor. Existing HA typography, themes, badges, dividers and
layout remain; explicit leave and vehicle-clock labels are readable without
overflow. The existing large single-result commute is unchanged.

Impeccable detector ran once on changed UI and reported only the existing
`border-radius: var(--ha-card-border-radius, 12px)` as the token `12px)`.
This is a parser false positive: `DESIGN.md` already declares the 12px card
fallback and HA's theme variable remains authoritative. No suppression was added.

## Actual isolated Home Assistant

PASS, using the backend peer's actual isolated integration at
`41ca3039846f38aab7d7b73b8e5b63a03e8ed19e`, based on merged combined-feed main
`a1edd74d26f52e64c6b185440a4c0360c6146298`. The exact frozen frontend artifact
above was copied read-only into its runtime and its SHA256 checked.
See the [corrected immutable backend verification record](https://github.com/DevSecNinja/home-assistant-ovapi/blob/41ca3039846f38aab7d7b73b8e5b63a03e8ed19e/specs/005-local-favourite-insights/verification.md).

Commands executed by the peer in that backend checkout:

```sh
OVAPI_CARD_BUNDLE="$PWD/.ha-e2e/bundles/leave-card.js" \
OVAPI_UI_ARTIFACTS=.ha-e2e/review-locked \
  mise exec -- uv run --locked --group e2e \
  pytest tests/ui -m frontend --no-cov --timeout=120 -q --tb=short
```

PASS: eight native EN/NL cases on HA 2026.10.1: stop picker, combination setup,
device pages and actual dashboard/editor.

```sh
UV_PROJECT_ENVIRONMENT=.venv-minimum \
OVAPI_CARD_BUNDLE="$PWD/.ha-e2e/bundles/leave-card.js" \
OVAPI_UI_ARTIFACTS=.ha-e2e/review-minimum \
  mise exec -- uv run --locked --no-default-groups --group minimum --group e2e \
  pytest tests/ui -m frontend --no-cov --timeout=120 -q --tb=short
```

PASS: the same eight cases on HA 2026.10.0 with its compatible fixture.

The real authenticated combined feed has three source favourites, three routes
(opposite metro destinations plus tram), and four vehicles per route. With group
walk7, an unreachable 4-minute vehicle is skipped for the 12-minute vehicle;
following leave times use exact absolute arithmetic. Leaf walks 9/3/11 never
affect the group's walk7. No coordinator or card model is substituted.

Native dashboard Edit / card Edit / Save / **fresh-page reopen** verifies omitted
override -> 2 -> cleared -> explicit0, yielding effective walks 7/2/7/0 while the
group's diagnostic remains 7. Source disable makes the feed unavailable and
suppresses advice; the unavailable original feed remains selectable. All six
diagnostic sensors are absent from the picker and their explicit WebSocket
subscriptions return `not_found`.

All four language/runtime machine-readable card reports were read and asserted
again in the frontend session: matching bundle hash, three sources/routes, exact
native precedence results, diagnostic invariants and one synthetic batched HTTP
request throughout. No off-origin browser request was observed. No real OVAPI or
live HA is contacted; runtimes and browsers close after the scenarios.

Final native desktop English routes, phone Dutch routes and native walking
override/editor preview were visually inspected. Screenshots wait for launch
screen removal, loaded fonts and stable target geometry after navigation/resize.
Ignored local copies are in `.ha-e2e/joint-proof/{en,nl}/`, including all four
`card-results.json` / `minimum-card-results.json` reports and the inspected PNGs.
No screenshot is committed to this frontend repository.

## Review and delivery

Native Copilot review of implementation `9892666` reported **zero findings** and
no inline comments. Its sole overview caveat was the then-pending actual-HA
check, now closed by the evidence above.
[Review](https://github.com/DevSecNinja/lovelace-ovapi/pull/6#pullrequestreview-5501465758).
Final evidence changes do not alter the reviewed source or bundle.

Backend review subsequently found that its browser harness allowlist used a URL
prefix comparison that could accept a credential-style off-origin URL. This was
a harness-guard issue, not a card finding or an observed external request.
The backend peer replaced all three native-fixture guards with parsed exact
scheme/host/port comparison, also rejecting userinfo, invalid and non-HTTP(S)
URLs. All 31 pure-string adversarial/normal URL cases pass without navigating to
or fetching them; five had failed against the old prefix guard. Both complete
native suites then passed again (eight cases per HA runtime) with the unchanged
frontend artifact. The proof reference, commands and local reports above now
identify that corrected run at `41ca3039`; T016 is complete. The original prefix
guard is not claimed to have provided complete origin enforcement.

## Convergence

Spec Kit specification, plan, tasks and implementation were executed using the
repository's pinned official tooling/templates. No extension hooks were installed.
Convergence checked eight functional requirements, five success criteria, twelve
acceptance scenarios, the five implementation decisions and all five constitution
principles. The only partial item was native HA evidence, already tracked by
T013 and appended as T015. Both are complete, along with the corrected-boundary
evidence refresh in T016. Final assessment finds no remaining product-code or
verification gap. All task obligations are satisfied.

No live HA changes, upstream requests, source persistence, additional dependencies,
contract changes, releases, workflow changes or merges.
