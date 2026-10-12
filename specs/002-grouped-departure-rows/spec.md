# Feature Specification: Grouped departure rows

**Feature Branch**: `devsecninja-grouped-departure-rows`

**Created**: 2026-10-12

**Status**: Accepted for implementation

**Input**: "Would also be cool if I could say in the card how many metros to show
(e.g. if there are 6 lines at a station, show only the 3 with recent departures).
Also how do we deal with multiple departes from a line. E.g. metro 50 to
Isolatorweg now shows 5 times in the card. I suggest just showing it once and then
show 'also in X, Y, Z minutes'".

## User Scenarios & Testing

### User Story 1 - Read one row per route (Priority: P1)

A commuter sees a compact station-like board with each transport, line and
destination combination once, and the next departure prominent.

**Why this priority**: Repeated destinations obscure the next usable choices.

**Independent Test**: Provide repeated route departures and verify the main time,
three following times, direction separation and advancement as time passes.

**Acceptance Scenarios**:

1. **Given** metro 50 to Isolatorweg in 2, 8, 14, 20 and 26 minutes, **When**
   grouped mode is selected, **Then** one row shows 2 min and "Also in 8, 14, 20 min".
2. **Given** different destinations, transport modes or favourite boards, **When**
   grouped, **Then** those services remain separate.
3. **Given** a cancelled departure before the next usable one, **When** grouped,
   **Then** cancellation remains explicit with its clock time and never counts
   down; the usable departure supplies the main countdown.
4. **Given** elapsed departures, **When** the local clock advances, **Then** the
   next and following times advance without requesting new departure data.

### User Story 2 - Limit visible route rows (Priority: P1)

A user chooses the three soonest line/destination combinations, not a fixed set
of lines or the three most recently departed vehicles.

**Why this priority**: The board must fit a phone or wall dashboard.

**Independent Test**: Configure three route rows with six distinct routes, filter
them and advance time to verify the next upcoming choices replace elapsed ones.

**Acceptance Scenarios**:

1. **Given** six routes, **When** the limit is three, **Then** at most three rows
   appear per favourite, ordered by earliest noncancelled upcoming departure.
2. **Given** optional filters, **When** grouping and limiting, **Then** filtering
   happens first and does not implicitly freeze any selected line.
3. **Given** routes with only cancellations, **When** space remains after usable
   routes, **Then** cancelled-only rows appear with no countdown.

### User Story 3 - Configure without disrupting working cards (Priority: P2)

A user switches between individual departures and grouped routes in the visual
editor with clearly named limits.

**Why this priority**: Existing dashboard configurations must remain predictable.

**Independent Test**: Edit mode and limits with keyboard, round-trip the settings,
and render old configurations unchanged.

**Acceptance Scenarios**:

1. **Given** an existing card without a display mode, **When** loaded, **Then** it
   keeps the individual-departure view and original departure limit.
2. **Given** grouped mode, **When** editing, **Then** the limit describes route
   rows as transport plus line plus destination, separately for each favourite.
3. **Given** English/Dutch and light/dark themes, **When** viewed on phone/tablet,
   **Then** destinations wrap, times align and controls remain keyboard accessible.

### Edge Cases

Distinct vehicles sharing a minute; duplicate event identities; unknown metadata;
mixed/all cancellations; equal times; expected versus scheduled times; sub-minute
rounding; midnight and both daylight-saving transitions; malformed input;
filtered-empty and successful-empty boards; stale, expired, disconnected and
unavailable states; hidden/detached cards; long destinations.

## Requirements

### Functional Requirements

- **FR-001**: Offer explicit grouped and individual-departure modes without
  changing the meaning of existing departure limits.
- **FR-002**: Group by transport, line and destination within each favourite;
  normalize case and surrounding whitespace consistently with filters.
- **FR-003**: Filter elapsed departures and user filters before grouping and
  limiting. Prefer expected over scheduled instants; order by next noncancelled
  departure, with cancelled-only routes last and deterministic ties.
- **FR-004**: Show at most three following noncancelled countdowns. Preserve
  distinct vehicles sharing a countdown; deduplicate only identical source events.
- **FR-005**: Keep cancellation notices with clock times, bounded to three notices
  plus an explicit additional count. Never call unknown status on-time.
- **FR-006**: Allow 1 to 20 grouped route rows per favourite, default five, without
  adding a following-count setting. The existing individual limit remains separate.
- **FR-007**: Recompute from the existing short-lived board on local clock ticks;
  add no polling, persistence or retention extension. Preserve commute guidance.
- **FR-008**: Preserve freshness, empty/error states, source erasure and accessible
  English/Dutch HA-native presentation.

### Key Entities

- **Route row**: One transport/line/destination combination within one favourite;
  next usable departure, up to three following departures and cancellation notices.
- **Departure**: Existing source identity, absolute times and nullable live status.
- **Display preference**: Explicit mode and separate individual/grouped limits.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Five repeated route departures occupy one row with exactly three
  following times; a limit of three never displays more than three route rows.
- **SC-002**: All existing configurations retain their per-departure limit behavior.
- **SC-003**: Local advancement adds zero network requests and erases source data
  at its original expiry, never later than 29 minutes after collection.
- **SC-004**: Grouped boards and editor have no horizontal overflow at phone and
  tablet widths in either theme and no automated accessibility violations.
- **SC-005**: Explicit deterministic examples cover ordering, filters, duplicate
  identity, cancellation, unknown status and timezone/rounding boundaries.

## Assumptions

- "Recent departures" means next upcoming, as confirmed with the user.
- Opposite directions count as two route rows, even for the same line number.
- Grouping uses existing board data only; new backend station metadata is not
  required. The native NS integration is out of scope.
- New cards also retain the individual default for consistency; grouping is opt-in.
- No release bump, live HA changes, merge or publication are requested.
