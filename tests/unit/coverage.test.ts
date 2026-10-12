import { describe, expect, it } from "vitest";
import { parseBoard } from "../../src/contract";
import { board, coverage, NOW, unavailableStation } from "../fixtures/boards";

const parse = (value: unknown) => parseBoard(value, board().entity_id, NOW);

describe("optional station coverage contract", () => {
  it("preserves legacy absence and whitelists the station record", () => {
    expect(parse(board())).not.toHaveProperty("coverage");
    const value = board({ coverage: coverage() });
    expect(
      parse({
        ...value,
        coverage: { ...value.coverage, raw_payload: "discard" },
      }),
    ).toEqual(value);
  });

  it.each([
    board({ coverage: coverage() }),
    unavailableStation(),
    board({ status: "stale", coverage: coverage({ status: "stale" }) }),
    unavailableStation({
      status: "unavailable",
      selected_members: 0,
      verified_members: 0,
      missing_members: 0,
      metadata_fetched_at: null,
      metadata_expires_at: null,
    }),
    unavailableStation({
      status: "complete",
      selected_members: 0,
      verified_members: 0,
      missing_members: 0,
    }),
    board({
      coverage: coverage({ selected_members: 30, verified_members: 30 }),
    }),
    board({ status: "stale", coverage: coverage() }),
    unavailableStation({
      status: "complete",
      verified_members: 4,
      missing_members: 0,
    }),
    unavailableStation({
      status: "stale",
      verified_members: 4,
      missing_members: 0,
    }),
  ])("accepts all coverage states and inclusive member bounds", (value) => {
    expect(parse(value)).toEqual(value);
  });

  it.each([
    undefined,
    null,
    false,
    [],
    "complete",
    {},
    { ...coverage(), status: "ready" },
    ...["selected_members", "verified_members", "missing_members"].flatMap(
      (key) =>
        [
          -1,
          0.5,
          31,
          "4",
          null,
          true,
          Number.MAX_SAFE_INTEGER + 1,
          undefined,
        ].map((value) => ({ ...coverage(), [key]: value })),
    ),
    { ...coverage(), verified_members: 3 },
    { ...coverage(), verified_members: 3, missing_members: 1 },
    { ...coverage(), status: "partial" },
    {
      ...coverage(),
      status: "stale",
      selected_members: 0,
      verified_members: 0,
    },
    { ...coverage(), status: "unavailable" },
    {
      ...coverage(),
      status: "unavailable",
      selected_members: 0,
      verified_members: 0,
    },
    {
      ...coverage(),
      status: "complete",
      metadata_fetched_at: null,
      metadata_expires_at: null,
    },
    ...[
      "2030-02-30T12:00:00Z",
      "2030-01-14T24:00:00Z",
      "2030-01-14T12:00:00+01:00",
      "2030-01-14T12:00:00",
      "bad",
      null,
      "2030-01-15T12:01:01Z",
    ].map((date) => ({ ...coverage(), metadata_fetched_at: date })),
    { ...coverage(), metadata_expires_at: null },
    { ...coverage(), metadata_expires_at: "2030-02-30T12:00:00Z" },
    { ...coverage(), metadata_expires_at: coverage().metadata_fetched_at },
    { ...coverage(), metadata_expires_at: "2030-01-13T12:00:00Z" },
  ])(
    "rejects malformed, unsafe or internally inconsistent coverage",
    (value) => {
      expect(() => parse({ ...board(), coverage: value })).toThrow();
    },
  );

  it.each([
    board({
      coverage: coverage({
        status: "partial",
        verified_members: 3,
        missing_members: 1,
      }),
    }),
    board({ coverage: coverage({ status: "stale" }) }),
    board({ coverage: coverage({ selected_members: 0, verified_members: 0 }) }),
    board({
      status: "stale",
      coverage: coverage({
        status: "partial",
        verified_members: 3,
        missing_members: 1,
      }),
    }),
    unavailableStation({ status: "stale" }),
    unavailableStation({ status: "unavailable" }),
  ])("rejects contradictory coverage and ordinary statuses", (value) => {
    expect(() => parse(value)).toThrow();
  });

  it("accepts strict UTC fractional instants and old cached metadata without applying the live TTL", () => {
    const value = board({
      coverage: coverage({
        metadata_fetched_at: "2030-01-01T12:00:00.123456+00:00",
        metadata_expires_at: "2030-01-08T12:00:00.123456Z",
      }),
    });
    expect(parse(value)).toEqual(value);
  });
  it.each([0, 2, "1", null, true])(
    "does not let coverage bypass version rejection: %s",
    (contract_version) => {
      expect(() =>
        parse({
          ...unavailableStation(),
          contract_version,
        }),
      ).toThrow("Unsupported contract version");
    },
  );
});
