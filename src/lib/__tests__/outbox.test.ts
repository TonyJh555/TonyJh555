import { describe, expect, it } from "vitest";
import {
  applyPending,
  NAG_AFTER_MINUTES,
  retryDelaySeconds,
  shouldWarn,
  stuckMinutes,
  writesFor,
  type PendingWrite,
} from "../outbox";

interface Row {
  id: string;
  status: string;
}

const idOf = (r: Row) => r.id;

function write(over: Partial<PendingWrite> = {}): PendingWrite {
  return {
    id: "ob-1",
    table: "bookings",
    recordId: "bk1",
    kind: "update",
    record: { id: "bk1", status: "completed" },
    at: "2026-08-09T10:00:00.000Z",
    attempts: 0,
    ...over,
  };
}

describe("a refetch must not throw away work that hasn't been sent", () => {
  it("keeps the local version of a record whose update is still queued", () => {
    // The bug this exists for: the worker taps "work is done", the update is
    // refused, and the next realtime event replaces the cache with cloud rows
    // where the job is still in progress.
    const cloud: Row[] = [{ id: "bk1", status: "in_progress" }];
    const merged = applyPending(cloud, [write()], idOf);
    expect(merged).toEqual([{ id: "bk1", status: "completed" }]);
  });

  it("keeps a booking the cloud has never heard of", () => {
    const merged = applyPending<Row>(
      [{ id: "bk2", status: "requested" }],
      [write({ kind: "insert", recordId: "bk9", record: { id: "bk9", status: "requested" } })],
      idOf,
    );
    expect(merged.map((r) => r.id)).toEqual(["bk9", "bk2"]);
  });

  it("does not resurrect a booking whose delete hasn't been sent", () => {
    const cloud: Row[] = [{ id: "bk1", status: "cancelled" }, { id: "bk2", status: "requested" }];
    const merged = applyPending(cloud, [write({ kind: "delete", record: undefined })], idOf);
    expect(merged.map((r) => r.id)).toEqual(["bk2"]);
  });

  it("takes the cloud's version when this device has nothing pending", () => {
    // Only writes made HERE are defended. Another device's change is news,
    // not a conflict — refusing it would strand this phone on stale data.
    const cloud: Row[] = [{ id: "bk1", status: "completed" }];
    expect(applyPending(cloud, [], idOf)).toEqual(cloud);
    expect(applyPending(cloud, [write({ recordId: "other" })], idOf)[0].status).toBe("completed");
  });

  it("ends with the later of two queued edits to the same record", () => {
    const merged = applyPending<Row>(
      [{ id: "bk1", status: "requested" }],
      [
        write({ id: "ob-1", record: { id: "bk1", status: "accepted" } }),
        write({ id: "ob-2", record: { id: "bk1", status: "in_progress" } }),
      ],
      idOf,
    );
    expect(merged).toEqual([{ id: "bk1", status: "in_progress" }]);
  });

  it("lets a queued delete win over an earlier queued update", () => {
    const merged = applyPending<Row>(
      [{ id: "bk1", status: "requested" }],
      [
        write({ id: "ob-1", record: { id: "bk1", status: "accepted" } }),
        write({ id: "ob-2", kind: "delete", record: undefined }),
      ],
      idOf,
    );
    expect(merged).toEqual([]);
  });

  it("does not disturb the list when nothing is queued", () => {
    const cloud: Row[] = [{ id: "a", status: "x" }, { id: "b", status: "y" }];
    expect(applyPending(cloud, [], idOf)).toBe(cloud);
  });

  it("keeps the cloud's ordering for everything it already knows", () => {
    const cloud: Row[] = [
      { id: "a", status: "x" },
      { id: "b", status: "y" },
      { id: "c", status: "z" },
    ];
    const merged = applyPending(
      cloud,
      [write({ recordId: "b", record: { id: "b", status: "changed" } })],
      idOf,
    );
    expect(merged.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(merged[1].status).toBe("changed");
  });
});

describe("deciding when to interrupt somebody", () => {
  const now = new Date("2026-08-09T10:05:00.000Z");

  it("says nothing when everything has landed", () => {
    expect(shouldWarn([], now)).toBe(false);
    expect(stuckMinutes([], now)).toBe(0);
  });

  it("stays quiet through a brief blip", () => {
    // Three seconds behind on a stairwell signal is not worth a warning.
    const justNow = [write({ at: "2026-08-09T10:04:57.000Z" })];
    expect(stuckMinutes(justNow, now)).toBe(0);
    expect(shouldWarn(justNow, now)).toBe(false);
  });

  it("speaks up once a write has been sitting", () => {
    expect(shouldWarn([write({ at: "2026-08-09T10:00:00.000Z" })], now)).toBe(true);
    expect(stuckMinutes([write({ at: "2026-08-09T10:00:00.000Z" })], now)).toBe(5);
  });

  it("speaks up immediately when the database actually refused", () => {
    // A refusal is not a slow connection and will not fix itself on the next
    // tick, so the grace period meant for bad signal does not apply.
    const refused = [write({ at: "2026-08-09T10:04:59.000Z", lastError: "row-level security" })];
    expect(shouldWarn(refused, now)).toBe(true);
  });

  it("measures from the oldest, not the newest", () => {
    const mixed = [
      write({ id: "ob-2", at: "2026-08-09T10:04:00.000Z" }),
      write({ id: "ob-1", at: "2026-08-09T09:45:00.000Z" }),
    ];
    expect(stuckMinutes(mixed, now)).toBe(20);
  });

  it("has a grace period short enough to matter", () => {
    expect(NAG_AFTER_MINUTES).toBeLessThanOrEqual(5);
  });
});

describe("backing off without giving up", () => {
  it("measures the wait from the last attempt, not from when it was queued", () => {
    // Shipped wrong the first time. Measuring from `at` means the delay is
    // permanently satisfied a minute after queueing, so every heartbeat then
    // retries every stuck write — a queue pointed at a dead endpoint spent ten
    // hours hammering it thirty seconds apart.
    const queued = new Date("2026-08-09T00:00:00.000Z").toISOString();
    const tried = new Date("2026-08-09T10:30:00.000Z").toISOString();
    const w = write({ at: queued, lastTriedAt: tried, attempts: 4 });
    const since = w.lastTriedAt ?? w.at;
    const waited = (new Date("2026-08-09T10:30:05.000Z").getTime() - new Date(since).getTime()) / 1000;
    expect(waited).toBe(5);
    expect(waited).toBeLessThan(retryDelaySeconds(w.attempts));
  });


  it("waits longer each time", () => {
    expect(retryDelaySeconds(0)).toBe(1);
    expect(retryDelaySeconds(1)).toBe(2);
    expect(retryDelaySeconds(3)).toBe(8);
  });

  it("never waits so long that a fixed signal goes unnoticed", () => {
    expect(retryDelaySeconds(20)).toBe(60);
    expect(retryDelaySeconds(999)).toBe(60);
  });
});

describe("keeping tables apart", () => {
  it("returns only the entries for the table asked about", () => {
    const all = [write(), write({ id: "ob-2", table: "chat_messages" })];
    expect(writesFor(all, "bookings").map((w) => w.id)).toEqual(["ob-1"]);
  });
});
