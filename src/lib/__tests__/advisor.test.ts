import { describe, expect, it } from "vitest";
import { matchByRules } from "../advisor";

describe("matchByRules", () => {
  it("matches electrical problems", () => {
    const r = matchByRules("My ceiling fan is making noise and the switch sparks");
    expect(r.categoryId).toBe("elec");
    expect(r.source).toBe("rules");
  });

  it("matches art categories like violinist", () => {
    expect(matchByRules("Need a violinist for a wedding").categoryId).toBe("violin");
    expect(matchByRules("Looking for piano lessons for my son").categoryId).toBe("piano");
  });

  it("matches care categories", () => {
    expect(matchByRules("babysitter for my toddler on weekdays").categoryId).toBe("babysitter");
    expect(matchByRules("need a caretaker for my grandmother").categoryId).toBe("eldercare");
  });

  it("flags emergencies as high urgency with safety tips", () => {
    const r = matchByRules("URGENT: wire is sparking and there is a burning smell, emergency!");
    expect(r.urgency).toBe("high");
    expect(r.categoryId).toBe("elec");
    expect(r.safetyTips.length).toBeGreaterThan(0);
  });

  it("falls back gracefully on gibberish", () => {
    const r = matchByRules("xyzzy blorp");
    expect(r.categoryId).toBeDefined();
    expect(r.note).toContain("Couldn't confidently match");
  });
});
