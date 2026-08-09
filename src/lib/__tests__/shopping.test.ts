import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/data/categories";
import {
  commissionableAmount,
  handlesShoppingMoney,
  ledgerSettlement,
  mayRecord,
  settleShopping,
  shoppingStage,
  WORKER_FLOAT_CAP,
  workerOutOfPocket,
} from "../shopping";
import { serviceDetail } from "@/data/service-details";

describe("which trades handle the customer's money", () => {
  it("covers buying and errands, and nothing else", () => {
    expect(handlesShoppingMoney("shopper")).toBe(true);
    expect(handlesShoppingMoney("errands")).toBe(true);
    expect(handlesShoppingMoney("elec")).toBe(false);
    expect(handlesShoppingMoney("bystander")).toBe(false);
  });
});

describe("a worker never buys with their own money", () => {
  it("allows no float at all", () => {
    expect(WORKER_FLOAT_CAP).toBe(0);
  });

  it("flags the moment the bill exceeds what was sent", () => {
    expect(workerOutOfPocket(2000, 2001)).toBe(true);
    expect(workerOutOfPocket(2000, 2000)).toBe(false);
    expect(workerOutOfPocket(2000, 1740)).toBe(false);
  });
});

describe("settling the shopping", () => {
  it("returns the change when the bill came in under", () => {
    const s = settleShopping(2000, 1740);
    expect(s).toEqual({ changeDue: 260, topUpDue: 0, workerCovered: false });
  });

  it("owes the worker back when the bill came in over", () => {
    const s = settleShopping(1500, 1780);
    expect(s).toEqual({ changeDue: 0, topUpDue: 280, workerCovered: true });
  });

  it("never owes both ways at once", () => {
    for (const [sent, bill] of [[0, 0], [500, 500], [900, 100], [100, 900]]) {
      const s = settleShopping(sent, bill);
      expect(s.changeDue > 0 && s.topUpDue > 0).toBe(false);
    }
  });

  it("treats a negative amount as nothing sent rather than as a credit", () => {
    // A stray minus sign must not turn into money the customer is owed.
    expect(settleShopping(-500, 400)).toEqual({
      changeDue: 0,
      topUpDue: 400,
      workerCovered: true,
    });
  });
});

describe("commission never touches the shopping bill", () => {
  it("charges on the trip only, however large the bill", () => {
    expect(commissionableAmount(300, 0)).toBe(300);
    expect(commissionableAmount(300, 4000)).toBe(300);
    expect(commissionableAmount(300, 100000)).toBe(300);
  });

  it("never goes negative", () => {
    expect(commissionableAmount(-50, 4000)).toBe(0);
  });
});

describe("each side writes only the figure it actually knows", () => {
  it("lets the customer say what they sent and nothing else", () => {
    expect(mayRecord("sent", "customer")).toBe(true);
    expect(mayRecord("bill", "customer")).toBe(false);
  });

  it("lets the worker say what the bill came to and nothing else", () => {
    // A ledger one person fills in alone is that person's word, which is
    // exactly the argument it exists to prevent.
    expect(mayRecord("bill", "worker")).toBe(true);
    expect(mayRecord("sent", "worker")).toBe(false);
  });
});

describe("where a shopping job has got to", () => {
  it("starts with nobody having sent anything", () => {
    expect(shoppingStage(undefined)).toBe("awaiting_money");
    expect(shoppingStage({})).toBe("awaiting_money");
  });

  it("moves to shopping once the money is out", () => {
    expect(shoppingStage({ sent: 2000 })).toBe("shopping");
  });

  it("waits on the handover once both figures are in", () => {
    expect(shoppingStage({ sent: 2000, bill: 1740 })).toBe("awaiting_settlement");
    expect(shoppingStage({ sent: 1500, bill: 1780 })).toBe("awaiting_settlement");
  });

  it("needs no handover when the bill landed exactly", () => {
    // There is nothing to hand over, so asking either side to confirm one
    // would leave the job stuck on a button that means nothing.
    expect(shoppingStage({ sent: 2000, bill: 2000 })).toBe("settled");
  });

  it("is done once the difference has changed hands", () => {
    expect(shoppingStage({ sent: 2000, bill: 1740, settledAt: "2026-08-09T10:00:00Z" })).toBe(
      "settled",
    );
  });

  it("treats a zero bill as a real figure, not a missing one", () => {
    // "The shop had nothing" is a legitimate outcome, and it means the whole
    // amount comes back rather than the job hanging in mid-air forever.
    expect(shoppingStage({ sent: 500, bill: 0 })).toBe("awaiting_settlement");
    expect(ledgerSettlement({ sent: 500, bill: 0 })?.changeDue).toBe(500);
  });
});

describe("the ledger says nothing until both sides have spoken", () => {
  it("works out nothing from half a record", () => {
    // Reading a missing bill as ₹0 would show the customer everything they
    // sent as "change due" the moment they sent it — a promise of money that
    // is not coming back.
    expect(ledgerSettlement(undefined)).toBeNull();
    expect(ledgerSettlement({ sent: 2000 })).toBeNull();
    expect(ledgerSettlement({ bill: 1740 })).toBeNull();
  });

  it("works out the change once it can", () => {
    expect(ledgerSettlement({ sent: 2000, bill: 1740 })).toEqual({
      changeDue: 260,
      topUpDue: 0,
      workerCovered: false,
    });
  });
});

describe("the three new services are wired up", () => {
  const ids = ["bystander", "errands", "shopper"] as const;

  it("each exists in the catalogue, in a real group, with sub-services", () => {
    for (const id of ids) {
      const cat = CATEGORIES.find((c) => c.id === id);
      expect(cat, id).toBeDefined();
      expect(cat!.subServices.length, id).toBeGreaterThan(2);
      expect(cat!.basePrice, id).toBeGreaterThan(0);
    }
  });

  it("every sub-service carries its own duration and starting price", () => {
    // These are the trades where "12-hour night shift" and "medicine pickup"
    // are wildly different jobs — a single category price tells nobody
    // anything.
    for (const id of ids) {
      const cat = CATEGORIES.find((c) => c.id === id)!;
      for (const sub of cat.subServices) {
        const detail = serviceDetail(id, sub);
        expect(detail, `${id} / ${sub}`).not.toBeNull();
        expect(detail!.minutes).toBeGreaterThan(0);
        expect(detail!.from).toBeGreaterThan(0);
      }
    }
  });
});
