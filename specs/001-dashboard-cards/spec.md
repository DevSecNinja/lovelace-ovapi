# Feature Specification: OVAPI dashboard cards

**Feature Branch**: `devsecninja-ovapi-dashboard-cards`

**Created**: 2026-10-12

**Status**: Accepted for implementation

**Input**: "Make some fancy/modern but useful cards too." Confirmed scope:
departure-board and commute leave-in views, favourites, filters, walking duration,
HA-native themes, phone/tablet, English/Dutch and no added upstream requests.

## User Scenarios & Testing

### User Story 1 - Read departures confidently (Priority: P1)

A commuter reads upcoming departures from multiple favourite stops.

**Why this priority**: Accurate and clearly qualified information is the primary job.

**Independent Test**: Supply synthetic boards and verify order, destinations,
delays, cancellations, filters and every freshness state.

**Acceptance Scenarios**:

1. **Given** a successful board, **When** displayed, **Then** upcoming departures
   are time-ordered with stop, line, destination and available delay/cancellation.
2. **Given** a failed refresh, **When** unexpired data remains, **Then** its stale
   status is visible; at expiry all source data disappears.
3. **Given** no results, **When** displayed, **Then** successful-empty, filtered-empty,
   loading, disconnected and unavailable states remain distinct.

### User Story 2 - Know when to leave (Priority: P1)

A commuter sees the next catchable service and time to leave with walking included.

**Why this priority**: Converts departures into a useful household decision.

**Independent Test**: Advance a deterministic clock across departure, leave-time,
midnight and daylight-saving boundaries.

**Acceptance Scenarios**:

1. **Given** walking duration, **When** an eligible departure exists, **Then** leave
   time equals expected departure (or scheduled fallback) minus walking duration.
2. **Given** cancelled or no-longer-catchable services, **When** choosing a commute,
   **Then** those services cannot produce an actionable countdown.
3. **Given** stale data, **When** a commute is displayed, **Then** it warns rather
   than instructing the user to leave.

### User Story 3 - Configure and install accessibly (Priority: P2)

A user installs one resource, chooses either card and configures it visually.

**Why this priority**: Usable delivery includes configuration and maintenance.

**Independent Test**: Load the shipped resource and edit every option using keyboard.

**Acceptance Scenarios**:

1. **Given** configured boards, **When** editing, **Then** users can choose multiple
   favourites, walking duration, line/destination filters, title and language.
2. **Given** a small phone or wall tablet, **When** using either HA theme, **Then**
   content wraps without overflow and controls have visible keyboard focus.

### Edge Cases

Unknown cancellation/delay, malformed or incompatible contract, missing entity,
late asynchronous subscriptions, reconnect, hidden/suspended tabs, source expiry,
duplicate/very large lists, timezone/midnight/DST, long untrusted destination text.

## Requirements

### Functional Requirements

- **FR-001**: Display sorted upcoming departure boards and commute leave-in views.
- **FR-002**: Support multiple favourites and optional exact line/destination filters.
- **FR-003**: Respect backend freshness and erase expired/disconnected data.
- **FR-004**: Never create upstream requests, refresh on countdown, persist or log departures.
- **FR-005**: Preserve unknown source values as null; discard unrecognized extra
  properties rather than retaining them. Cancelled services cannot suggest leaving.
- **FR-006**: Provide English/Dutch copy, HA-local times, theme compatibility and accessible editing.
- **FR-007**: Package both cards in one HACS-compatible resource with install documentation.
- **FR-008**: Verify offline with synthetic fixtures and a bounded actual isolated HA check.

### Key Entities

- **Favourite**: Configured board identity and optional display preferences.
- **Board**: Stop, freshness, walking duration and upcoming departures, expiring together.
- **Departure**: Line, destination, transport, absolute times and optional live status.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Zero upstream requests or persistent departure writes from cards in tests.
- **SC-002**: Expiry removes all source data at deadline, including without new events.
- **SC-003**: Explicit assertions cover all stories and critical lifecycle/time edge cases.
- **SC-004**: No overflow at 390px/1024px; automated accessibility checks have no violations.
- **SC-005**: One resource registers both cards and their editor in the production browser.

## Assumptions

- The backend owns transport coverage, fair-use policy and conservative polling.
- Local filters only narrow backend boards; they do not fetch more data.
- Walking overrides apply to the card; backend preferences remain unchanged.
- NS is out of scope; examples are synthetic and never evidence of real service coverage.
