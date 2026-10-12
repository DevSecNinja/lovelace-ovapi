import type {
  HAConnection,
  HomeAssistant,
  Unsubscribe,
} from "../../src/contract";

export class FakeConnection implements HAConnection {
  connected = true;
  subscriptions = new Map<string, Set<(value: unknown) => void>>();
  events = new Map<string, Set<() => void>>();
  calls = 0;
  unsubscriptions = 0;
  reject = false;
  deferred = false;
  resolve?: (unsubscribe: Unsubscribe) => void;

  subscribeMessage<T>(
    callback: (value: T) => void,
    message: { type: string; entity_id: string },
  ): Promise<Unsubscribe> {
    this.calls++;
    if (this.reject) return Promise.reject(new Error("synthetic failure"));
    const callbacks = this.subscriptions.get(message.entity_id) ?? new Set();
    const cb = callback as (value: unknown) => void;
    callbacks.add(cb);
    this.subscriptions.set(message.entity_id, callbacks);
    const unsubscribe = async () => {
      callbacks.delete(cb);
      this.unsubscriptions++;
    };
    if (this.deferred)
      return new Promise((resolve) => {
        this.resolve = () => resolve(unsubscribe);
      });
    return Promise.resolve(unsubscribe);
  }
  addEventListener(type: string, callback: () => void): void {
    const callbacks = this.events.get(type) ?? new Set();
    callbacks.add(callback);
    this.events.set(type, callbacks);
  }
  removeEventListener(type: string, callback: () => void): void {
    this.events.get(type)?.delete(callback);
  }
  emit(entity: string, value: unknown): void {
    this.subscriptions.get(entity)?.forEach((cb) => cb(value));
  }
  fire(type: "ready" | "disconnected"): void {
    this.connected = type === "ready";
    this.events.get(type)?.forEach((cb) => cb());
  }
}

export function hass(connection = new FakeConnection()): HomeAssistant {
  return {
    connection,
    language: "en",
    config: { time_zone: "Europe/Amsterdam" },
    locale: { language: "en", time_format: "24" },
    states: {
      "sensor.amsterdam_departures": {
        state: "ready",
        attributes: {
          contract_version: 1,
          board_id: "synthetic-entry",
          friendly_name: "Amsterdam Amstel",
        },
      },
      "sensor.centra al": { state: "ready", attributes: {} },
    },
  };
}
