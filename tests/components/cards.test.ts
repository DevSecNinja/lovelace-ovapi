import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../src/index";
import type { OvapiDeparturesCard } from "../../src/cards";
import { watchBoard } from "../../src/subscription";
import { FakeConnection, hass } from "../fixtures/connection";
import {
  board,
  combinedBoard,
  coverage,
  departure,
  groupedBoard,
  NOW,
  unavailableStation,
} from "../fixtures/boards";

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
  it("renders three walking-aware combined routes and explicit following leave times", async () => {
    const { card, connection, text } = await mountGrouped({
      time_mode: "leave",
    });
    connection.emit(board().entity_id, combinedBoard());
    await card.updateComplete;
    const rows = card.shadowRoot!.querySelectorAll(".departure");
    expect(rows).toHaveLength(3);
    expect(rows[0]!.querySelector(".time")?.textContent).toContain("Leave in");
    expect(rows[0]!.querySelector(".time strong")?.textContent).toContain("1");
    expect(
      rows[0]!
        .querySelector(".following")
        ?.textContent?.replace(/\s+/g, " ")
        .trim(),
    ).toBe("Also leave in 7, 13, 19 min");
    expect(
      rows[0]!.querySelector(".following time")?.getAttribute("datetime"),
    ).toBe(new Date(NOW + 7 * 60_000).toISOString());
    expect(text()).toContain("7 min walk");
    expect(text()).toContain("Departs");
    expect(card.shadowRoot!.querySelector(".cancellations")).toBeNull();
    expect(connection.calls).toBe(2);
    expect(
      rows[0]!.querySelector(".leave-time")?.getAttribute("aria-label"),
    ).toBe("Leave in 1 min · Scheduled");
  });
  it.each(["en", "nl"])(
    "labels walking-adjusted primary/following instants and unknown/delayed facts in %s",
    async (language) => {
      const { card, connection, text } = await mountGrouped({
        time_mode: "leave",
        language,
        max_routes: 1,
      });
      connection.emit(board().entity_id, {
        ...combinedBoard(),
        departures: [
          departure(8, { cancelled: null, transport: "unknown" }),
          departure(14, { cancelled: null, transport: "unknown" }),
          departure(18, {
            expected_at: new Date(NOW + 20 * 60_000).toISOString(),
            delay_seconds: 120,
            transport: "unknown",
          }),
        ],
      });
      await card.updateComplete;
      expect(text()).toContain(
        language === "en" ? "Live status unknown" : "Actuele status onbekend",
      );
      expect(text()).not.toContain(language === "en" ? "On time" : "Op tijd");
      expect(
        card.shadowRoot!.querySelector(".leave-time")?.getAttribute("datetime"),
      ).toBe(new Date(NOW + 60_000).toISOString());
      const times = card.shadowRoot!.querySelectorAll(".following time");
      expect(times[0]?.getAttribute("aria-label")).toContain(
        language === "en" ? "Also leave in 7 min" : "Vertrek ook over 7 min",
      );
      expect(times[0]?.getAttribute("title")).toContain(
        language === "en" ? "unknown" : "onbekend",
      );
      expect(times[1]?.getAttribute("aria-label")).toContain("+2 min");
      expect(times[1]?.getAttribute("datetime")).toBe(
        new Date(NOW + 13 * 60_000).toISOString(),
      );
      await vi.advanceTimersByTimeAsync(60_000);
      await card.updateComplete;
      expect(
        card.shadowRoot!.querySelector(".leave-time")?.textContent,
      ).toContain(language === "en" ? "Leave now" : "Vertrek nu");
      await vi.advanceTimersByTimeAsync(1000);
      await card.updateComplete;
      expect(
        card.shadowRoot!.querySelector(".leave-time")?.getAttribute("datetime"),
      ).toBe(new Date(NOW + 7 * 60_000).toISOString());
    },
  );
  it.each(["departures", "grouped"])(
    "suppresses unsafe leave advice and restores only fresh data in %s mode",
    async (display_mode) => {
      const { card, connection, text } = await mountGrouped({
        time_mode: "leave",
        display_mode,
        max_departures: 2,
      });
      connection.emit(board().entity_id, combinedBoard());
      await card.updateComplete;
      expect(card.shadowRoot!.querySelectorAll(".departure")).toHaveLength(
        display_mode === "grouped" ? 3 : 2,
      );
      expect(card.shadowRoot!.querySelectorAll(".following")).toHaveLength(
        display_mode === "grouped" ? 3 : 0,
      );
      for (const [value, expected] of [
        [{ ...combinedBoard(), status: "stale" }, "Check departures"],
        [
          {
            ...combinedBoard(),
            departures: [departure(8, { cancelled: true })],
          },
          "No catchable",
        ],
        [{ ...combinedBoard(), departures: [departure(2)] }, "No catchable"],
        [{ ...combinedBoard(), departures: [] }, "No catchable"],
        [unavailableStation(), "3 of 4"],
        [
          board({
            status: "unavailable",
            fetched_at: null,
            expires_at: null,
            departures: [],
          }),
          "unavailable",
        ],
        [{}, "Cannot read"],
      ]) {
        connection.emit(board().entity_id, value);
        await card.updateComplete;
        expect(text()).toContain(expected);
        expect(card.shadowRoot!.querySelector(".leave-time")).toBeNull();
        expect(card.shadowRoot!.querySelector(".following")).toBeNull();
      }
      connection.emit(board().entity_id, {
        ...combinedBoard(),
        expires_at: new Date(NOW + 1000).toISOString(),
      });
      await card.updateComplete;
      expect(card.shadowRoot!.querySelector(".leave-time")).not.toBeNull();
      await vi.advanceTimersByTimeAsync(1000);
      await card.updateComplete;
      expect(text()).toContain("expired");
      expect(text()).not.toContain("Isolatorweg");
      vi.setSystemTime(NOW);
      card.requestUpdate();
      await card.updateComplete;
      expect(card.shadowRoot!.querySelector(".leave-time")).toBeNull();
      for (const pause of ["pagehide", "disconnected", "hidden", "remove"]) {
        connection.emit(board().entity_id, combinedBoard());
        await card.updateComplete;
        expect(card.shadowRoot!.querySelector(".leave-time")).not.toBeNull();
        if (pause === "pagehide") window.dispatchEvent(new Event("pagehide"));
        if (pause === "disconnected") connection.fire("disconnected");
        const hidden =
          pause === "hidden"
            ? vi.spyOn(document, "hidden", "get").mockReturnValue(true)
            : undefined;
        if (hidden) document.dispatchEvent(new Event("visibilitychange"));
        if (pause === "remove") card.remove();
        await card.updateComplete;
        expect(text()).not.toContain("Isolatorweg");
        expect(card.shadowRoot!.querySelector(".leave-time")).toBeNull();
        if (pause === "pagehide") window.dispatchEvent(new Event("pageshow"));
        if (pause === "disconnected") connection.fire("ready");
        if (hidden) {
          hidden.mockRestore();
          document.dispatchEvent(new Event("visibilitychange"));
        }
      }
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it("uses one render clock for all feed reads and leave countdowns without route subscriptions", async () => {
    const second = "sensor.second";
    const { card, connection } = await mountGrouped({
      time_mode: "leave",
      entities: [board().entity_id, second],
    });
    connection.emit(board().entity_id, combinedBoard());
    connection.emit(second, {
      ...combinedBoard(),
      entity_id: second,
      board_id: "second",
      walking_minutes: 0,
    });
    await card.updateComplete;
    const calls = connection.calls;
    const clock = vi
      .spyOn(Date, "now")
      .mockReturnValueOnce(NOW + 59_999)
      .mockReturnValue(NOW + 60_000);
    card.requestUpdate();
    await card.updateComplete;
    expect(clock).toHaveBeenCalledTimes(1);
    const sections = card.shadowRoot!.querySelectorAll("section");
    expect(sections[0]!.querySelector(".leave-time")?.textContent).toContain(
      "Leave now",
    );
    expect(
      sections[1]!.querySelector(".leave-time strong")?.textContent,
    ).toContain("1");
    expect(sections[0]!.querySelector(".walking")?.textContent).toContain(
      "7 min",
    );
    expect(sections[1]!.querySelector(".walking")?.textContent).toContain(
      "0 min",
    );
    expect(connection.calls).toBe(calls);
    clock.mockRestore();
  });
  it("uses the captured read instant for irreversible metadata expiry in leave mode", async () => {
    const { card, connection, text } = await mountGrouped({
      time_mode: "leave",
    });
    connection.emit(board().entity_id, {
      ...combinedBoard(),
      coverage: coverage({
        metadata_expires_at: new Date(NOW + 60_000).toISOString(),
      }),
    });
    await card.updateComplete;
    vi.setSystemTime(NOW + 60_000);
    card.requestUpdate();
    await card.updateComplete;
    expect(text()).toContain("Station coverage information expired");
    vi.setSystemTime(NOW);
    card.requestUpdate();
    await card.updateComplete;
    expect(text()).not.toContain("Isolatorweg");
    expect(card.shadowRoot!.querySelector(".leave-time")).toBeNull();
  });
  it("keeps the same raw vehicle time when leave mode/override changes and distinguishes filtered-empty", async () => {
    const { card, connection } = await mountGrouped({
      time_mode: "leave",
      walking_minutes: 0,
      lines: ["50"],
      destinations: ["Isolatorweg"],
    });
    connection.emit(board().entity_id, combinedBoard());
    await card.updateComplete;
    expect(
      card.shadowRoot!.querySelector(".departure-clock time")?.textContent,
    ).toBe("13:02");
    expect(
      card.shadowRoot!.querySelector(".leave-time strong")?.textContent,
    ).toContain("2");
    card.setConfig({
      type: "custom:ovapi-departures-card",
      entities: [board().entity_id],
      display_mode: "grouped",
      time_mode: "departure",
      walking_minutes: 120,
    });
    connection.emit(board().entity_id, combinedBoard());
    await card.updateComplete;
    expect(
      card.shadowRoot!.querySelector(".time strong")?.textContent,
    ).toContain("2");
    expect(card.shadowRoot!.querySelector(".walking")).toBeNull();
    expect(
      card
        .shadowRoot!.querySelector(".following")
        ?.textContent?.replace(/\s+/g, " ")
        .trim(),
    ).toBe("Also in 8, 14, 20 min");
    card.setConfig({
      type: "custom:ovapi-departures-card",
      entities: [board().entity_id],
      time_mode: "leave",
      lines: ["missing"],
    });
    connection.emit(board().entity_id, combinedBoard());
    await card.updateComplete;
    expect(card.shadowRoot!.textContent).toContain(
      "No departures match your filters",
    );
    card.setConfig({
      type: "custom:ovapi-departures-card",
      entities: [board().entity_id],
      time_mode: "leave",
      lines: ["50"],
      walking_minutes: 120,
    });
    connection.emit(board().entity_id, combinedBoard());
    await card.updateComplete;
    expect(card.shadowRoot!.textContent).toContain("No catchable departure");
    expect(card.shadowRoot!.textContent).not.toContain("No departures match");
  });
  it.each([
    ["ovapi-departures-card", "departures", "live"],
    ["ovapi-departures-card", "grouped", "metadata"],
    ["ovapi-commute-card", "departures", "live"],
    ["ovapi-commute-card", "departures", "metadata"],
  ])(
    "irreversibly erases observed %s/%s/%s expiry across clock rollback",
    async (tag, display_mode, expiry) => {
      const { card, connection, text } = await mount(tag);
      card.setConfig({
        type: `custom:${tag}`,
        display_mode,
        entities: [board().entity_id],
      });
      const observer = vi.fn();
      const stop = watchBoard(connection, board().entity_id, observer);
      const calls = connection.calls;
      const value = board({
        coverage: coverage({
          metadata_expires_at: new Date(
            NOW + (expiry === "metadata" ? 60_000 : 86_400_000),
          ).toISOString(),
        }),
      });
      connection.emit(value.entity_id, value);
      await card.updateComplete;
      expect(text()).toContain("Synthetic destination");
      expect(observer.mock.lastCall?.[0].board).toBeDefined();

      // No timer runs: render is the first owner to observe the forward jump.
      vi.setSystemTime(NOW + 30 * 60_000);
      card.requestUpdate();
      await card.updateComplete;
      await card.updateComplete;
      expect(text()).not.toContain("Synthetic destination");
      const erased =
        expiry === "metadata"
          ? { status: "unavailable", coverageExpired: true }
          : { status: "expired", coverage: value.coverage };
      expect(observer.mock.lastCall?.[0]).toEqual(erased);
      expect(observer.mock.lastCall?.[0]).not.toHaveProperty("board");
      expect(vi.getTimerCount()).toBe(expiry === "metadata" ? 1 : 2);

      vi.setSystemTime(NOW);
      card.requestUpdate();
      await card.updateComplete;
      expect(text()).not.toContain("Synthetic destination");
      expect(card.shadowRoot!.querySelector(".leave")).toBeNull();
      const late = vi.fn();
      const stopLate = watchBoard(connection, value.entity_id, late);
      expect(late.mock.lastCall?.[0]).toEqual(erased);
      expect(connection.calls).toBe(calls);

      connection.emit(
        value.entity_id,
        board({
          fetched_at: new Date(NOW + 1000).toISOString(),
          expires_at: new Date(NOW + 29 * 60_000 + 1000).toISOString(),
          coverage: coverage(),
        }),
      );
      await card.updateComplete;
      expect(text()).toContain("Synthetic destination");
      stopLate();
      stop();
      card.remove();
      await card.updateComplete;
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it.each([
    ["ovapi-departures-card", "departures", "en"],
    ["ovapi-departures-card", "grouped", "en"],
    ["ovapi-commute-card", "departures", "en"],
    ["ovapi-departures-card", "departures", "nl"],
    ["ovapi-departures-card", "grouped", "nl"],
    ["ovapi-commute-card", "departures", "nl"],
  ])(
    "renders honest station coverage in %s/%s/%s",
    async (tag, display_mode, language) => {
      const { card, connection, text } = await mount(tag);
      card.setConfig({
        type: `custom:${tag}`,
        entities: [board().entity_id],
        title: "My station",
        display_mode,
        language,
      });
      for (const [value, expected] of [
        [
          unavailableStation(),
          language === "en"
            ? "3 of 4 platforms verified"
            : "3 van 4 perrons geverifieerd",
        ],
        [
          unavailableStation({
            status: "unavailable",
            selected_members: 0,
            verified_members: 0,
            missing_members: 0,
            metadata_fetched_at: null,
            metadata_expires_at: null,
          }),
          language === "en"
            ? "Station coverage unknown"
            : "Stationsdekking onbekend",
        ],
        [
          unavailableStation({
            status: "complete",
            selected_members: 0,
            verified_members: 0,
            missing_members: 0,
          }),
          language === "en"
            ? "No station platforms match"
            : "Geen stationsperrons",
        ],
        [
          board({ status: "stale", coverage: coverage({ status: "stale" }) }),
          language === "en"
            ? "Station coverage update failed"
            : "Bijwerken van stationsdekking mislukt",
        ],
      ] as const) {
        connection.emit(value.entity_id, value);
        await card.updateComplete;
        expect(text()).toContain("My station");
        expect(
          card.shadowRoot!.querySelector(".coverage[role=status]")?.textContent,
        ).toContain(expected);
        expect(card.shadowRoot!.querySelector(".leave")).toBeNull();
        if (value.status === "unavailable") {
          expect(card.shadowRoot!.querySelectorAll(".departure")).toHaveLength(
            0,
          );
          expect(text()).not.toContain("Synthetic destination");
          expect(text()).not.toContain("No upcoming departures");
          expect(text()).not.toContain("Geen komende vertrekken");
          expect(text()).not.toContain("No catchable departure");
        }
      }
      connection.emit(board().entity_id, board({ coverage: coverage() }));
      await card.updateComplete;
      expect(card.shadowRoot!.querySelector(".coverage")).toBeNull();
      expect(text()).toContain("Synthetic destination");
      connection.emit(board().entity_id, board());
      await card.updateComplete;
      expect(card.shadowRoot!.querySelector(".coverage")).toBeNull();
      expect(text()).toContain("Synthetic destination");
    },
  );
  it("keeps unavailable live-data status explicit alongside valid stale coverage", async () => {
    const { card, connection, text } = await mount();
    connection.emit(
      board().entity_id,
      unavailableStation({
        status: "stale",
        verified_members: 4,
        missing_members: 0,
      }),
    );
    await card.updateComplete;
    expect(text()).toContain("Station coverage update failed");
    expect(text()).toContain("Departure data unavailable");
  });
  it("hides departures and advice immediately at metadata expiry, including suspended render clocks", async () => {
    const { card, connection, text } = await mount("ovapi-commute-card");
    const snapshot = board({
      coverage: coverage({
        metadata_expires_at: new Date(NOW + 60_000).toISOString(),
      }),
    });
    connection.emit(snapshot.entity_id, snapshot);
    await card.updateComplete;
    expect(card.shadowRoot!.querySelector(".leave")).not.toBeNull();
    vi.setSystemTime(NOW + 60_000);
    card.requestUpdate();
    await card.updateComplete;
    expect(text()).toContain("Station coverage information expired");
    expect(text()).not.toContain("Synthetic destination");
    expect(card.shadowRoot!.querySelector(".leave")).toBeNull();
    connection.emit(snapshot.entity_id, snapshot);
    await card.updateComplete;
    expect(text()).toContain("Station coverage information expired");
    expect(connection.calls).toBe(1);
  });
  it("clears coverage on hidden/disconnected/detached lifecycle and replaces explanations on new frames", async () => {
    const { card, connection, text } = await mount();
    connection.emit(board().entity_id, unavailableStation());
    await card.updateComplete;
    expect(text()).toContain("3 of 4");
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    await card.updateComplete;
    expect(text()).not.toContain("3 of 4");
    expect(vi.getTimerCount()).toBe(0);
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    await card.updateComplete;
    expect(text()).not.toContain("3 of 4");
    connection.emit(board().entity_id, unavailableStation());
    await card.updateComplete;
    expect(text()).toContain("3 of 4");
    connection.fire("disconnected");
    await card.updateComplete;
    expect(text()).not.toContain("3 of 4");
    connection.fire("ready");
    connection.emit(board().entity_id, unavailableStation());
    await card.updateComplete;
    connection.emit(board().entity_id, {
      ...unavailableStation(),
      contract_version: 2,
    });
    await card.updateComplete;
    expect(text()).toContain("Cannot read");
    expect(text()).not.toContain("3 of 4");
    connection.emit(board().entity_id, unavailableStation());
    await card.updateComplete;
    card.remove();
    await card.updateComplete;
    expect(text()).not.toContain("3 of 4");
    expect(vi.getTimerCount()).toBe(0);
  });
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
    expect(rows[1]!.textContent?.replace(/\s+/g, " ")).toContain(
      "2 more cancelled",
    );
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
  it.each([
    ["en", 1, "1 more cancelled"],
    ["en", 2, "2 more cancelled"],
    ["nl", 1, "1 andere vervallen rit"],
    ["nl", 2, "2 andere vervallen ritten"],
  ])(
    "renders %s additional cancellation count %i grammatically",
    async (language, count, expected) => {
      const { card, connection } = await mountGrouped({ language });
      connection.emit(
        board().entity_id,
        board({
          departures: Array.from({ length: 3 + count }, (_, i) =>
            departure(i + 1, { cancelled: true }),
          ),
        }),
      );
      await card.updateComplete;
      const label = card.shadowRoot!.querySelector(".detail.cancelled-label")!;
      expect(label.textContent?.replace(/\s+/g, " ").trim()).toBe(expected);
    },
  );
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
