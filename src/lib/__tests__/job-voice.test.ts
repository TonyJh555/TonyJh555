import { describe, expect, it } from "vitest";
import { announceJob } from "../job-voice";

const job = { trade: "Plumbing", pay: 450, km: 2.34, place: "Kochi" };

describe("announceJob", () => {
  it("reads the essentials in English", () => {
    expect(announceJob(job, "en")).toBe(
      "New Plumbing job. Pay 450 rupees. About 2.3 kilometres from you. Location Kochi.",
    );
  });

  it("reads the essentials in Malayalam, keeping trade and place verbatim", () => {
    const said = announceJob(job, "ml");
    expect(said).toContain("Plumbing");
    expect(said).toContain("Kochi");
    expect(said).toContain("450");
    expect(said).toContain("2.3");
  });

  it("rounds pay to a whole rupee", () => {
    expect(announceJob({ ...job, pay: 449.6 }, "en")).toContain("Pay 450 rupees");
  });

  it("speaks a whole distance without a trailing decimal", () => {
    expect(announceJob({ ...job, km: 3 }, "en")).toContain("About 3 kilometres");
  });

  it("keeps one decimal for a fractional distance", () => {
    expect(announceJob({ ...job, km: 0.85 }, "en")).toContain("About 0.9 kilometres");
  });
});
