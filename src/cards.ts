import { LitElement, html, nothing } from "lit";
import type { HomeAssistant, BoardSnapshot, Departure } from "./contract";
import { isSupportedContract } from "./contract";
import {
  departureAt,
  minutesUntil,
  nextCommute,
  parseConfig,
  visibleDepartures,
  groupedDepartures,
} from "./model";
import type { CardConfig, DepartureGroup } from "./model";
import { clock, labels } from "./localize";
import { currentBoardView, watchBoard } from "./subscription";
import type { BoardView } from "./subscription";
import { styles } from "./styles";
import "./editor";

export class OvapiDeparturesCard extends LitElement {
  static styles = styles;
  private config?: CardConfig;
  private ha?: HomeAssistant;
  private views = new Map<string, BoardView>();
  private stops: (() => void)[] = [];
  private tick?: ReturnType<typeof setInterval>;
  private paused = false;

  static getConfigElement(): HTMLElement {
    return document.createElement("ovapi-card-editor");
  }
  static getStubConfig(hass?: HomeAssistant): { entities: string[] } {
    return {
      entities: Object.entries(hass?.states ?? {})
        .filter(
          ([id, state]) =>
            id.startsWith("sensor.") &&
            isSupportedContract(state.attributes.contract_version) &&
            typeof state.attributes.board_id === "string",
        )
        .slice(0, 1)
        .map(([id]) => id),
    };
  }

  setConfig(config: unknown): void {
    this.config = parseConfig(config);
    this.restart();
    this.requestUpdate();
  }
  set hass(hass: HomeAssistant) {
    const changed = this.ha?.connection !== hass.connection;
    this.ha = hass;
    if (changed || !this.stops.length) this.restart();
    this.requestUpdate();
  }
  get hass(): HomeAssistant | undefined {
    return this.ha;
  }
  getCardSize(): number {
    const limit =
      this.config?.display_mode === "grouped"
        ? this.config.max_routes
        : (this.config?.max_departures ?? 5);
    return (this.config?.entities.length ?? 1) * (this.commute ? 5 : limit + 2);
  }
  getGridOptions(): { columns: number; min_columns: number } {
    return { columns: 12, min_columns: 6 };
  }
  protected get commute(): boolean {
    return false;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.paused = document.hidden;
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("pagehide", this.pagehide);
    window.addEventListener("pageshow", this.pageshow);
    this.restart();
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("pagehide", this.pagehide);
    window.removeEventListener("pageshow", this.pageshow);
    this.clear();
    // Lit keeps a detached render tree; explicitly remove any rendered source text.
    this.requestUpdate();
  }
  private visibility = (): void => {
    this.paused = document.hidden;
    this.restart();
  };
  private pagehide = (): void => {
    this.paused = true;
    this.restart();
  };
  private pageshow = (): void => {
    this.paused = document.hidden;
    this.restart();
  };
  private clear(): void {
    this.stops.forEach((stop) => stop());
    this.stops = [];
    this.views.clear();
    clearInterval(this.tick);
    this.tick = undefined;
  }
  private restart(): void {
    this.clear();
    if (this.isConnected && !this.paused && this.config && this.ha) {
      this.stops = this.config.entities.map((entity) =>
        watchBoard(this.ha!.connection, entity, (view) => {
          this.views.set(entity, view);
          this.requestUpdate();
        }),
      );
      this.tick = setInterval(() => this.requestUpdate(), 1000);
    }
    this.requestUpdate();
  }

  protected render() {
    if (!this.config) return nothing;
    const t = labels(this.config, this.ha);
    return html` <!-- THESIS: Read departures and leave times, never decorative metrics.
      OWN-WORLD: Home Assistant theme, restrained dividers, tabular times.
      STORY: Choose a favourite, read freshness, decide when to leave.
      FIRST VIEWPORT: Title, named stop, status, aligned line/destination/time.
      FORM: Brief-pinned HA dashboard cards; no independent visual-world roll. -->
      <ha-card>
        <header>
          <h2>
            ${this.config.title || (this.commute ? t.commute : t.departures)}
          </h2>
        </header>
        ${this.config.entities.map((entity) => {
          const view = currentBoardView(
            this.views.get(entity) ?? { status: "loading" },
            Date.now(),
          );
          const board = view.board;
          if (
            !board ||
            !this.isConnected ||
            this.paused ||
            Date.parse(board.expires_at!) <= Date.now()
          ) {
            const status = board ? "expired" : view.status;
            const coverage =
              this.isConnected && !this.paused
                ? this.renderCoverage(view)
                : nothing;
            return html`<section>
              <h3>${entity}</h3>
              ${coverage}
              ${
                coverage === nothing || view.coverage?.status === "stale"
                  ? html`<p class="message" role="status">
                      ${t[status === "ready" || status === "stale" ? "loading" : status]}
                    </p>`
                  : nothing
              }
            </section>`;
          }
          return this.renderBoard(board);
        })}
      </ha-card>`;
  }

  private renderBoard(board: BoardSnapshot) {
    const config = this.config!;
    const t = labels(config, this.ha);
    return html`<section>
      <h3>${board.stop.name}</h3>
      <p class="status" role="status">
        ${board.status === "stale" ? t.stale : t.ready}
        <time datetime=${board.fetched_at!}
          >${clock(board.fetched_at!, config, this.ha)}</time
        >
      </p>
      ${board.status === "stale" ? html`<p class="message warning">${t.staleAdvice}</p>` : nothing}
      ${this.renderCoverage({ status: board.status, coverage: board.coverage })}
      ${this.commute ? this.renderCommute(board) : this.renderDepartures(board)}
    </section>`;
  }

