import { describe, expect, it } from "vitest";
import {
  parseConfig,
  visibleDepartures,
  nextCommute,
  minutesUntil,
} from "../../src/model";
import { board, NOW } from "../fixtures/boards";

describe("config and time model", () => {
  const config = parseConfig({
    type: "custom:ovapi-departures-card",
    entities: ["sensor.amsterdam_departures"],
  });
  it("sets explicit safe defaults and validates input", () => {
    expect(config.max_departures).toBe(5);
    expect(config.language).toBe("auto");
    for (const invalid of [
      null,
      {},
      { entities: [] },
      { entities: ["light.x"] },
      { entities: ["sensor.x"], walking_minutes: -1 },
      { entities: ["sensor.x"], max_departures: 21 },
    ]) {
      expect(() => parseConfig(invalid)).toThrow();
    }
  });
  it.each([
    { entities: "sensor.x" },
    { entities: [""] },
    { entities: Array.from({ length: 13 }, (_, i) => `sensor.s${i}`) },
    { type: "bad" },
    { language: "de" },
    { title: 3 },
    { title: "x".repeat(121) },
    { walking_minutes: 121 },
    { walking_minutes: 0.5 },
    { lines: [null] },
    { destinations: [3] },
  ])("rejects invalid config %j", (patch) => {
    expect(() => parseConfig({ ...config, ...patch })).toThrow();
  });
  it("preserves explicit options, deduplicates and sorts ties by ID", () => {
    expect(
      parseConfig({
        ...config,
        title: "Departures",
        entities: ["sensor.x", "sensor.x"],
        walking_minutes: 0,
      }),
    ).toMatchObject({
      entities: ["sensor.x"],
      walking_minutes: 0,
      title: "Departures",
    });
    const b = board();
    b.departures[1]!.scheduled_at = b.departures[0]!.expected_at!;
    expect(visibleDepartures(b, config, NOW).map((d) => d.id)).toEqual([
      "synthetic-trip-1",
      "synthetic-trip-2",
    ]);
  });
  it("sorts without mutating and intersects exact case-insensitive filters", () => {
    const snapshot = board();
    snapshot.departures.reverse();
    expect(visibleDepartures(snapshot, config, NOW)[0]?.line).toBe("X1");
    expect(snapshot.departures[0]?.line).toBe("X2");
    expect(
      visibleDepartures(
        snapshot,
        {
          ...config,
          lines: ["x2"],
          destinations: ["synthetic destination two"],
        },
        NOW,
      ),
    ).toHaveLength(1);
    expect(
      visibleDepartures(
        snapshot,
        { ...config, lines: ["X"], destinations: [] },
        NOW,
      ),
    ).toHaveLength(0);
  });
  it("hides elapsed trips and selects catchable noncancelled services", () => {
    expect(visibleDepartures(board(), config, NOW + 12 * 60_000)).toHaveLength(
      1,
    );
    expect(nextCommute(board(), config, NOW)?.leaveAt).toBe(NOW + 7 * 60_000);
    expect(
      nextCommute(board(), { ...config, walking_minutes: 13 }, NOW),
    ).toBeUndefined();
    expect(
      nextCommute(board({ status: "stale" }), config, NOW),
    ).toBeUndefined();
  });
  it("uses conservative local countdowns", () => {
    expect(minutesUntil(NOW + 119_999, NOW)).toBe(1);
    expect(minutesUntil(NOW + 999, NOW)).toBe(0);
  });
  it.each([
    ["2030-03-31T01:55:00+01:00", "2030-03-31T03:05:00+02:00"],
    ["2030-10-27T02:55:00+02:00", "2030-10-27T02:05:00+01:00"],
    ["2030-01-15T23:55:00+01:00", "2030-01-16T00:05:00+01:00"],
  ])("calculates elapsed instants across DST/midnight %s", (start, end) => {
    expect(minutesUntil(Date.parse(end), Date.parse(start))).toBe(10);
  });
});
