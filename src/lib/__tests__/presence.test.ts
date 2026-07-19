import { describe, expect, it } from "vitest";
import {
  applyPresence,
  formatOnlineTime,
  onlineSecondsToday,
  presenceOnline,
  toggleEntry,
  type PresenceMap,
} from "../presence";
import type { Worker } from "../types";

const T0 = new Date("2026-07-19T09:00:00.000Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

const seedOnline = { id: "a", online: true } as Worker;
const seedOffline = { id: "b", online: false } as Worker;

describe("presence resolution", () => {
  it("falls back to the seed default with no entry", () => {
    expect(presenceOnline({}, seedOnline)).toBe(true);
    expect(presenceOnline({}, seedOffline)).toBe(false);
  });

  it("a toggle overrides the seed in both directions", () => {
    const map: PresenceMap = {
      a: toggleEntry(undefined, false, T0),
      b: toggleEntry(undefined, true, T0),
    };
    expect(presenceOnline(map, seedOnline)).toBe(false);
    expect(presenceOnline(map, seedOffline)).toBe(true);
  });
});

describe("time-online accounting", () => {
  it("banks a stint's seconds when the worker goes offline", () => {
    let entry = toggleEntry(undefined, true, T0);
    entry = toggleEntry(entry, false, at(45));
    expect(entry.daySeconds["2026-07-19"]).toBe(45 * 60);
    expect(entry.online).toBe(false);
  });

  it("counts the running stint live and adds it to banked time", () => {
    let entry = toggleEntry(undefined, true, T0); // 09:00–09:30
    entry = toggleEntry(entry, false, at(30));
    entry = toggleEntry(entry, true, at(60)); // back on at 10:00
    const map: PresenceMap = { w: entry };
    expect(onlineSecondsToday(map, "w", at(75))).toBe(30 * 60 + 15 * 60);
  });

  it("toggling on twice keeps the original stint start", () => {
    let entry = toggleEntry(undefined, true, T0);
    entry = toggleEntry(entry, true, at(20)); // double-tap GO
    const map: PresenceMap = { w: entry };
    expect(onlineSecondsToday(map, "w", at(30))).toBe(30 * 60);
  });

  it("reports zero for a worker who never toggled", () => {
    expect(onlineSecondsToday({}, "ghost", T0)).toBe(0);
  });
});

describe("applyPresence", () => {
  it("overlays live presence onto the roster for search & dispatch", () => {
    const map: PresenceMap = { a: toggleEntry(undefined, false, T0) };
    const out = applyPresence([seedOnline, seedOffline], map);
    expect(out.map((w) => w.online)).toEqual([false, false]);
    expect(out[1]).toBe(seedOffline); // untouched workers keep identity
  });
});

describe("formatOnlineTime", () => {
  it("formats like a driver app", () => {
    expect(formatOnlineTime(12 * 60)).toBe("12m");
    expect(formatOnlineTime(2 * 3600 + 5 * 60)).toBe("2h 05m");
  });
});
