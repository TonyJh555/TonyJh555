import { describe, expect, it } from "vitest";
import { companyByPhone, samePhone } from "../company-auth";
import type { EventCompany } from "../event-store";

function company(over: Partial<EventCompany> = {}): EventCompany {
  return {
    id: "ec-1",
    name: "Malabar Weddings",
    contactName: "Suresh Nair",
    phone: "9876543211",
    district: "Ernakulam",
    city: "Kochi",
    yearsRunning: 14,
    crewSize: 40,
    services: [],
    about: "",
    portfolio: [],
    status: "approved",
    submittedAt: "2026-01-12T09:00:00.000Z",
    ...over,
  };
}

describe("matching a number to a company", () => {
  it("ignores how the number was typed", () => {
    // The registration form and the sign-in form were never going to be
    // filled in identically.
    expect(samePhone("9876543211", "98765 43211")).toBe(true);
    expect(samePhone("+91 98765-43211", "9876543211")).toBe(true);
    expect(samePhone("09876543211", "9876543211")).toBe(true);
  });

  it("does not match two different numbers", () => {
    expect(samePhone("9876543211", "9876543212")).toBe(false);
  });

  it("refuses to match on a fragment", () => {
    // Half a number matching anything would let one company sign in as another.
    expect(samePhone("543211", "9876543211")).toBe(false);
    expect(samePhone("", "9876543211")).toBe(false);
  });

  it("finds the company that registered it", () => {
    const all = [company(), company({ id: "ec-2", phone: "9876543212" })];
    expect(companyByPhone(all, "98765 43212")?.id).toBe("ec-2");
  });

  it("finds nobody for a number that registered nothing", () => {
    expect(companyByPhone([company()], "9000000000")).toBeUndefined();
  });

  it("never matches a company with no number on file", () => {
    // Otherwise an empty stored phone would match an empty typed one and hand
    // over somebody else's account.
    const noPhone = [company({ id: "ec-blank", phone: "" })];
    expect(companyByPhone(noPhone, "")).toBeUndefined();
    expect(companyByPhone(noPhone, "9876543211")).toBeUndefined();
  });
});
