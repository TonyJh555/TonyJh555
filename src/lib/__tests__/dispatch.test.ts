import { describe, expect, it } from "vitest";
import {
  advanceDispatch,
  dispatchQueue,
  initialDispatch,
  jobCoords,
  MAX_ATTEMPTS,
  OFFER_WINDOW_SECONDS,
  declinePatch,
  dispatchPhase,
  offerExpired,
  reassign,
} from "../dispatch";
import type { Booking, Worker } from "../types";

const JOB_AT = { lat: 9.98, lng: 76.3 }; // Kochi

function worker(id: string, over: Partial<Worker> = {}): Worker {
  return {
    id,
    name: `Worker ${id.toUpperCase()}`,
    categoryId: "elec",
    rating: 4.6,
    reviewCount: 50,
    rate: 500,
    unit: "visit",
    distanceKm: 2,
    district: "Ernakulam",
    coords: { lat: 9.99, lng: 76.31 },
    initials: "W",
    verified: true,
    experienceYears: 5,
    city: "Kochi",
    etaMinutes: 15,
    jobsDone: 200,
    bio: "",
    skills: [],
    badges: [],
    surge: false,
    online: true,
    acceptRate: 0.9,
    ...over,
  };
}

// near (~1.5 km), mid (~11 km), far (~250 km, Kannur)
const near = worker("near", { coords: { lat: 9.99, lng: 76.31 } });
const mid = worker("mid", { coords: { lat: 10.08, lng: 76.35 } });
const far = worker("far", { coords: { lat: 11.87, lng: 75.37 } });

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    workerId: "near",
    workerName: "Worker NEAR",
    categoryId: "elec",
    subService: "Wiring",
    tenureId: "onetime",
    stateId: "KL",
    coords: JOB_AT,
    quote: {} as Booking["quote"],
    paymentMethod: "upi",
    status: "requested",
    startCode: "1234",
    createdAt: new Date().toISOString(),
    dispatch: initialDispatch(),
    ...over,
  } as Booking;
}

describe("dispatchQueue", () => {
  it("ranks eligible workers nearest to the job first", () => {
    expect(dispatchQueue([far, mid, near], "elec", JOB_AT).map((w) => w.id)).toEqual([
      "near",
      "mid",
      "far",
    ]);
  });

  it("only offers to workers of the requested service", () => {
    const plumber = worker("p1", { categoryId: "plumb" });
    expect(dispatchQueue([plumber, near], "elec", JOB_AT).map((w) => w.id)).toEqual(["near"]);
  });

  it("skips offline, excluded, and away workers", () => {
    const offline = worker("off", { online: false });
    const onLeave = worker("leave");
    const queue = dispatchQueue([offline, onLeave, near, mid], "elec", JOB_AT, ["near"], {
      isUnavailable: (id) => id === "leave",
    });
    expect(queue.map((w) => w.id)).toEqual(["mid"]);
  });
});

