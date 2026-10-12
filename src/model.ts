import { record } from "./contract";
import type { BoardSnapshot, Departure } from "./contract";

export interface CardConfig {
  type: "custom:ovapi-departures-card" | "custom:ovapi-commute-card";
  entities: string[];
  title?: string;
  lines: string[];
  destinations: string[];
  display_mode: "departures" | "grouped";
  max_departures: number;
  max_routes: number;
  walking_minutes?: number;
  language: "auto" | "en" | "nl";
}

function strings(value: unknown, name: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((v) => typeof v !== "string" || !v.trim() || v.length > 512)
  ) {
    throw new Error(`${name}: use a list of non-empty strings`);
  }
  return [...new Set(value.map((v: string) => v.trim()))];
}

export function parseConfig(value: unknown): CardConfig {
  const c = record(value);
  const entities = strings(c.entities, "entities");
  if (
    entities.length < 1 ||
    entities.length > 12 ||
    entities.some((e) => !/^sensor\.[a-z0-9_]+$/.test(e))
  ) {
    throw new Error("entities: select 1 to 12 OVAPI sensors");
  }
  if (
    !["custom:ovapi-departures-card", "custom:ovapi-commute-card"].includes(
      String(c.type),
    )
  ) {
    throw new Error("type: select an OVAPI departure or commute card");
  }
  const max = c.max_departures ?? 5;
  if (!Number.isInteger(max) || Number(max) < 1 || Number(max) > 20)
    throw new Error("max_departures: use 1 to 20");
  const maxRoutes = c.max_routes === undefined ? 5 : c.max_routes;
  if (
    !Number.isInteger(maxRoutes) ||
    Number(maxRoutes) < 1 ||
    Number(maxRoutes) > 20
  )
    throw new Error("max_routes: use 1 to 20");
  const displayMode =
    c.display_mode === undefined ? "departures" : c.display_mode;
  if (displayMode !== "departures" && displayMode !== "grouped")
    throw new Error("display_mode: use departures or grouped");
  if (
    c.walking_minutes !== undefined &&
    (!Number.isInteger(c.walking_minutes) ||
      Number(c.walking_minutes) < 0 ||
      Number(c.walking_minutes) > 120)
  ) {
    throw new Error("walking_minutes: use 0 to 120");
  }
  if (
    c.title !== undefined &&
    (typeof c.title !== "string" || c.title.length > 120)
  )
    throw new Error("title: maximum 120 characters");
  const language = c.language ?? "auto";
  if (!["auto", "en", "nl"].includes(String(language)))
    throw new Error("language: use auto, en or nl");
  return {
    type: c.type as CardConfig["type"],
    entities,
    ...(c.title !== undefined ? { title: c.title as string } : {}),
    lines: strings(c.lines ?? [], "lines"),
    destinations: strings(c.destinations ?? [], "destinations"),
    max_departures: max as number,
    display_mode: displayMode,
    max_routes: maxRoutes as number,
    ...(c.walking_minutes !== undefined
      ? { walking_minutes: c.walking_minutes as number }
      : {}),
    language: language as CardConfig["language"],
  };
}

export const departureAt = (d: Departure): number =>
  Date.parse(d.expected_at ?? d.scheduled_at);
export const minutesUntil = (at: number, now: number): number =>
  Math.max(0, Math.floor((at - now) / 60_000));

const normalized = (value: string): string => value.trim().toLowerCase();
const compareDepartures = (a: Departure, b: Departure): number =>
  departureAt(a) - departureAt(b) || a.id.localeCompare(b.id);

export function visibleDepartures(
  board: BoardSnapshot,
  config: CardConfig,
  now: number,
): Departure[] {
  const matches = (filters: string[], value: string) =>
    !filters.length || filters.some((f) => normalized(f) === normalized(value));
  return board.departures
    .filter(
      (d) =>
        departureAt(d) > now &&
        matches(config.lines, d.line) &&
        matches(config.destinations, d.destination),
    )
    .sort(compareDepartures);
}

export interface DepartureGroup {
  departure: Departure;
  following: Departure[];
  cancellations: Departure[];
  additionalCancellations: number;
}

export function groupedDepartures(
  board: BoardSnapshot,
  config: CardConfig,
  now: number,
): DepartureGroup[] {
  const groups = new Map<
    string,
    { upcoming: Departure[]; cancelled: Departure[] }
  >();
  const seen = new Set<string>();
  for (const d of visibleDepartures(board, config, now)) {
    // v1 has no source-point key: only collapse identical events, never minute values.
    const identity = JSON.stringify([
      d.id,
      d.transport,
      d.line,
      d.destination,
      Date.parse(d.scheduled_at),
      d.expected_at === null ? null : Date.parse(d.expected_at),
      d.cancelled,
      d.delay_seconds,
    ]);
    if (seen.has(identity)) continue;
    seen.add(identity);
    const key = JSON.stringify([
      d.transport,
      normalized(d.line),
      normalized(d.destination),
    ]);
    let group = groups.get(key);
    if (!group) {
      group = { upcoming: [], cancelled: [] };
      groups.set(key, group);
    }
    (d.cancelled === true ? group.cancelled : group.upcoming).push(d);
  }
  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      departure: (group.upcoming[0] ?? group.cancelled[0])!,
      following: group.upcoming.slice(1, 4),
      cancellations: group.cancelled.slice(0, 3),
      additionalCancellations: Math.max(0, group.cancelled.length - 3),
    }))
    .sort(
      (a, b) =>
        Number(a.departure.cancelled === true) -
          Number(b.departure.cancelled === true) ||
        compareDepartures(a.departure, b.departure) ||
        a.key.localeCompare(b.key),
    )
    .slice(0, config.max_routes);
}

export function nextCommute(
  board: BoardSnapshot,
  config: CardConfig,
  now: number,
): { departure: Departure; leaveAt: number; walking: number } | undefined {
  if (board.status !== "ready") return undefined;
  const walking = config.walking_minutes ?? board.walking_minutes;
  const departure = visibleDepartures(board, config, now).find(
    (d) => d.cancelled !== true && departureAt(d) - walking * 60_000 >= now,
  );
  return departure
    ? { departure, leaveAt: departureAt(departure) - walking * 60_000, walking }
    : undefined;
}
