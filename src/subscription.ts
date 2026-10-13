import { parseBoard } from "./contract";
import type {
  BoardSnapshot,
  HAConnection,
  StationCoverage,
  Unsubscribe,
} from "./contract";

export type ViewStatus =
  | "loading"
  | "ready"
  | "stale"
  | "unavailable"
  | "expired"
  | "disconnected"
  | "error";
export interface BoardView {
  status: ViewStatus;
  board?: BoardSnapshot;
  coverage?: StationCoverage;
  coverageExpired?: true;
}
type Listener = (view: BoardView) => void;

function currentBoardView(view: BoardView, now: number): BoardView {
  if (
    view.coverage?.metadata_expires_at &&
    Date.parse(view.coverage.metadata_expires_at) <= now
  )
    return { status: "unavailable", coverageExpired: true };
  if (view.board && Date.parse(view.board.expires_at!) <= now)
    return {
      status: "expired",
      ...(view.coverage ? { coverage: view.coverage } : {}),
    };
  return view;
}

function deadline(view: BoardView): number {
  return Math.min(
    view.board ? Date.parse(view.board.expires_at!) : Infinity,
    view.coverage?.metadata_expires_at
      ? Date.parse(view.coverage.metadata_expires_at)
      : Infinity,
  );
}

const connections = new WeakMap<HAConnection, Map<string, BoardSubscription>>();

class BoardSubscription {
  private listeners = new Set<Listener>();
  private view: BoardView = { status: "loading" };
  private timer?: ReturnType<typeof setTimeout>;
  private unsubscribe?: Unsubscribe;
  private disposed = false;

  constructor(
    private connection: HAConnection,
    private entity: string,
  ) {
    connection.addEventListener("disconnected", this.disconnected);
    connection.addEventListener("ready", this.ready);
    this.view = { status: connection.connected ? "loading" : "disconnected" };
    void connection
      .subscribeMessage<unknown>(this.receive, {
        type: "ovapi/subscribe",
        entity_id: entity,
      })
      .then(
        (unsubscribe) => {
          if (this.disposed) this.release(unsubscribe);
          else this.unsubscribe = unsubscribe;
        },
        () => {
          if (!this.disposed) this.publish({ status: "error" });
        },
      );
  }

  private release(unsubscribe: Unsubscribe): void {
    void unsubscribe().catch(() => {
      // Never include server errors: they may contain source data.
      console.warn("OVAPI subscription cleanup failed; reload the dashboard.");
    });
  }

  private publish(view: BoardView, now = Date.now()): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.view = currentBoardView(view, now);
    this.listeners.forEach((listener) => listener(this.view));
    const remaining = deadline(this.view) - now;
    if (Number.isFinite(remaining))
      this.timer = setTimeout(
        () => this.publish(this.view),
        Math.min(remaining, 2_147_483_647),
      );
  }

  private disconnected = (): void => {
    this.publish({ status: "disconnected" });
  };
  private ready = (): void => {
    if (!this.view.board) this.publish({ status: "loading" });
  };
  private receive = (value: unknown): void => {
    if (this.disposed || !this.connection.connected) return;
    let board: BoardSnapshot;
    try {
      board = parseBoard(value, this.entity, Date.now());
    } catch {
      this.publish({ status: "error" });
      return;
    }
    this.publish({
      status: board.status,
      ...(board.status === "unavailable" ? {} : { board }),
      ...(board.coverage ? { coverage: board.coverage } : {}),
    });
  };

  current(now = Date.now()): BoardView {
    if (deadline(this.view) <= now) this.publish(this.view, now);
    return this.view;
  }

  add(listener: Listener): void {
    const view = this.current();
    this.listeners.add(listener);
    listener(view);
  }

  remove(listener: Listener): boolean {
    this.listeners.delete(listener);
    if (this.listeners.size) return false;
    this.disposed = true;
    this.publish({ status: "unavailable" });
    this.connection.removeEventListener("disconnected", this.disconnected);
    this.connection.removeEventListener("ready", this.ready);
    if (this.unsubscribe) this.release(this.unsubscribe);
    return true;
  }
}

export function readBoard(
  connection: HAConnection,
  entity: string,
  now = Date.now(),
): BoardView | undefined {
  return connections.get(connection)?.get(entity)?.current(now);
}

export function watchBoard(
  connection: HAConnection,
  entity: string,
  listener: Listener,
): () => void {
  let entries = connections.get(connection);
  if (!entries) {
    entries = new Map();
    connections.set(connection, entries);
  }
  let entry = entries.get(entity);
  if (!entry) {
    entry = new BoardSubscription(connection, entity);
    entries.set(entity, entry);
  }
  entry.add(listener);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    if (entry.remove(listener)) entries.delete(entity);
  };
}
