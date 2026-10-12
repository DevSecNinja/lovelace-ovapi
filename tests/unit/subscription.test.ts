import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readBoard, watchBoard } from "../../src/subscription";
import { FakeConnection } from "../fixtures/connection";
import { board, coverage, NOW, unavailableStation } from "../fixtures/boards";

describe("ephemeral shared subscriptions", () => {
  it("reads one owned snapshot, erases observed expiry before reentrant listeners and never creates a subscription", () => {
    const c = new FakeConnection();
    expect(readBoard(c, board().entity_id)).toBeUndefined();
    const listener = vi.fn(() => readBoard(c, board().entity_id));
    const stop = watchBoard(c, board().entity_id, listener);
    c.emit(board().entity_id, board());
    expect(readBoard(c, board().entity_id)?.board).toBeDefined();
    vi.setSystemTime(NOW + 30 * 60_000);
    expect(readBoard(c, board().entity_id)).toEqual({ status: "expired" });
    expect(listener.mock.lastCall).toBeDefined();
    expect(listener.mock.results.at(-1)?.value).toEqual({ status: "expired" });
    vi.setSystemTime(NOW);
    expect(readBoard(c, board().entity_id)).toEqual({ status: "expired" });
    expect(vi.getTimerCount()).toBe(0);
    expect(c.calls).toBe(1);
    stop();
    expect(readBoard(c, board().entity_id)).toBeUndefined();
  });
  it("retains only whitelisted unavailable coverage, shares it, and erases on disconnect/unsubscribe", async () => {
    const c = new FakeConnection(),
      a = vi.fn(),
      b = vi.fn();
    const stopA = watchBoard(c, board().entity_id, a);
    const value = unavailableStation();
    c.emit(value.entity_id, {
      ...value,
      raw_payload: "discard",
      coverage: { ...value.coverage, raw_payload: "discard" },
    });
    const expected = { status: "unavailable", coverage: value.coverage };
    expect(a.mock.lastCall?.[0]).toEqual(expected);
    const stopB = watchBoard(c, value.entity_id, b);
    expect(b.mock.lastCall?.[0]).toEqual(expected);
    expect(c.calls).toBe(1);
    c.fire("disconnected");
    expect(a.mock.lastCall?.[0]).toEqual({ status: "disconnected" });
    c.fire("ready");
    expect(a.mock.lastCall?.[0]).toEqual({ status: "loading" });
    c.emit(value.entity_id, value);
    await Promise.resolve();
    stopA();
    stopB();
    expect(vi.getTimerCount()).toBe(0);
    const fresh = vi.fn();
    const stop = watchBoard(c, value.entity_id, fresh);
    expect(fresh.mock.lastCall?.[0]).toEqual({ status: "loading" });
    stop();
  });
  it.each(["complete", "partial", "stale"] as const)(
    "expires %s metadata at its original deadline despite cached/duplicate frames",
    async (status) => {
      const c = new FakeConnection(),
        a = vi.fn(),
        b = vi.fn();
      const stop = watchBoard(c, board().entity_id, a);
      const metadata = coverage({
        status,
        metadata_expires_at: new Date(NOW + 120_000).toISOString(),
        ...(status === "partial"
          ? { verified_members: 3, missing_members: 1 }
          : {}),
      });
      const value =
        status === "partial"
          ? unavailableStation(metadata)
          : board({
              status: status === "stale" ? "stale" : "ready",
              coverage: metadata,
            });
      c.emit(value.entity_id, value);
      await vi.advanceTimersByTimeAsync(60_000);
      c.emit(value.entity_id, value);
      const stopB = watchBoard(c, value.entity_id, b);
      expect(b.mock.lastCall?.[0].coverage).toEqual(metadata);
      await vi.advanceTimersByTimeAsync(59_999);
      expect(a.mock.lastCall?.[0].coverage).toEqual(metadata);
      await vi.advanceTimersByTimeAsync(1);
      expect(a.mock.lastCall?.[0]).toEqual({
        status: "unavailable",
        coverageExpired: true,
      });
      c.emit(value.entity_id, value);
      expect(b.mock.lastCall?.[0]).toEqual({
        status: "unavailable",
        coverageExpired: true,
      });
      expect(vi.getTimerCount()).toBe(0);
      expect(c.calls).toBe(1);
      stop();
      stopB();
    },
  );
  it("erases live data first without applying the 29-minute TTL to static coverage", async () => {
    const c = new FakeConnection(),
      listener = vi.fn();
    const stop = watchBoard(c, board().entity_id, listener);
    const value = board({ coverage: coverage() });
    c.emit(value.entity_id, value);
    await vi.advanceTimersByTimeAsync(29 * 60_000);
    expect(listener.mock.lastCall?.[0]).toEqual({
      status: "expired",
      coverage: value.coverage,
    });
    c.emit(value.entity_id, value);
    expect(listener.mock.lastCall?.[0]).toEqual({
      status: "expired",
      coverage: value.coverage,
    });
    c.emit(value.entity_id, { ...unavailableStation(), coverage: null });
    expect(listener.mock.lastCall?.[0]).toEqual({ status: "error" });
    expect(vi.getTimerCount()).toBe(0);
    stop();
  });
  it("checks metadata before serving cached data after suspended clock jumps", () => {
    const c = new FakeConnection(),
      listener = vi.fn(),
      late = vi.fn();
    const stop = watchBoard(c, board().entity_id, listener);
    c.emit(board().entity_id, unavailableStation());
    vi.setSystemTime(Date.parse(coverage().metadata_expires_at!));
    const stopLate = watchBoard(c, board().entity_id, late);
    expect(late.mock.lastCall?.[0]).toEqual({
      status: "unavailable",
      coverageExpired: true,
    });
    stop();
    stopLate();
  });
  it("does not overflow platform timers for long static validity or retain unknown metadata", async () => {
    const c = new FakeConnection(),
      listener = vi.fn();
    const stop = watchBoard(c, board().entity_id, listener);
    c.emit(
      board().entity_id,
      unavailableStation({
        metadata_expires_at: new Date(NOW + 3_000_000_000).toISOString(),
      }),
    );
    await vi.advanceTimersByTimeAsync(2_147_483_647);
    expect(listener.mock.lastCall?.[0].coverage.status).toBe("partial");
    await vi.advanceTimersByTimeAsync(3_000_000_000 - 2_147_483_647);
    expect(listener.mock.lastCall?.[0]).toEqual({
      status: "unavailable",
      coverageExpired: true,
    });
    c.emit(
      board().entity_id,
      unavailableStation({
        status: "unavailable",
        selected_members: 0,
        verified_members: 0,
        missing_members: 0,
        metadata_fetched_at: null,
        metadata_expires_at: null,
      }),
    );
    expect(listener.mock.lastCall?.[0].coverage.status).toBe("unavailable");
    expect(vi.getTimerCount()).toBe(0);
    stop();
  });
  it("reports cleanup failures without logging source or server errors", async () => {
    const c = new FakeConnection();
    c.subscribeMessage = async () => async () => {
      throw new Error("SENSITIVE SYNTHETIC PAYLOAD");
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const stop = watchBoard(c, board().entity_id, vi.fn());
    await Promise.resolve();
    stop();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledWith(
      "OVAPI subscription cleanup failed; reload the dashboard.",
    );
    expect(warn.mock.calls.flat().join()).not.toContain("SENSITIVE");
    warn.mockRestore();
  });
  it("starts disconnected and ignores failures after disposal", async () => {
    const c = new FakeConnection();
    c.connected = false;
    c.reject = true;
    const listener = vi.fn();
    const stop = watchBoard(c, board().entity_id, listener);
    expect(listener.mock.lastCall?.[0]).toEqual({ status: "disconnected" });
    stop();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it("does not resurrect expired data for a new subscriber after a clock jump", () => {
    const c = new FakeConnection(),
      a = vi.fn(),
      b = vi.fn();
    const stopA = watchBoard(c, board().entity_id, a);
    c.emit(board().entity_id, board());
    c.fire("ready");
    expect(a.mock.lastCall?.[0].board).toEqual(board());
    vi.setSystemTime(NOW + 30 * 60_000);
    const stopB = watchBoard(c, board().entity_id, b);
    expect(b.mock.lastCall?.[0]).toEqual({ status: "expired" });
    stopA();
    stopB();
  });
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());
  it("shares one subscription, replaces snapshots and clears exactly at expiry", async () => {
    const connection = new FakeConnection();
    const a = vi.fn(),
      b = vi.fn();
    const stopA = watchBoard(connection, board().entity_id, a);
    const stopB = watchBoard(connection, board().entity_id, b);
    expect(connection.calls).toBe(1);
    connection.emit(board().entity_id, board());
    expect(a.mock.lastCall?.[0].board.departures).toHaveLength(2);
    connection.emit(board().entity_id, board({ departures: [] }));
    expect(b.mock.lastCall?.[0].board.departures).toEqual([]);
    await vi.advanceTimersByTimeAsync(29 * 60_000);
    expect(a.mock.lastCall?.[0]).toEqual({ status: "expired" });
    expect(connection.calls).toBe(1);
    stopA();
    expect(connection.unsubscriptions).toBe(0);
    stopB();
    stopB();
    expect(connection.unsubscriptions).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    expect([...connection.events.values()].every((set) => !set.size)).toBe(
      true,
    );
  });
  it("clears disconnect immediately and accepts only a fresh replacement on reconnect", () => {
    const c = new FakeConnection(),
      listener = vi.fn();
    const stop = watchBoard(c, board().entity_id, listener);
    c.emit(board().entity_id, board());
    c.fire("disconnected");
    expect(listener.mock.lastCall?.[0]).toEqual({ status: "disconnected" });
    c.emit(board().entity_id, board());
    expect(listener.mock.lastCall?.[0]).toEqual({ status: "disconnected" });
    c.fire("ready");
    expect(listener.mock.lastCall?.[0]).toEqual({ status: "loading" });
    c.emit(board().entity_id, board({ status: "stale" }));
    expect(listener.mock.lastCall?.[0].status).toBe("stale");
    stop();
  });
  it("handles bad, unavailable, expired, failed and late data without retaining it", async () => {
    const c = new FakeConnection(),
      listener = vi.fn();
    c.deferred = true;
    const stop = watchBoard(c, board().entity_id, listener);
    c.emit(board().entity_id, { contract_version: 2 });
    expect(listener.mock.lastCall?.[0]).toEqual({ status: "error" });
    c.emit(
      board().entity_id,
      board({
        status: "unavailable",
        departures: [],
        fetched_at: null,
        expires_at: null,
      }),
    );
    expect(listener.mock.lastCall?.[0]).toEqual({ status: "unavailable" });
    vi.setSystemTime(NOW + 30 * 60_000);
    c.emit(board().entity_id, board());
    expect(listener.mock.lastCall?.[0]).toEqual({ status: "expired" });
    stop();
    c.emit(board().entity_id, board());
    c.resolve?.(async () => {});
    await Promise.resolve();
    expect(c.unsubscriptions).toBe(1);
    const failed = new FakeConnection();
    failed.reject = true;
    const cleanup = watchBoard(failed, board().entity_id, listener);
    await Promise.resolve();
    expect(listener.mock.lastCall?.[0]).toEqual({ status: "error" });
    cleanup();
  });
});
