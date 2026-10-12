import { board, coverage, groupedBoard } from "../fixtures/boards";
import { FakeConnection, hass } from "../fixtures/connection";
import type { BoardSnapshot, StationCoverage } from "../../src/contract";
import type { OvapiDeparturesCard } from "../../src/cards";
import type { OvapiCardEditor } from "../../src/editor";

const params = new URLSearchParams(location.search);
const grouped = params.has("grouped");
document.documentElement.classList.toggle(
  "dark",
  params.get("theme") === "dark",
);
document.documentElement.lang = params.get("language") === "nl" ? "nl" : "en";
const connection = new FakeConnection();
const ha = hass(connection);
ha.locale!.language = document.documentElement.lang;
const entities = ["sensor.amsterdam_departures", "sensor.centraal_departures"];
ha.states[entities[1]!] = {
  state: "ready",
  attributes: {
    contract_version: 1,
    board_id: "synthetic-centraal",
    friendly_name: "Amsterdam Centraal",
  },
};
await customElements.whenDefined("ovapi-departures-card");
const cards = ["ovapi-departures-card", "ovapi-commute-card"].map((tag) => {
  const card = document.createElement(tag) as OvapiDeparturesCard;
  card.setConfig({
    type: `custom:${tag}`,
    entities,
    max_departures: 4,
    ...(grouped ? { display_mode: "grouped", max_routes: 3 } : {}),
  });
  card.hass = ha;
  document.querySelector("#cards")!.append(card);
  return card;
});
function snapshot(entity: string, second = false): BoardSnapshot {
  const now = Date.now();
  const b = board({
    entity_id: entity,
    board_id: second ? "synthetic-centraal" : "synthetic-entry",
    stop: {
      id: second ? "SYNTHETIC_CENTRAAL" : "SYNTHETIC_AMSTEL",
      name: second ? "Amsterdam Centraal" : "Amsterdam Amstel",
    },
    fetched_at: new Date(now).toISOString(),
    expires_at: new Date(now + 29 * 60_000).toISOString(),
    walking_minutes: second ? 8 : 5,
  });
  const descriptions = [
    "Museumkwartier · synthetic",
    "IJburg · synthetic",
    "Science Park · synthetic",
    "A very long synthetic destination to demonstrate readable wrapping",
  ];
  b.departures = Array.from({ length: 4 }, (_, i) => ({
    id: `synthetic-${i}`,
    line: second ? `M${i + 1}` : `T${i + 1}`,
    destination: descriptions[i]!,
    transport: second ? "metro" : "tram",
    scheduled_at: new Date(now + (12 + i * 5) * 60_000).toISOString(),
    expected_at:
      i === 2 ? null : new Date(now + (14 + i * 5) * 60_000).toISOString(),
    cancelled: i === 1,
    delay_seconds: i === 2 ? null : 120,
  }));
  if (grouped) {
    b.departures = groupedBoard(now).departures;
    if (second) {
      b.departures.find((d) => d.id === "synthetic-opposite")!.destination =
        "A very long synthetic destination to demonstrate readable wrapping";
    }
  }
  return b;
}
function emit(status: BoardSnapshot["status"] = "ready") {
  entities.forEach((entity, i) => {
    const b = snapshot(entity, i === 1);
    b.status = status;
    if (status === "unavailable") {
      b.departures = [];
      b.fetched_at = null;
      b.expires_at = null;
    }
    connection.emit(entity, b);
  });
}
emit();
function station(status: StationCoverage["status"] | "zero" | "expiring") {
  entities.forEach((entity, index) => {
    const b = snapshot(entity, index === 1);
    b.coverage = coverage({
      status: status === "zero" || status === "expiring" ? "complete" : status,
      metadata_fetched_at: new Date(Date.now() - 86_400_000).toISOString(),
      metadata_expires_at: new Date(
        Date.now() + (status === "expiring" ? 1000 : 6 * 86_400_000),
      ).toISOString(),
    });
    if (status === "partial") {
      b.coverage.verified_members = 3;
      b.coverage.missing_members = 1;
    }
    if (status === "unavailable" || status === "zero") {
      b.coverage.selected_members = 0;
      b.coverage.verified_members = 0;
      if (status === "unavailable") {
        b.coverage.metadata_fetched_at = null;
        b.coverage.metadata_expires_at = null;
      }
    }
    if (status === "partial" || status === "unavailable" || status === "zero") {
      b.status = "unavailable";
      b.departures = [];
      b.fetched_at = null;
      b.expires_at = null;
    } else if (status === "stale") b.status = "stale";
    connection.emit(entity, b);
  });
}
if (params.has("coverage")) station("partial");
const configChanges: Record<string, unknown>[] = [];
let editor: OvapiCardEditor | undefined;
if (params.has("editor")) {
  editor = document.createElement("ovapi-card-editor") as OvapiCardEditor;
  editor.hass = ha;
  editor.setConfig({
    type: "custom:ovapi-departures-card",
    entities: [entities[0]],
    ...(grouped
      ? { display_mode: "grouped", max_routes: 3, max_departures: 4 }
      : {}),
  });
  editor.addEventListener("config-changed", (event) => {
    const config = (event as CustomEvent<{ config: Record<string, unknown> }>)
      .detail.config;
    window.demo.config = config;
    configChanges.push(config);
    editor!.setConfig(structuredClone(config));
    cards[0]!.setConfig(window.demo.config);
    emit();
  });
  document.querySelector("#editor")!.append(editor);
}
declare global {
  interface Window {
    demo: {
      connection: FakeConnection;
      ha: typeof ha;
      editor: OvapiCardEditor | undefined;
      configChanges: typeof configChanges;
      config?: unknown;
      emit: typeof emit;
      station: typeof station;
      empty: () => void;
      expireSoon: () => void;
      remove: () => void;
    };
  }
}
window.demo = {
  connection,
  ha,
  editor,
  configChanges,
  emit,
  station,
  empty: () =>
    entities.forEach((e) =>
      connection.emit(e, { ...snapshot(e), departures: [] }),
    ),
  expireSoon: () =>
    entities.forEach((e) =>
      connection.emit(e, {
        ...snapshot(e),
        expires_at: new Date(Date.now() + 1000).toISOString(),
      }),
    ),
  remove: () => cards.forEach((card) => card.remove()),
};
