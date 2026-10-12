import { expect, it, vi } from "vitest";

it("registers one set of custom elements and picker entries across repeated imports", async () => {
  await import("../../src/index");
  const original = customElements.get("ovapi-departures-card");
  vi.resetModules();
  await import("../../src/index");
  expect(customElements.get("ovapi-departures-card")).toBe(original);
  expect(
    window.customCards?.filter((card) => card.type === "ovapi-departures-card"),
  ).toHaveLength(1);
});
