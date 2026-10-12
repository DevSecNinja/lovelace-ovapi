import { describe, expect, it } from "vitest";
import { clock, labels, language } from "../../src/localize";
import { hass } from "../fixtures/connection";
import { NOW } from "../fixtures/boards";

describe("locale and HA time", () => {
  it("honors explicit languages and HA locale with English fallback", () => {
    expect(language({ language: "auto" })).toBe("en");
    const ha = hass();
    ha.locale = { language: "nl-NL" };
    expect(labels({ language: "auto" }, ha).departures).toBe("Vertrektijden");
    expect(labels({ language: "en" }, ha).departures).toBe("Departures");
    delete ha.locale;
    ha.language = "nl";
    expect(language({ language: "auto" }, ha)).toBe("nl");
  });
  it("honors HA zone, 12/24 hour preferences and DST", () => {
    const ha = hass();
    expect(clock(NOW, { language: "en" }, ha)).toBe("13:00");
    ha.locale!.time_format = "12";
    expect(clock(NOW, { language: "en" }, ha)).toMatch(/01:00 PM/i);
    ha.locale!.time_format = "language";
    expect(clock("2030-03-31T01:05:00Z", { language: "nl" }, ha)).toBe("03:05");
    expect(clock(NOW, { language: "nl" })).toBe("13:00");
    ha.config.time_zone = "UTC";
    expect(clock(NOW, { language: "nl" }, ha)).toBe("12:00");
  });
});
