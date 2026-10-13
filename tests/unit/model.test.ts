import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  parseConfig,
  visibleDepartures,
  nextCommute,
  minutesUntil,
  groupedDepartures,
  departureAt,
  displayDepartures,
  leaveAt,
} from "../../src/model";
import {
  board,
  combinedBoard,
  departure,
  groupedBoard,
  NOW,
} from "../fixtures/boards";

describe("config and time model", () => {
  const config = parseConfig({
    type: "custom:ovapi-departures-card",
    entities: ["sensor.amsterdam_departures"],
  });
  it("sets explicit safe defaults and validates input", () => {
    expect(config.max_departures).toBe(5);
    expect(config.language).toBe("auto");
    expect(config.display_mode).toBe("departures");
    expect(config.max_routes).toBe(5);
    expect(config).toHaveProperty("time_mode", "departure");
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
    { display_mode: "routes" },
    { display_mode: false },
    { time_mode: "walking" },
    { time_mode: "" },
    { time_mode: false },
    { max_routes: 0 },
    { max_routes: 21 },
    { max_routes: 1.5 },
    { max_routes: "3" },
    { max_departures: 0 },
    { max_departures: 21 },
  ])("rejects invalid config %j", (patch) => {
    expect(() => parseConfig({ ...config, ...patch })).toThrow();
  });

  it.each([
    ["max_routes", "max_routes: use 1 to 20"],
    ["display_mode", "display_mode: use departures or grouped"],
    ["time_mode", "time_mode: use departure or leave"],
  ])("rejects explicit null and empty YAML values for %s", (field, message) => {
    expect(() => parseConfig({ ...config, [field]: null })).toThrow(message);
    for (const value of ["", "null", "~"]) {
      const yaml: unknown = parseYaml(
        `type: custom:ovapi-departures-card\nentities:\n  - sensor.amsterdam_departures\n${field}: ${value}\n`,
      );
      expect(() => parseConfig(yaml)).toThrow(message);
    }
  });

  it("defaults undefined new settings and preserves legacy max_departures null behavior", () => {
    expect(
      parseConfig({
        ...config,
        display_mode: undefined,
        max_routes: undefined,
        max_departures: null,
      }),
    ).toMatchObject({
      display_mode: "departures",
      max_routes: 5,
      max_departures: 5,
    });
  });

  describe("grouped departures", () => {
    const config = parseConfig({
      type: "custom:ovapi-departures-card",
      entities: [board().entity_id],
      display_mode: "grouped",
      max_routes: 20,
    });
    describe("walking-aware departures", () => {
      const config = parseConfig({
        type: "custom:ovapi-departures-card",
        entities: [board().entity_id],
        display_mode: "grouped",
        time_mode: "leave",
      });

      it("chooses later reachable vehicles for every route before grouping and limits", () => {
        const b = combinedBoard();
        const original = structuredClone(b);
        const groups = groupedDepartures(b, config, NOW);
        expect(groups.map((g) => g.departure.id)).toEqual([
          "synthetic-metro-8",
          "opposite-9",
          "bus-10",
        ]);
        expect(
          groups[0]?.following.map((d) =>
            minutesUntil(departureAt(d) - 7 * 60_000, NOW),
          ),
        ).toEqual([7, 13, 19]);
        expect(groups.every((g) => g.cancellations.length === 0)).toBe(true);
        expect(
          groupedDepartures(
            b,
            { ...config, max_routes: 1, destinations: ["Gein"] },
            NOW,
          )[0]?.departure.id,
        ).toBe("opposite-9");
        expect(b).toEqual(original);
      });

      it.each([
        [undefined, 8],
        [0, 2],
        [7, 8],
        [9, 14],
      ])(
        "uses override %s instead of the feed walk",
        (walking_minutes, first) => {
          const c = parseConfig({ ...config, walking_minutes });
          const group = groupedDepartures(combinedBoard(), c, NOW)[0]!;
          // At walk9 the opposite route is reachable immediately and sorts first.
          const metro = groupedDepartures(combinedBoard(), c, NOW).find(
            (g) =>
              g.departure.transport === "metro" &&
              g.departure.destination === "Isolatorweg",
          )!;
          expect(metro.departure.id).toBe(`synthetic-metro-${first}`);
          expect(group.departure.cancelled).not.toBe(true);
        },
      );

      it("withholds stale, unavailable, cancelled-only and unreachable advice", () => {
        for (const b of [
          { ...combinedBoard(), status: "stale" as const },
          board({
            status: "unavailable",
            fetched_at: null,
            expires_at: null,
            departures: [],
          }),
          board({ departures: [departure(8, { cancelled: true })] }),
          board({ walking_minutes: 120 }),
        ]) {
          expect(groupedDepartures(b, config, NOW)).toEqual([]);
        }
      });

      it("preserves departure defaults and commute selection regardless of time/display mode", () => {
        for (const type of [
          "custom:ovapi-departures-card",
          "custom:ovapi-commute-card",
        ]) {
          const defaults = parseConfig({
            type,
            entities: config.entities,
            time_mode: undefined,
          });
          expect(defaults).toMatchObject({
            time_mode: "departure",
            display_mode: "departures",
          });
          expect(displayDepartures(combinedBoard(), defaults, NOW)[0]?.id).toBe(
            "synthetic-metro-2",
          );
          for (const time_mode of ["departure", "leave"]) {
            const c = parseConfig({
              ...defaults,
              time_mode,
              display_mode: "grouped",
              max_routes: 1,
            });
            expect(nextCommute(combinedBoard(), c, NOW)?.departure.id).toBe(
              "synthetic-metro-8",
            );
          }
        }
      });

      it("uses each feed's own walk, or one override for every feed, including zero", () => {
        const boards = [
          combinedBoard(),
          { ...combinedBoard(), walking_minutes: 0 },
        ];
        expect(
          boards.map((b) => displayDepartures(b, config, NOW)[0]?.id),
        ).toEqual(["synthetic-metro-8", "synthetic-metro-2"]);
        for (const walking_minutes of [0, 7]) {
          expect(
            boards.map(
              (b) =>
                displayDepartures(b, { ...config, walking_minutes }, NOW)[0]
                  ?.id,
            ),
          ).toEqual(
            Array(2).fill(
              walking_minutes === 0 ? "synthetic-metro-2" : "synthetic-metro-8",
            ),
          );
        }
      });

      it("uses expected instants, retains unknowns, rejects cancellation, and advances exact leave boundaries", () => {
        const b = board({
          walking_minutes: 7,
          departures: [
            departure(2, {
              expected_at: new Date(NOW + 8 * 60_000).toISOString(),
              delay_seconds: 360,
              cancelled: null,
            }),
            departure(8, { cancelled: true }),
            departure(14, { cancelled: null, transport: "unknown" }),
            departure(20, { expected_at: new Date(NOW - 1).toISOString() }),
          ],
        });
        expect(displayDepartures(b, config, NOW).map((d) => d.id)).toEqual([
          "synthetic-metro-2",
          "synthetic-metro-14",
        ]);
        expect(displayDepartures(b, config, NOW + 60_000)[0]?.id).toBe(
          "synthetic-metro-2",
        );
        expect(displayDepartures(b, config, NOW + 60_001)[0]?.id).toBe(
          "synthetic-metro-14",
        );
        expect(displayDepartures(b, config, NOW + 7 * 60_000 + 1)).toEqual([]);
        expect(
          displayDepartures(
            board({ departures: [departure(0)], walking_minutes: 0 }),
            config,
            NOW,
          ),
        ).toEqual([]);
      });

      it("deduplicates exact events only, preserves collisions, and stably orders route rows", () => {
        const d = departure(8);
        const b = board({
          walking_minutes: 7,
          departures: [
            d,
            { ...d },
            { ...d, scheduled_at: "2030-01-15T13:08:00+01:00" },
            { ...d, id: "distinct" },
            { ...d, delay_seconds: 10 },
            {
              ...d,
              scheduled_at: new Date(NOW + 8 * 60_000 + 1000).toISOString(),
            },
            { ...d, destination: "Gein" },
            { ...d, transport: "bus" },
          ],
        });
        const signature = () =>
          groupedDepartures(b, config, NOW).map((g) => [
            g.departure.transport,
            g.departure.destination,
            [g.departure, ...g.following]
              .map((e) => [e.id, e.delay_seconds, Date.parse(e.scheduled_at)])
              .sort((a, b) =>
                JSON.stringify(a).localeCompare(JSON.stringify(b)),
              ),
          ]);
        const groups = groupedDepartures(b, config, NOW);
        expect(groups).toHaveLength(3);
        expect(
          groups.find(
            (g) =>
              g.departure.destination === "Isolatorweg" &&
              g.departure.transport === "metro",
          )?.following,
        ).toHaveLength(3);
        const before = signature();
        b.departures.reverse();
        expect(signature()).toEqual(before);
      });

      it("applies normalized intersecting filters before both limits, and bounds default and maximum routes", () => {
        const b = board({
          walking_minutes: 7,
          departures: Array.from({ length: 25 }, (_, i) =>
            departure(8 + i, { line: `${i}`, destination: `Stop ${i}` }),
          ),
        });
        expect(groupedDepartures(b, config, NOW)).toHaveLength(5);
        expect(
          groupedDepartures(b, { ...config, max_routes: 20 }, NOW),
        ).toHaveLength(20);
        expect(
          groupedDepartures(
            b,
            {
              ...config,
              max_routes: 1,
              lines: [" 24 "],
              destinations: [" stop 24 "],
            },
            NOW,
          )[0]?.departure.line,
        ).toBe("24");
        expect(
          displayDepartures(
            b,
            { ...config, lines: ["24"], destinations: ["stop 1"] },
            NOW,
          ),
        ).toEqual([]);
        expect(
          groupedDepartures(board({ departures: [] }), config, NOW),
        ).toEqual([]);
      });

      it.each([
        ["2030-03-31T01:55:00+01:00", "2030-03-31T03:05:00+02:00"],
        ["2030-10-27T02:55:00+02:00", "2030-10-27T02:05:00+01:00"],
        ["2030-01-15T23:55:00+01:00", "2030-01-16T00:05:00+01:00"],
      ])("subtracts walk across DST/midnight %s", (start, end) => {
        const now = Date.parse(start);
        const d = departure(0, { scheduled_at: end }, now);
        expect(minutesUntil(leaveAt(d, 7), now)).toBe(3);
        expect(minutesUntil(leaveAt(d, 7), now + 1)).toBe(2);
      });
    });

    it("groups transport/line/destination separately with three following times", () => {
      const b = groupedBoard();
      const original = structuredClone(b);
      const groups = groupedDepartures(b, config, NOW);
      expect(groups).toHaveLength(6);
      expect(groups[0]?.departure.id).toBe("synthetic-metro-2");
      expect(
        groups[0]?.following.map((d) => minutesUntil(departureAt(d), NOW)),
      ).toEqual([8, 14, 20]);
      expect(groups[0]?.cancellations.map((d) => d.id)).toEqual([
        "synthetic-cancelled",
      ]);
      expect(
        groups.map((g) => [
          g.departure.transport,
          g.departure.line,
          g.departure.destination,
        ]),
      ).toEqual([
        ["metro", "50", "Isolatorweg"],
        ["metro", "50", "Gein"],
        ["bus", "50", "Isolatorweg"],
        ["tram", "50", "Isolatorweg"],
        ["metro", "51", "Isolatorweg"],
        ["unknown", "?", "Isolatorweg"],
      ]);
      expect(b).toEqual(original);
    });

    it("normalizes case and surrounding whitespace for filters and groups, but not internal whitespace", () => {
      const b = board({
        departures: [
          departure(2, { line: " 50 ", destination: " ISOLATORWEG " }),
          departure(8),
          departure(3, { destination: "Iso latorweg" }),
        ],
      });
      const filtered = {
        ...config,
        lines: [" 50 "],
        destinations: ["isolatorweg "],
      };
      expect(visibleDepartures(b, filtered, NOW)).toHaveLength(2);
      const groups = groupedDepartures(b, filtered, NOW);
      expect(groups).toHaveLength(1);
      expect(groups[0]?.following).toHaveLength(1);
      expect(groups[0]?.departure.destination).toBe(" ISOLATORWEG ");
    });

    it("deduplicates identical source events, not distinct IDs, same-minute vehicles or conflicting IDs", () => {
      const d = departure(2);
      const b = board({
        departures: [
          d,
          { ...d },
          { ...d, scheduled_at: "2030-01-15T13:02:00+01:00" },
          { ...d, id: "distinct-vehicle" },
          {
            ...d,
            scheduled_at: new Date(NOW + 2 * 60_000 + 1000).toISOString(),
          },
          { ...d, cancelled: true },
        ],
      });
      const g = groupedDepartures(b, config, NOW)[0]!;
      expect(g.following).toHaveLength(2);
      expect(
        [g.departure, ...g.following].map((e) =>
          minutesUntil(departureAt(e), NOW),
        ),
      ).toEqual([2, 2, 2]);
      expect(g.cancellations).toHaveLength(1);
    });

    it("orders by usable instants, applies filters before limits and keeps cancelled-only rows last", () => {
      const b = groupedBoard();
      b.departures.push(
        departure(0.5, { line: "cancelled-only", cancelled: true }),
      );
      b.departures.reverse();
      expect(
        groupedDepartures(b, { ...config, max_routes: 3 }, NOW).map(
          (g) => g.departure.id,
        ),
      ).toEqual(["synthetic-metro-2", "synthetic-opposite", "synthetic-bus"]);
      expect(
        groupedDepartures(
          b,
          { ...config, max_routes: 1, destinations: ["Gein"] },
          NOW,
        )[0]?.departure.id,
      ).toBe("synthetic-opposite");
      const all = groupedDepartures(b, config, NOW);
      expect(all.at(-1)?.departure.line).toBe("cancelled-only");
      expect(
        groupedDepartures(b, { ...config, lines: ["missing"] }, NOW),
      ).toEqual([]);
      expect(groupedDepartures(board({ departures: [] }), config, NOW)).toEqual(
        [],
      );
    });

    it("bounds cancellation notices and orders cancelled-only groups by their first instant", () => {
      const b = board({
        departures: [
          ...[2, 3, 4, 5, 6].map((m) => departure(m, { cancelled: true })),
          departure(1, { line: "51", cancelled: true }),
        ],
      });
      const groups = groupedDepartures(b, config, NOW);
      expect(groups.map((g) => g.departure.line)).toEqual(["51", "50"]);
      expect(groups[1]?.following).toEqual([]);
      expect(groups[1]?.cancellations).toHaveLength(3);
      expect(groups[1]?.additionalCancellations).toBe(2);
    });

    it("enforces the default and both route-count boundaries on a larger board", () => {
      const b = board({
        departures: Array.from({ length: 25 }, (_, i) =>
          departure(i + 1, { line: `L${i}` }),
        ),
      });
      expect(
        groupedDepartures(
          b,
          parseConfig({
            type: config.type,
            entities: config.entities,
            display_mode: "grouped",
          }),
          NOW,
        ),
      ).toHaveLength(5);
      expect(
        groupedDepartures(b, { ...config, max_routes: 1 }, NOW),
      ).toHaveLength(1);
      expect(
        groupedDepartures(b, { ...config, max_routes: 20 }, NOW),
      ).toHaveLength(20);
    });

    it("sorts equal-time groups deterministically by ID then group key", () => {
      const b = board({
        departures: [
          departure(2, { id: "same", line: "B" }),
          departure(2, { id: "same", line: "A" }),
          departure(2, { id: "first", line: "C" }),
        ],
      });
      expect(
        groupedDepartures(b, config, NOW).map((g) => g.departure.line),
      ).toEqual(["C", "A", "B"]);
      b.departures.reverse();
      expect(
        groupedDepartures(b, config, NOW).map((g) => g.departure.line),
      ).toEqual(["C", "A", "B"]);
    });

    it("prefers expected time, drops elapsed events and advances the next/following departures locally", () => {
      const b = groupedBoard();
      b.departures.push(
        departure(-5, {
          expected_at: new Date(NOW + 60_000).toISOString(),
          cancelled: null,
        }),
      );
      b.departures.push(
        departure(30, { expected_at: new Date(NOW - 1).toISOString() }),
      );
      const first = groupedDepartures(b, config, NOW)[0]!;
      expect(first.departure.cancelled).toBeNull();
      expect(
        first.following.map((d) => minutesUntil(departureAt(d), NOW)),
      ).toEqual([2, 8, 14]);
      const next = groupedDepartures(
        b,
        { ...config, lines: ["50"], destinations: ["Isolatorweg"] },
        NOW + 2 * 60_000,
      );
      expect(next.map((g) => g.departure.transport)).toEqual([
        "bus",
        "tram",
        "metro",
      ]);
      expect(
        next[2]?.following.map((d) =>
          minutesUntil(departureAt(d), NOW + 2 * 60_000),
        ),
      ).toEqual([12, 18, 24]);
      expect(groupedDepartures(b, config, NOW + 30 * 60_000)).toEqual([]);
    });

    it.each([
      ["2030-03-31T01:55:00+01:00", "2030-03-31T03:05:00+02:00"],
      ["2030-10-27T02:55:00+02:00", "2030-10-27T02:05:00+01:00"],
      ["2030-01-15T23:55:00+01:00", "2030-01-16T00:05:00+01:00"],
    ])("groups across absolute-time boundaries %s", (start, end) => {
      const now = Date.parse(start);
      const b = board({
        departures: [
          departure(0, { scheduled_at: end }, now),
          departure(11, {}, now),
        ],
      });
      const g = groupedDepartures(b, config, now)[0]!;
      expect(minutesUntil(departureAt(g.departure), now)).toBe(10);
      expect(minutesUntil(departureAt(g.following[0]!), now + 1)).toBe(10);
      expect(minutesUntil(departureAt(g.departure), now + 1)).toBe(9);
    });
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
