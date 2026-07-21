import { describe, expect, it } from "vitest";
import { dueReminder, minutesUntil, scheduledAt, upcomingBookings } from "../reminders";
import type { Booking } from "../types";

const NOW = new Date("2026-07-15T12:00:00");

function booking(over: Partial<Booking>): Booking {
  return {
    id: "b1",
    customerId: "c1",
    status: "accepted",
    schedule: { when: "scheduled", date: "2026-07-15", time: "13:00" },
    ...over,
  } as Booking;
}

describe("scheduledAt / minutesUntil", () => {
  it("returns null for ASAP jobs", () => {
    expect(scheduledAt(booking({ schedule: { when: "asap" } }))).toBeNull();
    expect(minutesUntil(booking({ schedule: { when: "asap" } }), NOW)).toBeNull();
  });

  it("computes minutes to a scheduled start", () => {
    expect(minutesUntil(booking({ schedule: { when: "scheduled", date: "2026-07-15", time: "13:00" } }), NOW)).toBe(60);
    expect(minutesUntil(booking({ schedule: { when: "scheduled", date: "2026-07-16", time: "12:00" } }), NOW)).toBe(24 * 60);
  });
});

describe("dueReminder", () => {
  it("fires the 1-hour reminder once inside the hour", () => {
    const b = booking({ schedule: { when: "scheduled", date: "2026-07-15", time: "12:45" } }); // 45m away
    const first = dueReminder(b, new Set(), NOW);
    expect(first?.window).toBe(60);
    // Already sent → no repeat.
    expect(dueReminder(b, new Set([first!.key]), NOW)).toBeNull();
  });

  it("fires the day-before reminder for a job ~23h out", () => {
    const b = booking({ schedule: { when: "scheduled", date: "2026-07-16", time: "11:00" } }); // 23h away
    const r = dueReminder(b, new Set(), NOW);
    expect(r?.window).toBe(24 * 60);
    expect(r?.when).toBe("tomorrow");
  });

  it("does not remind for ASAP, past, or completed jobs", () => {
    expect(dueReminder(booking({ schedule: { when: "asap" } }), new Set(), NOW)).toBeNull();
    expect(dueReminder(booking({ schedule: { when: "scheduled", date: "2026-07-15", time: "11:00" } }), new Set(), NOW)).toBeNull(); // past
    expect(dueReminder(booking({ status: "completed" }), new Set(), NOW)).toBeNull();
  });

  it("gives the tighter window once inside it", () => {
    const b = booking({ schedule: { when: "scheduled", date: "2026-07-15", time: "12:30" } }); // 30m
    // 24h already passed AND 1h already passed; tightest un-sent is 60.
    expect(dueReminder(b, new Set([`${b.id}:${24 * 60}`]), NOW)?.window).toBe(60);
  });
});

describe("upcomingBookings", () => {
  it("lists this customer's soon scheduled jobs, soonest first", () => {
    const list = [
      booking({ id: "later", schedule: { when: "scheduled", date: "2026-07-16", time: "10:00" } }),
      booking({ id: "soon", schedule: { when: "scheduled", date: "2026-07-15", time: "14:00" } }),
      booking({ id: "asap", schedule: { when: "asap" } }),
      booking({ id: "other", customerId: "c2", schedule: { when: "scheduled", date: "2026-07-15", time: "15:00" } }),
      booking({ id: "done", status: "completed" }),
    ];
    expect(upcomingBookings(list, "c1", NOW).map((b) => b.id)).toEqual(["soon", "later"]);
  });
});
