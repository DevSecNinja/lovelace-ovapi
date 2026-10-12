export const CARD_CONTRACT_VERSION = 1;

export function isSupportedContract(
  value: unknown,
): value is typeof CARD_CONTRACT_VERSION {
  return value === CARD_CONTRACT_VERSION;
}

export interface Departure {
  id: string;
  line: string;
  destination: string;
  transport: "bus" | "tram" | "metro" | "unknown";
  scheduled_at: string;
  expected_at: string | null;
  cancelled: boolean | null;
  delay_seconds: number | null;
}

export interface BoardSnapshot {
  contract_version: typeof CARD_CONTRACT_VERSION;
  board_id: string;
  entity_id: string;
  stop: { id: string; name: string };
  status: "ready" | "stale" | "unavailable";
  fetched_at: string | null;
  expires_at: string | null;
  walking_minutes: number;
  departures: Departure[];
}

export type Unsubscribe = () => Promise<void>;
export interface HAConnection {
  connected: boolean;
  subscribeMessage<T>(
    callback: (snapshot: T) => void,
    message: { type: string; entity_id: string },
  ): Promise<Unsubscribe>;
  addEventListener(type: "ready" | "disconnected", callback: () => void): void;
  removeEventListener(
    type: "ready" | "disconnected",
    callback: () => void,
  ): void;
}

export interface HomeAssistant {
  connection: HAConnection;
  language: string;
  locale?: { language: string; time_format?: string };
  config: { time_zone: string };
  states: Record<
    string,
    { state: string; attributes: Record<string, unknown> }
  >;
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected an object");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim().length || value.length > 512) {
    throw new Error("Invalid text");
  }
  return value;
}

function instant(value: unknown): string {
  const result = text(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      result,
    ) ||
    !Number.isFinite(Date.parse(result))
  )
    throw new Error("Invalid instant");
  return result;
}

function departure(value: unknown): Departure {
  const d = record(value);
  if (
    !["bus", "tram", "metro", "unknown"].includes(String(d.transport)) ||
    !(d.cancelled === null || typeof d.cancelled === "boolean") ||
    !(d.delay_seconds === null || Number.isSafeInteger(d.delay_seconds))
  ) {
    throw new Error("Invalid departure");
  }
  return {
    id: text(d.id),
    line: text(d.line),
    destination: text(d.destination),
    transport: d.transport as Departure["transport"],
    scheduled_at: instant(d.scheduled_at),
    expected_at: d.expected_at === null ? null : instant(d.expected_at),
    cancelled: d.cancelled,
    delay_seconds: d.delay_seconds as number | null,
  };
}

export function parseBoard(
  value: unknown,
  entity: string,
  now: number,
): BoardSnapshot {
  const b = record(value);
  if (!isSupportedContract(b.contract_version))
    throw new Error("Unsupported contract version");
  if (
    b.entity_id !== entity ||
    !["ready", "stale", "unavailable"].includes(String(b.status)) ||
    !Number.isSafeInteger(b.walking_minutes) ||
    Number(b.walking_minutes) < 0 ||
    !Array.isArray(b.departures) ||
    b.departures.length > 5000
  ) {
    throw new Error("Invalid board");
  }
  const stop = record(b.stop);
  const fetched = b.fetched_at === null ? null : instant(b.fetched_at);
  const expires = b.expires_at === null ? null : instant(b.expires_at);
  if (b.status === "unavailable") {
    if (fetched !== null || expires !== null || b.departures.length) {
      throw new Error("Unavailable board contains source data");
    }
  } else if (
    fetched === null ||
    expires === null ||
    Date.parse(expires) <= Date.parse(fetched) ||
    Date.parse(expires) - Date.parse(fetched) > 29 * 60_000 ||
    Date.parse(fetched) > now + 60_000
  ) {
    throw new Error("Invalid source validity");
  }
  return {
    contract_version: CARD_CONTRACT_VERSION,
    board_id: text(b.board_id),
    entity_id: entity,
    stop: { id: text(stop.id), name: text(stop.name) },
    status: b.status as BoardSnapshot["status"],
    fetched_at: fetched,
    expires_at: expires,
    walking_minutes: b.walking_minutes as number,
    departures: b.departures.map(departure),
  };
}
