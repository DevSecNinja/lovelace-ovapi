import { parseBoard } from "./contract";
import type { BoardSnapshot, HAConnection, Unsubscribe } from "./contract";

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
}
type Listener = (view: BoardView) => void;

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

  private publish(view: BoardView): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.view = view;
    this.listeners.forEach((listener) => listener(view));
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
    if (board.status === "unavailable") {
      this.publish({ status: "unavailable" });
      return;
    }
    const remaining = Date.parse(board.expires_at!) - Date.now();
    if (remaining <= 0) {
      this.publish({ status: "expired" });
      return;
    }
    this.publish({ status: board.status, board });
    this.timer = setTimeout(
      () => this.publish({ status: "expired" }),
      remaining,
    );
  };

  add(listener: Listener): void {
    this.listeners.add(listener);
    if (
      this.view.board &&
      Date.parse(this.view.board.expires_at!) <= Date.now()
    )
      this.publish({ status: "expired" });
    else listener(this.view);
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