describe("offer lifecycle", () => {
  it("a fresh offer is not expired", () => {
    expect(offerExpired(booking())).toBe(false);
  });

  it("expires without giving the job to anyone else — the customer chose this worker", () => {
    const b = booking();
    const later = new Date(Date.now() + (OFFER_WINDOW_SECONDS + 5) * 1000);
    expect(offerExpired(b, later)).toBe(true);

    const patch = advanceDispatch(b, [near, mid, far], { now: later });
    // The countdown stops; the request stays with the chosen worker and the
    // customer is offered the choice of someone else themselves.
    expect(patch?.workerId).toBeUndefined();
    expect(patch?.workerName).toBeUndefined();
    expect(patch?.dispatch?.offerExpiresAt).toBeNull();
  });

  it("does nothing while the window is still running", () => {
    expect(advanceDispatch(booking(), [near, mid])).toBeNull();
  });

  it("ignores bookings that are no longer live requests", () => {
    const later = new Date(Date.now() + OFFER_WINDOW_SECONDS * 2000);
    expect(advanceDispatch(booking({ status: "accepted" }), [near, mid], { now: later })).toBeNull();
  });

  it("a decline reassigns immediately without waiting for expiry", () => {
    const patch = reassign(booking(), [near, mid, far]);
    expect(patch?.workerId).toBe("mid");
  });

  it("cascades through the whole queue in distance order", () => {
    const b = booking();
    const first = reassign(b, [near, mid, far])!;
    const second = reassign({ ...b, ...first }, [near, mid, far])!;
    expect(first.workerId).toBe("mid");
    expect(second.workerId).toBe("far");
    expect(second.dispatch?.passedIds).toEqual(["near", "mid"]);
  });

  it("starts a fresh round once everyone has passed", () => {
    const b = booking({
      workerId: "far",
      dispatch: { passedIds: ["near", "mid"], attempt: 3, offerExpiresAt: new Date().toISOString() },
    });
    const patch = reassign(b, [near, mid, far])!;
    expect(patch.workerId).toBe("near"); // round 2 re-offers the nearest again
    expect(patch.dispatch?.passedIds).toEqual(["far"]); // only the current holder stays excluded
  });

  it("leaves the offer open (timer off) in a one-worker area", () => {
    const b = booking();
    const later = new Date(Date.now() + (OFFER_WINDOW_SECONDS + 5) * 1000);
    const patch = advanceDispatch(b, [near], { now: later }); // nobody but the holder
    expect(patch?.workerId).toBeUndefined();
    expect(patch?.dispatch?.offerExpiresAt).toBeNull();
  });

  it("stops the timer at the attempt cap instead of bouncing forever", () => {
    const b = booking({
      dispatch: { passedIds: [], attempt: MAX_ATTEMPTS - 1, offerExpiresAt: new Date().toISOString() },
    });
    const patch = reassign(b, [near, mid])!;
    expect(patch.dispatch?.attempt).toBe(MAX_ATTEMPTS);
    expect(patch.dispatch?.offerExpiresAt).toBeNull();
  });
});

describe("jobCoords", () => {
  it("prefers the map pin and falls back to the address text", () => {
    expect(jobCoords({ coords: JOB_AT, address: "Kannur" })).toEqual(JOB_AT);
    const fromAddress = jobCoords({ address: "Kannur" });
    expect(fromAddress.lat).toBeGreaterThan(11); // north Kerala
  });
});

describe("telling the customer the truth about an unaccepted request", () => {
  const NOW = new Date("2026-07-26T10:00:00Z");

  it("counts down while the worker still holds the offer", () => {
    const b = booking({ dispatch: initialDispatch(NOW) });
    const p = dispatchPhase(b, new Date(NOW.getTime() + 60_000));
    expect(p).toEqual({ phase: "offered", secondsLeft: OFFER_WINDOW_SECONDS - 60 });
  });

  it("says declined — not 'no reply' — when the worker actually said no", () => {
    const b = booking({ dispatch: initialDispatch(NOW) });
    const after = { ...b, ...declinePatch(b, NOW) } as Booking;
    const p = dispatchPhase(after, NOW);
    expect(p?.phase).toBe("declined");
    expect(p && "outcome" in p && p.outcome?.workerName).toBe("Worker NEAR");
  });

  it("a decline stops the timer and records the passer", () => {
    const b = booking({ dispatch: initialDispatch(NOW) });
    const d = declinePatch(b, NOW).dispatch!;
    expect(d.offerExpiresAt).toBeNull();
    expect(d.passedIds).toContain("near");
    expect(d.lastOutcome?.reason).toBe("declined");
  });

  it("a lapsed window is 'no reply', which is not the same as a refusal", () => {
    const b = booking({ dispatch: initialDispatch(NOW) });
    const later = new Date(NOW.getTime() + (OFFER_WINDOW_SECONDS + 5) * 1000);
    const patch = advanceDispatch(b, [near], { now: later })!;
    const after = { ...b, ...patch } as Booking;
    expect(after.dispatch!.lastOutcome?.reason).toBe("no_reply");
    expect(dispatchPhase(after, later)?.phase).toBe("no_reply");
  });

  it("a previous worker's refusal does not stick to the next one", () => {
    // The customer moved the job on. The new worker hasn't refused anything.
    const b = booking({ dispatch: initialDispatch(NOW) });
    const declined = { ...b, ...declinePatch(b, NOW) } as Booking;
    const moved = {
      ...declined,
      workerId: "mid",
      workerName: "Worker MID",
      dispatch: { ...declined.dispatch!, offerExpiresAt: null },
    } as Booking;
    expect(dispatchPhase(moved, NOW)?.phase).toBe("no_reply");
  });

  it("says nothing once somebody has accepted", () => {
    expect(dispatchPhase(booking({ status: "accepted" }), NOW)).toBeNull();
  });
});
