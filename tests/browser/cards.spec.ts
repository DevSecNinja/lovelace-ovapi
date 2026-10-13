import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("production resource: native registration, themes, dimensions, a11y and screenshot", async ({
  page,
}, info) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173"))
      external.push(request.url());
  });
  const dark = info.project.name.includes("dark");
  await page.goto(
    `/tests/harness/?theme=${dark ? "dark" : "light"}&language=${dark ? "nl" : "en"}`,
  );
  await expect(page.locator("ovapi-departures-card h3")).toHaveCount(2);
  await expect(page.locator("ovapi-departures-card li")).toHaveCount(8);
  await expect(page.locator("ovapi-commute-card .leave").first()).toContainText(
    dark ? "Vertrek over" : "Leave in",
  );
  expect(
    await page.evaluate(() => window.customCards?.map((c) => c.type)),
  ).toEqual(["ovapi-departures-card", "ovapi-commute-card"]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath(`${info.project.name}.png`),
    fullPage: true,
  });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  expect(external).toEqual([]);
  expect(await page.evaluate(() => window.demo.connection.calls)).toBe(2);
});

test("offline countdown, status replacement, expiry and cleanup", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/tests/harness/");
  await expect(page.locator("ovapi-departures-card li")).toHaveCount(8);
  const calls = await page.evaluate(() => window.demo.connection.calls);
  await page.clock.fastForward(60_000);
  expect(await page.evaluate(() => window.demo.connection.calls)).toBe(calls);
  await page.evaluate(() => window.demo.emit("stale"));
  await expect(page.locator("ovapi-commute-card .leave")).toHaveCount(0);
  await expect(
    page.locator("ovapi-departures-card .warning").first(),
  ).toContainText("Update failed");
  await page.evaluate(() => window.demo.empty());
  await expect(page.locator("ovapi-departures-card")).toContainText(
    "No upcoming departures",
  );
  await page.evaluate(() => window.demo.expireSoon());
  await page.clock.fastForward(1001);
  await expect(page.locator("ovapi-departures-card")).toContainText("expired");
  await expect(page.locator("ovapi-departures-card")).not.toContainText(
    "Museumkwartier",
  );
  await page.evaluate(() => window.demo.connection.fire("disconnected"));
  await expect(page.locator("ovapi-departures-card")).toContainText(
    "Disconnected",
  );
  await page.evaluate(() => window.demo.remove());
  expect(
    await page.evaluate(() => window.demo.connection.unsubscriptions),
  ).toBe(2);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
});

