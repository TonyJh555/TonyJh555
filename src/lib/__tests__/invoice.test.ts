import { describe, expect, it } from "vitest";
import { invoicePayload, serviceLabel } from "../invoice";
import { settleBooking } from "../metered";
import type { Booking } from "../types";

const T0 = new Date("2026-07-24T10:00:00Z");
const at = (min: number) => new Date(T0.getTime() + min * 60_000);
const worker = { unit: "hr" as const, rate: 600 };

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: "bk-90210abc",
    workerId: "w1",
    workerName: "Tijo Thomas",
    categoryId: "elec",
    subService: "Fan Repair",
    tenureId: "hr",
    stateId: "KL",
    quote: {
      serviceAmount: 600, surgeApplied: false, gst: 108, cess: 0,
      totalUserPays: 708, platformFee: 90, tds: 6, workerPayout: 504,
    },
    paymentMethod: "gpay",
    status: "completed",
    startCode: "1234",
    createdAt: T0.toISOString(),
    startedAt: T0.toISOString(),
    ...over,
  } as Booking;
}

describe("invoice contents", () => {
  it("invoices the booking quote when the meter never applied", () => {
    const b = booking();
    const p = invoicePayload({
      booking: b,
      completedAt: at(45).toISOString(),
      service: serviceLabel(b),
    });
    expect(p.total).toBe(708);
    expect(p.serviceAmount).toBe(600);
    expect(p.workerPayout).toBe(504);
    expect(p.billedMinutes).toBeUndefined();
    expect(p.completedAt).toBe(at(45).toISOString());
  });

  it("invoices the SETTLED amount, not the original quote, on an overtime job", () => {
    const b = booking();
    const settled = settleBooking(b, worker, at(95))!;
    const p = invoicePayload({
      booking: b,
      quote: settled.quote,
      settlement: settled.settlement,
      completedAt: at(95).toISOString(),
      service: serviceLabel(b),
    });
    // The customer must be billed for the minutes actually worked.
    expect(settled.settlement.billedMinutes).toBeGreaterThan(60);
    expect(p.billedMinutes).toBe(settled.settlement.billedMinutes);
    expect(p.actualMinutes).toBe(settled.settlement.actualMinutes);
    expect(p.total).toBe(settled.quote.totalUserPays);
    expect(p.total).toBeGreaterThan(b.quote.totalUserPays);
    expect(p.workerPayout).toBe(settled.quote.workerPayout);
  });

  it("never bills a second hour for a job that ran inside the base hour", () => {
    const b = booking();
    const settled = settleBooking(b, worker, at(52))!;
    const p = invoicePayload({
      booking: b,
      quote: settled.quote,
      settlement: settled.settlement,
      completedAt: at(52).toISOString(),
      service: serviceLabel(b),
    });
    expect(p.billedMinutes).toBe(60);
    expect(p.total).toBe(b.quote.totalUserPays);
  });

  it("carries both recipients through, and tolerates either being absent", () => {
    const b = booking();
    const both = invoicePayload({
      booking: b,
      completedAt: at(40).toISOString(),
      service: serviceLabel(b),
      customerEmail: "anu@example.com",
      customerName: "Anu",
      workerEmail: "tijo@example.com",
    });
    expect(both.customerEmail).toBe("anu@example.com");
    expect(both.workerEmail).toBe("tijo@example.com");

    // A phone-only customer still yields a valid worker statement.
    const phoneOnly = invoicePayload({
      booking: b,
      completedAt: at(40).toISOString(),
      service: serviceLabel(b),
      workerEmail: "tijo@example.com",
    });
    expect(phoneOnly.customerEmail).toBeUndefined();
    expect(phoneOnly.workerEmail).toBe("tijo@example.com");
  });

  it("labels the service the way the customer booked it", () => {
    expect(serviceLabel(booking())).toContain("Fan Repair");
  });
});
