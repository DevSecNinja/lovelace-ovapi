import { LitElement, html, nothing } from "lit";
import type { HomeAssistant } from "./contract";
import { record } from "./contract";
import { parseConfig } from "./model";
import { labels } from "./localize";
import { styles } from "./styles";

export class OvapiCardEditor extends LitElement {
  static styles = styles;
  private config: Record<string, unknown> = {};
  private ha?: HomeAssistant;
  private error = "";
  set hass(hass: HomeAssistant) {
    this.ha = hass;
    this.requestUpdate();
  }
  setConfig(config: unknown): void {
    this.config = { ...record(config) };
    this.requestUpdate();
  }

  private change(key: string, value: unknown): void {
    const next = { ...this.config, [key]: value };
    if (value === undefined) delete next[key];
    this.config = next;
    try {
      parseConfig(next);
      this.error = "";
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
  protected render() {
    const language =
      this.config.language === "nl" || this.config.language === "en"
        ? this.config.language
        : "auto";
    const t = labels({ language }, this.ha);
    const selected = Array.isArray(this.config.entities)
      ? this.config.entities.filter((e): e is string => typeof e === "string")
      : [];
    const entities = [
      ...new Set([
        ...selected,
        ...Object.entries(this.ha?.states ?? {})
          .filter(
            ([id, state]) =>
              id.startsWith("sensor.") &&
              state.attributes.contract_version === 1 &&
              typeof state.attributes.board_id === "string",
          )
          .map(([id]) => id),
      ]),
    ];
    return html`<div class="editor">
      <fieldset>
        <legend>${t.entities}</legend>
        ${
          entities.length
            ? entities.map(
                (entity) =>
                  html`<label class="choice">
                    <input
                      type="checkbox"
                      .checked=${selected.includes(entity)}
                      @change=${(event: Event) => this.change("entities", this.input(event).checked ? [...selected, entity] : selected.filter((e) => e !== entity))}
                    />
                    ${String(this.ha?.states[entity]?.attributes.friendly_name ?? entity)}
                  </label>`,
              )
            : html`<p>${t.choose}</p>`
        }
      </fieldset>
      ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}
      <label for="title">${t.title}</label
      ><input
        id="title"
        maxlength="120"
        .value=${String(this.config.title ?? "")}
        @change=${(e: Event) => this.change("title", this.input(e).value)}
      />
      ${(["lines", "destinations"] as const).map(
        (key) =>
          html` <label for=${key}>${t[key]}</label
            ><input
              id=${key}
              .value=${Array.isArray(this.config[key]) ? this.config[key].join(", ") : ""}
              @change=${(e: Event) =>
                this.change(
                  key,
                  this.input(e)
                    .value.split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )}
            />`,
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
      <label for="maximum">${t.maximum}</label
      ><input
        id="maximum"
        type="number"
        min="1"
        max="20"
        step="1"
        .value=${String(this.config.max_departures ?? 5)}
        @change=${(e: Event) => this.change("max_departures", Number(this.input(e).value))}
      />
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
