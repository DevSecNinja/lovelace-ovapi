# Research: Walking-aware departures

## Current-source diagnosis

Fetched main `eb99055cfa592305012535829250a97af966130c`. `parseConfig` and the
shared editor accept walking minutes for both cards, but `renderDepartures`
ignores them in both display modes. Only `nextCommute` subtracts walking.
Existing model/component/editor baseline: 86 tests pass.

## Decisions

- **Decision**: Optional `time_mode: departure | leave`, default departure.
  **Rationale**: Do not silently redefine existing countdowns or change commute.
  **Alternative rejected**: A multi-route commute redesign; latest clarification
  points to the already-existing grouped departures presentation.
- **Decision**: Reuse exact-event grouping; filter reachable noncancelled vehicles
  before grouping or limits.
  **Rationale**: The first source vehicle may be uncatchable but its successor
  catchable; separate modes/destinations must not collapse.
  **Alternative rejected**: Group first and adjust its first vehicle afterward.
- **Decision**: Leave countdowns and following times use absolute departure minus
  effective walking duration, captured against one render instant.
  **Rationale**: Never label raw departure minutes as leave minutes.
  **Alternative rejected**: Rounded departure minutes minus walking, or multiple
  clock reads straddling a minute boundary.
- **Decision**: Show the existing walking input only for commute or Leave time;
  explain optional override, clearing, zero and favourite precedence.
  **Rationale**: A visible no-op setting caused the confusion.
  **Alternative rejected**: Automatically switch modes when walking is edited.
- **Decision**: Preserve the single shared subscription's irreversible expiry
  owner, adding only a captured instant parameter to reads.
  **Rationale**: No retained route snapshots or extra lifecycle state.

No unresolved research or contract questions. The backend confirms v1 combined
feeds have their own walking duration and diagnostic sensors have no feed identity.
