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

  it("tells a hospital bystander apart from a home nurse", () => {
    // The family's own words, in both languages. A bystander sits with the
    // patient; sending them a nurse's price for that is a different product.
    expect(matchByRules("need a bystander for my father in the hospital").categoryId).toBe(
      "bystander",
    );
    expect(matchByRules("ആശുപത്രിയിൽ കൂട്ടിരിക്കാൻ ആളെ വേണം").categoryId).toBe("bystander");
    expect(matchByRules("nurse to give an injection at home").categoryId).toBe("nurse");
  });

  it("separates going WITH someone from going INSTEAD of them", () => {
    // This is the whole distinction between the two new services, and it is
    // easy to blur: both involve a shop.
    expect(matchByRules("someone to accompany my mother to the bank").categoryId).toBe("errands");
    expect(matchByRules("send a list and buy for me from the supermarket").categoryId).toBe(
      "shopper",
    );
    expect(matchByRules("വാങ്ങിത്തരാൻ ആളെ വേണം, ലിസ്റ്റ് അയക്കാം").categoryId).toBe("shopper");
  });

  it("warns a shopper's customer about the money before the shop", () => {
    // The one thing that must never be missing from this trade.
    const tips = matchByRules("buy for me from the supermarket").safetyTips.join(" ");
    expect(tips).toMatch(/money/i);
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
