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

describe("the worker's copy of the same event", () => {
  it("says where to be, not who is coming", () => {
    const text = new URL(googleCalendarUrl(booking({}), 60, "worker")!).searchParams.get("text")!;
    expect(text).toContain("KAAM job");
    expect(text).toContain("Vyttila");
    // A worker does not need to be told their own name.
    expect(text).not.toContain("Anil");
  });

  it("carries the booking reference, so the app entry can be found again", () => {
    const b = booking({ id: "bk-77" });
    const details = new URL(googleCalendarUrl(b, 60, "worker")!).searchParams.get("details")!;
    expect(details).toContain("bk-77");
  });

  it("still refuses to invent a time for an ASAP job", () => {
    expect(googleCalendarUrl(booking({ schedule: { when: "asap" } }), 60, "worker")).toBeNull();
  });

  it("puts both sides at the same moment", () => {
    const b = booking({});
    const dates = (v: "customer" | "worker") =>
      new URL(googleCalendarUrl(b, 60, v)!).searchParams.get("dates");
    expect(dates("worker")).toBe(dates("customer"));
  });
});
