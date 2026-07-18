import { describe, expect, it } from "vitest";
import { toCSV } from "../csv";

describe("toCSV", () => {
  it("joins headers and rows", () => {
    expect(toCSV(["a", "b"], [[1, 2], [3, 4]])).toBe("a,b\n1,2\n3,4");
  });

  it("quotes fields containing commas, quotes or newlines", () => {
    expect(toCSV(["name"], [["Kochi, KL"]])).toBe('name\n"Kochi, KL"');
    expect(toCSV(["q"], [['say "hi"']])).toBe('q\n"say ""hi"""');
    expect(toCSV(["m"], [["line1\nline2"]])).toBe('m\n"line1\nline2"');
  });
});
