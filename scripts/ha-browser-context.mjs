import assert from "node:assert/strict";

/**
 * @param {import("@playwright/test").Browser} browser
 * @param {string} origin
 * @param {import("@playwright/test").BrowserContextOptions} options
 */
export async function createHaBrowserContext(browser, origin, options = {}) {
  assert.equal(new URL(origin).hostname, "127.0.0.1");
  assert.equal(new URL(origin).protocol, "http:");
  assert.equal(new URL(origin).origin, origin);
  const context = await browser.newContext({
    ...options,
    serviceWorkers: "block",
  });
  // Fulfilled documents lose Chromium's loopback address-space classification.
  await context.grantPermissions(["local-network-access"], { origin });
  const unexpectedRequests = [];
  await context.route("**/*", async (route) => {
    const requestOrigin = new URL(route.request().url()).origin;
    if (requestOrigin !== origin) {
      unexpectedRequests.push({ type: "http", origin: requestOrigin });
      await route.abort("blockedbyclient");
      return;
    }
    // Playwright does not reroute later hops of a continued redirect chain.
    const response = await route.fetch({ maxRedirects: 0 });
    try {
      const status = response.status();
      if (status >= 300 && status < 400) {
        unexpectedRequests.push({
          type: "redirect",
          origin: requestOrigin,
          status,
        });
        await route.abort("blockedbyclient");
        return;
      }
      await route.fulfill({ response });
    } finally {
      await response.dispose();
    }
  });
  await context.routeWebSocket("**/*", (socket) => {
    const requestOrigin = new URL(socket.url()).origin;
    if (requestOrigin === origin.replace("http:", "ws:")) {
      socket.connectToServer();
      return;
    }
    unexpectedRequests.push({ type: "websocket", origin: requestOrigin });
    socket.close();
  });
  return {
    context,
    unexpectedRequests,
    assertNoUnexpectedRequests() {
      assert.deepEqual(
        unexpectedRequests,
        [],
        "HA browser attempted an unexpected origin or redirect",
      );
    },
  };
}
