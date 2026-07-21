import type { TicketCategory } from "./support";

/**
 * Canned replies — one-tap common responses so agents answer in seconds and
 * stay consistent (the macro/quick-reply feature every support tool has). An
 * agent taps one to prefill the reply box, then edits if needed before send.
 */
export interface CannedReply {
  label: string;
  text: string;
  /** If set, only surfaced for these ticket categories; else always. */
  categories?: TicketCategory[];
}

export const CANNED_REPLIES: CannedReply[] = [
  {
    label: "Looking into it",
    text: "Thanks for reaching out — we're looking into this right away and will update you shortly.",
  },
  {
    label: "Refund processing",
    text: "Your refund is being processed and will reach your KAAM Cash within 3–5 working days. Sorry for the trouble!",
    categories: ["refund", "payment"],
  },
  {
    label: "Payout queued",
    text: "Your payout is queued and should hit your bank within 24 hours. We'll confirm once it's sent.",
    categories: ["payment"],
  },
  {
    label: "Reassigned a worker",
    text: "We're sorry about this. We've arranged another verified worker for you — please check My Bookings.",
    categories: ["quality", "safety"],
  },
  {
    label: "Noted on record",
    text: "Thank you for flagging this. We've noted it on the worker's record and our team will follow up.",
    categories: ["safety", "quality"],
  },
  {
    label: "Need more details",
    text: "To help faster, could you share the booking date and a bit more detail about what happened?",
  },
  {
    label: "Anything else?",
    text: "Glad we could help! Is there anything else we can do for you?",
  },
];

/** Canned replies relevant to a ticket's category (category-specific first). */
export function cannedFor(category: TicketCategory): CannedReply[] {
  const specific = CANNED_REPLIES.filter((r) => r.categories?.includes(category));
  const general = CANNED_REPLIES.filter((r) => !r.categories);
  return [...specific, ...general];
}
