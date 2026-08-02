import { describe, expect, it } from "vitest";
import { WORKERS } from "@/data/workers";
import { isRealWorker, rosterFrom, workerFromApplication } from "../roster";
import type { WorkerApplication } from "../applications";

/**
 * Approval has to put someone on the platform.
 *
 * It used to flip a status and nothing else. The owner's roster, the
 * customer's search, the home screen and dispatch all read a hardcoded seed
 * array, so an approved worker was approved onto nothing: not in the roster,
 * not findable, not bookable. Someone uploaded their Aadhaar, waited a day,
 * was told "You're verified!" — and the platform had no record of them
 * anywhere that mattered.
 */

function application(over: Partial<WorkerApplication> = {}): WorkerApplication {
  return {
    id: "app1",
    name: "Sujith Balakrishnan",
    phone: "9876500011",
    city: "Kochi",
    categoryId: "elec",
    experienceYears: 7,
    bio: "Wiring and panel work.",
    docs: {},
    media: [],
    status: "approved",
    submittedAt: "2026-08-01T09:00:00.000Z",
    reviewedAt: "2026-08-02T09:00:00.000Z",
    ...over,
  };
}

describe("an approved application becomes a worker", () => {
  it("is on the roster", () => {
    const roster = rosterFrom([application()]);
    const found = roster.find((w) => w.name === "Sujith Balakrishnan");
    expect(found).toBeDefined();
    expect(isRealWorker(found!)).toBe(true);
  });

  it("keeps everyone who shipped with the app", () => {
    expect(rosterFrom([application()])).toHaveLength(WORKERS.length + 1);
  });

  it("leaves the roster alone while an application is still pending", () => {
    // Approval is the gate. A pending applicant is not bookable.
    expect(rosterFrom([application({ status: "pending" })])).toHaveLength(WORKERS.length);
    expect(rosterFrom([application({ status: "rejected" })])).toHaveLength(WORKERS.length);
  });

  it("starts with nothing it has not earned", () => {
    const w = workerFromApplication(application());
    expect(w.rating).toBe(0);
    expect(w.reviewCount).toBe(0);
    expect(w.jobsDone).toBe(0);
    // KYC is the one thing that really was checked.
    expect(w.verified).toBe(true);
  });

  it("starts offline, because only they can say they are ready", () => {
    expect(workerFromApplication(application()).online).toBe(false);
  });

  it("lands in a real district", () => {
    expect(workerFromApplication(application({ city: "Kochi" })).district).toBe("Ernakulam");
    expect(workerFromApplication(application({ city: "Munnar" })).district).toBe("Idukki");
    expect(workerFromApplication(application({ city: "Kollam" })).district).toBe("Kollam");
  });

  it("still lands somewhere for a village nobody has heard of", () => {
    // Falls back to the nearest district HQ rather than dropping the worker.
    const w = workerFromApplication(application({ city: "Kuttiyadi" }));
    expect(w.district).toBeTruthy();
    expect(Number.isFinite(w.coords.lat)).toBe(true);
    expect(Number.isFinite(w.coords.lng)).toBe(true);
  });

  it("builds initials that fit an avatar", () => {
    expect(workerFromApplication(application({ name: "Sujith Balakrishnan" })).initials).toBe("SB");
    expect(workerFromApplication(application({ name: "Ammu" })).initials).toBe("AM");
  });

  it("gives every worker a distinct id, never colliding with a seed worker", () => {
    const roster = rosterFrom([application({ id: "a" }), application({ id: "b", name: "Ravi P" })]);
    const ids = roster.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("puts the newest joiner first, so today's arrivals are visible", () => {
    const roster = rosterFrom([
      application({ id: "old", name: "Older Joiner", reviewedAt: "2026-07-01T00:00:00.000Z" }),
      application({ id: "new", name: "Newer Joiner", reviewedAt: "2026-08-02T00:00:00.000Z" }),
    ]);
    expect(roster[0].name).toBe("Newer Joiner");
    expect(roster[1].name).toBe("Older Joiner");
  });

  it("charges the category's base rate until they set their own", () => {
    const w = workerFromApplication(application({ categoryId: "elec" }));
    expect(w.rate).toBeGreaterThan(0);
    expect(w.unit).toBe("hr");
  });
});
