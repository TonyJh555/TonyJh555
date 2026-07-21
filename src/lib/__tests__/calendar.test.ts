import { describe, expect, it } from "vitest";
import { googleCalendarUrl } from "../calendar";
import type { Booking } from "../types";

function booking(over: Partial<Booking>): Booking {
  return {
    subService: "Wiring",
    workerName: "Anil Kumar",
    address: "Vyttila, Kochi",
    schedule: { when: "scheduled", date: "2026-07-15", time: "13:00" },
    ...over,
  } as Booking;
}

describe("googleCalendarUrl", () => {
  it("returns null for ASAP bookings", () => {
    expect(googleCalendarUrl(booking({ schedule: { when: "asap" } }))).toBeNull();
  });

  it("builds a Google Calendar link with a 1-hour block by default", () => {
    const url = googleCalendarUrl(booking({}))!;
    expect(url).toContain("calendar.google.com");
    expect(url).toContain("dates=20260715T130000%2F20260715T140000");
    expect(url).toContain("KAAM");
    expect(url).toContain("Anil");
    expect(url).toContain("Vyttila");
  });

  it("honors a custom duration", () => {
    const url = googleCalendarUrl(booking({}), 120)!;
    expect(url).toContain("20260715T130000%2F20260715T150000");
  });
});
