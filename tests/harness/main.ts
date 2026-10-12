import { board } from "../fixtures/boards";
import { FakeConnection, hass } from "../fixtures/connection";
import type { BoardSnapshot } from "../../src/contract";
import type { OvapiDeparturesCard } from "../../src/cards";
import type { OvapiCardEditor } from "../../src/editor";

const params = new URLSearchParams(location.search);
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
  card.setConfig({ type: `custom:${tag}`, entities, max_departures: 4 });
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
if (params.has("editor")) {
  const editor = document.createElement("ovapi-card-editor") as OvapiCardEditor;
  editor.hass = ha;
  editor.setConfig({
    type: "custom:ovapi-departures-card",
    entities: [entities[0]],
  });
  document.querySelector("#editor")!.append(editor);
}
declare global {
  interface Window {
    demo: {
      connection: FakeConnection;
      emit: typeof emit;
      empty: () => void;
      expireSoon: () => void;
      remove: () => void;
    };
  }
}
window.demo = {
  connection,
  emit,
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
