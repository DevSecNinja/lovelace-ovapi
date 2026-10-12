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
