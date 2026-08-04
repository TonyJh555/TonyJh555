import { EVENT_FEE_CAP } from "./events";
import { PLATFORM_FEE_RATE } from "./pricing";

/**
 * Why an event company signs something and an electrician does not.
 *
 * A customer new to the city opens KAAM, finds four caterers, reads the
 * ratings, tastes the food and picks one. Somewhere in that fortnight the
 * company says "book me directly and I'll take 5% off". The customer saves
 * ₹15,000, the company keeps a little more than it would have, and KAAM —
 * which found the customer, held the brief, ran the comparison and paid for
 * the introduction — earns nothing at all.
 *
 * There is no technical answer to this. Tasting means sitting in a room
 * together; seeing past work means visiting a venue. Phone numbers are
 * exchanged there and no software prevents it, so a platform that tries looks
 * paranoid and gets deleted. Nor does price alone win it: at 5% off a
 * three-lakh wedding the customer is genuinely better off and the company is
 * too. Both sides gain, which is exactly why it happens.
 *
 * What does work is that the other side of the deal is a **business**. You
 * cannot enforce anything against "Suresh who does catering". You can against
 * a firm with a legal name, a GSTIN and a bank account, because that firm
 * signed something and has a great deal more to lose than one wedding.
 *
 * So an event company is not a worker signing up. It registers as a company,
 * proves it, and accepts terms that say plainly what KAAM takes and what
 * happens if a customer KAAM introduced is booked around it. Then the
 * enforcement is ordinary commercial recourse, not a chat filter.
 *
 * ⚠️ The clauses below are written to be read by a caterer in Thrissur, not by
 * a court. Have a lawyer draft the binding version before a single company
 * signs it — particularly the recovery clause, whose enforceability depends on
 * how it is framed under the Indian Contract Act.
 */

/** Bump when the terms change; every company must accept the current one. */
export const AGREEMENT_VERSION = 1;

/**
 * How long after an introduction a customer still "belongs" to KAAM.
 *
 * Twelve months is the ordinary commercial figure and it is defensible: it
 * covers the season a wedding is planned in, and it does not pretend to own a
 * relationship for ever. A customer who comes back to the same company three
 * years later found them on their own.
 */
export const NON_CIRCUMVENTION_MONTHS = 12;

export interface AgreementClause {
  heading: string;
  headingMl: string;
  body: string;
  bodyMl: string;
}

/**
 * The terms, in the words a company would actually use.
 *
 * The commission is stated first and in rupees, because the whole argument
 * starts with a number somebody guessed at. A company that can see the real
 * figure before it quotes has nothing to renegotiate in a car park later.
 */
export const AGREEMENT_CLAUSES: AgreementClause[] = [
  {
    heading: "What KAAM takes",
    headingMl: "കാം എടുക്കുന്നത്",
    body: `${Math.round(PLATFORM_FEE_RATE * 100)}% of the job, and never more than ₹${EVENT_FEE_CAP.toLocaleString("en-IN")} on any single event however large it is. Nothing is taken on a quote the customer does not accept, and nothing is taken on conversations, tastings or site visits.`,
    bodyMl: `ജോലിയുടെ ${Math.round(PLATFORM_FEE_RATE * 100)}%, ഒരു പരിപാടിക്ക് പരമാവധി ₹${EVENT_FEE_CAP.toLocaleString("en-IN")} മാത്രം — എത്ര വലുതായാലും. ഉപഭോക്താവ് സ്വീകരിക്കാത്ത വിലയ്ക്ക് ഒന്നും ഈടാക്കില്ല. സംസാരം, രുചി പരിശോധന, സ്ഥലം കാണൽ — ഇവയ്ക്കൊന്നും പണമില്ല.`,
  },
  {
    heading: "The money is held, not taken",
    headingMl: "പണം സൂക്ഷിക്കുന്നു, എടുക്കുന്നില്ല",
    body: "The customer pays into KAAM against the payment stages you set yourself. Each stage is released to you when it falls due. That is what lets a stranger hand over lakhs to a company they met online a fortnight ago.",
    bodyMl: "നിങ്ങൾ തന്നെ നിശ്ചയിക്കുന്ന ഘട്ടങ്ങൾക്കനുസരിച്ച് ഉപഭോക്താവ് കാമിലേക്ക് പണം അടയ്ക്കുന്നു. ഓരോ ഘട്ടവും സമയമാകുമ്പോൾ നിങ്ങൾക്ക് കൈമാറും. ഇതുകൊണ്ടാണ് ഒരു അപരിചിതൻ ലക്ഷങ്ങൾ ഏൽപ്പിക്കാൻ ധൈര്യപ്പെടുന്നത്.",
  },
  {
    heading: "Customers KAAM introduced",
    headingMl: "കാം പരിചയപ്പെടുത്തിയ ഉപഭോക്താക്കൾ",
    body: `If a customer first reached you through KAAM, any event you do for them within ${NON_CIRCUMVENTION_MONTHS} months goes through KAAM. Book it around us and the commission that would have been due is still payable, and the listing is withdrawn. Customers you already had, and anyone who finds you another way, are entirely your own — this claims nothing it did not bring you.`,
    bodyMl: `ഒരു ഉപഭോക്താവ് ആദ്യമായി നിങ്ങളെ കണ്ടെത്തിയത് കാം വഴിയാണെങ്കിൽ, ${NON_CIRCUMVENTION_MONTHS} മാസത്തിനുള്ളിൽ അവർക്കായി ചെയ്യുന്ന പരിപാടികൾ കാം വഴി തന്നെ വേണം. പുറത്ത് ബുക്ക് ചെയ്താൽ കമ്മീഷൻ നൽകേണ്ടിവരും, ലിസ്റ്റിംഗ് നീക്കം ചെയ്യും. നിങ്ങൾക്ക് നേരത്തെയുള്ള ഉപഭോക്താക്കളും മറ്റ് വഴികളിൽ വരുന്നവരും പൂർണ്ണമായും നിങ്ങളുടേതാണ്.`,
  },
  {
    heading: "You keep your own prices",
    headingMl: "വില നിങ്ങളുടേത് തന്നെ",
    body: "KAAM never sets what you charge, never asks you to undercut anyone, and never shows a customer one company's quote to another. Your payment stages are your own too.",
    bodyMl: "നിങ്ങളുടെ വില കാം നിശ്ചയിക്കില്ല, ആരെയും വില കുറയ്ക്കാൻ പറയില്ല, ഒരു കമ്പനിയുടെ വില മറ്റൊരാൾക്ക് കാണിക്കില്ല. പണം വാങ്ങുന്ന ഘട്ടങ്ങളും നിങ്ങളുടേത് തന്നെ.",
  },
  {
    heading: "The day itself",
    headingMl: "പരിപാടിയുടെ ദിവസം",
    body: "You turn up and do what the accepted quote says. A function cannot be run again, so an event abandoned after acceptance is the one thing that ends a listing immediately.",
    bodyMl: "സ്വീകരിച്ച വിലയിൽ പറഞ്ഞത് ചെയ്യണം. ഒരു ചടങ്ങ് വീണ്ടും നടത്താൻ കഴിയില്ല — സ്വീകരിച്ചശേഷം ഉപേക്ഷിച്ചാൽ ലിസ്റ്റിംഗ് ഉടൻ അവസാനിക്കും.",
  },
];

