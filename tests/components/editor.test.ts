import { afterEach, describe, expect, it } from "vitest";
import { OvapiCardEditor } from "../../src/editor";
import { hass } from "../fixtures/connection";
import { parseConfig } from "../../src/model";

describe("visual editor", () => {
  afterEach(() => document.body.replaceChildren());
  it("round-trips mode and separate limits, rejects bad route limits and preserves inactive values", async () => {
    const editor = new OvapiCardEditor();
    editor.setConfig({
      type: "custom:ovapi-departures-card",
      entities: ["sensor.amsterdam_departures"],
      max_departures: 7,
    });
    document.body.append(editor);
    await editor.updateComplete;
    let config: Record<string, unknown> = {};
    let changes = 0;
    editor.addEventListener("config-changed", (event) => {
      config = (event as CustomEvent).detail.config;
      changes++;
    });
    const change = async (id: string, value: string) => {
      const input = editor.shadowRoot!.querySelector<
        HTMLInputElement | HTMLSelectElement
      >(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event("change"));
      await editor.updateComplete;
    };
    expect(
      editor.shadowRoot!.querySelector<HTMLSelectElement>("#display-mode")
        ?.value,
    ).toBe("departures");
    await change("display-mode", "grouped");
    expect(editor.shadowRoot!.querySelector("#maximum")).toBeNull();
    expect(
      editor.shadowRoot!.querySelector<HTMLInputElement>("#max-routes")?.value,
    ).toBe("5");
    expect(editor.shadowRoot!.textContent).toContain("line + destination");
    await change("max-routes", "3");
    expect(parseConfig(config)).toMatchObject({
      display_mode: "grouped",
      max_routes: 3,
      max_departures: 7,
    });
    const count = changes;
    for (const value of ["0", "21", "1.5", ""]) {
      await change("max-routes", value);
      expect(changes).toBe(count);
      expect(
        editor.shadowRoot!.querySelector("[role=alert]")?.textContent,
      ).toContain("max_routes");
    }
    await change("max-routes", "20");
    await change("display-mode", "departures");
    expect(editor.shadowRoot!.querySelector("#max-routes")).toBeNull();
    expect(
      editor.shadowRoot!.querySelector<HTMLInputElement>("#maximum")?.value,
    ).toBe("7");
    expect(config.max_routes).toBe(20);
    await change("display-mode", "grouped");
    editor.setConfig(config);
    await editor.updateComplete;
    expect(
      editor.shadowRoot!.querySelector<HTMLInputElement>("#max-routes")?.value,
    ).toBe("20");
    await change("language", "nl");
    expect(editor.shadowRoot!.textContent).toContain("lijn + bestemming");
    editor.setConfig({ ...config, type: "custom:ovapi-commute-card" });
    await editor.updateComplete;
    expect(editor.shadowRoot!.querySelector("#display-mode")).toBeNull();
  });
  it("edits all options, validates ranges and emits composed config changes", async () => {
    const editor = new OvapiCardEditor();
    editor.hass = hass();
    editor.setConfig({
      type: "custom:ovapi-commute-card",
      entities: ["sensor.amsterdam_departures"],
      lines: ["X0"],
      destinations: ["Old destination"],
    });
    document.body.append(editor);
    await editor.updateComplete;
    const events: CustomEvent[] = [];
    editor.addEventListener("config-changed", (e) =>
      events.push(e as CustomEvent),
    );
    const change = async (id: string, value: string) => {
      const input = editor.shadowRoot!.querySelector<
        HTMLInputElement | HTMLTextAreaElement
      >(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await editor.updateComplete;
    };
    await change("title", "My commute");
    expect(events.at(-1)?.detail.config.title).toBe("My commute");
    expect(events.at(-1)?.composed).toBe(true);
    await change("lines-0", "X1");
    await change("destinations-0", "Synthetic destination");
    await change("walking", "8");
    await change("maximum", "7");
    await change("language", "nl");
    expect(events.at(-1)?.detail.config).toMatchObject({
      lines: ["X1"],
      destinations: ["Synthetic destination"],
      walking_minutes: 8,
      max_departures: 7,
      language: "nl",
    });
    expect(editor.shadowRoot!.textContent).toContain("Looptijd");
    await change("walking", "");
    expect(events.at(-1)?.detail.config).not.toHaveProperty("walking_minutes");
    const count = events.length;
    await change("walking", "-1");
    expect(events).toHaveLength(count);
    expect(
      editor.shadowRoot!.querySelector("[role=alert]")?.textContent,
    ).toContain("0 to 120");
    await change("walking", "0");
    const checkbox = editor.shadowRoot!.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));
    await editor.updateComplete;
    expect(
      editor.shadowRoot!.querySelector("[role=alert]")?.textContent,
    ).toContain("1 to 12");
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    await editor.updateComplete;
    expect(events.at(-1)?.detail.config.entities).toEqual([
      "sensor.amsterdam_departures",
    ]);
  });

  it("preserves existing array values including commas, quotes and newlines", async () => {
    const editor = new OvapiCardEditor();
    const lines = ["X1, X2", "X3"];
    const destinations = ["Station, west", 'Stop "A"', "Lower\nUpper"];
    editor.setConfig({
      type: "custom:ovapi-departures-card",
      entities: ["sensor.amsterdam_departures"],
      lines,
      destinations,
    });
    document.body.append(editor);
    await editor.updateComplete;
    let config: Record<string, unknown> = {};
    editor.addEventListener("config-changed", (event) => {
      config = (event as CustomEvent).detail.config;
    });
    for (const [key, values] of Object.entries({ lines, destinations })) {
      for (let i = 0; i < values.length; i++) {
        const field = editor.shadowRoot!.querySelector<HTMLTextAreaElement>(
          `#${key}-${i}`,
        )!;
        expect(field.value).toBe(values[i]);
        field.dispatchEvent(new Event("change"));
        await editor.updateComplete;
      }
      expect(config[key]).toEqual(values);
    }
    const add = [...editor.shadowRoot!.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Add Destinations"),
    )!;
    add.click();
    await editor.updateComplete;
    const added =
      editor.shadowRoot!.querySelector<HTMLTextAreaElement>("#destinations-3")!;
    expect(editor.shadowRoot!.activeElement).toBe(added);
    added.value = "Station, east";
    added.dispatchEvent(new Event("change"));
    await editor.updateComplete;
    expect(config.destinations).toEqual([...destinations, "Station, east"]);
    editor
      .shadowRoot!.querySelector<HTMLButtonElement>(
        '[aria-label="Remove Destinations 2"]',
      )!
      .click();
    await editor.updateComplete;
    expect(config.destinations).toEqual([
      "Station, west",
      "Lower\nUpper",
      "Station, east",
    ]);
    const first =
      editor.shadowRoot!.querySelector<HTMLTextAreaElement>("#destinations-0")!;
    first.value = "";
    first.dispatchEvent(new Event("change"));
    await editor.updateComplete;
    expect(config.destinations).toEqual(["Lower\nUpper", "Station, east"]);
  });

  it("offers only supported contract sensors for new selections", async () => {
    const editor = new OvapiCardEditor(),
      ha = hass();
    ha.states["sensor.future"] = {
      state: "ready",
      attributes: { contract_version: 2, board_id: "future" },
    };
    editor.hass = ha;
    document.body.append(editor);
    await editor.updateComplete;
    expect(editor.shadowRoot!.textContent).not.toContain("sensor.future");
  });

  it("handles unconfigured and unavailable entities without dropping selections", async () => {
    const editor = new OvapiCardEditor();
    document.body.append(editor);
    await editor.updateComplete;
    expect(editor.shadowRoot!.textContent).toContain("Choose one");
    editor.setConfig({
      type: "custom:ovapi-departures-card",
      entities: ["sensor.missing"],
    });
    editor.hass = hass();
    await editor.updateComplete;
    expect(editor.shadowRoot!.textContent).toContain("sensor.missing");
    expect(
      editor.shadowRoot!.querySelectorAll('input[type="checkbox"]'),
    ).toHaveLength(2);
  });
});
