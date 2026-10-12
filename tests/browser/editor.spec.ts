import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const amstel = "sensor.amsterdam_departures";
const centraal = "sensor.centraal_departures";
const zuid = "sensor.zuid_departures";

async function setup(page: Page, dark: boolean, entities = [zuid, amstel]) {
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173"))
      external.push(request.url());
  });
  await page.goto(`/tests/harness/?editor&theme=${dark ? "dark" : "light"}`);
  await page.evaluate(
    ({ entities, dark }) => {
      const { ha, editor } = window.demo;
      ha.locale!.language = dark ? "nl" : "en";
      ha.states["sensor.zuid_departures"] = {
        state: "ready",
        attributes: {
          contract_version: 1,
          board_id: "synthetic-zuid",
          friendly_name: "Amsterdam Zuid",
        },
      };
      editor!.hass = ha;
      editor!.setConfig({
        type: "custom:ovapi-departures-card",
        entities,
        language: dark ? "nl" : "en",
        display_mode: "grouped",
        max_routes: 3,
        max_departures: 7,
        lines: ["X1, X2"],
        destinations: ['Stop "A"'],
      });
    },
    { entities, dark },
  );
  const editor = page.locator("ovapi-card-editor");
  await expect(
    editor.getByLabel("Amsterdam Zuid", { exact: true }),
  ).toBeVisible();
  return { editor, external };
}

