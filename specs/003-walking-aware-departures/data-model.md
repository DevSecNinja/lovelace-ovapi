# Data model: Walking-aware departures

## Configuration

`time_mode` is `departure` or `leave`; omission/undefined defaults to `departure`.
Explicit null, empty strings and unknown values are errors. It changes only
departures-card time presentation, independent of `display_mode`.

`walking_minutes` retains its optional integer 0-120 contract. An absent value
uses each selected feed's `walking_minutes`. A combined feed uses its own setting,
not any leaf setting. Explicit zero means no walk; clearing deletes the override.

## Transient selection

Departure mode uses the existing sorted/filtered upcoming vehicles.
Leave mode accepts only ready boards and noncancelled vehicles whose absolute
leave instant is at or after the render instant; elapsed departures are excluded.
Both individual and grouped limits are applied after eligibility.

Grouped rows retain transport + normalized line + normalized destination.
Exact-event deduplication remains ID, mode, original line/destination, scheduled
and expected instants, cancellation and delay; same-minute/colliding IDs alone
are insufficient to merge vehicles. Following is bounded to three.

## Lifecycle

No new source owner or stored route list. The existing shared subscription owns
validation, expiry and erasure. `readBoard` receives the captured render instant;
observed expiry publishes and persists erasure even if the clock later rolls back.
Hidden/disconnect/unsubscribe clear source data as before.
