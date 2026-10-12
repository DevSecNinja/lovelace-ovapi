# lovelace-ovapi

Accessible departure and commute cards for the Home Assistant OVAPI integration.

Two HA-native cards: a readable **departure board** and a walking-adjusted
**“leave in” commute view**. Multiple favourites, line/destination filters,
English/Dutch, phone/tablet layouts and your Home Assistant theme.

**Pre-release implementation:** no release has been published. HACS can use the
default-branch resource. Synthetic demonstrations are not evidence of real service
coverage.

## Requirements

- The [OVAPI integration](https://github.com/DevSecNinja/home-assistant-ovapi),
  with at least one configured favourite and card contract v1.
- A current Home Assistant frontend with custom dashboard resources.
- Bus/tram/metro data only where OVAPI covers the selected timing point.

This is a community project, not an official Home Assistant Gold/Platinum
integration. NS rail data is intentionally excluded. The native
[Nederlandse Spoorwegen integration](https://www.home-assistant.io/integrations/nederlandse_spoorwegen/)
is complementary and independent.

## Installation

### HACS

Requires Home Assistant with HACS already installed and configured. Use the button
to open this repository in HACS and confirm adding it as a custom repository if
prompted. It does not install or enable HACS, or automatically download the cards.

[![Open lovelace-ovapi in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=DevSecNinja&repository=lovelace-ovapi&category=plugin)

1. If not added using the button, add `https://github.com/DevSecNinja/lovelace-ovapi`
   as a **Dashboard** [custom repository](https://www.hacs.xyz/docs/faq/custom_repositories/).
2. Download the repository. It contains `dist/lovelace-ovapi.js`; no build tools are needed in HA.
3. Check **Settings → Dashboards → Resources** (advanced mode). HACS normally registers
   `/hacsfiles/lovelace-ovapi/lovelace-ovapi.js` as a **JavaScript module**.
   Add it if missing; do not register the same file twice.
4. Reload the dashboard and choose **OVAPI departures** or **OVAPI commute**.

### Manual / review-branch installation

Build this branch using the development commands below. Copy only
`dist/lovelace-ovapi.js` into `<config>/www/lovelace-ovapi.js`. Register
`/local/lovelace-ovapi.js` as a **JavaScript module** in dashboard Resources.
Restart HA if you just created its `www` directory, then reload the dashboard.

No live Home Assistant installation is modified by development or tests.

## Configuration

Choose favourite OVAPI sensors in the visual editor. Each sensor is configured in
the backend integration; the cards only display its existing board.
The picker is ordered by entity ID so rows do not jump when toggled; it does not
reorder saved favourites. New selections are appended to the card's display order.
Cards require 1–12 sensors. Clearing the last checkbox leaves an unsaved draft
with an error; HA keeps the last valid configuration until you choose a sensor.
A thirteenth selection is rejected without changing the existing twelve.
Add/remove individual line and destination fields. Each field is one exact value;
commas, quotes and line breaks within a name are preserved rather than split.

```yaml
type: custom:ovapi-departures-card
title: Nearby departures
entities:
  - sensor.amsterdam_amstel_departures
  - sensor.amsterdam_centraal_departures
max_departures: 5
language: auto
```

For a compact station-style board, opt into **Grouped routes** in the visual
editor and choose **Maximum route rows per favourite**:

```yaml
type: custom:ovapi-departures-card
entities:
  - sensor.amsterdam_amstel_departures
display_mode: grouped
max_routes: 3
language: auto
```

Each row is **transport + line + destination**, not a unique line number.
Metro 50 to Isolatorweg and metro 50 to Gein count as two rows; bus 50 is separate
from metro 50. Rows never merge across favourite sensors. The three rows with the
**next upcoming** noncancelled departures appear first, not recently departed
vehicles or a frozen set of lines.

For example, departures in 2, 8, 14, 20 and 26 minutes show one row with **2 min**
and **Also in 8, 14, 20 min** (Dutch: **Ook over**). Following times are bounded to
three; their live status is available as a tooltip and screen-reader description.
Distinct vehicles can have the same displayed minute; only identical source events
are deduplicated. All countdowns round down and advance locally.

Cancelled departures are excluded from the main/following countdowns but retain
explicit clock-time notices in their displayed route row: up to three cancelled
times and a count of any additional cancellations. Cancelled-only routes appear
after usable routes when the route limit leaves room, without a countdown.
Stale boards remain labelled as outdated.

Existing cards (and new cards unless opted in) keep **Individual departures**.
`max_departures` still limits individual events; it is not repurposed to count
routes. Switching modes in the editor preserves both limits. Grouping does not
change the commute card's catchable-departure selection.

```yaml
type: custom:ovapi-commute-card
title: Leave for the tram
entities:
  - sensor.amsterdam_amstel_departures
walking_minutes: 6
lines:
  - X1
destinations:
  - Synthetic destination
language: en
```

These sensor IDs and services are **synthetic examples**. Replace them with
your actual entities and supported lines/destinations. The examples do not claim
coverage at Amsterdam Amstel or Centraal.

| Option            | Default              | Meaning                                                              |
| ----------------- | -------------------- | -------------------------------------------------------------------- |
| `entities`        | Required             | 1–12 unique OVAPI sensor entity IDs                                  |
| `title`           | Localized card title | Optional heading, at most 120 characters                             |
| `lines`           | All                  | Exact, case-insensitive line names                                   |
| `destinations`    | All                  | Exact, case-insensitive destination names                            |
| `display_mode`    | `departures`         | `departures` or `grouped` (departure card only)                      |
| `max_departures`  | `5`                  | 1–20 individual departures per favourite in `departures` mode        |
| `max_routes`      | `5`                  | 1–20 transport/line/destination rows per favourite in `grouped` mode |
| `walking_minutes` | Integration setting  | Optional 0–120 minute card-only override                             |
| `language`        | `auto`               | `en`, `nl`, or HA language                                           |

Line and destination filters intersect; matching and grouping ignore case and
surrounding whitespace, not internal whitespace or punctuation. Filters apply
before grouping and limits. They can only narrow the backend board;
they cannot fetch additional departures. Filters persist as dashboard configuration,
not as downloaded source data. Time display follows HA's configured time zone and
12/24-hour preference; calculations use absolute instants, including across DST.

The commute card chooses the earliest noncancelled departure whose walking-adjusted
leave time has not elapsed. Countdown minutes round down conservatively. “Leave now”
means less than one minute remains. Walking time is not journey planning, transfer
advice, or a guarantee you will catch a service.

## Freshness and fair use

**The cards never call OVAPI, poll HA for departures, or request backend refreshes.**
They share the authenticated HA WebSocket connection and one subscription per
favourite across cards. A local timer updates the display without network calls.
Backend polling is always-on and conservative; there are no travel-window schedules.

- **Updated:** latest backend refresh succeeded, possibly with an empty result.
- **Outdated:** refresh failed but retained source data is still unexpired.
  Departures remain visibly qualified; commute advice is suppressed.
- **Expired/unavailable/disconnected:** no source departures are shown.
- **No upcoming departures:** a successful board has no future results. This is
  not a claim that no service exists.
- **Live status unknown / Scheduled:** source information is incomplete; the card
  does not turn unknown into “on time”.
- Nonzero delays below a minute show **<1 min early/late** (Dutch: **eerder/later**),
  never a misleading signed zero. Larger delays round to the nearest minute.
- **Cancelled:** text identifies cancellation, and no actionable countdown appears.

Source snapshots are retained only in memory until their original expiry, never
more than 29 minutes after fetch. Disconnect, hidden page, navigation or removal
clears the card's payload. Reopening subscribes to the backend cache without
triggering an upstream fetch. No departure payload is written to browser storage,
logs, files or HA state attributes. A fixed cleanup warning contains no source data.
The backend owns upstream policy enforcement and omits incomplete display records.

### Station coverage

With a station-aware backend, the optional v1 coverage field adds explanations
without changing existing single-timing-point cards or requiring equal release
versions. Coverage counts unique station platforms/quays for the favourite's
selected bus/tram/metro modes, not active journeys or lines.

- **Station coverage incomplete:** shows verified/selected platform counts.
  All departures and commute advice are withheld, including in grouped mode.
- **Station coverage unknown/expired:** no departures are displayed until the
  integration supplies verified, unexpired membership and live data.
- **Station coverage update failed:** previously verified metadata is still
  valid, but any retained departures remain stale and cannot suggest leaving.
- **No station platforms match the selected transport types:** complete metadata
  with zero selected platforms, not a claim that no service exists. Review the
  favourite's transport selection in the integration.

The backend intentionally fails closed for old cards too: partial or unverifiable
station coverage sends an ordinary unavailable board with empty departures and
null live timestamps. For example, a known Amstel quay missing from v0 can make
the affected mode unavailable until verified; this limitation is surfaced, not
silently omitted. Missing bus membership does not invalidate a metro-only board.
Cards never fetch station metadata or v0 schedules themselves.

Static station metadata has its own expiry, independent of the 29-minute live
departure limit. The first deadline removes departures. The small validated
coverage explanation may survive live-data expiry until its own deadline;
expired metadata counts/dates are erased. Replayed/cached snapshots never reset
either deadline. Existing hidden-page, disconnect and removal cleanup clears
coverage too. No metadata or departures are persisted in browser storage.

See the [versioned contract](specs/001-dashboard-cards/contracts/card-v1.md).
Do not attach live source payloads when reporting a problem; use synthetic examples.

## Development and verification

Tools and the minimum mise version are declared in `.mise.toml`; packages are
locked in `package-lock.json`. The supported build Node range is `package.json`
`engines.node`. No global tool defaults are changed.

```sh
mise trust
mise install
mise run install
mise run lint
mise run test
mise exec -- npx playwright install chromium
mise run browser
mise run ha-versions
mise run ha-version-tests
mise exec -- lefthook run pre-commit
```

`mise run browser` builds the **actual shipped resource**, verifies HACS naming,
registration, absence of network/persistence APIs, and bundle size, then tests all
phone/tablet × light/dark combinations with keyboard and axe assertions.
Screenshots are local ignored artifacts under `test-results/`, never uploaded.
`mise exec -- npm run harness` serves the labelled synthetic demo on loopback.
Use `/tests/harness/?grouped&editor` for grouped rows and the visual editor;
add `theme=dark&language=nl` for the Dutch dark-theme preview.
Add `coverage` to preview the synthetic incomplete-station warning.
It is a component harness, **not** a full Home Assistant E2E.

Unit/component tests use synthetic data and fake clocks. Per-file coverage gates
are 95% statements/lines/functions and 90% branches. Critical retention, timer,
subscription, sorting/filtering, cancelled/unknown, empty/error, editor and
midnight/DST behavior use explicit assertions rather than snapshots alone.
Routine tests and CI perform no live OVAPI requests.

The production bundle is committed because HACS supports unreleased default-branch
resources. Regenerate it with `mise run build`; never edit it by hand.

### Isolated actual Home Assistant check

The optional combined check uses a **separate temporary HA installation**, the
real backend integration, actual HA config-flow HTTP and WebSocket APIs, the
real HA frontend and Lovelace resource registration. Only the backend's upstream
transport is replaced with dynamically dated synthetic data. It is not a live
HA test and does not validate real stop coverage or upstream availability.
It also opens the native Lovelace card editor with three actual synthetic sensors,
exercises label/Space selection and an empty draft, observes the host's
`config-changed`/`setConfig` feedback, and verifies Save/storage/reopen.

With a reviewed backend checkout available, run in one terminal:

```sh
OVAPI_BACKEND_PATH=/path/to/home-assistant-ovapi mise run ha-server
```

After the ready message, run in another terminal:

```sh
mise exec -- node scripts/ha-e2e-browser.mjs
```

The server binds only `127.0.0.1:18123`, automatically stops after ten minutes, and
cleans its temporary config and synthetic credentials on exit. Stop it with Ctrl-C
after the check. Screenshots stay in `.ha-e2e/evidence/` (ignored). No backend
checkout or shared Python environment is changed. Minimal standalone HA on macOS
may log optional Supervisor/media-library warnings unrelated to these cards.

### Version maintenance

`npm run versions` is mandatory in install/check/test/build (therefore browser/CI).
It uses standard SemVer, TOML and YAML parsers to check release/lock/installed
dependency agreement, exact tool pins, supported Node engines, CI mise at least
the declared minimum, and installed Spec Kit provenance. `npm ci` and strict
engines remain the package manager's authority for lock installation.

- **Release bump:** `package.json` owns the cards release. Use
  `npm version <version> --no-git-tag-version` to update package and lock metadata;
  rebuild the bundle. There is no separate runtime release banner/version to sync.
  Backend releases and wire protocol numbers are independent.
- **Dependencies/tools:** update the manifest/pins and regenerate the lock with
  npm, then run the gates. Dependency updates must not silently raise support
  minimums. CI derives both the Node engine minimum and development pin, testing
  both if they differ. The original unbounded Node range incorrectly included
  unsupported odd majors; it was constrained without raising the minimum.
  Commands require the pinned development Node or exact tested minimum for
  reproducibility, even when another patch is within the declared engine range.
- **Compatibility changes:** deliberately edit `engines.node` and verify the
  complete declared range fits dependencies. `.mise.toml` owns tool pins and the
  minimum mise; CI may run a newer mise. Renovate's existing presets manage pins
  and full action SHAs; version comments are retained, not used instead of SHAs.
- **HA target:** `tests/ha-requirements.txt` owns the tested optional E2E environment,
  not a minimum-HA claim. `mise run ha-versions` verifies every installed pin,
  Python against `.mise.toml` and package `Requires-Python`, and frontend against
  the actual HA manifest. This check and its mutation tests run in CI; the full
  setup-to-display E2E remains local/optional. `mise run ha-server` performs the
  same preflight before starting. Adding a HACS HA minimum requires an exact
  minimum-runtime test and revising the explicit no-unverified-claim guard.
  Run the full isolated E2E before recording a new HA target as tested; metadata
  compatibility alone does not prove frontend behavior or HA storage-schema compatibility.
- **Contract:** `CARD_CONTRACT_VERSION` owns the consumer's supported wire version.
  Parser, picker and editor share its guard; independent v1 synthetic fixtures and
  rejection tests prevent accidental “support” for future/malformed versions.
  Breaking protocol changes require backend coordination and new fixtures.
- **Spec Kit:** upgrade through Specify CLI, then update its pinned source task
  and generated provenance together. Do not edit provenance to disguise an upgrade.
  Historical spec/research/verification records are dated evidence, not active pins.

## Repository conventions and Spec Kit

This repository uses official **GitHub Spec Kit**, installed from the pinned
official source release and initialized for Copilot. Generated `.specify/` scripts,
templates and `.github/skills/` are retained. Constitution → specification → plan
→ tasks → implementation → convergence evidence lives in
[`specs/001-dashboard-cards/`](specs/001-dashboard-cards/), with the opt-in grouped
presentation in [`specs/002-grouped-departure-rows/`](specs/002-grouped-departure-rows/).

Shared lint CI is SHA-pinned to `DevSecNinja/.github` in `.github/workflows/ci.yml`
with failures enforced.
That reusable workflow declares `security-events: write` internally, so GitHub
requires the calling lint job to grant it even with SARIF uploads disabled. The
permission is scoped to that job; frontend verification remains read-only.
Frontend, HACS and browser tests are local because they are product-specific.
Canonical formatting, Renovate presets and PR conventions follow the org's
`.github` and `repo-starter` repositories. Unused Go/IaC and generated-shell
linters are disabled explicitly. Actions use least permissions and no releases.

## Troubleshooting

**Card not found:** check module resource URL and browser reload; ensure the built
file, not `src/index.ts`, was installed.

**Cannot read this board:** check that the selected entity belongs to OVAPI, your
HA user can read it, and integration/cards both support contract v1.

**No matching departures:** remove local filters; compare exact line/destination
names and backend filters. Cards cannot expand a backend board.

**Disconnected/expired:** restore HA connectivity or investigate the integration.
Reloading the dashboard is not an upstream refresh control.

## License

MIT, following the repository starter. Bundled and generated third-party
attributions are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
