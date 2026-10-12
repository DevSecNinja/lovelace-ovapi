import { readFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const {
  url,
  access_token: token,
  refresh_token: refreshToken,
} = JSON.parse(readFileSync(".ha-e2e/connection.json", "utf8"));
assert.equal(new URL(url).hostname, "127.0.0.1");
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1024, height: 900 },
});
const page = await context.newPage();
const upstream = [];
page.on("request", (request) => {
  if (request.url().includes("ovapi.nl")) upstream.push(request.url());
});
try {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const start = await context.request.post(
    `${url}/api/config/config_entries/flow`,
    { headers, data: { handler: "ovapi", show_advanced_options: false } },
  );
  assert.equal(start.status(), 200);
  const form = await start.json();
  assert.equal(form.type, "form");
  const setup = await context.request.post(
    `${url}/api/config/config_entries/flow/${form.flow_id}`,
    {
      headers,
      data: {
        name: "Amsterdam Amstel (synthetic)",
        stop_id: "01234567",
        walking_minutes: 5,
      },
    },
  );
  assert.equal(setup.status(), 200);
  assert.equal((await setup.json()).type, "create_entry");
  await page.addInitScript(
    ({ accessToken, refreshToken, url }) => {
      localStorage.setItem(
        "hassTokens",
        JSON.stringify({
          hassUrl: url,
          clientId: `${url}/`,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "Bearer",
          expires_in: 1800,
          expires: Date.now() + 1800_000,
        }),
      );
    },
    { accessToken: token, refreshToken, url },
  );
  await page.goto(url);
  await page.waitForFunction(
    () => document.querySelector("home-assistant")?.hass?.connection?.connected,
    undefined,
    { timeout: 60_000 },
  );
  // The isolated non-default port triggers HA's own HTTP safety confirmation.
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  const result = await page.evaluate(async () => {
    const hass = document.querySelector("home-assistant").hass;
    const wait = () => new Promise((resolve) => setTimeout(resolve, 100));
    let entity;
    for (let i = 0; i < 100; i++) {
      entity = Object.values(
        document.querySelector("home-assistant").hass.states,
      ).find(
        (state) =>
          state.attributes.contract_version === 1 && state.attributes.board_id,
      )?.entity_id;
      if (entity) break;
      await wait();
    }
    if (!entity) throw new Error("Actual OVAPI sensor did not appear");
    const snapshot = await new Promise((resolve, reject) => {
      let unsubscribe;
      const timer = setTimeout(
        () => reject(new Error("No actual HA board event")),
        10_000,
      );
      hass.connection
        .subscribeMessage(
          (value) => {
            clearTimeout(timer);
            resolve(value);
            if (unsubscribe) void unsubscribe();
            else setTimeout(() => unsubscribe?.(), 0);
          },
          { type: "ovapi/subscribe", entity_id: entity },
        )
        .then((stop) => {
          unsubscribe = stop;
        }, reject);
    });
    await hass.callWS({
      type: "lovelace/resources/create",
      res_type: "module",
      url: "/local/lovelace-ovapi.js",
    });
    await hass.callWS({
      type: "lovelace/dashboards/create",
      url_path: "ovapi-e2e",
      title: "Synthetic OVAPI",
      mode: "storage",
      show_in_sidebar: true,
      require_admin: false,
    });
    await hass.callWS({
      type: "lovelace/config/save",
      url_path: "ovapi-e2e",
      config: {
        title: "Synthetic OVAPI E2E",
        views: [
          {
            title: "Departures",
            path: "departures",
            cards: [
              { type: "custom:ovapi-departures-card", entities: [entity] },
              { type: "custom:ovapi-commute-card", entities: [entity] },
            ],
          },
        ],
      },
    });
    return { entity, snapshot, attributes: hass.states[entity].attributes };
  });
  assert.equal(result.snapshot.contract_version, 1);
  assert.equal(result.snapshot.status, "ready");
  assert.equal(result.snapshot.walking_minutes, 5);
  assert.equal(
    result.snapshot.departures.length,
    2,
    "Incomplete upstream metadata is omitted",
  );
  assert.equal(result.snapshot.departures[0].line, "X1");
  assert.equal(result.snapshot.departures[1].cancelled, true);
  assert.ok(
    !("departures" in result.attributes),
    "Source data must not reach entity attributes",
  );
  await page.goto(`${url}/ovapi-e2e/departures`);
  await page.locator("ovapi-departures-card").waitFor({ timeout: 60_000 });
  await page
    .getByText("Synthetic destination", { exact: true })
    .first()
    .waitFor();
  assert.equal(await page.locator("ovapi-departures-card li").count(), 2);
  assert.match(
    await page.locator("ovapi-commute-card .leave").innerText(),
    /Leave in|Vertrek over/,
  );
  assert.match(
    await page.locator("ovapi-departures-card .cancelled-label").innerText(),
    /Cancelled|Vervallen/,
  );
  await page
    .getByText("Loading...", { exact: true })
    .waitFor({ state: "hidden" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  mkdirSync(".ha-e2e/evidence", { recursive: true });
  await page.screenshot({
    path: ".ha-e2e/evidence/actual-ha-tablet.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: ".ha-e2e/evidence/actual-ha-phone.png",
    fullPage: true,
  });
  assert.deepEqual(upstream, []);
  console.log(
    "PASS actual HA: config flow -> sensor -> authenticated WS v1 -> registered Lovelace resource -> both rendered cards",
  );
  console.log(
    "PASS synthetic incomplete/cancelled data, walking time, no departures in entity attributes, no browser upstream calls",
  );
} finally {
  await browser.close();
}
