import { describe, expect, it } from "vitest";
import { cannedFor, CANNED_REPLIES } from "../canned-replies";

describe("cannedFor", () => {
  it("puts category-specific replies before general ones", () => {
    const refund = cannedFor("refund");
    expect(refund[0].label).toBe("Refund processing"); // specific first
    expect(refund.some((r) => r.label === "Anything else?")).toBe(true); // general included
  });

  it("shows only general replies for a category with no specific ones", () => {
    const account = cannedFor("account");
    expect(account.every((r) => !r.categories)).toBe(true);
  });

  it("every canned reply has non-empty text", () => {
    for (const r of CANNED_REPLIES) expect(r.text.trim().length).toBeGreaterThan(0);
  });
});
