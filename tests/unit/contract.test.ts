import { describe, expect, it } from "vitest";
import {
  CARD_CONTRACT_VERSION,
  isSupportedContract,
  parseBoard,
} from "../../src/contract";
import { board, NOW } from "../fixtures/boards";

describe("v1 runtime contract", () => {
  it.each([undefined, null, 0, 2, "1", 1.1, true])(
    "rejects unsupported/malformed wire version %s",
    (version) => {
      expect(isSupportedContract(version)).toBe(false);
      expect(() =>
        parseBoard(
          { ...board(), contract_version: version },
          board().entity_id,
          NOW,
        ),
      ).toThrow("Unsupported contract version");
    },
  );
  it("keeps protocol v1 independent of package release metadata", () => {
    expect(CARD_CONTRACT_VERSION).toBe(1);
    expect(isSupportedContract(board().contract_version)).toBe(true);
  });
  it("rejects missing display metadata and accepts bounded source values", () => {
    const b = board();
    b.departures[0]!.line = "";
    b.departures[0]!.destination = "";
    expect(() => parseBoard(b, b.entity_id, NOW)).toThrow();
    b.departures[0]!.line = " ";
    expect(() => parseBoard(b, b.entity_id, NOW)).toThrow();
    b.departures[0]!.line = "X1";
    expect(() => parseBoard(b, b.entity_id, NOW)).toThrow();
    b.departures[0]!.destination = "x".repeat(512);
    expect(
      parseBoard(b, b.entity_id, NOW).departures[0]!.destination,
    ).toHaveLength(512);
    b.departures[0]!.destination += "x";
    expect(() => parseBoard(b, b.entity_id, NOW)).toThrow();
  });
  it("accepts synthetic backend shape and discards unknown properties", () => {
    expect(
      parseBoard({ ...board(), extra: "discard" }, board().entity_id, NOW),
    ).toEqual(board());
  });
  it.each([
    { contract_version: 2 },
    { status: "unknown" },
    { entity_id: "sensor.other" },
    { fetched_at: "2030-01-15T12:00:00" },
    { expires_at: "2030-01-15T12:30:00Z" },
    { walking_minutes: -1 },
    { departures: [{ bad: true }] },
    { status: "unavailable" },
  ])("rejects incompatible or unsafe data %j", (patch) => {
    expect(() =>
      parseBoard({ ...board(), ...patch }, board().entity_id, NOW),
    ).toThrow();
  });
  it("allows unknown cancellation and unavailable snapshots", () => {
    const snapshot = board();
    snapshot.departures[0]!.cancelled = null;
    expect(
      parseBoard(snapshot, snapshot.entity_id, NOW).departures[0]?.cancelled,
    ).toBeNull();
    expect(
      parseBoard(
        board({
          status: "unavailable",
          departures: [],
          fetched_at: null,
          expires_at: null,
        }),
        snapshot.entity_id,
        NOW,
      ).status,
    ).toBe("unavailable");
  });
  it.each([
    null,
    [],
    { ...board(), stop: null },
    { ...board(), board_id: "" },
    { ...board(), board_id: "x".repeat(513) },
    {
      ...board(),
      departures: Array.from({ length: 5001 }, () => board().departures[0]),
    },
    { ...board(), expires_at: board().fetched_at },
    {
      ...board(),
      fetched_at: "2031-01-15T12:00:00Z",
      expires_at: "2031-01-15T12:29:00Z",
    },
    ...[
      { transport: "train" },
      { cancelled: "yes" },
      { delay_seconds: 0.5 },
      { scheduled_at: "bad" },
    ].map((patch) => ({
      ...board(),
      departures: [{ ...board().departures[0], ...patch }],
    })),
  ])("rejects malformed snapshots", (value) => {
    expect(() => parseBoard(value, board().entity_id, NOW)).toThrow();
  });
});
