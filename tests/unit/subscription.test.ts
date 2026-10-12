import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchBoard } from "../../src/subscription";
import { FakeConnection } from "../fixtures/connection";
import { board, NOW } from "../fixtures/boards";

describe("ephemeral shared subscriptions", () => {
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
