import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";

const hacs = JSON.parse(readFileSync("hacs.json", "utf8"));
assert.equal(hacs.filename, "lovelace-ovapi.js");
const bundle = readFileSync(`dist/${hacs.filename}`, "utf8");
assert.ok(
  gzipSync(bundle).length < 100 * 1024,
  "Bundle must remain below 100 KiB gzip",
);
for (const element of [
  "ovapi-departures-card",
  "ovapi-commute-card",
  "ovapi-card-editor",
]) {
  assert.ok(bundle.includes(element), `${element} missing`);
}
assert.ok(
  !/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\b/.test(bundle),
  "No network polling or persistent storage",
);
assert.ok(
  !/from\s*["'](?:https?:|lit)/.test(bundle),
  "No external runtime imports",
);
console.log(`HACS bundle verified: ${gzipSync(bundle).length} bytes gzip`);
