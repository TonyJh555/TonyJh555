import type { EventRequest } from "./events";

/**
 * Where a wedding actually gets agreed.
 *
 * Everything about the event flow assumed a company could read a brief and
 * name a price. Nobody prices a wedding that way. Before a caterer can quote
 * at all they need to ask whether it is vegetarian, whether the venue kitchen
 * is usable, whether serving staff are included, whether the 400 is a real
 * number or a hope — and then the customer wants the menu changed twice and
 * the headcount moved once.
 *
 * None of that could happen on KAAM. `EventRequest.notes` is one field written
 * once; `EventQuote.note` is one field written once; there is no reply. Chat
 * is keyed to a booking, and no booking exists until the event is awarded — so
 * the conversation had nowhere to live during the weeks it actually happens.
 *
 * Then `offsite.ts` caught the phone number in the one field they had. KAAM
 * was blocking the workaround to a gap KAAM had left, and both sides
 * experienced that as the platform being in the way. It is hard to think of a
 * faster way to lose a company.
 *
 * So: a room, per company, from the moment they are invited. Free, unlimited
 * and open before anyone has paid anything — nothing about a discussion should
 * feel metered, or the pressure to move it elsewhere starts on day one.
 *
 * There is no new store. Chat threads are keyed by an opaque string that has
 * always happened to hold a booking id; giving it an event key instead costs
 * nothing and means these conversations get the read-receipts, the photo
 * sharing and the cloud sync that already work.
 */

/** The thread key for one customer-and-company conversation about one event. */
export function eventThreadId(requestId: string, companyId: string): string {
  return `evt:${requestId}:${companyId}`;
}

/** Is this thread an event negotiation rather than a job? */
export function isEventThread(threadId: string): boolean {
  return threadId.startsWith("evt:");
}

/** The request and company a thread belongs to, or null if it isn't one. */
export function parseEventThread(
  threadId: string,
): { requestId: string; companyId: string } | null {
  if (!isEventThread(threadId)) return null;
  const [, requestId, companyId] = threadId.split(":");
  return requestId && companyId ? { requestId, companyId } : null;
}

/**
 * The opening message, so a company never arrives at an empty box.
 *
 * A blank thread asks the company to work out what to say; this asks the
 * questions that have to be answered before any wedding can be priced, in the
 * customer's own brief. It is the difference between a room and a room with a
 * table in it.
 */
export function openingBrief(request: EventRequest): string {
  const lines = [
    `📋 ${request.guests} guests · ${request.venue} · ${request.date}`,
    request.budget > 0 ? `Budget in mind: ₹${request.budget.toLocaleString("en-IN")}` : null,
    request.notes?.trim() ? `Notes: ${request.notes.trim()}` : null,
    "",
    "Ask anything you need before quoting — this chat is free and stays open until the event is over.",
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/**
 * Can these two still talk?
 *
 * Until the customer awards the job, every invited company can. Afterwards
 * only the one that won it — the losing companies have no reason to keep a
 * line open to someone else's customer, and a customer who picked somebody
 * should not still be fielding pitches.
 */
export function canTalk(
  request: Pick<EventRequest, "status" | "invitedIds" | "awardedQuoteId">,
  companyId: string,
  awardedCompanyId?: string,
): boolean {
  if (!request.invitedIds.includes(companyId)) return false;
  if (request.status === "cancelled") return false;
  if (request.status === "awarded") return awardedCompanyId === companyId;
  return true;
}
