import { describe, expect, it } from "vitest";
import { normalizePhone, smsLink, statusMessage, waLink } from "../safety";
import type { Booking } from "../types";

describe("normalizePhone", () => {
  it("accepts the ways Keralites actually type numbers", () => {
    expect(normalizePhone("9876543210")).toBe("919876543210");
    expect(normalizePhone("98765 43210")).toBe("919876543210");
    expect(normalizePhone("+91 98765-43210")).toBe("919876543210");
    expect(normalizePhone("09876543210")).toBe("919876543210");
    expect(normalizePhone("919876543210")).toBe("919876543210");
  });

  it("rejects numbers that cannot be Indian mobiles", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("call me maybe")).toBeNull();
  });
});

describe("share links", () => {
  it("builds one-tap WhatsApp and SMS links with the text prefilled", () => {
    expect(waLink("919876543210", "hello amma")).toBe(
      "https://wa.me/919876543210?text=hello%20amma",
    );
    expect(smsLink("919876543210", "hi & bye")).toBe("sms:+919876543210?body=hi%20%26%20bye");
  });
});

describe("statusMessage", () => {
  const base = {
    subService: "Deep cleaning",
    workerName: "Anitha Suresh",
    address: "Panampilly Nagar, Kochi",
    startCode: "4821",
    status: "in_progress",
  } as Booking;

  it("tells family the job started, who is there, and the safety net", () => {
    const msg = statusMessage(base);
    expect(msg).toContain("started the job");
    expect(msg).toContain("Anitha Suresh");
    expect(msg).toContain("KYC-verified");
    expect(msg).toContain("Panampilly Nagar");
    expect(msg).toContain("SOS");
    expect(msg).not.toContain("4821"); // the OTP stays private — never shared out
  });

  it("adapts the stage line to the booking status", () => {
    expect(statusMessage({ ...base, status: "completed" })).toContain("finished");
    expect(statusMessage({ ...base, status: "accepted" })).toContain("A worker is booked");
  });
});
