import { describe, expect, it } from "vitest";
import { sanitiseFaq, sanitiseFaqs, DEFAULT_FAQS } from "../faqs";

describe("the Help centre never goes blank", () => {
  it("ships with questions in both languages", () => {
    expect(DEFAULT_FAQS.length).toBeGreaterThan(3);
    for (const faq of DEFAULT_FAQS) {
      expect(faq.q.length, faq.q).toBeGreaterThan(5);
      expect(faq.a.length, faq.q).toBeGreaterThan(20);
      expect(faq.qMl.length, faq.q).toBeGreaterThan(5);
      expect(faq.aMl.length, faq.q).toBeGreaterThan(20);
    }
  });

  it("falls back to the shipped list for anything unusable", () => {
    // A half-written document must not leave a customer staring at nothing.
    for (const raw of [undefined, null, {}, "", 0, [], [null], [{ q: "no answer" }]]) {
      expect(sanitiseFaqs(raw), JSON.stringify(raw)).toEqual(DEFAULT_FAQS);
    }
  });

  it("keeps the entries that are complete and drops the ones that aren't", () => {
    const list = sanitiseFaqs([
      { q: "Real question?", a: "Real answer." },
      { q: "  ", a: "orphan answer" },
      { q: "orphan question", a: "   " },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].q).toBe("Real question?");
  });
});

describe("a missing translation is not a blank answer", () => {
  it("falls back to the English when the Malayalam is empty", () => {
    const faq = sanitiseFaq({ q: "How do I pay?", a: "UPI, card or cash." });
    // A customer reading Malayalam is better served by an answer in the wrong
    // language than by an empty card.
    expect(faq).toEqual({
      q: "How do I pay?",
      a: "UPI, card or cash.",
      qMl: "How do I pay?",
      aMl: "UPI, card or cash.",
    });
  });

  it("keeps the Malayalam when it's there", () => {
    const faq = sanitiseFaq({ q: "Q", a: "A", qMl: "ചോദ്യം", aMl: "ഉത്തരം" });
    expect(faq?.qMl).toBe("ചോദ്യം");
    expect(faq?.aMl).toBe("ഉത്തരം");
  });

  it("trims what somebody pasted", () => {
    expect(sanitiseFaq({ q: "  Q  ", a: "  A  " })?.q).toBe("Q");
  });

  it("rejects an entry with nothing in it", () => {
    expect(sanitiseFaq({})).toBeNull();
    expect(sanitiseFaq(null)).toBeNull();
    expect(sanitiseFaq("a string")).toBeNull();
  });
});
