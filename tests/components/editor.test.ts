import { afterEach, describe, expect, it } from "vitest";
import { OvapiCardEditor } from "../../src/editor";
import { hass } from "../fixtures/connection";

describe("visual editor", () => {
  afterEach(() => document.body.replaceChildren());
  it("edits all options, validates ranges and emits composed config changes", async () => {
    const editor = new OvapiCardEditor();
    editor.hass = hass();
    editor.setConfig({
      type: "custom:ovapi-commute-card",
      entities: ["sensor.amsterdam_departures"],
    });
    document.body.append(editor);
    await editor.updateComplete;
    const events: CustomEvent[] = [];
    document.body.addEventListener(
      "config-changed",
      (e) => events.push(e as CustomEvent),
      { signal: AbortSignal.timeout(1000) },
    );
    const change = async (id: string, value: string) => {
      const input = editor.shadowRoot!.querySelector<HTMLInputElement>(
        `#${id}`,
      )!;
      input.value = value;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await editor.updateComplete;
    };
    await change("title", "My commute");
    expect(events.at(-1)?.detail.config.title).toBe("My commute");
    expect(events.at(-1)?.composed).toBe(true);
    await change("lines", "X1, X2, ");
    await change("destinations", "Synthetic destination");
    await change("walking", "8");
    await change("maximum", "7");
    await change("language", "nl");
    expect(events.at(-1)?.detail.config).toMatchObject({
      lines: ["X1", "X2"],
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
