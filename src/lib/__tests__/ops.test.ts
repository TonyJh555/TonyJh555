import { describe, expect, it } from "vitest";
import { opsSnapshot } from "../ops";
import type { Booking, Worker } from "../types";

const NOW = new Date("2026-07-15T12:00:00");
const minAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

function worker(id: string, over: Partial<Worker> = {}): Worker {
  return { id, district: "Ernakulam", online: true, categoryId: "elec", coords: { lat: 9.98, lng: 76.3 }, ...over } as Worker;
}

function job(over: Partial<Booking>): Booking {
  return {
    id: `b${Math.random()}`,
    workerId: "w1",
    workerName: "Worker One",
    categoryId: "elec",
    status: "requested",
    createdAt: minAgo(5),
    address: "MG Road",
    ...over,
  } as Booking;
}

const workers = [worker("w1"), worker("w2"), worker("w3", { online: false })];

describe("opsSnapshot", () => {
  it("counts jobs by live status", () => {
    const s = opsSnapshot(
      [
        job({ status: "requested" }),
        job({ status: "requested" }),
        job({ status: "accepted" }),
        job({ status: "in_progress" }),
        job({ status: "completed", createdAt: minAgo(30) }),
        job({ status: "cancelled", createdAt: minAgo(30) }),
      ],
      workers,
      { now: NOW },
    );
    expect(s.hunting).toBe(2);
    expect(s.enRoute).toBe(1);
    expect(s.working).toBe(1);
    expect(s.completedToday).toBe(1);
    expect(s.cancelledToday).toBe(1);
  });

  it("orders active jobs by urgency: hunting first, then oldest", () => {
    const s = opsSnapshot(
      [
        job({ id: "young-req", status: "requested", createdAt: minAgo(2) }),
        job({ id: "old-req", status: "requested", createdAt: minAgo(20) }),
        job({ id: "inprog", status: "in_progress", createdAt: minAgo(60) }),
      ],
      workers,
      { now: NOW },
    );
    expect(s.activeJobs.map((j) => j.id)).toEqual(["old-req", "young-req", "inprog"]);
  });

  it("averages the wait of hunting jobs only", () => {
    const s = opsSnapshot(
      [
        job({ status: "requested", createdAt: minAgo(10) }),
        job({ status: "requested", createdAt: minAgo(20) }),
        job({ status: "in_progress", createdAt: minAgo(90) }),
      ],
      workers,
      { now: NOW },
    );
    expect(s.avgWaitMinutes).toBe(15);
  });

  it("counts online workers, honoring a live presence override", () => {
    const base = opsSnapshot([], workers, { now: NOW });
    expect(base.onlineWorkers).toBe(2); // w3 seeded offline

    const withPresence = opsSnapshot([], workers, {
      now: NOW,
      isOnline: (w) => w.id !== "w1", // w1 toggled offline
    });
    expect(withPresence.onlineWorkers).toBe(2); // w2 + w3
  });

  it("surfaces surging districts when demand outpaces online supply", () => {
    const hot = [worker("a"), worker("b")];
    const s = opsSnapshot([job({ workerId: "a" }), job({ workerId: "b" })], hot, { now: NOW });
    expect(s.surgingDistricts).toContain("Ernakulam");
  });
});