/** What a company has signed, and when. */
export interface AcceptedAgreement {
  version: number;
  acceptedAt: string;
  /** The person who accepted, by name — a signature needs a signatory. */
  acceptedBy: string;
}

/* ── Proving the company is a company ──────────────────────────────── */

/**
 * GSTIN: two-digit state code, the holder's PAN, an entity digit, 'Z', and a
 * checksum character. Shape only — the real check is the certificate a human
 * reads at the verification desk.
 */
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;

/** Kerala's GST state code. Warned about, never blocked. */
export const KERALA_GST_CODE = "32";

export function isValidGstin(gstin: string): boolean {
  return GSTIN_RE.test(gstin.trim().toUpperCase());
}

export function isValidPan(pan: string): boolean {
  return PAN_RE.test(pan.trim().toUpperCase());
}

/**
 * The PAN embedded in a GSTIN — characters 3 to 12.
 *
 * Checking the two against each other catches the ordinary mistake (a digit
 * mistyped in one of them) without anyone leaving the form.
 */
export function panFromGstin(gstin: string): string {
  return gstin.trim().toUpperCase().slice(2, 12);
}

export interface RegistrationProblem {
  field: "legalName" | "gstin" | "pan";
  message: string;
  messageMl: string;
}

/**
 * What is wrong with the registration details, if anything.
 *
 * Returns every problem rather than the first, because a form that reveals one
 * fault at a time is a form people abandon.
 */
export function registrationProblems(input: {
  legalName: string;
  gstin: string;
  pan: string;
}): RegistrationProblem[] {
  const out: RegistrationProblem[] = [];
  if (input.legalName.trim().length < 3) {
    out.push({
      field: "legalName",
      message: "Enter the registered name of the business, exactly as on the GST certificate.",
      messageMl: "ജി.എസ്.ടി സർട്ടിഫിക്കറ്റിലുള്ള അതേ പേര് നൽകൂ.",
    });
  }
  if (!isValidGstin(input.gstin)) {
    out.push({
      field: "gstin",
      message: "That doesn't look like a GSTIN. It is 15 characters, e.g. 32AABCU9603R1ZM.",
      messageMl: "ഇത് ശരിയായ ജി.എസ്.ടി നമ്പർ അല്ല. 15 അക്ഷരങ്ങൾ വേണം — ഉദാ: 32AABCU9603R1ZM.",
    });
  }
  if (!isValidPan(input.pan)) {
    out.push({
      field: "pan",
      message: "That doesn't look like a PAN. It is 10 characters, e.g. AABCU9603R.",
      messageMl: "ഇത് ശരിയായ പാൻ അല്ല. 10 അക്ഷരങ്ങൾ വേണം — ഉദാ: AABCU9603R.",
    });
  }
  // Only worth comparing once both are individually well-formed.
  if (
    out.length === 0 &&
    panFromGstin(input.gstin) !== input.pan.trim().toUpperCase()
  ) {
    out.push({
      field: "pan",
      message: "The PAN doesn't match the one inside your GSTIN — check both for a typo.",
      messageMl: "ജി.എസ്.ടി നമ്പറിനുള്ളിലെ പാനുമായി ഇത് ചേരുന്നില്ല — രണ്ടും ഒന്നുകൂടി നോക്കൂ.",
    });
  }
  return out;
}

/** Has this company signed the terms that are currently in force? */
export function agreementCurrent(
  agreement: AcceptedAgreement | undefined,
): boolean {
  return agreement?.version === AGREEMENT_VERSION;
}

/**
 * May this company price a customer's function?
 *
 * Approval says KAAM checked them. The agreement says they know what KAAM
 * takes and what happens if a customer is booked around it. Quoting before
 * both is how a commission becomes an argument three weeks later.
 */
export function mayQuote(company: {
  status: string;
  agreement?: AcceptedAgreement;
}): boolean {
  return company.status === "approved" && agreementCurrent(company.agreement);
}
