import { LitElement, html, nothing } from "lit";
import { live } from "lit/directives/live.js";
import { repeat } from "lit/directives/repeat.js";
import type { HomeAssistant } from "./contract";
import { record, isSupportedContract } from "./contract";
import { parseConfig } from "./model";
import { labels } from "./localize";
import { styles } from "./styles";

export class OvapiCardEditor extends LitElement {
  static styles = styles;
  private config: Record<string, unknown> = {};
  private acceptedConfig?: Record<string, unknown>;
  private ha?: HomeAssistant;
  private error = "";
  set hass(hass: HomeAssistant) {
    this.ha = hass;
    this.requestUpdate();
  }
  setConfig(config: unknown): void {
    const next = { ...record(config) };
    const accepted = this.acceptedConfig;
    // HA echoes the last valid config; do not replace an unfinished local draft.
    if (
      accepted &&
      Object.keys(next).length === Object.keys(accepted).length &&
      Object.entries(next).every(
        ([key, value]) =>
          Object.hasOwn(accepted, key) &&
          JSON.stringify(value) === JSON.stringify(accepted[key]),
      )
    )
      return;
    this.config = next;
    this.acceptedConfig = next;
    this.error = "";
    this.requestUpdate();
  }

  private selectedEntities(): string[] {
    return Array.isArray(this.config.entities)
      ? this.config.entities.filter((e): e is string => typeof e === "string")
      : [];
  }

  private toggleEntity(entity: string, checked: boolean): void {
    const selected = this.selectedEntities();
    if (selected.includes(entity) === checked) {
      this.requestUpdate();
      return;
    }
    if (checked && selected.length >= 12) {
      this.error = "entities: select 1 to 12 OVAPI sensors";
      this.requestUpdate();
      return;
    }
    this.change(
      "entities",
      checked ? [...selected, entity] : selected.filter((e) => e !== entity),
    );
  }

