/**
 * Keeping the deal on KAAM — and being honest about why.
 *
 * On a fan repair KAAM's cut is ₹88 and nobody bothers going around it. On a
 * three-lakh wedding it is ₹45,000, and both sides can do that arithmetic. The
 * moment a phone number lands in a quote note, the booking moves to WhatsApp
 * and KAAM earns nothing on the largest transaction it will ever touch.
 *
 * The answer is not to hide contact details and hope. It is to make the
 * platform worth its cut and to say so plainly at the moment somebody is
 * tempted: the milestone plan both sides agreed, the money held to it, the
 * record if it goes wrong, and a dispute desk that answers. None of that
 * survives a WhatsApp deal, and the customer — who is about to hand over lakhs
 * to a stranger — loses more than KAAM does.
 *
 * So free text is checked before it is sent, the sender is told exactly what
 * was found and what they would both be giving up, and the attempt is recorded
 * for the admin desk. Nothing is silently deleted: a company that thinks its
 * message went through and hears nothing back blames KAAM, not itself.
 *
 * Pure and framework-free, so the rules can be tested rather than trusted.
 */

export type ContactKind = "phone" | "email" | "link" | "handle";

export interface ContactHit {
  kind: ContactKind;
  /** The exact text that matched, for showing the sender what to remove. */
  text: string;
}

/**
 * A 10-digit Indian mobile, however it has been dressed up — spaces, dashes,
 * dots, a +91, a leading 0. Deliberately tolerant, because someone trying to
 * pass a number along will space it out.
 */
const PHONE = /(?:\+?91[\s.-]?)?(?:0)?[6-9](?:[\s.-]?\d){9}/g;
const EMAIL = /[a-zA-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const LINK = /(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+\.(?:com|in|co\.in|net|org|me)\b/gi;
const HANDLE = /(?:^|\s)@[a-zA-Z0-9._]{3,}/g;

/** Words that give away an attempt even when the digits are spelled out. */
const OFFSITE_WORDS =
  /\b(whats\s?app|wtsapp|watsapp|telegram|call me|contact me|my number|direct(?:ly)?\s+(?:deal|pay|contact)|outside\s+(?:the\s+)?app|cash\s+deal)\b/gi;

/**
 * Every contact detail found in a piece of free text.
 *
 * Note what is NOT flagged: prices, dates, guest counts, GST numbers and years
 * are all numbers a legitimate quote is full of. Only a plausible mobile
 * shape counts, so "400 guests" and "₹45000" pass through untouched.
 */
export function findContactDetails(text: string): ContactHit[] {
  if (!text) return [];
  const hits: ContactHit[] = [];
  const seen = new Set<string>();

  const push = (kind: ContactKind, raw: string) => {
    const value = raw.trim();
    const key = `${kind}:${value.toLowerCase()}`;
    if (!value || seen.has(key)) return;
    seen.add(key);
    hits.push({ kind, text: value });
  };

  // Emails first — an email contains an @ that would otherwise read as a
  // handle, and a domain that would read as a link.
  const withoutEmails = text.replace(EMAIL, (m) => {
    push("email", m);
    return " ".repeat(m.length);
  });

  const withoutLinks = withoutEmails.replace(LINK, (m) => {
    push("link", m);
    return " ".repeat(m.length);
  });

  for (const m of withoutLinks.matchAll(HANDLE)) push("handle", m[0]);

  for (const m of withoutLinks.matchAll(PHONE)) {
    // A real mobile is exactly ten digits once the country code is stripped.
    const digits = m[0].replace(/\D/g, "").replace(/^(?:91)?0?/, "");
    if (digits.length === 10) push("phone", m[0]);
  }

  for (const m of withoutLinks.matchAll(OFFSITE_WORDS)) push("handle", m[0]);

  return hits;
}

/** Does this text try to move the conversation off KAAM? */
export function looksOffsite(text: string): boolean {
  return findContactDetails(text).length > 0;
}

export interface OffsiteWarning {
  hits: ContactHit[];
  title: string;
  titleMl: string;
  body: string;
  bodyMl: string;
}

/**
 * What to show the sender. Written to persuade rather than scold: the person
 * typing a phone number is usually trying to be helpful, not to cheat, and a
 * marketplace that treats them as a thief loses them.
 */
export function offsiteWarning(
  text: string,
  side: "company" | "customer",
): OffsiteWarning | null {
  const hits = findContactDetails(text);
  if (hits.length === 0) return null;

  return side === "company"
    ? {
        hits,
        title: "Please take the contact details out",
        titleMl: "കോൺടാക്ട് വിവരങ്ങൾ ഒഴിവാക്കൂ",
        body:
          "Quotes settled off KAAM lose the payment plan you just wrote, the money held to it, and the record if the customer disputes the work. Send it here and the stages are enforced for you.",
        bodyMl:
          "കാമിന് പുറത്ത് ഉറപ്പിക്കുന്ന ജോലിക്ക് നിങ്ങൾ എഴുതിയ പേയ്‌മെന്റ് ഘട്ടങ്ങൾ ഉറപ്പില്ല, തർക്കമുണ്ടായാൽ രേഖയുമില്ല. ഇവിടെ അയച്ചാൽ ആ ഘട്ടങ്ങൾ കാം ഉറപ്പാക്കും.",
      }
    : {
        hits,
        title: "Please take your contact details out",
        titleMl: "നിങ്ങളുടെ കോൺടാക്ട് വിവരങ്ങൾ ഒഴിവാക്കൂ",
        body:
          "Paying a company directly means no agreed payment stages, no refund if they don't turn up, and nobody to call if the stage isn't built on the morning. Book it here and every rupee is tied to a stage you approved.",
        bodyMl:
          "നേരിട്ട് പണം നൽകിയാൽ ഉറപ്പിച്ച ഘട്ടങ്ങളില്ല, അവർ വന്നില്ലെങ്കിൽ പണം തിരികെയില്ല, പരാതി പറയാൻ ആരുമില്ല. ഇവിടെ ബുക്ക് ചെയ്താൽ ഓരോ രൂപയും നിങ്ങൾ അംഗീകരിച്ച ഘട്ടത്തോട് ചേർന്നിരിക്കും.",
      };
}

/** One recorded attempt, for the admin desk to look at patterns. */
export interface OffsiteAttempt {
  at: string;
  by: "company" | "customer";
  actorId: string;
  requestId?: string;
  kinds: ContactKind[];
}

/**
 * A single attempt is usually a habit, not a scheme. Repeated ones from the
 * same company are the signal worth acting on, so the admin desk counts rather
 * than reacts.
 */
export function offsiteAttemptFrom(
  text: string,
  by: OffsiteAttempt["by"],
  actorId: string,
  requestId?: string,
  now: Date = new Date(),
): OffsiteAttempt | null {
  const hits = findContactDetails(text);
  if (hits.length === 0) return null;
  return {
    at: now.toISOString(),
    by,
    actorId,
    requestId,
    kinds: [...new Set(hits.map((h) => h.kind))],
  };
}
