import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../src/index";
import type { OvapiDeparturesCard } from "../../src/cards";
import { FakeConnection, hass } from "../fixtures/connection";
import { board, departure, groupedBoard, NOW } from "../fixtures/boards";

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
  async function mountGrouped(extra: Record<string, unknown> = {}) {
    const mounted = await mount();
    mounted.card.setConfig({
      type: "custom:ovapi-departures-card",
      entities: [board().entity_id],
      display_mode: "grouped",
      max_routes: 3,
      ...extra,
    });
    mounted.connection.emit(board().entity_id, groupedBoard());
    await mounted.card.updateComplete;
    return mounted;
  }
  it("renders three next route rows, following times and cancellation clocks without cancellation countdowns", async () => {
    const { card } = await mountGrouped();
    const rows = card.shadowRoot!.querySelectorAll(".departure");
    expect(rows).toHaveLength(3);
    expect(rows[0]!.querySelector(".time strong")?.textContent).toContain("2");
    expect(
      rows[0]!
        .querySelector(".following")
        ?.textContent?.replace(/\s+/g, " ")
        .trim(),
    ).toBe("Also in 8, 14, 20 min");
    expect(rows[0]!.querySelector(".cancellations")?.textContent).toContain(
      "Cancelled",
    );
    expect(rows[0]!.querySelector(".cancellations time")?.textContent).toBe(
      "13:01",
    );
    expect(rows[0]!.querySelector(".cancellations strong")).toBeNull();
    expect(rows[0]!.classList.contains("cancelled")).toBe(false);
    expect(card.getCardSize()).toBe(5);
  });
  it("keeps following status accessible and displays unknown transport/status without inventing on-time", async () => {
    const { card, connection, text } = await mountGrouped();
    connection.emit(
      board().entity_id,
      board({
        departures: [
          departure(2, { transport: "unknown", cancelled: null }),
          departure(8, { transport: "unknown", cancelled: null }),
          departure(14, {
            transport: "unknown",
            expected_at: new Date(NOW + 15 * 60_000).toISOString(),
            delay_seconds: 60,
          }),
        ],
      }),
    );
    await card.updateComplete;
    expect(text()).toContain("Service");
    expect(text()).toContain("Live status unknown");
    expect(text()).not.toContain("On time");
    const times = card.shadowRoot!.querySelectorAll(".following time");
    expect(times[0]?.getAttribute("title")).toContain("Live status unknown");
    expect(times[1]?.getAttribute("title")).toContain("+1 min");
    expect(times[0]?.getAttribute("aria-label")).toContain("8 min");
  });
  it("bounds cancellation notices and handles only-cancelled routes and single departures", async () => {
    const { card, connection } = await mountGrouped();
    connection.emit(
      board().entity_id,
      board({
        departures: [
          ...[2, 3, 4, 5, 6].map((m) => departure(m, { cancelled: true })),
          departure(7, { line: "51" }),
        ],
      }),
    );
    await card.updateComplete;
    const rows = card.shadowRoot!.querySelectorAll(".departure");
    expect(rows[0]!.querySelector(".following")).toBeNull();
    expect(rows[1]!.classList.contains("cancelled")).toBe(true);
    expect(rows[1]!.querySelector("strong")).toBeNull();
    expect(rows[1]!.querySelectorAll("time")).toHaveLength(3);
    expect(rows[1]!.textContent).toContain("2 more cancelled");
    expect(rows[1]!.querySelector(".time time")?.textContent).toBe("13:02");
  });
  it("uses Dutch grouped copy and keeps old configurations and commute behavior unchanged", async () => {
    const { card, connection, text } = await mountGrouped({ language: "nl" });
    expect(text()).toContain("Ook over");
    expect(text()).toContain("Vervallen");
    card.setConfig({
      type: "custom:ovapi-departures-card",
      entities: [board().entity_id],
      max_departures: 4,
      max_routes: 1,
    });
    connection.emit(board().entity_id, groupedBoard());
    await card.updateComplete;
    expect(card.shadowRoot!.querySelectorAll("li")).toHaveLength(4);
    expect(card.shadowRoot!.querySelector(".following")).toBeNull();
    expect(card.getCardSize()).toBe(6);
    const commute = await mount("ovapi-commute-card");
    commute.card.setConfig({
      type: "custom:ovapi-commute-card",
      entities: [board().entity_id],
      display_mode: "grouped",
      max_routes: 1,
      walking_minutes: 0,
    });
    commute.connection.emit(board().entity_id, groupedBoard());
    await commute.card.updateComplete;
    expect(
      commute.card.shadowRoot!.querySelector(".leave strong")?.textContent,
    ).toContain("2");
    expect(commute.card.shadowRoot!.querySelector(".following")).toBeNull();
  });
  it("keeps boards separate, filters before limits and labels empty grouped results", async () => {
    const second = "sensor.second";
    const { card, connection, text } = await mountGrouped({
      entities: [board().entity_id, second],
      max_routes: 1,
      destinations: ["Gein"],
    });
    connection.emit(second, {
      ...groupedBoard(),
      entity_id: second,
      board_id: "second",
    });
    await card.updateComplete;
    expect(card.shadowRoot!.querySelectorAll("section")).toHaveLength(2);
    expect(card.shadowRoot!.querySelectorAll(".departure")).toHaveLength(2);
    expect(
      card.shadowRoot!.querySelectorAll(".destination")[0]?.textContent,
    ).toBe("Gein");
    expect(
      card.shadowRoot!.querySelectorAll(".destination")[1]?.textContent,
    ).toBe("Gein");
    connection.emit(board().entity_id, board({ departures: [] }));
    await card.updateComplete;
    expect(text()).toContain("No departures match your filters");
    card.setConfig({
      type: "custom:ovapi-departures-card",
      entities: [board().entity_id],
      display_mode: "grouped",
    });
    connection.emit(board().entity_id, board({ departures: [] }));
    await card.updateComplete;
    expect(text()).toContain("No upcoming departures");
  });
  it("advances grouped rows and conservative minute edges locally, then erases at exact expiry", async () => {
    const { card, connection, text } = await mountGrouped({ max_routes: 1 });
    const calls = connection.calls;
    await vi.advanceTimersByTimeAsync(1000);
    await card.updateComplete;
    expect(
      card.shadowRoot!.querySelector(".time strong")?.textContent,
    ).toContain("1");
    expect(
      card
        .shadowRoot!.querySelector(".following")
        ?.textContent?.replace(/\s+/g, " ")
        .trim(),
    ).toBe("Also in 7, 13, 19 min");
    await vi.advanceTimersByTimeAsync(119_000);
    await card.updateComplete;
    expect(card.shadowRoot!.querySelector(".destination")?.textContent).toBe(
      "Gein",
    );
    expect(card.shadowRoot!.querySelector(".cancellations")).toBeNull();
    expect(connection.calls).toBe(calls);
    connection.emit(
      board().entity_id,
      board({
        departures: [departure(40)],
        expires_at: new Date(NOW + 180_000).toISOString(),
      }),
    );
    await card.updateComplete;
    await vi.advanceTimersByTimeAsync(59_999);
    await card.updateComplete;
    expect(text()).toContain("Isolatorweg");
    await vi.advanceTimersByTimeAsync(1);
    await card.updateComplete;
    expect(text()).toContain("expired");
    expect(text()).not.toContain("Isolatorweg");
    card.remove();
    await card.updateComplete;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("retains grouped stale/error states and erases on hide, disconnect and detach", async () => {
    const { card, connection, text } = await mountGrouped();
    connection.emit(board().entity_id, { ...groupedBoard(), status: "stale" });
    await card.updateComplete;
    expect(text()).toContain("Outdated");
    expect(text()).toContain("Also in");
    expect(text()).toContain("Check departures");
    connection.emit(board().entity_id, {
      ...groupedBoard(),
      departures: [{ ...departure(2), expected_at: "bad" }],
    });
    await card.updateComplete;
    expect(text()).toContain("Cannot read");
    expect(text()).not.toContain("Isolatorweg");
    connection.emit(board().entity_id, groupedBoard());
    await card.updateComplete;
    window.dispatchEvent(new Event("pagehide"));
    await card.updateComplete;
    expect(text()).not.toContain("Isolatorweg");
    expect(vi.getTimerCount()).toBe(0);
    window.dispatchEvent(new Event("pageshow"));
    connection.emit(board().entity_id, groupedBoard());
    await card.updateComplete;
    connection.fire("disconnected");
    await card.updateComplete;
    expect(text()).not.toContain("Isolatorweg");
    connection.fire("ready");
    connection.emit(board().entity_id, groupedBoard());
    await card.updateComplete;
    card.remove();
    await card.updateComplete;
    expect(text()).not.toContain("Isolatorweg");
    expect(vi.getTimerCount()).toBe(0);
  });
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
