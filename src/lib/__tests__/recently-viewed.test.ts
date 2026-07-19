import { describe, expect, it } from "vitest";
import { pushViewed } from "../recently-viewed";

describe("pushViewed", () => {
  it("prepends and dedupes", () => {
    expect(pushViewed(["w1", "w2"], "w2")).toEqual(["w2", "w1"]);
  });

  it("caps at the max", () => {
    const eight = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const next = pushViewed(eight, "9");
    expect(next).toHaveLength(8);
    expect(next[0]).toBe("9");
    expect(next).not.toContain("8");
  });
});
