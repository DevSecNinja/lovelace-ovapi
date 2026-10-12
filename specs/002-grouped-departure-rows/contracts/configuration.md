# Configuration contract

```yaml
type: custom:ovapi-departures-card
entities:
  - sensor.amsterdam_amstel_departures
display_mode: grouped
max_routes: 3
language: auto
```

The example entity is synthetic. Grouping is within each favourite only, by
transport + line + destination. Opposite directions consume two rows. Optional
line/destination filters run before grouping and limiting.

`display_mode` defaults to `departures`; `max_departures` still defaults to five
individual rows. `max_routes` defaults to five grouped rows and accepts 1-20.
Visual editing shows the applicable limit and preserves the inactive one.
Following times are bounded to three with no separate setting.

The backend-owned [v1 contract](../../001-dashboard-cards/contracts/card-v1.md)
is unchanged. No new source fields, messages, refreshes or retained caches.