  private change(key: string, value: unknown): void {
    const next = { ...this.config, [key]: value };
    if (value === undefined) delete next[key];
    for (const filter of ["lines", "destinations"]) {
      if (Array.isArray(next[filter])) {
        next[filter] = next[filter].filter(
          (entry) => typeof entry !== "string" || entry.trim(),
        );
      }
    }
    this.config = next;
    try {
      parseConfig(next);
      this.error = "";
      this.acceptedConfig = next;
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: next },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Invalid configuration";
    }
    this.requestUpdate();
  }
  private input(event: Event): HTMLInputElement {
    return event.target as HTMLInputElement;
  }
  private filters(key: "lines" | "destinations"): string[] {
    return Array.isArray(this.config[key]) ? this.config[key] : [];
  }
  private addFilter(key: "lines" | "destinations"): void {
    this.config = { ...this.config, [key]: [...this.filters(key), ""] };
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.shadowRoot
        ?.querySelector<HTMLTextAreaElement>(
          `#${key}-${this.filters(key).length - 1}`,
        )
        ?.focus();
    });
  }
  protected render() {
    const language =
      this.config.language === "nl" || this.config.language === "en"
        ? this.config.language
        : "auto";
    const t = labels({ language }, this.ha);
    const departures = this.config.type !== "custom:ovapi-commute-card";
    const grouped = departures && this.config.display_mode === "grouped";
    const selected = this.selectedEntities();
    const entities = [
      ...new Set([
        ...selected,
        ...Object.entries(this.ha?.states ?? {})
          .filter(
            ([id, state]) =>
              id.startsWith("sensor.") &&
              isSupportedContract(state.attributes.contract_version) &&
              typeof state.attributes.board_id === "string",
          )
          .map(([id]) => id),
      ]),
    ].sort();
    return html`<div class="editor">
      <fieldset>
        <legend>${t.entities}</legend>
        ${
          entities.length
            ? repeat(
                entities,
                (entity) => entity,
                (entity) =>
                  html`<label class="choice">
                    <input
                      type="checkbox"
                      .value=${entity}
                      .checked=${live(selected.includes(entity))}
                      @change=${(event: Event) => this.toggleEntity(entity, this.input(event).checked)}
                    />
                    ${String(this.ha?.states[entity]?.attributes.friendly_name ?? entity)}
                  </label>`,
              )
            : html`<p>${t.choose}</p>`
        }
      </fieldset>
      ${this.error ? html`<p class="error" role="alert">${this.error.startsWith("entities:") ? t.entitiesError : this.error}</p>` : nothing}
      <label for="title">${t.title}</label
      ><input
        id="title"
        maxlength="120"
        .value=${String(this.config.title ?? "")}
        @change=${(e: Event) => this.change("title", this.input(e).value)}
      />
      ${(["lines", "destinations"] as const).map(
        (key) =>
          html`<fieldset class="filters">
            <legend>${t[key]}</legend>
            ${this.filters(key).map(
              (value, index) => html`
                <label for="${key}-${index}">${t[key]} ${index + 1}</label>
                <div class="filter-row">
                  <textarea
                    id="${key}-${index}"
                    rows="1"
                    .value=${value}
                    @change=${(e: Event) =>
                      this.change(
                        key,
                        this.filters(key).map((current, i) =>
                          i === index ? this.input(e).value : current,
                        ),
                      )}
                  ></textarea>
                  <button
                    type="button"
                    aria-label="${t.removeFilter} ${t[key]} ${index + 1}"
                    @click=${() =>
                      this.change(
                        key,
                        this.filters(key).filter((_, i) => i !== index),
                      )}
                  >
                    ${t.removeFilter}
                  </button>
                </div>
              `,
            )}
            <button type="button" @click=${() => this.addFilter(key)}>
              ${t.addFilter} ${t[key]}
            </button>
          </fieldset>`,
      )}
      <p class="detail">${t.editorHelp}</p>
      <label for="walking">${t.walking}</label
      ><input
        id="walking"
        type="number"
        min="0"
        max="120"
        step="1"
        .value=${String(this.config.walking_minutes ?? "")}
        @change=${(e: Event) => this.change("walking_minutes", this.input(e).value === "" ? undefined : Number(this.input(e).value))}
      />
      ${
        departures
          ? html`<label for="display-mode">${t.displayMode}</label>
              <select
                id="display-mode"
                .value=${this.config.display_mode ?? "departures"}
                @change=${(e: Event) => this.change("display_mode", this.input(e).value)}
              >
                <option value="departures">${t.individual}</option>
                <option value="grouped">${t.grouped}</option>
              </select>`
          : nothing
      }
      ${
        grouped
          ? html`<label for="max-routes">${t.maxRoutes}</label>
              <input
                id="max-routes"
                type="number"
                min="1"
                max="20"
                step="1"
                aria-describedby="grouped-help"
                .value=${String(this.config.max_routes ?? 5)}
                @change=${(e: Event) => this.change("max_routes", Number(this.input(e).value))}
              />
              <p id="grouped-help" class="detail">${t.groupedHelp}</p>`
          : html`<label for="maximum">${t.maximum}</label
              ><input
                id="maximum"
                type="number"
                min="1"
                max="20"
                step="1"
                .value=${String(this.config.max_departures ?? 5)}
                @change=${(e: Event) => this.change("max_departures", Number(this.input(e).value))}
              />`
      }
      <label for="language">${t.language}</label
      ><select
        id="language"
        .value=${language}
        @change=${(e: Event) => this.change("language", this.input(e).value)}
      >
        <option value="auto">${t.auto}</option>
        <option value="en">English</option>
        <option value="nl">Nederlands</option>
      </select>
    </div>`;
  }
}

if (!customElements.get("ovapi-card-editor"))
  customElements.define("ovapi-card-editor", OvapiCardEditor);
