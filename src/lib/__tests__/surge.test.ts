import { describe, expect, it } from "vitest";
import { applySurge, isSurging, surgeMap } from "../surge";
import type { Booking, Worker } from "../types";

const NOW = new Date("2026-07-19T12:00:00.000Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

function worker(id: string, over: Partial<Worker> = {}): Worker {
  return {
    id,
    district: "Ernakulam",
    online: true,
    surge: false,
    categoryId: "elec",
    ...over,
  } as Worker;
}

function job(workerId: string, over: Partial<Booking> = {}): Booking {
  return {
    id: `b-${workerId}-${Math.random()}`,
    workerId,
    status: "requested",
    createdAt: minutesAgo(30),
    ...over,
  } as Booking;
}

describe("surgeMap", () => {
  it("surges a district when live demand outpaces online supply", () => {
    const workers = [worker("a"), worker("b")];
    const bookings = [job("a"), job("b")]; // 2 jobs / 2 online → pressure 1
    const map = surgeMap(bookings, workers, { now: NOW });
    expect(map.Ernakulam?.surging).toBe(true);
    expect(map.Ernakulam?.pressure).toBe(1);
  });

  it("stays calm with plenty of workers online", () => {
    const workers = [worker("a"), worker("b"), worker("c"), worker("d"), worker("e")];
    const bookings = [job("a"), job("b")]; // 2 / 5 → pressure 0.4
    expect(isSurging(surgeMap(bookings, workers, { now: NOW }), "Ernakulam")).toBe(false);
  });

  it("one lone job never surges a district (minimum demand)", () => {
    const workers = [worker("a")];
    expect(isSurging(surgeMap([job("a")], workers, { now: NOW }), "Ernakulam")).toBe(false);
  });

  it("only counts live jobs from the demand window", () => {
    const workers = [worker("a"), worker("b")];
    const bookings = [
      job("a", { createdAt: minutesAgo(300) }), // stale — outside 2h window
      job("a", { status: "completed" }), // finished — not demand
      job("a", { status: "cancelled" }),
      job("b"),
    ];
    expect(isSurging(surgeMap(bookings, workers, { now: NOW }), "Ernakulam")).toBe(false);
  });

  it("workers going offline shrink supply and can tip the district into surge", () => {
    const workers = [worker("a"), worker("b"), worker("c"), worker("d"), worker("e")];
    const bookings = [job("a"), job("b")];
    const offline = new Set(["c", "d", "e"]);
    const map = surgeMap(bookings, workers, { now: NOW, isOnline: (w) => !offline.has(w.id) });
    expect(map.Ernakulam?.supply).toBe(2);
    expect(map.Ernakulam?.surging).toBe(true); // 2 jobs / 2 online
  });

  it("districts are independent", () => {
    const workers = [worker("a"), worker("k", { district: "Kannur" } as Partial<Worker>)];
    const bookings = [job("a"), job("a")];
    const map = surgeMap(bookings, workers, { now: NOW });
    expect(isSurging(map, "Ernakulam")).toBe(true);
    expect(isSurging(map, "Kannur")).toBe(false);
  });
});

describe("applySurge", () => {
  it("overlays live surge onto the roster, replacing the static flag", () => {
    const hot = [worker("a"), worker("b")];
    const map = surgeMap([job("a"), job("b")], hot, { now: NOW });
    const out = applySurge(
      [worker("a", { surge: false } as Partial<Worker>), worker("k", { district: "Kannur", surge: true } as Partial<Worker>)],
      map,
    );
    expect(out[0].surge).toBe(true); // hot district switched on
    expect(out[1].surge).toBe(false); // calm district switched off, even if seeded on
  });
});
