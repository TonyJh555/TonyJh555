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
