import { describe, expect, it } from "vitest";
import {
  canBeDispatched,
  completedJobs,
  highStakes,
  isHighStakes,
  isProven,
  jobsUntilProven,
  PROVEN_JOBS,
  UNPROVEN_MAX_VALUE,
} from "../trust";
import type { Booking, Worker } from "../types";

const newbie: Pick<Worker, "id" | "jobsDone"> = { id: "kw-1", jobsDone: 0 };
const veteran: Pick<Worker, "id" | "jobsDone"> = { id: "w1", jobsDone: 847 };

function job(over: Partial<Booking> = {}): Pick<Booking, "crew" | "quote"> {
  return {
    quote: {
      serviceAmount: 500, surgeApplied: false, gst: 90, cess: 0,
      totalUserPays: 590, platformFee: 75, tds: 5, workerPayout: 420,
    },
    ...over,
  } as Pick<Booking, "crew" | "quote">;
}

const done = (workerId: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ workerId, status: "completed" as const, id: `b${i}` }));

describe("how much a worker has actually done", () => {
  it("counts the history they brought and the work they've done here", () => {
    expect(completedJobs(newbie, done("kw-1", 3))).toBe(3);
    expect(completedJobs(veteran, done("w1", 2))).toBe(849);
  });

  it("counts only finished jobs — an accepted one has not happened yet", () => {
    const pending = [{ workerId: "kw-1", status: "accepted" as const }];
    expect(completedJobs(newbie, pending)).toBe(0);
  });

  it("does not credit one worker with another's jobs", () => {
    expect(completedJobs(newbie, done("kw-2", 9))).toBe(0);
  });
});

describe("who counts as proven", () => {
  it("a brand-new signup does not", () => {
    expect(isProven(newbie, [])).toBe(false);
    expect(jobsUntilProven(newbie, [])).toBe(PROVEN_JOBS);
  });

  it("neither does one who is nearly there", () => {
    expect(isProven(newbie, done("kw-1", PROVEN_JOBS - 1))).toBe(false);
    expect(jobsUntilProven(newbie, done("kw-1", PROVEN_JOBS - 1))).toBe(1);
  });

  it("but they get there by doing the work", () => {
    expect(isProven(newbie, done("kw-1", PROVEN_JOBS))).toBe(true);
    expect(jobsUntilProven(newbie, done("kw-1", PROVEN_JOBS))).toBe(0);
  });

  it("and an experienced worker is not treated as a stranger", () => {
    // Fifteen years of carpentry is a record, even on day one here.
    expect(isProven(veteran, [])).toBe(true);
  });
});

describe("which jobs cannot simply be redone", () => {
  it("an ordinary repair is not one of them", () => {
    expect(isHighStakes(job())).toBe(false);
  });

  it("a crew booking always is — that is an occasion by definition", () => {
    expect(isHighStakes(job({ crew: { roles: [], heads: 6 } }))).toBe(true);
  });

  it("so is anything large enough", () => {
    expect(highStakes(UNPROVEN_MAX_VALUE, false)).toBe(false);
    expect(highStakes(UNPROVEN_MAX_VALUE + 1, false)).toBe(true);
  });

  it("a small crew job still counts — it is the occasion, not the price", () => {
    expect(highStakes(500, true)).toBe(true);
  });
});

describe("what KAAM will offer on its own initiative", () => {
  it("hands an ordinary repair to anyone available", () => {
    expect(canBeDispatched(newbie, job(), [])).toBe(true);
  });

  it("will not send a worker nobody has hired yet to a wedding", () => {
    const wedding = job({ crew: { roles: [], heads: 8 } });
    expect(canBeDispatched(newbie, wedding, [])).toBe(false);
  });

  it("will once they have a record", () => {
    const wedding = job({ crew: { roles: [], heads: 8 } });
    expect(canBeDispatched(newbie, wedding, done("kw-1", PROVEN_JOBS))).toBe(true);
    expect(canBeDispatched(veteran, wedding, [])).toBe(true);
  });

  it("guards by value as well as by crew", () => {
    const big = job({
      quote: { ...job().quote, totalUserPays: UNPROVEN_MAX_VALUE + 5000 },
    });
    expect(canBeDispatched(newbie, big, [])).toBe(false);
    expect(canBeDispatched(veteran, big, [])).toBe(true);
  });
});
