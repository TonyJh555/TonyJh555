import type { CategoryId } from "./types";

/**
 * Whose money buys the shopping.
 *
 * "Buy For Me" and the errand trips are the only jobs on KAAM where the worker
 * handles the customer's cash rather than only their own labour, and that one
 * difference creates two ways to hurt somebody that no other trade has:
 *
 * 1. **The worker fronts the money.** A ₹300 trip that requires ₹4,000 of
 *    groceries first is not a ₹300 job — it is a ₹4,000 loan from the poorest
 *    person in the transaction, repaid only if the customer answers the door.
 *    So the money goes out before the shopping does. A worker who is asked to
 *    pay first should refuse, and the app has to say so plainly enough that
 *    refusing feels normal rather than rude.
 *
 * 2. **KAAM takes a cut of the bill.** Commission on ₹4,000 of rice is not a
 *    fee for a service, it is a tax on groceries, and it would make the app
 *    more expensive than walking. The commissionable amount is the trip and
 *    nothing else — `commissionableAmount` exists so that stays true even if
 *    somebody later wires the bill total into a quote by accident.
 *
 * Everything here is arithmetic and rules; it holds no money and touches no
 * store. What the customer actually sends travels by UPI between the two of
 * them, which is why the change has to be worked out in the open.
 */

/** Trades where the worker spends the customer's money on goods. */
const SPENDS_CUSTOMER_MONEY = new Set<CategoryId>(["shopper", "errands"]);

export function handlesShoppingMoney(categoryId: CategoryId): boolean {
  return SPENDS_CUSTOMER_MONEY.has(categoryId);
}

/**
 * The most a worker should ever be out of pocket: nothing.
 *
 * Written as a constant rather than left implicit because the temptation to
 * "just let them cover small amounts" arrives the first time a customer is slow
 * to send money, and small amounts are exactly what a worker on a ₹300 trip
 * cannot cover.
 */
export const WORKER_FLOAT_CAP = 0;

/** Is this worker being asked to pay for the goods themselves? */
export function workerOutOfPocket(sentByCustomer: number, billTotal: number): boolean {
  return billTotal - sentByCustomer > WORKER_FLOAT_CAP;
}

export interface ShoppingSettlement {
  /** ₹ the worker hands back to the customer. */
  changeDue: number;
  /** ₹ the customer still owes — the shopping cost more than they sent. */
  topUpDue: number;
  /** True when the worker paid the difference and must be made whole. */
  workerCovered: boolean;
}

/**
 * What is owed once the shopping is done.
 *
 * Never both: money flows one way. A bill that came in under the amount sent
 * returns change; a bill that came in over means the worker covered the gap and
 * is owed it back, which is the case that gets forgotten and the case that
 * matters most.
 */
export function settleShopping(sentByCustomer: number, billTotal: number): ShoppingSettlement {
  const sent = Math.max(0, Math.round(sentByCustomer));
  const bill = Math.max(0, Math.round(billTotal));
  const gap = bill - sent;
  return {
    changeDue: gap < 0 ? -gap : 0,
    topUpDue: gap > 0 ? gap : 0,
    workerCovered: gap > 0,
  };
}

/**
 * The part of a shopping job KAAM may charge commission on.
 *
 * The trip fee, never the bill. Passing the bill in and getting it ignored is
 * the whole point — this is a guard, not a calculation.
 */
export function commissionableAmount(tripFee: number, billTotal: number): number {
  void billTotal;
  return Math.max(0, tripFee);
}

/**
 * The record of the money, kept by whoever actually knows each number.
 *
 * The customer records what they sent, because only they know they sent it.
 * The worker records what the shopping came to and photographs the bill,
 * because only they were at the till. Neither side may write the other's
 * figure — a ledger one person fills in alone is that person's word, and the
 * argument it is meant to prevent is exactly the argument it would cause.
 * (The cash-confirmation flow already works this way for the same reason.)
 */
export interface ShoppingLedger {
  /** ₹ the customer sent for the goods. Customer's entry only. */
  sent?: number;
  sentAt?: string;
  /** ₹ the shopping came to. Worker's entry only. */
  bill?: number;
  billAt?: string;
  /** The receipt, photographed. What makes `bill` checkable rather than claimed. */
  billPhoto?: string;
  /** When the change — or the money owed back to the worker — changed hands. */
  settledAt?: string;
}

export type ShoppingStage =
  /** Nothing sent yet. Nobody should be walking to a shop. */
  | "awaiting_money"
  /** Money is with the worker; the shopping hasn't been rung up. */
  | "shopping"
  /** Both figures are in and somebody is owed something. */
  | "awaiting_settlement"
  /** Done: either it balanced exactly, or the difference changed hands. */
  | "settled";

export function shoppingStage(ledger: ShoppingLedger | undefined): ShoppingStage {
  if (!ledger?.sent) return "awaiting_money";
  if (ledger.bill === undefined) return "shopping";
  if (ledger.settledAt) return "settled";
  const { changeDue, topUpDue } = settleShopping(ledger.sent, ledger.bill);
  // An exact bill needs no handover, so there is nothing left to confirm.
  return changeDue === 0 && topUpDue === 0 ? "settled" : "awaiting_settlement";
}

/**
 * What is owed, once both sides have written their number down.
 *
 * Null until then — deliberately. Treating a missing bill as ₹0 would show the
 * customer the entire amount they sent as "change due" the moment they sent
 * it, which is a promise of money that isn't coming back.
 */
export function ledgerSettlement(
  ledger: ShoppingLedger | undefined,
): ShoppingSettlement | null {
  if (!ledger?.sent || ledger.bill === undefined) return null;
  return settleShopping(ledger.sent, ledger.bill);
}

/** Whether this side is the one who writes this figure. */
export function mayRecord(
  field: "sent" | "bill",
  viewer: "customer" | "worker",
): boolean {
  return field === "sent" ? viewer === "customer" : viewer === "worker";
}

/** The rule, in both languages, for the screen the customer actually reads. */
export const SHOPPING_MONEY = {
  title: "Money for the shopping",
  titleMl: "സാധനങ്ങൾക്കുള്ള പണം",
  lines: [
    {
      en: "Send the money for the shopping before they leave for the shop — never after.",
      ml: "കടയിൽ പോകുന്നതിന് മുൻപ് സാധനങ്ങൾക്കുള്ള പണം അയയ്ക്കുക — ശേഷം അല്ല.",
    },
    {
      en: "KAAM charges only for the trip. Nothing is taken from your shopping bill.",
      ml: "കാം യാത്രയ്ക്ക് മാത്രമേ ചാർജ് ചെയ്യൂ. നിങ്ങളുടെ ബില്ലിൽ നിന്ന് ഒന്നും എടുക്കില്ല.",
    },
    {
      en: "You get the bill and the change back. Ask for a photo of the bill in chat.",
      ml: "ബില്ലും ബാക്കി പണവും തിരികെ കിട്ടും. ബില്ലിന്റെ ഫോട്ടോ ചാറ്റിൽ ചോദിക്കാം.",
    },
  ],
  /** Shown to the worker, where the harm actually lands. */
  worker: {
    en: "Never buy with your own money. If the amount hasn't reached you, wait — KAAM will back you.",
    ml: "ഒരിക്കലും സ്വന്തം പണം കൊണ്ട് വാങ്ങരുത്. പണം കിട്ടിയില്ലെങ്കിൽ കാത്തിരിക്കുക — കാം നിങ്ങളുടെ കൂടെയുണ്ട്.",
  },
} as const;
