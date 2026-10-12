# Backend-owned card contract v1

Authoritative source: `DevSecNinja/home-assistant-ovapi/docs/card-contract-v1.md`,
agreed 2026-10-12. Subscribe using the existing authenticated HA connection:

```json
{"type":"ovapi/subscribe","entity_id":"sensor.amsterdam_departures"}
```

HA assigns an ID, acknowledges, then sends immediate/full-replacement snapshot
events. Standard unsubscribe_events releases the subscription. Subscription,
reconnection and local filtering never fetch OVAPI.

Snapshot: `contract_version:1`, `board_id`, `entity_id`, `stop:{id,name}`,
`status:ready|stale|unavailable`, `fetched_at`, `expires_at`, `walking_minutes`,
`departures`. Available timestamps are offset-qualified instants. Expiry is at
most 29 minutes after fetch. Unavailable has null timestamps and empty departures.
Stop names are configured labels, not retained upstream metadata.

Departure: string `id`, `line`, `destination`; `transport:bus|tram|metro|unknown`;
`scheduled_at`; nullable `expected_at`; nullable boolean `cancelled`; nullable
integer `delay_seconds`. Unknown remains null. Rail/platforms are not in v1.
Line/destination/ID are nonempty and text is bounded to 512 characters. The producer
omits incomplete source records rather than fabricating display metadata.

Source data stays only in ephemeral memory. Erase on expiry/disconnect/unsubscribe.
No payload logs, browser storage, Recorder, diagnostics or real-source fixtures.
Ready includes successful empty data; stale is failed refresh with valid retained
data. None of these board statuses implies cancellation or absence of service.
A null departure field means that information is unknown. The consumer whitelists
the defined properties and discards unrecognized extra properties for retention safety.

## Optional station coverage (additive v1)

Agreed directly with the backend owner for
`DevSecNinja/home-assistant-ovapi#5` on 2026-10-12. Single timing-point boards
continue to omit `coverage`; no backend/card release-version equality is required.

```json
{
  "status": "partial",
  "selected_members": 4,
  "verified_members": 3,
  "missing_members": 1,
  "metadata_fetched_at": "2030-01-14T12:00:00+00:00",
  "metadata_expires_at": "2030-01-21T12:00:00+00:00"
}
```

`coverage.status` is `complete|partial|stale|unavailable`. Counts are integers
0..30 and `verified_members + missing_members = selected_members`. They count
unique active station quays matching the favourite's selected transport modes;
an unverifiable quay is missing. Missing bus coverage cannot invalidate a
metro-only favourite. Counts are not lines, directions or active journeys.

| Coverage    | Counts/static metadata                                                      | Ordinary board                                                    |
| ----------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| complete    | Missing 0, verified = selected; valid metadata dates                        | ready, stale (live refresh failed), or unavailable (no live data) |
| partial     | Missing >0; valid metadata dates                                            | unavailable only                                                  |
| stale       | Failed refresh with retained valid metadata; missing 0, verified = selected | stale or unavailable, never ready                                 |
| unavailable | All counts 0; both metadata dates null                                      | unavailable only                                                  |

Known metadata with zero selected members requires coverage complete and ordinary unavailable.
It means no station platforms match the selected modes, not no active service.
Every ordinary unavailable board still requires `departures:[]` and null live
timestamps. Partial and unverifiable station results therefore fail closed for
old v1 cards too: those clients ignore coverage but cannot show a misleading
complete timetable. There is no partial-usable mode or capability handshake.

Metadata timestamps are calendar-valid UTC ISO instants (`Z` or `+00:00`),
expires strictly after fetched, fetched at most 60 seconds in the future.
They describe static membership (backend's planned seven-day TTL), not source
departures; do not apply the 29-minute live TTL to them. Cached frames may
already be expired by receipt, so expiry is enforced by the consumer lifecycle,
not mistaken for a malformed schema. Expired metadata removes all departures,
counts and dates, leaving only a generic expired-coverage reason. Live expiry
removes all departures while still-valid small static coverage may remain.
Both kinds of metadata are erased on disconnect/hidden page/last unsubscribe.
Unknown properties inside coverage are discarded, like unknown board properties.

The backend deliberately withholds affected-mode station boards when known
Amstel membership cannot be verified in v0. Cards must show the reason rather
than hide that safety tradeoff or fabricate missing platform schedules.

The shared synthetic producer cases are mirrored in
`tests/fixtures/station-coverage-v1.json`; provenance, content hash and actual-HA
boundary evidence are recorded in [verification.md](../verification.md).
