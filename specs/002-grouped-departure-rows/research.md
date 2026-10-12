# Research: Grouped departure rows

All decisions derive from the confirmed brief and current source/contract. No
unresolved technical questions, external research or additional agents needed.

## Configuration

- **Decision**: `display_mode: departures | grouped`, default `departures`;
  `max_routes` 1-20 default five. Keep `max_departures` independent.
- **Rationale**: No silent migration; switching modes preserves each limit.
- **Alternatives**: Reusing `max_departures` would obscure which thing is counted;
  grouped-by-default stubs introduce an unnecessary new/existing discrepancy.

## Grouping and identity

- **Decision**: Group within one board by transport and trimmed lowercase
  line/destination. Use the same normalization for exact filters. Deduplicate
  identical validated Departure records including ID, absolute scheduled/expected
  times and status; do not collapse distinct IDs or conflicting source records.
- **Rationale**: v1 has ID but no source-point field or explicit unique-ID guarantee
  across aggregated timing points. Conservative exact-event deduplication avoids
  guessing that matching minute values or colliding IDs are the same vehicle.
- **Alternatives**: Minute deduplication loses vehicles; ID-only deduplication
  can lose a conflicting event. Additional backend fields are unnecessary.

## Cancellation and status

- **Decision**: Noncancelled (including unknown cancellation) departures supply
  main/following times with existing honest status labels. Main service metadata
  remains visible. Following statuses are accessible per-time descriptions.
  Cancelled entries use up to three clock-time notices plus a remaining count.
  Cancelled-only groups sort after usable routes and show no countdown.
- **Rationale**: The next usable route drives ranking; cancellations cannot replace
  or look like usable times but remain discoverable within displayed rows.
- **Alternatives**: Dropping cancelled entries hides useful information; allowing
  them to rank first displaces imminent usable routes.

## Presentation and lifecycle

- **Decision**: Existing outlined line badge, flexible destination, tabular
  right-aligned time; following line below main status, cancellation notices below
  that. No colors invented for operators/routes. No persisted derived groups.
- **Rationale**: Refine the HA-native Operate surface, preserve themes and small
  container wrapping, and inherit exact source erasure on expiry/visibility.
- **Alternatives**: Separate UI component/state layer adds lifecycle risk.
