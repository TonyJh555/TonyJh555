import { describe, expect, it } from "vitest";
import { customerRatingFor } from "../customer-rating";
import type { Booking } from "../types";

function bk(over: Partial<Booking>): Booking {
  return {
    id: Math.random().toString(36).slice(2),
    customerId: "c1",
    workerId: "w1",
    workerName: "W",
    categoryId: "elec",
    subService: "Fan",
    tenureId: "hr",
    stateId: "KL",
    quote: {
      serviceAmount: 500, surgeApplied: false, gst: 90, cess: 0, totalUserPays: 590,
      platformFee: 75, tds: 5, workerPayout: 420,
    },
    paymentMethod: "gpay",
    status: "completed",
    startCode: "1234",
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe("customerRatingFor", () => {
  it("averages a customer's worker-given ratings", () => {
    const r = customerRatingFor(
      [
        bk({ customerId: "c1", customerRating: 5 }),
        bk({ customerId: "c1", customerRating: 4 }),
        bk({ customerId: "c1" }), // unrated → ignored
        bk({ customerId: "c2", customerRating: 1 }), // other customer
      ],
      "c1",
    );
    expect(r.count).toBe(2);
    expect(r.avg).toBeCloseTo(4.5);
  });

  it("returns zero for an unknown or missing customer", () => {
    expect(customerRatingFor([bk({ customerRating: 5 })], undefined)).toEqual({ avg: 0, count: 0 });
    expect(customerRatingFor([bk({ customerId: "c1", customerRating: 5 })], "cX")).toEqual({ avg: 0, count: 0 });
  });
});
