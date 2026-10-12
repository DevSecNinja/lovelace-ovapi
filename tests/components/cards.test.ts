import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../src/index";
import type { OvapiDeparturesCard } from "../../src/cards";
import { FakeConnection, hass } from "../fixtures/connection";
import { board, NOW } from "../fixtures/boards";

describe("cards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  async function mount(tag = "ovapi-departures-card") {
    const card = document.createElement(tag) as OvapiDeparturesCard;
    const connection = new FakeConnection();
    card.setConfig({ type: `custom:${tag}`, entities: [board().entity_id] });
    card.hass = hass(connection);
    document.body.append(card);
    await card.updateComplete;
    return { card, connection, text: () => card.shadowRoot!.textContent! };
  }
  it("renders loading, departures, delays, cancellation, stale, empty and expiry honestly", async () => {
    const { card, connection, text } = await mount();
    expect(text()).toContain("Connecting");
    connection.emit(board().entity_id, board());
    await card.updateComplete;
    expect(text()).toContain("Amsterdam Amstel");
    expect(text()).toContain("+2");
    expect(text()).toContain("Cancelled");
    connection.emit(board().entity_id, board({ status: "stale" }));
    await card.updateComplete;
    expect(text()).toContain("Outdated");
    connection.emit(board().entity_id, board({ departures: [] }));
    await card.updateComplete;
    expect(text()).toContain("No upcoming departures");
    await vi.advanceTimersByTimeAsync(29 * 60_000);
    await card.updateComplete;
    expect(text()).toContain("expired");
    expect(text()).not.toContain("Amsterdam Amstel");
  });
  it("renders commute with walking, updates locally and never polls", async () => {
    const { card, connection, text } = await mount("ovapi-commute-card");
    connection.emit(board().entity_id, board());
    await card.updateComplete;
    expect(text()).toContain("Leave in");
    expect(text()).toContain("7");
    expect(text()).toContain("5 min walk");
    await vi.advanceTimersByTimeAsync(60_000);
    await card.updateComplete;
    expect(connection.calls).toBe(1);
    connection.fire("disconnected");
    await card.updateComplete;
    expect(text()).toContain("Disconnected");
    expect(text()).not.toContain("Synthetic destination");
    card.remove();
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("covers native registration, sizing, stub config and unconfigured rendering", async () => {
    const { OvapiDeparturesCard, OvapiCommuteCard } =
      await import("../../src/cards");
    expect(OvapiDeparturesCard.getConfigElement().localName).toBe(
      "ovapi-card-editor",
    );
    expect(OvapiDeparturesCard.getStubConfig(hass()).entities).toEqual([
      board().entity_id,
    ]);
    expect(OvapiDeparturesCard.getStubConfig().entities).toEqual([]);
    const future = hass();
    future.states[board().entity_id]!.attributes.contract_version = 2;
    expect(OvapiDeparturesCard.getStubConfig(future).entities).toEqual([]);
    const card = new OvapiDeparturesCard();
    document.body.append(card);
    await card.updateComplete;
    expect(card.shadowRoot!.querySelector("ha-card")).toBeNull();
    expect(card.getCardSize()).toBe(7);
    expect(card.getGridOptions()).toEqual({ columns: 12, min_columns: 6 });
    expect(new OvapiCommuteCard().getCardSize()).toBe(5);
    expect(window.customCards?.map((c) => c.type)).toContain(
      "ovapi-commute-card",
    );
    expect(card.hass).toBeUndefined();
  });
  it("reacts to config/hass changes, unknown text safely, filters and locale", async () => {
    const { card, connection, text } = await mount();
    const b = board();
    b.departures[0]!.destination = "<img src=x onerror=alert(1)>";
    b.departures[0]!.cancelled = null;
    b.departures[0]!.delay_seconds = null;
    b.departures[0]!.transport = "unknown";
    connection.emit(b.entity_id, b);
    await card.updateComplete;
    expect(text()).toContain("<img");
    expect(card.shadowRoot!.querySelector("img")).toBeNull();
    expect(text()).toContain("Live status unknown");
    const ha = hass(connection);
    ha.locale!.language = "nl";
    card.hass = ha;
    await card.updateComplete;
    expect(text()).toContain("Vertrektijden");
    expect(connection.calls).toBe(1);
    card.setConfig({
      type: "custom:ovapi-departures-card",
      title: "Custom",
      entities: [b.entity_id],
      lines: ["none"],
    });
    connection.emit(b.entity_id, b);
    await card.updateComplete;
    expect(text()).toContain("Custom");
    expect(text()).toContain("Geen vertrekken voor je filters");
    const second = new FakeConnection();
    card.hass = hass(second);
    await card.updateComplete;
    expect(text()).not.toContain("<img");
    expect(second.calls).toBe(1);
  });
  it("renders scheduled, expected, early and on-time states without inventing unknowns", async () => {
    const { card, connection, text } = await mount();
    for (const [patch, expected] of [
      [{ expected_at: null, delay_seconds: null }, "Scheduled"],
      [{ delay_seconds: null }, "Expected"],
      [{ delay_seconds: 0 }, "On time"],
      [{ delay_seconds: -120 }, "-2"],
    ] as const) {
      const b = board();
      Object.assign(b.departures[0]!, patch);
      connection.emit(b.entity_id, b);
      await card.updateComplete;
      expect(text()).toContain(expected);
    }
  });
  it.each(["en", "nl"] as const)(
    "preserves delay direction at sub-minute boundaries in %s",
    async (language) => {
      const { card, connection } = await mount();
      card.setConfig({
        type: "custom:ovapi-departures-card",
        entities: [board().entity_id],
        language,
      });
      for (const seconds of [
        1, 29, 30, 59, 60, 120, 150, -1, -29, -30, -59, -60, -120, -150,
      ]) {
        const b = board();
        b.departures[0]!.delay_seconds = seconds;
        connection.emit(b.entity_id, b);
        await card.updateComplete;
        const status =
          card.shadowRoot!.querySelector(".departure .detail")!.textContent!;
        if (Math.abs(seconds) < 60) {
          expect(status).toContain(
            language === "en"
              ? seconds < 0
                ? "<1 min early"
                : "<1 min late"
              : seconds < 0
                ? "<1 min eerder"
                : "<1 min later",
          );
        } else {
          expect(status).toContain(
            `${seconds < 0 ? "" : "+"}${Math.round(seconds / 60)} min`,
          );
        }
        expect(status).not.toContain("+0");
        expect(status).not.toContain("-0");
      }
    },
  );
  it("suppresses stale/cancelled commute advice, handles leave-now and no-catchable", async () => {
    const { card, connection, text } = await mount("ovapi-commute-card");
    connection.emit(board().entity_id, board({ status: "stale" }));
    await card.updateComplete;
    expect(text()).toContain("Check departures");
    expect(text()).not.toContain("Leave in");
    connection.emit(board().entity_id, board({ walking_minutes: 12 }));
    await card.updateComplete;
    expect(text()).toContain("Leave now");
    connection.emit(board().entity_id, board({ walking_minutes: 20 }));
    await card.updateComplete;
    expect(text()).toContain("No catchable");
    const b = board();
    b.departures[0]!.transport = "unknown";
    connection.emit(b.entity_id, b);
    await card.updateComplete;
    expect(text()).toContain("Service");
  });
  it("clears source on pagehide/unmount and resubscribes on visibility/pageshow", async () => {
    const { card, connection, text } = await mount();
    connection.emit(board().entity_id, board());
    await card.updateComplete;
    window.dispatchEvent(new Event("pagehide"));
    await card.updateComplete;
    expect(text()).not.toContain("Synthetic");
    expect(vi.getTimerCount()).toBe(0);
    window.dispatchEvent(new Event("pageshow"));
    await card.updateComplete;
    expect(connection.calls).toBe(2);
    connection.emit(board().entity_id, board());
    await card.updateComplete;
    const unsubscribed = connection.unsubscriptions;
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    await card.updateComplete;
    expect(text()).not.toContain("Synthetic");
    expect(vi.getTimerCount()).toBe(0);
    expect(connection.unsubscriptions).toBe(unsubscribed + 1);
    connection.emit(board().entity_id, board());
    await card.updateComplete;
    expect(text()).not.toContain("Synthetic");
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    await card.updateComplete;
    expect(connection.calls).toBe(3);
    connection.emit(board().entity_id, board());
    await card.updateComplete;
    card.remove();
    await card.updateComplete;
    expect(text()).not.toContain("Synthetic");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("renders unavailable, error and expiry even after clock suspension", async () => {
    const { card, connection, text } = await mount();
    connection.emit(board().entity_id, {});
    await card.updateComplete;
    expect(text()).toContain("Cannot read");
    connection.emit(
      board().entity_id,
      board({
        status: "unavailable",
        fetched_at: null,
        expires_at: null,
        departures: [],
      }),
    );
    await card.updateComplete;
    expect(text()).toContain("unavailable");
    connection.emit(board().entity_id, board());
    await card.updateComplete;
    vi.setSystemTime(NOW + 30 * 60_000);
    card.requestUpdate();
    await card.updateComplete;
    expect(text()).toContain("expired");
    expect(text()).not.toContain("Synthetic");
  });
});
