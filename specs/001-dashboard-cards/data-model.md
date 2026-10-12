# Data model

`BoardSnapshot` is a full replacement from the backend v1 contract. Validation
copies only defined fields so unknown extra properties cannot retain source data.
Each entry owns a deadline timer; subscribers share one entry per connection/entity.

Local view states: loading -> ready/stale/unavailable; invalid data -> error;
disconnect -> disconnected; expiry -> expired. Reconnect waits for a new snapshot,
never revives discarded data. Last subscriber removal erases the entry.

`CardConfig`: type, entities (1..12 unique sensor IDs), optional title,
lines/destinations (exact case-insensitive matches), max_departures (1..20,
default 5), walking_minutes (0..120 override, otherwise backend), language
auto/en/nl (default auto). Filters intersect: selected line AND destination.

Departure ordering uses expected_at ?? scheduled_at and ID as deterministic tie
breaker. Elapsed departures are omitted. Commute picks earliest noncancelled
departure whose leave instant has not elapsed. Stale boards never provide an
imperative leave instruction. Absolute instants drive math; HA timezone drives
display. Retention uses source expiry, never locally extended age.
