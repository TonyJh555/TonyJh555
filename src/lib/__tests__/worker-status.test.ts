import { describe, expect, it } from "vitest";
import { availabilityRank, isOnJob, suggestWorkers, workerStatus } from "../worker-status";
import { advanceDispatch, initialDispatch } from "../dispatch";
import type { Booking, Worker } from "../types";

const NOW = new Date("2026-07-25T10:00:00Z");

const w = (id: string, over: Partial<Worker> = {}): Worker => ({
  id, name: `Worker ${id}`, categoryId: "elec", rating: 4.5, reviewCount: 10,
  rate: 500, unit: "hr", distanceKm: 2, district: "Ernakulam",
  coords: { lat: 9.9, lng: 76.3 }, initials: "W", verified: true,
  experienceYears: 5, city: "Kochi", etaMinutes: 15, jobsDone: 100,
  bio: "", skills: [], surge: false, online: true, acceptRate: 0.9,
  ...over,
});

const job = (workerId: string, status: Booking["status"], over: Partial<Booking> = {}): Booking => ({
  id: `b-${workerId}-${status}`, workerId, workerName: "W", categoryId: "elec",
  subService: "Fan", tenureId: "hr", stateId: "KL",
  quote: { serviceAmount: 500, surgeApplied: false, gst: 90, cess: 0, totalUserPays: 590, platformFee: 75, tds: 5, workerPayout: 420 },
  paymentMethod: "gpay", status, startCode: "1111", createdAt: NOW.toISOString(),
  ...over,
} as Booking);

const ctx = (bookings: Booking[] = [], away = {}, presence = {}) =>
  ({ presence, away, bookings, now: NOW });

describe("a customer can see who is actually free", () => {
  it("green when online with no job in hand", () => {
    const s = workerStatus(w("w1"), ctx());
    expect(s.id).toBe("available");
    expect(s.bookable).toBe(true);
  });

  it("amber while working with someone else", () => {
    const s = workerStatus(w("w1"), ctx([job("w1", "in_progress")]));
    expect(s.id).toBe("busy");
    expect(s.hint).toMatch(/wait/i);
  });

  it("counts an accepted job as busy — they're already on their way", () => {
    expect(workerStatus(w("w1"), ctx([job("w1", "accepted")])).id).toBe("busy");
  });

  it("a paused job frees them up — that's the point of pausing", () => {
    const paused = job("w1", "in_progress", { pausedAt: NOW.toISOString() });
    expect(workerStatus(w("w1"), ctx([paused])).id).toBe("available");
  });

  it("finished and cancelled jobs never make anyone look busy", () => {
    expect(isOnJob([job("w1", "completed"), job("w1", "cancelled")], "w1")).toBe(false);
  });

  it("offline when they haven't gone online", () => {
    const s = workerStatus(w("w1", { online: false }), ctx());
    expect(s.id).toBe("offline");
    expect(s.bookable).toBe(false);
  });

  it("leave beats everything, even a job in hand", () => {
    const away = { w1: "2026-08-01T00:00:00Z" };
    expect(workerStatus(w("w1"), ctx([job("w1", "in_progress")], away)).id).toBe("away");
  });

  it("every status is bilingual", () => {
    for (const s of [
      workerStatus(w("a"), ctx()),
      workerStatus(w("b"), ctx([job("b", "in_progress")])),
      workerStatus(w("c", { online: false }), ctx()),
    ]) {
      expect(s.labelMl.length).toBeGreaterThan(0);
      expect(s.hintMl.length).toBeGreaterThan(0);
      expect(s.labelMl).not.toBe(s.label);
    }
  });
});

describe("suggestions put free workers first without hiding anyone", () => {
  const roster = [
    w("busy1", { distanceKm: 0.5 }),
    w("free1", { distanceKm: 3 }),
    w("off1", { distanceKm: 0.1, online: false }),
  ];
  const bookings = [job("busy1", "in_progress")];

  it("ranks free above busy above offline, whatever the distance", () => {
    const out = suggestWorkers(roster, "elec", ctx(bookings));
    expect(out.map((o) => o.worker.id)).toEqual(["free1", "busy1", "off1"]);
  });

  it("still lists busy and offline workers — the customer may want to wait", () => {
    expect(suggestWorkers(roster, "elec", ctx(bookings))).toHaveLength(3);
  });

  it("leaves out whoever already had the job", () => {
    const out = suggestWorkers(roster, "elec", ctx(bookings), ["free1"]);
    expect(out.find((o) => o.worker.id === "free1")).toBeUndefined();
  });

  it("never suggests a different trade", () => {
    const mixed = [...roster, w("plumb1", { categoryId: "plumb" })];
    const out = suggestWorkers(mixed, "elec", ctx(bookings));
    expect(out.every((o) => o.worker.categoryId === "elec")).toBe(true);
  });

  it("ranking order is free, busy, offline, away", () => {
    expect(availabilityRank("available")).toBeLessThan(availabilityRank("busy"));
    expect(availabilityRank("busy")).toBeLessThan(availabilityRank("offline"));
    expect(availabilityRank("offline")).toBeLessThan(availabilityRank("away"));
  });
});

describe("a request is never handed to a worker the customer didn't pick", () => {
  const roster = [w("chosen"), w("other")];
  const stale = {
    ...job("chosen", "requested"),
    dispatch: { ...initialDispatch(new Date(NOW.getTime() - 10 * 60_000)) },
  };

  it("an expired offer stops the clock and keeps the chosen worker", () => {
    const patch = advanceDispatch(stale, roster, { now: NOW });
    expect(patch).not.toBeNull();
    expect(patch!.workerId).toBeUndefined();
    expect(patch!.dispatch!.offerExpiresAt).toBeNull();
  });

  it("does nothing at all while the offer is still live", () => {
    const live = { ...job("chosen", "requested"), dispatch: initialDispatch(NOW) };
    expect(advanceDispatch(live, roster, { now: NOW })).toBeNull();
  });
});