test("favourite rows keep identity, order, checked state and focus through label/Space toggles and HA feedback", async ({
  page,
}, info) => {
  const { editor, external } = await setup(
    page,
    info.project.name.includes("dark"),
  );
  const first = editor.getByLabel("Amsterdam Amstel", { exact: true });
  const third = editor.getByLabel("Amsterdam Zuid", { exact: true });
  const firstNode = await first.elementHandle();
  const thirdNode = await third.elementHandle();
  const order = await editor.locator(".choice").allTextContents();
  const label = (name: string) =>
    editor.locator(".choice").filter({ hasText: name });

  await label("Amsterdam Zuid").click();
  await expect(first).toBeChecked();
  await expect(third).not.toBeChecked();
  await expect(third).toBeFocused();
  expect(await editor.locator(".choice").allTextContents()).toEqual(order);
  expect(
    await thirdNode!.evaluate(
      (el) =>
        el.isConnected && el === (el.getRootNode() as ShadowRoot).activeElement,
    ),
  ).toBe(true);
  expect(
    await firstNode!.evaluate((el) => el.parentElement!.textContent),
  ).toContain("Amsterdam Amstel");
  expect(
    await page.evaluate(() => window.demo.configChanges.at(-1)?.entities),
  ).toEqual([amstel]);

  await page.keyboard.press("Space");
  await expect(third).toBeChecked();
  await expect(third).toBeFocused();
  await label("Amsterdam Centraal").click();
  await expect(
    editor.getByLabel("Amsterdam Centraal", { exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(
    editor.getByLabel("Amsterdam Centraal", { exact: true }),
  ).not.toBeChecked();
  expect(
    await page.evaluate(() => window.demo.configChanges.map((c) => c.entities)),
  ).toEqual([
    [amstel],
    [amstel, zuid],
    [amstel, zuid, centraal],
    [amstel, zuid],
  ]);
  expect(await page.evaluate(() => window.demo.config)).toMatchObject({
    display_mode: "grouped",
    max_routes: 3,
    max_departures: 7,
    lines: ["X1, X2"],
    destinations: ['Stop "A"'],
  });
  const calls = await page.evaluate(() => window.demo.connection.calls);
  await page.evaluate(async () => {
    const { editor, ha, config } = window.demo;
    ha.states = Object.fromEntries(Object.entries(ha.states).reverse());
    editor!.hass = { ...ha };
    editor!.setConfig(structuredClone(config));
    await editor!.updateComplete;
  });
  expect(await editor.locator(".choice").allTextContents()).toEqual(order);
  await expect(third).toBeChecked();
  expect(await page.evaluate(() => window.demo.configChanges.length)).toBe(4);
  expect(await page.evaluate(() => window.demo.connection.calls)).toBe(calls);

  await page.evaluate(async () => {
    const { editor, config, ha } = window.demo;
    const reopened = document.createElement(
      "ovapi-card-editor",
    ) as typeof editor;
    reopened!.setConfig(structuredClone(config));
    reopened!.hass = ha;
    editor!.replaceWith(reopened!);
    await reopened!.updateComplete;
  });
  await expect(first).toBeChecked();
  await expect(third).toBeChecked();
  await expect(
    editor.getByLabel("Amsterdam Centraal", { exact: true }),
  ).not.toBeChecked();
  expect(external).toEqual([]);
});

test("last favourite is an explicit unsaved draft across HA echoes and refreshes, then selects only its replacement", async ({
  page,
}, info) => {
  const dark = info.project.name.includes("dark");
  const { editor, external } = await setup(page, dark, [amstel]);
  await editor
    .locator(".choice")
    .filter({ hasText: "Amsterdam Amstel" })
    .click();
  await expect(editor.getByRole("alert")).toContainText(
    dark ? "1 tot 12" : "1 to 12",
  );
  await expect(editor.locator('input[type="checkbox"]:checked')).toHaveCount(0);
  expect(await page.evaluate(() => window.demo.configChanges)).toEqual([]);
  await page.evaluate(() => {
    const { editor, ha } = window.demo;
    editor!.setConfig({
      destinations: ['Stop "A"'],
      lines: ["X1, X2"],
      max_departures: 7,
      max_routes: 3,
      display_mode: "grouped",
      language: ha.locale!.language === "nl" ? "nl" : "en",
      entities: ["sensor.amsterdam_departures"],
      type: "custom:ovapi-departures-card",
    });
    editor!.hass = { ...ha };
  });
  await expect(editor.locator('input[type="checkbox"]:checked')).toHaveCount(0);
  await expect(editor.getByRole("alert")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await editor.screenshot({ path: info.outputPath("empty-favourites.png") });
  await editor.getByLabel("Amsterdam Centraal", { exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(editor.getByRole("alert")).toHaveCount(0);
  await expect(
    editor.getByLabel("Amsterdam Amstel", { exact: true }),
  ).not.toBeChecked();
  await expect(
    editor.getByLabel("Amsterdam Centraal", { exact: true }),
  ).toBeChecked();
  expect(
    await page.evaluate(() => window.demo.configChanges.map((c) => c.entities)),
  ).toEqual([[centraal]]);
  expect(external).toEqual([]);
});

test("rapid native label clicks before a render use the latest intended selection", async ({
  page,
}, info) => {
  const { editor } = await setup(page, info.project.name.includes("dark"), [
    amstel,
  ]);
  await editor.evaluate((el) => {
    const labels = [
      ...el.shadowRoot!.querySelectorAll<HTMLLabelElement>("label.choice"),
    ];
    for (const name of [
      "Amsterdam Centraal",
      "Amsterdam Zuid",
      "Amsterdam Amstel",
    ]) {
      labels.find((label) => label.textContent!.includes(name))!.click();
    }
  });
  await expect(
    editor.getByLabel("Amsterdam Amstel", { exact: true }),
  ).not.toBeChecked();
  await expect(
    editor.getByLabel("Amsterdam Centraal", { exact: true }),
  ).toBeChecked();
  await expect(
    editor.getByLabel("Amsterdam Zuid", { exact: true }),
  ).toBeChecked();
  expect(
    await page.evaluate(() => window.demo.configChanges.map((c) => c.entities)),
  ).toEqual([
    [amstel, centraal],
    [amstel, centraal, zuid],
    [centraal, zuid],
  ]);
});

test("thirteenth favourite is rejected visibly; missing/unavailable favourites remain removable", async ({
  page,
}, info) => {
  const dark = info.project.name.includes("dark");
  const { editor } = await setup(page, dark);
  await page.evaluate(() => {
    const { ha, editor } = window.demo;
    const entities = Array.from({ length: 10 }, (_, i) => `sensor.limit_${i}`);
    for (const entity of entities) {
      ha.states[entity] = {
        state: "ready",
        attributes: { contract_version: 1, board_id: entity },
      };
    }
    ha.states["sensor.unavailable"] = { state: "unavailable", attributes: {} };
    editor!.hass = ha;
    editor!.setConfig({
      type: "custom:ovapi-departures-card",
      entities: ["sensor.missing", "sensor.unavailable", ...entities],
      language: "auto",
    });
  });
  await expect(editor.locator('input[type="checkbox"]:checked')).toHaveCount(
    12,
  );
  const candidate = editor.getByLabel("Amsterdam Centraal", { exact: true });
  await candidate.focus();
  await page.keyboard.press("Space");
  await expect(candidate).not.toBeChecked();
  await expect(candidate).toBeFocused();
  await expect(editor.getByRole("alert")).toContainText(
    dark ? "1 tot 12" : "1 to 12",
  );
  expect(await page.evaluate(() => window.demo.configChanges)).toEqual([]);
  await editor.locator(".choice").filter({ hasText: "sensor.missing" }).click();
  await expect(
    editor.getByLabel("sensor.missing", { exact: true }),
  ).toHaveCount(0);
  await expect(editor.getByRole("alert")).toHaveCount(0);
  await candidate.check();
  await expect(editor.locator('input[type="checkbox"]:checked')).toHaveCount(
    12,
  );
  await editor
    .locator(".choice")
    .filter({ hasText: "sensor.unavailable" })
    .click();
  await expect(
    editor.getByLabel("sensor.unavailable", { exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => window.demo.configChanges.at(-1)?.entities),
  ).toEqual([
    ...Array.from({ length: 10 }, (_, i) => `sensor.limit_${i}`),
    centraal,
  ]);
});
