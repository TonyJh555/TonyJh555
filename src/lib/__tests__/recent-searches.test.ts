import { describe, expect, it } from "vitest";
import { pushRecent } from "../recent-searches";

describe("pushRecent", () => {
  it("prepends and dedupes case-insensitively", () => {
    expect(pushRecent(["nurse", "electrician"], "NURSE")).toEqual(["NURSE", "electrician"]);
  });

  it("ignores terms shorter than 2 chars", () => {
    expect(pushRecent(["a"], "x")).toEqual(["a"]);
    expect(pushRecent([], "  ")).toEqual([]);
  });

  it("caps the list length", () => {
    const eight = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"];
    const next = pushRecent(eight, "new");
    expect(next).toHaveLength(8);
    expect(next[0]).toBe("new");
    expect(next).not.toContain("a8");
  });
});
