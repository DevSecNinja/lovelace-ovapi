# Feature Specification: Walking-aware departures

**Feature Branch**: `devsecninja-commute-route-alternatives`

**Created**: 2026-10-13

**Status**: Accepted for implementation

**Input**: "Oh wait, I think I can do that with the OVAPI departures card config
and then saying 'Group routes'. I don't think the walking minutes works though."

The coordinator's conservative assumption is an optional walking-aware
presentation of the existing departures card, not a commute-card redesign.

## User Scenarios & Testing

### User Story 1 - Read walking-adjusted route choices (Priority: P1)

A commuter selects Leave time on an existing grouped departures card to see when
to leave home for each transport, line and destination in a combined favourite.

**Why this priority**: Walking minutes are currently exposed but ignored by this
card; route grouping already solves the multi-route display need.

**Independent Test**: A combined favourite with at least three routes and repeated
services shows each reachable route, including opposite destinations/modes.

**Acceptance Scenarios**:

1. **Given** departures in 2, 8, 14, 20 and 26 minutes and a seven-minute walk,
   **When** Leave time is selected, **Then** the route shows "Leave in 1 min" and
   "Also leave in 7, 13, 19 min", not raw departure countdowns.
2. **Given** an unreachable first vehicle, **When** a later one is reachable,
   **Then** the later vehicle is chosen before applying route limits.
3. **Given** multiple feeds, **When** routes coincide, **Then** each feed stays
   separate and uses its own walking duration unless overridden on the card.
4. **Given** exact duplicate events and distinct same-minute vehicles, **When**
   grouped, **Then** only identical events collapse.

### User Story 2 - Preserve meaningful defaults and configuration (Priority: P1)

A user chooses Departure time or Leave time independently of individual/grouped
rows. Existing departure and commute cards retain their behavior.

**Why this priority**: An unlabelled change in the meaning of "8 min" is unsafe.

**Independent Test**: Default and explicit Departure time render unchanged; Leave
time survives native editor save/reopen with filters, limits and walking override.

**Acceptance Scenarios**:

1. **Given** an existing card, **When** updated, **Then** its countdowns, default
   display mode and commute single-result presentation stay unchanged.
2. **Given** Departure time mode, **When** editing, **Then** no ineffectual walking
   field is shown; Leave time and commute cards expose the working override.
3. **Given** mode changes, **When** saved and reopened, **Then** inactive walking
   and row-limit preferences remain preserved.
4. **Given** diagnostic and unavailable feed sensors, **When** editing, **Then**
   only original feed-status sensors are offered, including unavailable ones;
   existing checkbox/draft/echo behavior is preserved.

### User Story 3 - Trust time and freshness (Priority: P1)

A commuter can distinguish vehicle departure time, time to leave home, live
uncertainty and unsafe data in English or Dutch on phone/tablet.

**Independent Test**: Exercise walking zero/seven/override, delay and unknown
facts, stale/unavailable/error/expired frames, clock changes and lifecycle events.

**Acceptance Scenarios**:

1. **Given** cancelled or past-leave candidates, **When** in Leave time mode,
   **Then** they never produce actionable leave instructions or false "Leave now".
2. **Given** stale, unavailable or expired data, **When** rendered, **Then** leave
   advice disappears while the correct freshness/error explanation remains.
3. **Given** unknown facts or delays, **When** times are shown, **Then** status
   remains honest, including accessible descriptions for following leave times.
4. **Given** hidden, disconnected or removed cards or observed expiry followed by
   clock rollback, **When** rendered again, **Then** erased source data cannot return.

### Edge Cases

Exact leave-now boundary, scheduled fallback, delay making a vehicle reachable,
cancelled-only routes, conflicting IDs, stable ties, filters before limits,
invalid/null modes, no results, DST/midnight, narrow cards and long destinations.

## Requirements

### Functional Requirements

- **FR-001**: Offer an optional Departure time / Leave time presentation on the
  departures card, orthogonal to individual/grouped rows.
- **FR-002**: Apply effective walking time to primary and up to three following
  leave times, explicitly labelled and based on one absolute instant per render.
- **FR-003**: Reuse transport + line + destination grouping, exact-event identity,
  filters and route limits; support more than two combined sources.
- **FR-004**: Suppress unsafe advice and preserve the original source-lifecycle
  requirements, unknown facts and irreversible expiry.
- **FR-005**: Keep current defaults and commute behavior, hide unused walking
  controls, preserve editor echo behavior and feed-only selection.
- **FR-006**: Add no upstream calls, subscriptions per route or source persistence.
- **FR-007**: Verify offline and through current actual isolated Home Assistant,
  authenticated combined-feed updates and native editor save/reopen.
- **FR-008**: Card walking override wins over the selected feed's own value;
  combined feeds never inherit or sum source walking values. Clearing removes
  the override; zero means no walk. Explain this precedence in the editor.

### Key Entities

- **Feed**: One original favourite status entity and its transient board.
- **Route**: Transport + normalized line + destination within one feed.
- **Leave time**: Absolute vehicle departure minus effective walking duration.

## Success Criteria

### Measurable Outcomes

- **SC-001**: At least three reachable routes appear in a combined feed using
  grouped Leave time and default route limit; each has at most three alternatives.
- **SC-002**: All primary/following leave countdowns subtract the effective walk;
  cancelled/stale/expired/unavailable data produces zero leave instructions.
- **SC-003**: Default departure countdowns and the existing commute card remain
  unchanged, with no additional subscriptions or upstream requests.
- **SC-004**: No horizontal overflow or automated accessibility violations in
  phone/tablet, EN/NL and light/dark checks.
- **SC-005**: Native editor save/reopen preserves selected mode, filters, limits,
  walking override and sensor order.

## Assumptions

- This narrower target is a coordinator assumption based on the latest user
  clarification, not an explicit choice returned by the unavailable user.
- The existing v1 combined feed already supplies its own walking duration; no
  backend contract change is needed.
- Unknown cancellation is not confirmed cancellation; retain its uncertainty.
- Source filters already apply in the backend; card filters only narrow results.
- Station discovery, releases, live HA and real upstream calls are out of scope.
