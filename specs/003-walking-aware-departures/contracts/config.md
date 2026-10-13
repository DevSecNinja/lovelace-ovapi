# Configuration and presentation contract

Backend WebSocket v1 is unchanged; see
[card-v1.md](../../001-dashboard-cards/contracts/card-v1.md).

```yaml
type: custom:ovapi-departures-card
entities:
  - sensor.synthetic_combined_departures
display_mode: grouped
time_mode: leave
max_routes: 5
# walking_minutes: 7  # optional card override; omitted uses this feed's value
```

`time_mode: departure` (default) preserves ordinary departure countdowns.
`time_mode: leave` shows explicitly labelled Leave in / Leave now and Also leave
in countdowns; absolute vehicle clock times remain labelled Departs.
The setting is orthogonal to individual/grouped rows. Commute behavior does not
change. Its editor continues to show walking duration without a time-mode selector.

Walking precedence: card override > selected feed's own value. A combined feed's
source walking settings never contribute. Zero is a valid override; clearing
removes it. Inactive config values survive mode switches. No new subscription,
transport coverage, source persistence or backend request is implied.
