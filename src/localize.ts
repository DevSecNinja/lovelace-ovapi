import type { HomeAssistant } from "./contract";
import type { CardConfig } from "./model";

const en = {
  departures: "Departures",
  commute: "Time to leave",
  loading: "Connecting to your departure board…",
  unavailable: "Departure data unavailable. Check the OVAPI integration.",
  expired: "Departure data expired. Waiting for a fresh update.",
  disconnected: "Disconnected from Home Assistant. Waiting to reconnect.",
  error:
    "Cannot read this board. Check the entity, permissions and integration/card versions.",
  ready: "Updated",
  stale: "Outdated · last update",
  staleAdvice: "Update failed. Check departures before leaving.",
  empty: "No upcoming departures in this board.",
  filtered: "No departures match your filters.",
  noCommute:
    "No catchable departure. Try another favourite or check your walking time.",
  cancelled: "Cancelled",
  scheduled: "Scheduled",
  expected: "Expected",
  onTime: "On time",
  unknown: "Live status unknown",
  leaveIn: "Leave in",
  leaveNow: "Leave now",
  min: "min",
  walk: "walk",
  departs: "Departs",
  bus: "Bus",
  tram: "Tram",
  metro: "Metro",
  transport: "Service",
  title: "Title",
  entities: "Favourite OVAPI sensors",
  lines: "Lines (comma separated)",
  destinations: "Destinations (comma separated)",
  walking: "Walking minutes (empty = integration setting)",
  maximum: "Maximum departures per stop",
  language: "Language",
  auto: "Automatic",
  choose: "Choose one or more OVAPI sensors.",
  editorHelp:
    "Filters narrow the existing board; they never request more data.",
};
const nl: typeof en = {
  departures: "Vertrektijden",
  commute: "Tijd om te vertrekken",
  loading: "Verbinding met je vertrekbord…",
  unavailable:
    "Vertrekgegevens niet beschikbaar. Controleer de OVAPI-integratie.",
  expired: "Vertrekgegevens verlopen. Wachten op een nieuwe update.",
  disconnected: "Verbinding met Home Assistant verbroken. Wachten op herstel.",
  error:
    "Dit bord kan niet worden gelezen. Controleer de entiteit, rechten en integratie-/kaartversies.",
  ready: "Bijgewerkt",
  stale: "Verouderd · laatste update",
  staleAdvice:
    "Bijwerken mislukt. Controleer vertrektijden voordat je vertrekt.",
  empty: "Geen komende vertrekken op dit bord.",
  filtered: "Geen vertrekken voor je filters.",
  noCommute:
    "Geen haalbaar vertrek. Kies een andere favoriet of controleer je looptijd.",
  cancelled: "Vervallen",
  scheduled: "Gepland",
  expected: "Verwacht",
  onTime: "Op tijd",
  unknown: "Actuele status onbekend",
  leaveIn: "Vertrek over",
  leaveNow: "Vertrek nu",
  min: "min",
  walk: "lopen",
  departs: "Vertrek",
  bus: "Bus",
  tram: "Tram",
  metro: "Metro",
  transport: "Vervoer",
  title: "Titel",
  entities: "Favoriete OVAPI-sensoren",
  lines: "Lijnen (kommagescheiden)",
  destinations: "Bestemmingen (kommagescheiden)",
  walking: "Looptijd in minuten (leeg = integratie-instelling)",
  maximum: "Maximum vertrekken per halte",
  language: "Taal",
  auto: "Automatisch",
  choose: "Kies een of meer OVAPI-sensoren.",
  editorHelp:
    "Filters beperken het bestaande bord; ze vragen nooit extra gegevens op.",
};

export function language(
  config: Pick<CardConfig, "language">,
  hass?: HomeAssistant,
): "en" | "nl" {
  return config.language === "auto"
    ? (hass?.locale?.language ?? hass?.language ?? "en").startsWith("nl")
      ? "nl"
      : "en"
    : config.language;
}
export function labels(
  config: Pick<CardConfig, "language">,
  hass?: HomeAssistant,
): typeof en {
  return language(config, hass) === "nl" ? nl : en;
}
export function clock(
  at: string | number,
  config: Pick<CardConfig, "language">,
  hass?: HomeAssistant,
): string {
  const timeFormat = hass?.locale?.time_format;
  return new Intl.DateTimeFormat(language(config, hass), {
    timeZone: hass?.config.time_zone ?? "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
    ...(timeFormat === "12"
      ? { hour12: true }
      : timeFormat === "24"
        ? { hour12: false }
        : {}),
  }).format(new Date(at));
}
