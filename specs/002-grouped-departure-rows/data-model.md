# Data model: Grouped departure rows

## CardConfig

- Existing settings unchanged.
- `display_mode`: `departures` (default) or `grouped`; invalid values throw.
- `max_routes`: integer 1-20 (default five); invalid values throw even while inactive.
- `max_departures`: still bounds individual events, never groups.
- Commute rendering ignores departure presentation settings.

## DepartureGroup (render-local)

- `departure`: earliest noncancelled upcoming event, or earliest cancellation when
  no usable event remains; supplies badge/destination/transport and main status.
- `following`: up to three subsequent noncancelled events.
- `cancellations`: up to three cancelled events sorted by instant.
- `additionalCancellations`: remaining cancellation count.
- Group key is the JSON tuple of transport, trimmed/lowercase line and destination.
- Equal-time ordering uses source ID, then deterministic group key tie-breaking.

Filtering uses expected time with scheduled fallback and strictly future instants.
Duplicate comparison includes the full defined event fields, using absolute times.
The source snapshot is never mutated. Groups are recomputed, not stored, on every
local tick, and disappear with the snapshot at its original expiry.
