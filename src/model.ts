import { record } from "./contract";
import type { BoardSnapshot, Departure } from "./contract";

export interface CardConfig {
  type: "custom:ovapi-departures-card" | "custom:ovapi-commute-card";
  entities: string[];
  title?: string;
  lines: string[];
  destinations: string[];
  max_departures: number;
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

export function visibleDepartures(
  board: BoardSnapshot,
  config: CardConfig,
  now: number,
): Departure[] {
  const matches = (filters: string[], value: string) =>
    !filters.length ||
    filters.some((f) => f.toLowerCase() === value.toLowerCase());
  return board.departures
    .filter(
      (d) =>
        departureAt(d) > now &&
        matches(config.lines, d.line) &&
        matches(config.destinations, d.destination),
    )
    .sort(
      (a, b) => departureAt(a) - departureAt(b) || a.id.localeCompare(b.id),
    );
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
