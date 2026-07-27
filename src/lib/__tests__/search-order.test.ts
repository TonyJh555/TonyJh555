import { describe, expect, it } from "vitest";
import { availabilityRank, workerStatus } from "../worker-status";
import type { Booking, Worker } from "../types";

/**
 * The ordering rule search applies on top of distance/rating: whoever can
 * come now is listed first, and nobody is ever removed from the list.
 */
const NOW = new Date("2026-07-25T10:00:00Z");

const w = (id: string, over: Partial<Worker> = {}): Worker => ({
  id, name: id, categoryId: "elec", rating: 4.5, reviewCount: 10, rate: 500,
  unit: "hr", distanceKm: 2, district: "Ernakulam", coords: { lat: 9.9, lng: 76.3 },
  initials: "W", verified: true, experienceYears: 5, city: "Kochi", etaMinutes: 15,
  jobsDone: 100, bio: "", skills: [], surge: false, online: true,
  acceptRate: 0.9, ...over,
});

const onJob = (workerId: string): Booking => ({
  id: `b-${workerId}`, workerId, workerName: workerId, categoryId: "elec",
  subService: "Fan", tenureId: "hr", stateId: "KL",
  quote: { serviceAmount: 500, surgeApplied: false, gst: 90, cess: 0, totalUserPays: 590, platformFee: 75, tds: 5, workerPayout: 420 },
  paymentMethod: "gpay", status: "in_progress", startCode: "1111",
  createdAt: NOW.toISOString(), startedAt: NOW.toISOString(),
} as Booking);

function ordered(workers: Worker[], bookings: Booking[], away = {}) {
  const ctx = { presence: {}, away, bookings, now: NOW };
  return [...workers]
    .sort((a, b) => availabilityRank(workerStatus(a, ctx).id) - availabilityRank(workerStatus(b, ctx).id))
    .map((x) => x.id);
}

describe("search puts workers who can actually come first", () => {
  it("a free worker outranks a closer busy one", () => {
    const busyNearby = w("busy", { distanceKm: 0.2 });
    const freeFar = w("free", { distanceKm: 9 });
    expect(ordered([busyNearby, freeFar], [onJob("busy")])).toEqual(["free", "busy"]);
  });

  it("a busy worker still outranks one who is offline", () => {
    const busy = w("busy");
    const offline = w("offline", { online: false });
    expect(ordered([offline, busy], [onJob("busy")])).toEqual(["busy", "offline"]);
  });

  it("nobody is dropped — the customer can still scroll to their favourite", () => {
    const list = [w("a"), w("busy"), w("off", { online: false }), w("gone")];
    const out = ordered(list, [onJob("busy")], { gone: "2026-09-01T00:00:00Z" });
    expect(out).toHaveLength(4);
    expect(out).toContain("gone");
  });

  it("leaves the relative order of equally-available workers alone", () => {
    const first = w("first");
    const second = w("second");
    expect(ordered([first, second], [])).toEqual(["first", "second"]);
  });
});