  private renderCoverage(view: BoardView) {
    const t = labels(this.config!, this.ha);
    const coverage = view.coverage;
    const message = view.coverageExpired
      ? t.coverageExpired
      : coverage?.status === "unavailable"
        ? t.coverageUnavailable
        : coverage?.status === "partial"
          ? t.coveragePartial(
              coverage.verified_members,
              coverage.selected_members,
            )
          : coverage?.selected_members === 0
            ? t.coverageEmpty
            : coverage?.status === "stale"
              ? t.coverageStale
              : null;
    return message
      ? html`<p class="message warning coverage" role="status">${message}</p>`
      : nothing;
  }

  private renderDepartures(board: BoardSnapshot) {
    const config = this.config!;
    const t = labels(config, this.ha);
    const now = Date.now();
    const rows: { departure: Departure; group?: DepartureGroup }[] =
      config.display_mode === "grouped"
        ? groupedDepartures(board, config, now).map((group) => ({
            departure: group.departure,
            group,
          }))
        : visibleDepartures(board, config, now)
            .slice(0, config.max_departures)
            .map((departure) => ({ departure }));
    if (!rows.length)
      return html`<p class="message">
        ${config.lines.length || config.destinations.length ? t.filtered : t.empty}
      </p>`;
    return html`<ol aria-label=${t.departures}>
      ${rows.map((row) => this.renderDeparture(row.departure, now, row.group))}
    </ol>`;
  }

  private renderDeparture(d: Departure, now: number, group?: DepartureGroup) {
    const config = this.config!;
    const t = labels(config, this.ha);
    const cancellations =
      group?.cancellations.filter((cancelled) => cancelled !== d) ?? [];
    return html`<li
      class="departure ${d.cancelled === true ? "cancelled" : ""}"
    >
      <span class="line">${d.line}</span>
      <div>
        <div class="destination">${d.destination}</div>
        <div class="detail">
          ${d.transport === "unknown" ? t.transport : t[d.transport]} ·
          <span class=${d.cancelled === true ? "cancelled-label" : ""}
            >${this.serviceStatus(d)}</span
          >
        </div>
        ${
          group?.following.length
            ? html`<div class="following detail">
                ${t.alsoIn}
                ${group.following.map((following, i) => {
                  const minutes = minutesUntil(departureAt(following), now);
                  const status = this.serviceStatus(following);
                  return html`${i ? ", " : ""}<time
                      datetime=${following.expected_at ?? following.scheduled_at}
                      title=${status}
                      aria-label="${minutes} ${t.min} · ${status}"
                      >${minutes}</time
                    >`;
                })}
                ${t.min}
              </div>`
            : nothing
        }
        ${
          cancellations.length
            ? html`<div class="cancellations detail">
                <span class="cancelled-label">${t.cancelled}</span>:
                ${cancellations.map(
                  (cancelled, i) =>
                    html`${i ? ", " : ""}<time
                        datetime=${cancelled.expected_at ?? cancelled.scheduled_at}
                        >${clock(departureAt(cancelled), config, this.ha)}</time
                      >`,
                )}
              </div>`
            : nothing
        }
        ${
          group?.additionalCancellations
            ? html`<div class="detail cancelled-label">
                ${group.additionalCancellations}
                ${group.additionalCancellations === 1 ? t.oneMoreCancelled : t.moreCancelled}
              </div>`
            : nothing
        }
      </div>
      <div class="time">
        ${
          d.cancelled === true
            ? nothing
            : html`<strong
                  >${minutesUntil(departureAt(d), now)}
                  <small>${t.min}</small></strong
                ><br />`
        }
        <time datetime=${d.expected_at ?? d.scheduled_at}
          >${clock(departureAt(d), config, this.ha)}</time
        >
      </div>
    </li>`;
  }

  private serviceStatus(d: Departure): string {
    const t = labels(this.config!, this.ha);
    if (d.cancelled === true) return t.cancelled;
    if (d.delay_seconds !== null && d.delay_seconds !== 0) {
      if (Math.abs(d.delay_seconds) < 60) {
        return `${t.expected} ${d.delay_seconds < 0 ? t.subMinuteEarly : t.subMinuteLate}`;
      }
      const minutes = Math.round(d.delay_seconds / 60);
      return `${t.expected} ${minutes >= 0 ? "+" : ""}${minutes} ${t.min}`;
    }
    if (d.cancelled === null) return t.unknown;
    return d.expected_at === null
      ? t.scheduled
      : d.delay_seconds === 0
        ? t.onTime
        : t.expected;
  }

  private renderCommute(board: BoardSnapshot) {
    const config = this.config!;
    const t = labels(config, this.ha);
    if (board.status === "stale") return nothing;
    const journey = nextCommute(board, config, Date.now());
    if (!journey) return html`<p class="message">${t.noCommute}</p>`;
    const { departure: d, leaveAt, walking } = journey;
    const minutes = minutesUntil(leaveAt, Date.now());
    return html` <div class="leave">
        ${minutes ? t.leaveIn : t.leaveNow}${minutes ? html`<strong>${minutes} <small>${t.min}</small></strong>` : nothing}
      </div>
      <div class="commute-route">
        <span class="line">${d.line}</span>
        <div>
          <div class="destination">${d.destination}</div>
          <div class="detail">
            ${d.transport === "unknown" ? t.transport : t[d.transport]} ·
            ${this.serviceStatus(d)}
          </div>
        </div>
      </div>
      <p class="commute-detail">
        ${walking} ${t.min} ${t.walk} · ${t.departs}
        <time datetime=${d.expected_at ?? d.scheduled_at}
          >${clock(departureAt(d), config, this.ha)}</time
        >
      </p>`;
  }
}

export class OvapiCommuteCard extends OvapiDeparturesCard {
  protected get commute(): boolean {
    return true;
  }
}
