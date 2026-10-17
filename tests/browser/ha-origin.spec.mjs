import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { test, expect } from "@playwright/test";
import { createHaBrowserContext } from "../../scripts/ha-browser-context.mjs";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
}

async function close(server) {
  server.closeAllConnections();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

for (const status of [301, 302, 303, 307, 308]) {
  test(`HA origin boundary blocks HTTP ${status} before contacting another loopback port`, async ({
    browser,
  }) => {
    const disallowedRequests = [];
    const disallowed = createServer((request, response) => {
      disallowedRequests.push(request.url);
      response.end("Must never be requested");
    });
    const disallowedOrigin = await listen(disallowed);
    const allowed = createServer((request, response) => {
      if (request.url === "/redirect") {
        response.writeHead(status, { Location: `${disallowedOrigin}/denied` });
        response.end();
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(
        "<!doctype html><title>Allowed</title><p>Allowed response</p>",
      );
    });
    let context;
    try {
      const allowedOrigin = await listen(allowed);
      const boundary = await createHaBrowserContext(browser, allowedOrigin);
      context = boundary.context;
      const page = await context.newPage();
      await page.goto(`${allowedOrigin}/ok`);
      await expect(page.locator("p")).toHaveText("Allowed response");
      boundary.assertNoUnexpectedRequests();

      const apiResponse = await context.request.post(
        `${allowedOrigin}/redirect`,
        {
          maxRedirects: 0,
        },
      );
      expect(apiResponse.status()).toBe(status);
      expect(disallowedRequests).toEqual([]);
      await apiResponse.dispose();

      await page.goto(`${allowedOrigin}/redirect`).catch((error) => {
        expect(error.message).toContain("ERR_BLOCKED_BY_CLIENT");
      });
      expect(disallowedRequests).toEqual([]);
      expect(boundary.unexpectedRequests).toEqual([
        { type: "redirect", origin: allowedOrigin, status },
      ]);
      expect(() => boundary.assertNoUnexpectedRequests()).toThrow(
        /HA browser attempted an unexpected origin or redirect/,
      );
    } finally {
      await context?.close();
      await Promise.all([close(allowed), close(disallowed)]);
    }
  });
}