test("configuration editor is keyboard accessible with visible focus", async ({
  page,
}, info) => {
  await page.goto(
    `/tests/harness/?editor&theme=${info.project.name.includes("dark") ? "dark" : "light"}`,
  );
  const editor = page.locator("ovapi-card-editor");
  await expect(editor.getByLabel("Amsterdam Amstel")).toBeChecked();
  await page.keyboard.press("Tab");
  await expect(editor.getByLabel("Amsterdam Amstel")).toBeFocused();
  const focus = await editor
    .getByLabel("Amsterdam Amstel")
    .evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(focus).not.toBe("none");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await expect(editor.getByLabel("Amsterdam Centraal")).toBeChecked();
  await editor
    .getByLabel("Time display", { exact: true })
    .selectOption("leave");
  await editor.getByLabel("Walking minutes", { exact: false }).fill("9");
  await editor.getByLabel("Title", { exact: true }).fill("Morning commute");
  await editor
    .getByRole("button", { name: "Add Destinations", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    editor.getByLabel("Destinations 1", { exact: true }),
  ).toBeFocused();
  await page.keyboard.type("Station, west");
  await page.keyboard.press("Tab");
  await expect(
    editor.getByLabel("Destinations 1", { exact: true }),
  ).toHaveValue("Station, west");
  await editor.getByRole("button", { name: "Add Lines", exact: true }).click();
  await editor.getByLabel("Lines 1", { exact: true }).fill("X1, X2");
  await page.keyboard.press("Tab");
  await expect(editor.getByLabel("Lines 1", { exact: true })).toHaveValue(
    "X1, X2",
  );
  await expect(
    editor.getByRole("button", { name: "Remove Lines 1", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(editor.getByLabel("Lines 1", { exact: true })).toHaveCount(0);
  await editor.getByLabel("Language", { exact: true }).selectOption("nl");
  await expect(editor).toContainText("Favoriete OVAPI-sensoren");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await editor.screenshot({ path: info.outputPath("editor.png") });
});

test("grouped production rows: next routes, bounded times, cancellation, themes and accessibility", async ({
  page,
}, info) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173"))
      external.push(request.url());
  });
  await page.clock.install({ time: new Date("2030-01-15T12:00:00Z") });
  await page.clock.setFixedTime(new Date("2030-01-15T12:00:00Z"));
  const dark = info.project.name.includes("dark");
  await page.goto(
    `/tests/harness/?grouped&theme=${dark ? "dark" : "light"}&language=${dark ? "nl" : "en"}`,
  );
  const card = page.locator("ovapi-departures-card");
  await expect(card.locator("li")).toHaveCount(6);
  await expect(card.locator(".destination").first()).toHaveText("Isolatorweg");
  await expect(card.locator(".time strong").first()).toHaveText("2 min");
  await expect(card.locator(".following").first()).toHaveText(
    `${dark ? "Ook over" : "Also in"} 8, 14, 20 min`,
  );
  await expect(card.locator(".cancellations").first()).toContainText(
    dark ? "Vervallen" : "Cancelled",
  );
  await expect(card.locator(".cancellations time").first()).toHaveText("13:01");
  await expect(card.locator(".cancellations strong")).toHaveCount(0);
  expect(await card.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  expect(
    await card
      .locator(".departure")
      .evaluateAll((rows) =>
        rows.every((row) => row.scrollWidth <= row.clientWidth),
      ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: info.outputPath("grouped.png"),
    fullPage: true,
  });
  await card.evaluate((el) => {
    el.style.width = "240px";
  });
  expect(
    await card
      .locator(".departure")
      .evaluateAll((rows) =>
        rows.every((row) => row.scrollWidth <= row.clientWidth),
      ),
  ).toBe(true);
  await card.evaluate((el) => {
    el.style.removeProperty("width");
  });
  const calls = await page.evaluate(() => window.demo.connection.calls);
  expect(calls).toBe(2);
  await page.clock.setFixedTime(new Date("2030-01-15T12:00:01Z"));
  await page.clock.fastForward(1000);
  await expect(card.locator(".following").first()).toHaveText(
    `${dark ? "Ook over" : "Also in"} 7, 13, 19 min`,
  );
  await page.clock.setFixedTime(new Date("2030-01-15T12:02:00Z"));
  await page.clock.fastForward(119_000);
  await expect(card.locator(".destination").first()).toHaveText("Gein");
  await expect(card.locator("li")).toHaveCount(6);
  expect(await page.evaluate(() => window.demo.connection.calls)).toBe(calls);
  await page.evaluate(() => window.demo.emit("stale"));
  await expect(card.locator(".warning").first()).toBeVisible();
  await expect(page.locator("ovapi-commute-card .leave")).toHaveCount(0);
  await page.evaluate(() => window.demo.expireSoon());
  await page.clock.setFixedTime(new Date("2030-01-15T12:02:01Z"));
  await page.clock.fastForward(1000);
  await expect(card.locator("li")).toHaveCount(0);
  await expect(card).not.toContainText("Isolatorweg");
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(external).toEqual([]);
});

test("grouped editor round-trip with keyboard mode/limit controls and legacy limit preservation", async ({
  page,
}, info) => {
  await page.goto(
    `/tests/harness/?grouped&editor&theme=${info.project.name.includes("dark") ? "dark" : "light"}`,
  );
  const editor = page.locator("ovapi-card-editor");
  const mode = editor.getByLabel("Departure display", { exact: true });
  const limit = editor.getByLabel("Maximum route rows per favourite", {
    exact: true,
  });
  await expect(mode).toHaveValue("grouped");
  await mode.focus();
  await page.keyboard.press("Tab");
  await expect(limit).toBeFocused();
  expect(
    await limit.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Tab");
  await expect(limit).toHaveValue("2");
  expect(await page.evaluate(() => window.demo.config)).toMatchObject({
    display_mode: "grouped",
    max_routes: 2,
    max_departures: 4,
  });
  await expect(page.locator("ovapi-departures-card li")).toHaveCount(2);
  await mode.selectOption("departures");
  await expect(
    editor.getByLabel("Maximum departures per stop", { exact: true }),
  ).toHaveValue("4");
  await expect(page.locator("ovapi-departures-card li")).toHaveCount(4);
  await mode.selectOption("grouped");
  await expect(limit).toHaveValue("2");
  await expect(page.locator("ovapi-departures-card li")).toHaveCount(2);
  await limit.fill("0");
  await page.keyboard.press("Tab");
  await expect(editor.getByRole("alert")).toContainText("max_routes");
  await limit.fill("3");
  await page.keyboard.press("Tab");
  await expect(editor.getByRole("alert")).toHaveCount(0);
  await editor.getByLabel("Language", { exact: true }).selectOption("nl");
  await expect(editor).toContainText("lijn + bestemming");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await editor.screenshot({ path: info.outputPath("grouped-editor.png") });
});
