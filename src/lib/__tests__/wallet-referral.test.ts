import { describe, expect, it } from "vitest";
import { referralEarnings, REFERRAL_REWARD } from "../wallet";

const txn = (amount: number, reason: string) => ({ id: reason, amount, reason, createdAt: "2026-07-15" });

describe("referralEarnings", () => {
  it("sums only referral-related credits", () => {
    const txns = [
      txn(REFERRAL_REWARD, "Referral bonus (KAAMAB12)"),
      txn(REFERRAL_REWARD, "Referral bonus (KAAMCD34)"),
      txn(100, "Welcome bonus 🎉"),
      txn(250, "Refund · cancelled cleaning"),
    ];
    expect(referralEarnings(txns)).toBe(2 * REFERRAL_REWARD);
  });

  it("is zero with no referral credits", () => {
    expect(referralEarnings([txn(100, "Welcome bonus 🎉")])).toBe(0);
    expect(referralEarnings([])).toBe(0);
  });
});
