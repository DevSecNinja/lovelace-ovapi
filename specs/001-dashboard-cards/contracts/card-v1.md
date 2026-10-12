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
