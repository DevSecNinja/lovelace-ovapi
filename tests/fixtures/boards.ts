import type {
  BoardSnapshot,
  Departure,
  StationCoverage,
} from "../../src/contract";

export const NOW = Date.parse("2030-01-15T12:00:00Z");

export function coverage(
  overrides: Partial<StationCoverage> = {},
): StationCoverage {
  return {
    status: "complete",
    selected_members: 4,
    verified_members: 4,
    missing_members: 0,
    metadata_fetched_at: "2030-01-14T12:00:00Z",
    metadata_expires_at: "2030-01-21T12:00:00+00:00",
    ...overrides,
  };
}

export function unavailableStation(
  overrides: Partial<StationCoverage> = {},
): BoardSnapshot {
  return board({
    status: "unavailable",
    fetched_at: null,
    expires_at: null,
    departures: [],
    coverage: coverage({
      status: "partial",
      verified_members: 3,
      missing_members: 1,
      ...overrides,
    }),
  });
}

export function departure(
  minutes: number,
  overrides: Partial<Departure> = {},
  now = NOW,
): Departure {
  return {
    id: `synthetic-metro-${minutes}`,
    line: "50",
    destination: "Isolatorweg",
    transport: "metro",
    scheduled_at: new Date(now + minutes * 60_000).toISOString(),
    expected_at: null,
    cancelled: false,
    delay_seconds: null,
    ...overrides,
  };
}

export function groupedBoard(now = NOW): BoardSnapshot {
  return board({
    fetched_at: new Date(now).toISOString(),
    expires_at: new Date(now + 29 * 60_000).toISOString(),
    departures: [
      ...[2, 8, 14, 20, 26].map((m) => departure(m, {}, now)),
      departure(1, { id: "synthetic-cancelled", cancelled: true }, now),
      departure(3, { id: "synthetic-opposite", destination: "Gein" }, now),
      departure(4, { id: "synthetic-bus", transport: "bus" }, now),
      departure(5, { id: "synthetic-tram", transport: "tram" }, now),
      departure(6, { id: "synthetic-other-line", line: "51" }, now),
      departure(
        7,
        {
          id: "synthetic-unknown",
          line: "?",
          transport: "unknown",
          cancelled: null,
        },
        now,
      ),
    ],
  });
}

export function combinedBoard(now = NOW): BoardSnapshot {
  return board({
    stop: {
      id: "SYNTHETIC_COMBINED",
      name: "Diemen Zuid · synthetic combined",
    },
    fetched_at: new Date(now).toISOString(),
    expires_at: new Date(now + 29 * 60_000).toISOString(),
    walking_minutes: 7,
    departures: [
      ...[2, 8, 14, 20, 26].map((m) => departure(m, {}, now)),
      ...[3, 9, 15, 21].map((m) =>
        departure(m, { id: `opposite-${m}`, destination: "Gein" }, now),
      ),
      ...[4, 10, 16, 22].map((m) =>
        departure(m, { id: `bus-${m}`, transport: "bus" }, now),
      ),
      departure(7, { cancelled: true }, now),
    ],
  });
}

export function board(overrides: Partial<BoardSnapshot> = {}): BoardSnapshot {
  return {
    contract_version: 1,
    board_id: "synthetic-entry",
    entity_id: "sensor.amsterdam_departures",
    stop: { id: "SYNTHETIC_AMSTEL", name: "Amsterdam Amstel" },
    status: "ready",
    fetched_at: new Date(NOW).toISOString(),
    expires_at: new Date(NOW + 29 * 60_000).toISOString(),
    walking_minutes: 5,
    departures: [
      {
        id: "synthetic-trip-1",
        line: "X1",
        destination: "Synthetic destination",
        transport: "tram",
        scheduled_at: new Date(NOW + 10 * 60_000).toISOString(),
        expected_at: new Date(NOW + 12 * 60_000).toISOString(),
        cancelled: false,
        delay_seconds: 120,
      },
      {
        id: "synthetic-trip-2",
        line: "X2",
        destination: "Synthetic destination two",
        transport: "bus",
        scheduled_at: new Date(NOW + 15 * 60_000).toISOString(),
        expected_at: null,
        cancelled: true,
        delay_seconds: null,
      },
    ],
    ...overrides,
  };
}
