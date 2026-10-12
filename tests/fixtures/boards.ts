import type { BoardSnapshot } from "../../src/contract";

export const NOW = Date.parse("2030-01-15T12:00:00Z");
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
