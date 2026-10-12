import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("station coverage: all presentations, EN/NL, themes, expiry and no requests", async ({
  page,
}, info) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173"))
      external.push(request.url());
  });
  await page.clock.install();
  const dark = info.project.name.includes("dark");
  for (const language of ["en", "nl"]) {
    for (const grouped of [false, true]) {
      await page.goto(
        `/tests/harness/?coverage&theme=${dark ? "dark" : "light"}&language=${language}${grouped ? "&grouped" : ""}`,
      );
      const cards = page.locator("ovapi-departures-card, ovapi-commute-card");
      await expect(cards.locator(".coverage")).toHaveCount(4);
      for (const card of await cards.all()) {
        await expect(card.locator(".coverage").first()).toContainText(
          language === "en"
            ? "3 of 4 platforms verified"
            : "3 van 4 perrons geverifieerd",
        );
        await expect(card.locator(".departure, .leave")).toHaveCount(0);
        expect(
          await card.evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
        expect(
          await card
            .locator(".coverage")
            .evaluateAll((items) =>
              items.every((item) => item.scrollWidth <= item.clientWidth),
            ),
        ).toBe(true);
      }
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      if (grouped)
        await page.screenshot({
          path: info.outputPath(`coverage-${language}.png`),
          fullPage: true,
        });
      const calls = await page.evaluate(() => window.demo.connection.calls);
      for (const [state, expected] of [
        [
          "unavailable",
          language === "en"
            ? "Station coverage unknown"
            : "Stationsdekking onbekend",
        ],
        [
          "zero",
          language === "en"
            ? "No station platforms match"
            : "Geen stationsperrons",
        ],
        [
          "stale",
          language === "en"
            ? "Station coverage update failed"
            : "Bijwerken van stationsdekking mislukt",
        ],
      ] as const) {
        await page.evaluate((value) => window.demo.station(value), state);
        await expect(cards.locator(".coverage").first()).toContainText(
          expected,
        );
        await expect(page.locator("ovapi-commute-card .leave")).toHaveCount(0);
      }
      await page.evaluate(() => window.demo.station("complete"));
      await expect(cards.locator(".coverage")).toHaveCount(0);
      await expect(page.locator("ovapi-commute-card .leave")).toHaveCount(2);
      await page.evaluate(() => window.demo.station("expiring"));
      await page.clock.fastForward(1001);
      await expect(cards.locator(".coverage").first()).toContainText(
        language === "en"
          ? "Station coverage information expired"
          : "Informatie over stationsdekking verlopen",
      );
      await expect(cards.locator(".departure, .leave")).toHaveCount(0);
      expect(await page.evaluate(() => window.demo.connection.calls)).toBe(
        calls,
      );
      await page.evaluate(() => window.demo.connection.fire("disconnected"));
      await expect(cards.locator(".coverage")).toHaveCount(0);
      expect(
        await page.evaluate(() => [localStorage.length, sessionStorage.length]),
      ).toEqual([0, 0]);
    }
  }
  expect(external).toEqual([]);
});
