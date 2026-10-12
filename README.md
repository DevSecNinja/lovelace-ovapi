# lovelace-ovapi

Accessible departure and commute cards for the Home Assistant OVAPI integration.

Two HA-native cards: a readable **departure board** and a walking-adjusted
**“leave in” commute view**. Multiple favourites, line/destination filters,
English/Dutch, phone/tablet layouts and your Home Assistant theme.

**Pre-release implementation:** no release has been published. Review and merge
are required before default-branch HACS installation. Synthetic demonstrations
are not evidence of real service coverage.

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

### HACS (after the implementation is available on the default branch)

1. Add `https://github.com/DevSecNinja/lovelace-ovapi` as a **Dashboard** custom repository.
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

```yaml
type: custom:ovapi-departures-card
title: Nearby departures
entities:
  - sensor.amsterdam_amstel_departures
  - sensor.amsterdam_centraal_departures
max_departures: 5
language: auto
```

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

These sensor IDs and the X1 service are **synthetic examples**. Replace them with
your actual entities and supported lines/destinations. The examples do not claim
coverage at Amsterdam Amstel or Centraal.

| Option            | Default              | Meaning                                          |
| ----------------- | -------------------- | ------------------------------------------------ |
| `entities`        | Required             | 1–12 unique OVAPI sensor entity IDs              |
| `title`           | Localized card title | Optional heading, at most 120 characters         |
| `lines`           | All                  | Exact, case-insensitive line names               |
| `destinations`    | All                  | Exact, case-insensitive destination names        |
| `max_departures`  | `5`                  | 1–20 visible rows per favourite (departure card) |
| `walking_minutes` | Integration setting  | Optional 0–120 minute card-only override         |
| `language`        | `auto`               | `en`, `nl`, or HA language                       |

Line and destination filters intersect. They can only narrow the backend board;
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
- **Cancelled:** text identifies cancellation, and no actionable countdown appears.

Source snapshots are retained only in memory until their original expiry, never
more than 29 minutes after fetch. Disconnect, hidden page, navigation or removal
clears the card's payload. Reopening subscribes to the backend cache without
triggering an upstream fetch. No departure payload is written to browser storage,
logs, files or HA state attributes. A fixed cleanup warning contains no source data.
The backend owns upstream policy enforcement and omits incomplete display records.

See the [versioned contract](specs/001-dashboard-cards/contracts/card-v1.md).
Do not attach live source payloads when reporting a problem; use synthetic examples.

## Development and verification

Tools are pinned in `.mise.toml`, packages in `package-lock.json`. No global tool
defaults are changed. Requires mise >=2026.9.15.

```sh
mise trust
mise install
mise run install
mise run lint
mise run test
mise exec -- npx playwright install chromium
mise run browser
mise exec -- lefthook run pre-commit
```

`mise run browser` builds the **actual shipped resource**, verifies HACS naming,
registration, absence of network/persistence APIs, and bundle size, then tests all
phone/tablet × light/dark combinations with keyboard and axe assertions.
Screenshots are local ignored artifacts under `test-results/`, never uploaded.
`mise exec -- npm run harness` serves the labelled synthetic demo on loopback.
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

With a reviewed backend checkout available, run in one terminal:

```sh
OVAPI_BACKEND_PATH=/path/to/home-assistant-ovapi \
  mise exec -- uv run --python 3.14.8 --no-project \
  --with-requirements tests/ha-requirements.txt python scripts/ha-e2e-server.py
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

## Repository conventions and Spec Kit

This repository uses official **GitHub Spec Kit v1.1.3**, installed from the pinned
official source release and initialized for Copilot. Generated `.specify/` scripts,
templates and `.github/skills/` are retained. Constitution → specification → plan
→ tasks → implementation → convergence evidence lives in
[`specs/001-dashboard-cards/`](specs/001-dashboard-cards/).

Shared lint CI is SHA-pinned to `DevSecNinja/.github` v3.2.0 with failures enforced.
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
