import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function ready(page: Page) {
  await expect(page.locator("#ha-launch-screen")).toHaveCount(0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    let previous = "";
    let stable = 0;
    for (let frame = 0; frame < 120; frame++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const geometry = JSON.stringify(
        [
          ...document.querySelectorAll(
            "ovapi-departures-card, ovapi-commute-card, ovapi-card-editor",
          ),
        ].map((card) => {
          const { x, y, width, height } = card.getBoundingClientRect();
          return [x, y, width, height];
        }),
      );
      stable = geometry === previous ? stable + 1 : 0;
      if (stable >= 3) return;
      previous = geometry;
    }
    throw new Error("Card geometry did not stabilize");
  });
}

test("walking-aware grouped production rows: separate routes, exact leave times, themes, narrow widths and no requests", async ({
  page,
}, info) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173"))
      external.push(request.url());
  });
  const start = new Date("2030-01-15T12:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.setFixedTime(start);
  const dark = info.project.name.includes("dark");
  await page.goto(
    `/tests/harness/?grouped&leave&theme=${dark ? "dark" : "light"}&language=${dark ? "nl" : "en"}`,
  );
  const card = page.locator("ovapi-departures-card");
  const first = card.locator("section").first();
  await expect(card.locator(".leave-mode")).toHaveCount(6);
  await expect(first.locator(".destination")).toHaveText([
    "Isolatorweg",
    "Gein",
    "Isolatorweg",
  ]);
  await expect(first.locator(".leave-time strong")).toHaveText([
    "1 min",
    "2 min",
    "3 min",
  ]);
  await expect(first.locator(".following").first()).toHaveText(
    `${dark ? "Vertrek ook over" : "Also leave in"} 7, 13, 19 min`,
  );
  await expect(first.locator(".following time").first()).toHaveAttribute(
    "datetime",
    "2030-01-15T12:07:00.000Z",
  );
  await expect(first.locator(".following time").first()).toHaveAttribute(
    "aria-label",
    new RegExp(dark ? "Vertrek ook over 7 min" : "Also leave in 7 min"),
  );
  await expect(first.locator(".walking")).toHaveText(
    `7 min ${dark ? "lopen" : "walk"}`,
  );
  await expect(first.locator(".departure-clock").first()).toHaveText(
    `${dark ? "Vertrek" : "Departs"} 13:08`,
  );
  await expect(card.locator("section").nth(1).locator(".walking")).toHaveText(
    `0 min ${dark ? "lopen" : "walk"}`,
  );
  await expect(
    card.locator("section").nth(1).locator(".leave-time strong").first(),
  ).toHaveText("2 min");
  await expect(card.locator(".cancellations")).toHaveCount(0);
  await ready(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await card
      .locator(".departure")
      .evaluateAll((rows) =>
        rows.every((row) => row.scrollWidth <= row.clientWidth),
      ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("leave-routes.png"),
    fullPage: true,
  });
  await card.evaluate((el) => {
    el.style.width = "240px";
  });
  await ready(page);
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
  await ready(page);
  const calls = await page.evaluate(() => window.demo.connection.calls);
  expect(calls).toBe(2);
  await page.clock.setFixedTime(new Date("2030-01-15T12:01:00Z"));
  await page.clock.fastForward(1000);
  await expect(first.locator(".leave-time").first()).toHaveText(
    dark ? "Vertrek nu" : "Leave now",
  );
  await page.clock.setFixedTime(new Date("2030-01-15T12:01:01Z"));
  await page.clock.fastForward(1000);
  await expect(first.locator(".destination").first()).toHaveText("Gein");
  await expect(first.locator(".leave-time strong").first()).toHaveText(
    dark ? "Vertrek nu" : "Leave now",
  );
  expect(await page.evaluate(() => window.demo.connection.calls)).toBe(calls);
  await page.evaluate(() => window.demo.emit("stale"));
  await expect(card.locator(".leave-time")).toHaveCount(0);
  await expect(card.locator(".following")).toHaveCount(0);
  await expect(first.locator(".warning")).toBeVisible();
  await page.evaluate(() => window.demo.expireSoon());
  await expect(card.locator(".leave-time").first()).toBeVisible();
  await page.clock.setFixedTime(new Date("2030-01-15T12:01:02Z"));
  await page.clock.fastForward(1000);
  await expect(card.locator(".leave-time")).toHaveCount(0);
  await expect(card).not.toContainText("Isolatorweg");
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(external).toEqual([]);
});

test("time display is orthogonal to rows; walking override/clear/zero and defaults round-trip", async ({
  page,
}, info) => {
  const start = new Date("2030-01-15T12:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.setFixedTime(start);
  const dark = info.project.name.includes("dark");
  await page.goto(
    `/tests/harness/?grouped&leave&editor&theme=${dark ? "dark" : "light"}&language=${dark ? "nl" : "en"}`,
  );
  const editor = page.locator("ovapi-card-editor");
  const card = page.locator("ovapi-departures-card");
  const timeMode = editor.locator("#time-mode");
  const walking = editor.locator("#walking");
  await expect(timeMode).toHaveValue("leave");
  await expect(walking).toHaveValue("");
  await timeMode.focus();
  await page.keyboard.press("Tab");
  await expect(walking).toBeFocused();
  expect(
    await walking.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
  const override = async (value: string, minutes: string) => {
    await walking.fill(value);
    await page.keyboard.press("Tab");
    await expect(card.locator(".leave-time strong").first()).toHaveText(
      minutes,
    );
    const config = await page.evaluate(() => window.demo.configChanges.at(-1));
    if (value === "") expect(config).not.toHaveProperty("walking_minutes");
    else expect(config?.walking_minutes).toBe(Number(value));
    await page.evaluate(() => {
      const { editor, config } = window.demo;
      editor!.setConfig(structuredClone(config));
    });
    await expect(walking).toHaveValue(value);
  };
  await override("9", dark ? "Vertrek nu" : "Leave now");
  await override("", "1 min");
  await override("0", "2 min");
  await timeMode.selectOption("departure");
  await expect(walking).toHaveCount(0);
  await expect(card.locator(".time strong").first()).toHaveText("2 min");
  await expect(card.locator(".following").first()).toHaveText(
    `${dark ? "Ook over" : "Also in"} 8, 14, 20 min`,
  );
  expect(
    await page.evaluate(
      () => window.demo.configChanges.at(-1)?.walking_minutes,
    ),
  ).toBe(0);
  await timeMode.selectOption("leave");
  await expect(walking).toHaveValue("0");
  await editor.locator("#display-mode").selectOption("departures");
  await expect(editor.locator("#maximum")).toHaveValue("4");
  await expect(card.locator(".leave-time")).toHaveCount(4);
  await expect(card.locator(".following")).toHaveCount(0);
  await editor.locator("#display-mode").selectOption("grouped");
  await expect(editor.locator("#max-routes")).toHaveValue("3");
  await expect(card.locator(".leave-time")).toHaveCount(3);
  await page.evaluate(async () => {
    const { editor, ha, config } = window.demo;
    const reopened = document.createElement("ovapi-card-editor") as NonNullable<
      typeof editor
    >;
    reopened.hass = ha;
    reopened.setConfig(structuredClone(config));
    editor!.replaceWith(reopened);
    window.demo.editor = reopened;
    await reopened.updateComplete;
  });
  await expect(timeMode).toHaveValue("leave");
  await expect(walking).toHaveValue("0");
  await ready(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await editor.screenshot({ path: info.outputPath("leave-editor.png") });
});
