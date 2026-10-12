import { readFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const {
  url,
  access_token: token,
  refresh_token: refreshToken,
  station_entities: stationEntities = {},
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
async function stableLayout() {
  await page.locator("#ha-launch-screen").waitFor({ state: "detached" });
  await page
    .locator("ovapi-departures-card, ovapi-commute-card")
    .evaluateAll(async (cards) => {
      await document.fonts.ready;
      let previous = "";
      let stable = 0;
      for (let frame = 0; frame < 120; frame++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const layout = JSON.stringify([
          document.documentElement.scrollWidth,
          document.documentElement.scrollHeight,
          ...cards.map((card) => card.getBoundingClientRect().toJSON()),
        ]);
        stable = layout === previous ? stable + 1 : 0;
        if (stable === 2) return;
        previous = layout;
      }
      throw new Error("Actual HA card layout did not stabilize");
    });
}
try {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  for (const [name, lines] of [
    ["Amsterdam Amstel (synthetic)", ""],
    ["Amstel tram (synthetic)", "X1"],
    ["Amstel bus (synthetic)", "X2"],
  ]) {
    const start = await context.request.post(
      `${url}/api/config/config_entries/flow`,
      { headers, data: { handler: "ovapi", show_advanced_options: false } },
    );
    assert.equal(start.status(), 200);
    let form = await start.json();
    const flowUrl = `${url}/api/config/config_entries/flow/${form.flow_id}`;
    if (form.type === "menu") {
      const manual = await context.request.post(flowUrl, {
        headers,
        data: { next_step_id: "manual" },
      });
      assert.equal(manual.status(), 200);
      form = await manual.json();
    }
    assert.equal(form.type, "form");
    const setup = await context.request.post(flowUrl, {
      headers,
      data: {
        name,
        stop_id: "01234567",
        lines,
        walking_minutes: 5,
      },
    });
    assert.equal(setup.status(), 200);
    let result = await setup.json();
    for (let i = 0; i < 100 && result.type === "progress"; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const progress = await context.request.post(flowUrl, {
        headers,
        data: {},
      });
      assert.equal(progress.status(), 200);
      result = await progress.json();
    }
    assert.equal(result.type, "create_entry");
  }
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
  const result = await page.evaluate(async (stationIds) => {
    const hass = document.querySelector("home-assistant").hass;
    const wait = () => new Promise((resolve) => setTimeout(resolve, 100));
    let entities = [];
    for (let i = 0; i < 100; i++) {
      entities = Object.values(
        document.querySelector("home-assistant").hass.states,
      )
        .filter(
          (state) =>
            state.attributes.contract_version === 1 &&
            state.attributes.board_id &&
            !stationIds.includes(state.entity_id),
        )
        .map((state) => state.entity_id);
      if (entities.length === 3) break;
      await wait();
    }
    if (entities.length !== 3)
      throw new Error("Three actual OVAPI sensors did not appear");
    const [entity] = entities;
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
              {
                type: "custom:ovapi-departures-card",
                entities: [entity],
                display_mode: "grouped",
                max_routes: 3,
                max_departures: 7,
              },
              { type: "custom:ovapi-commute-card", entities: [entity] },
            ],
          },
        ],
      },
    });
    return {
      entity,
      entities,
      snapshot,
      attributes: hass.states[entity].attributes,
    };
  }, Object.values(stationEntities));
  assert.equal(result.snapshot.contract_version, 1);
  assert.ok(!("coverage" in result.snapshot), "Legacy point omits coverage");
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
  await stableLayout();
  mkdirSync(".ha-e2e/evidence", { recursive: true });
  await page.screenshot({
    path: ".ha-e2e/evidence/actual-ha-tablet.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await stableLayout();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: ".ha-e2e/evidence/actual-ha-phone.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(`${url}/ovapi-e2e/departures`);
  await page.getByRole("button", { name: /^Edit dashboard/ }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  const editor = page.locator("ovapi-card-editor");
  await expect(editor.locator('[type="checkbox"]')).toHaveCount(
    3 + Object.keys(stationEntities).length,
  );
  await editor.evaluate((el) => {
    el.selectionEvidence = { changes: [], echoes: [] };
    const setConfig = el.setConfig.bind(el);
    el.setConfig = (config) => {
      el.selectionEvidence.echoes.push([...config.entities]);
      setConfig(config);
    };
    el.addEventListener("config-changed", (event) => {
      el.selectionEvidence.changes.push([...event.detail.config.entities]);
    });
  });
  const [first, second, third] = result.entities;
  const checkbox = (entity) => editor.locator(`input[value="${entity}"]`);
  const order = await editor.locator(".choice").allTextContents();
  const firstNode = await checkbox(first).elementHandle();
  await checkbox(second).locator("..").click();
  await page.keyboard.press("Space");
  await expect(checkbox(second)).not.toBeChecked();
  await expect(checkbox(second)).toBeFocused();
  await page.keyboard.press("Space");
  await checkbox(third).locator("..").click();
  await checkbox(first).locator("..").click();
  await expect(checkbox(second)).toBeChecked();
  await expect(checkbox(third)).toBeChecked();
  assert.equal(await firstNode.evaluate((el) => el.value), first);
  assert.deepEqual(await editor.locator(".choice").allTextContents(), order);
  await checkbox(second).locator("..").click();
  await checkbox(third).locator("..").click();
  await expect(editor.locator('[type="checkbox"]:checked')).toHaveCount(0);
  await expect(editor.getByRole("alert")).toContainText("1 to 12");
  const changes = [
    [first, second],
    [first],
    [first, second],
    [first, second, third],
    [second, third],
    [third],
  ];
  await expect
    .poll(() => editor.evaluate((el) => el.selectionEvidence.changes))
    .toEqual(changes);
  await expect
    .poll(() => editor.evaluate((el) => el.selectionEvidence.echoes.length))
    .toBeGreaterThan(0);
  await page.screenshot({
    path: ".ha-e2e/evidence/actual-ha-editor-tablet.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: ".ha-e2e/evidence/actual-ha-editor-phone.png",
    fullPage: false,
  });
  await checkbox(second).focus();
  await page.keyboard.press("Space");
  await expect(editor.getByRole("alert")).toHaveCount(0);
  await expect(checkbox(second)).toBeChecked();
  assert.deepEqual(
    await editor.evaluate((el) => el.selectionEvidence.changes),
    [...changes, [second]],
  );
  const echoes = await editor.evaluate(
    (el) => el.selectionEvidence.echoes.length,
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  const saved = await page.evaluate(async () => {
    const hass = document.querySelector("home-assistant").hass;
    return hass.callWS({ type: "lovelace/config", url_path: "ovapi-e2e" });
  });
  assert.deepEqual(saved.views[0].cards[0], {
    type: "custom:ovapi-departures-card",
    entities: [second],
    display_mode: "grouped",
    max_routes: 3,
    max_departures: 7,
  });
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await expect(checkbox(first)).not.toBeChecked();
  await expect(checkbox(second)).toBeChecked();
  await expect(checkbox(third)).not.toBeChecked();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  if (Object.keys(stationEntities).length) {
    const stationBoards = await page.evaluate(async (entities) => {
      const hass = document.querySelector("home-assistant").hass;
      const snapshots = {};
      for (const [key, entity] of Object.entries(entities)) {
        snapshots[key] = await new Promise((resolve, reject) => {
          let unsubscribe;
          const timer = setTimeout(
            () => reject(new Error("No station WebSocket event")),
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
        if ("departures" in hass.states[entity].attributes)
          throw new Error("Source departures retained in HA state");
      }
      const saved = await hass.callWS({
        type: "lovelace/config",
        url_path: "ovapi-e2e",
      });
      saved.views.push({
        title: "Station coverage",
        path: "stations",
        cards: [
          {
            type: "custom:ovapi-departures-card",
            entities: Object.values(entities),
          },
          {
            type: "custom:ovapi-departures-card",
            entities: Object.values(entities),
            display_mode: "grouped",
          },
          {
            type: "custom:ovapi-commute-card",
            entities: Object.values(entities),
          },
        ],
      });
      await hass.callWS({
        type: "lovelace/config/save",
        url_path: "ovapi-e2e",
        config: saved,
      });
      return snapshots;
    }, stationEntities);
    const { partial, complete, zero } = stationBoards;
    assert.equal(partial.coverage.status, "partial");
    assert.equal(partial.coverage.selected_members, 2);
    assert.equal(partial.coverage.verified_members, 1);
    assert.equal(partial.coverage.missing_members, 1);
    for (const unavailable of [partial, zero]) {
      assert.equal(unavailable.status, "unavailable");
      assert.equal(unavailable.fetched_at, null);
      assert.equal(unavailable.expires_at, null);
      assert.deepEqual(unavailable.departures, []);
    }
    assert.equal(complete.status, "ready");
    assert.equal(complete.coverage.status, "complete");
    assert.equal(complete.coverage.selected_members, 1);
    assert.equal(complete.coverage.verified_members, 1);
    assert.equal(complete.coverage.missing_members, 0);
    assert.equal(zero.coverage.status, "complete");
    assert.equal(zero.coverage.selected_members, 0);
    assert.equal(zero.coverage.verified_members, 0);
    assert.equal(zero.coverage.missing_members, 0);
    assert.ok(
      Date.parse(zero.coverage.metadata_expires_at) -
        Date.parse(zero.coverage.metadata_fetched_at) >
        29 * 60_000,
    );
    await page.goto(`${url}/ovapi-e2e/stations`);
    const cards = page.locator("ovapi-departures-card, ovapi-commute-card");
    await expect(cards).toHaveCount(3);
    for (const card of await cards.all()) {
      const partialSection = card.locator("section").filter({
        has: page.locator("h3", { hasText: stationEntities.partial }),
      });
      const zeroSection = card
        .locator("section")
        .filter({ has: page.locator("h3", { hasText: stationEntities.zero }) });
      await expect(partialSection.locator(".coverage")).toContainText(
        /1 of 2 platforms verified|1 van 2 perrons geverifieerd/,
      );
      await expect(zeroSection.locator(".coverage")).toContainText(
        /No station platforms match|Geen stationsperrons/,
      );
      await expect(partialSection.locator(".departure, .leave")).toHaveCount(0);
      await expect(zeroSection.locator(".departure, .leave")).toHaveCount(0);
      await expect(card.locator(".error")).toHaveCount(0);
    }
    await expect(page.locator("ovapi-commute-card .leave")).toHaveCount(1);
    for (const [name, width, height] of [
      ["tablet", 1024, 900],
      ["phone", 390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await stableLayout();
      assert.deepEqual(
        await page.evaluate(() => [
          document.documentElement.clientWidth,
          document.documentElement.clientHeight,
        ]),
        [width, height],
      );
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: `.ha-e2e/evidence/actual-ha-station-${name}.png`,
        fullPage: false,
      });
    }
    console.log(
      "PASS actual HA station HTTP parsing -> config entries -> sensors -> WS -> three card presentations: partial fail-closed, metro excludes missing bus, zero selected; legacy single points unchanged",
    );
  }
  assert.deepEqual(upstream, []);
  console.log(
    "PASS actual HA: config flow -> sensor -> authenticated WS v1 -> registered Lovelace resource -> both rendered cards",
  );
  console.log(
    "PASS synthetic incomplete/cancelled data, walking time, no departures in entity attributes, no browser upstream calls",
  );
  console.log(
    `PASS actual HA Lovelace editor: three sensors, native label/Space toggles, ${echoes} host setConfig echoes, empty draft, valid replacement, Save/storage/reopen and unchanged grouped limits`,
  );
} finally {
  await browser.close();
}
