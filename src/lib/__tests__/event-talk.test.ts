import { describe, expect, it } from "vitest";
import { canTalk, eventThreadId, isEventThread, openingBrief, parseEventThread } from "../event-talk";
import type { EventRequest } from "../events";

function request(over: Partial<EventRequest> = {}): EventRequest {
  return {
    id: "er-1",
    customerId: "c1",
    kind: "wedding",
    date: "2026-12-14",
    venue: "Ammas Auditorium, Kakkanad",
    district: "Ernakulam",
    guests: 400,
    budget: 300_000,
    notes: "Sadya at noon, veg only",
    invitedIds: ["ec-1", "ec-2"],
    status: "open",
    stateId: "KL",
    createdAt: "2026-08-01T09:00:00.000Z",
    ...over,
  };
}

describe("the thread key", () => {
  it("is one room per company, not one per event", () => {
    // Four companies quoting the same wedding must not read each other's
    // conversations — or each other's prices.
    expect(eventThreadId("er-1", "ec-1")).not.toBe(eventThreadId("er-1", "ec-2"));
  });

  it("round-trips", () => {
    const id = eventThreadId("er-1", "ec-2");
    expect(parseEventThread(id)).toEqual({ requestId: "er-1", companyId: "ec-2" });
  });

  it("is distinguishable from a job's thread", () => {
    expect(isEventThread(eventThreadId("er-1", "ec-1"))).toBe(true);
    expect(isEventThread("bk-123")).toBe(false);
    expect(parseEventThread("bk-123")).toBeNull();
  });
});

describe("the opening message", () => {
  const text = openingBrief(request());

  it("puts the facts a company needs before it can price anything", () => {
    expect(text).toContain("400 guests");
    expect(text).toContain("Ammas Auditorium");
    expect(text).toContain("2026-12-14");
    expect(text).toContain("Sadya at noon");
  });

  it("says the conversation is free, because that is the whole point", () => {
    expect(text).toContain("free");
  });

  it("leaves the budget out when the customer would rather not say", () => {
    expect(openingBrief(request({ budget: 0 }))).not.toContain("Budget");
  });

  it("does not invent a notes line when there are none", () => {
    expect(openingBrief(request({ notes: undefined }))).not.toContain("Notes:");
  });
});

describe("who may still talk", () => {
  it("every invited company, while the customer is still deciding", () => {
    expect(canTalk(request(), "ec-1")).toBe(true);
    expect(canTalk(request(), "ec-2")).toBe(true);
  });

  it("nobody who was never asked", () => {
    expect(canTalk(request(), "ec-9")).toBe(false);
  });

  it("only the winner, once the job is awarded", () => {
    const awarded = request({ status: "awarded", awardedQuoteId: "eq-1" });
    expect(canTalk(awarded, "ec-1", "ec-1")).toBe(true);
    // A company that lost has no reason to keep a line open to someone
    // else's customer, and the customer should not still be pitched at.
    expect(canTalk(awarded, "ec-2", "ec-1")).toBe(false);
  });

  it("nobody, once the event is called off", () => {
    expect(canTalk(request({ status: "cancelled" }), "ec-1")).toBe(false);
  });
});
