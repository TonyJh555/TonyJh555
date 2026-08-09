import { CATEGORIES } from "@/data/categories";
import type { CategoryId } from "./types";

/**
 * Rule-based problem → category matcher.
 *
 * Serves as the AI Advisor's offline fallback when no ANTHROPIC_API_KEY is
 * configured, and as the validator for category ids returned by Claude.
 */

export interface AdvisorResult {
  /** null when nothing matched confidently — don't recommend a wrong trade. */
  categoryId: CategoryId | null;
  /** Secondary suggestion, when the problem spans two trades. */
  altCategoryId?: CategoryId;
  urgency: "low" | "medium" | "high";
  safetyTips: string[];
  note: string;
  source: "claude" | "rules";
}

/**
 * Keywords → category, checked against the lowercased problem text. Includes
 * Malayalam word stems (so inflected forms like "നേഴ്സിനെ" still match "നേഴ്സ")
 * so the offline fallback understands common Kerala requests without the API key.
 */
const KEYWORDS: Record<CategoryId, string[]> = {
  elec: ["light", "fan", "switch", "wiring", "wire", "spark", "current", "shock", "socket", "mcb", "fuse", "short circuit", "power", "electric", "ഇലക്ട്രീഷ്യൻ", "കറന്റ്", "ഫാൻ", "ലൈറ്റ്", "സ്വിച്ച്", "വയറിംഗ്", "ഷോക്ക്"],
  plumb: ["leak", "tap", "pipe", "drain", "toilet", "flush", "geyser", "water tank", "blockage", "seepage", "plumb", "പ്ലംബർ", "പൈപ്പ്", "ടാപ്പ്", "ലീക്ക്", "വെള്ളം", "ക്ലോസറ്റ്"],
  mech: ["car", "bike", "scooter", "engine", "battery", "tyre", "puncture", "brake", "വണ്ടി", "ബൈക്ക്", "കാർ", "സ്കൂട്ടർ", "എഞ്ചിൻ"],
  ac: ["ac ", " ac", "air condition", "cooling", "gas refill", "split ac", "window ac", "എസി", "എയർ കണ്ടീഷൻ"],
  nurse: ["nurse", "injection", "iv drip", "wound", "dressing", "post surgery", "patient", "bedridden", "നേഴ്സ", "നഴ്സ", "ഇൻജക്ഷൻ", "രോഗി", "ഡ്രെസിംഗ്"],
  driver: ["driver", "drive", "airport", "outstation", "chauffeur", "ഡ്രൈവർ", "ഡ്രൈവിംഗ്"],
  nails: ["nail", "manicure", "pedicure", "gel polish", "nail art", "extensions", "cracked heel", "നഖം", "മാനിക്യൂർ", "പെഡിക്യൂർ", "നെയിൽ"],
  mehendi: ["mehendi", "mehandi", "henna", "bridal mehendi", "arabic mehendi", "മൈലാഞ്ചി", "മെഹന്ദി"],
  hair: ["haircut", "hair cut", "hair colour", "hair color", "hair spa", "keratin", "smoothening", "blow dry", "beard", "മുടി", "ഹെയർ", "മുടിവെട്ട്"],
  makeup: ["makeup", "make up", "bridal makeup", "party makeup", "saree draping", "മേക്കപ്പ്", "ബ്രൈഡൽ"],
  tutor: ["tutor", "tuition", "math", "science", "exam", "jee", "neet", "homework", "study", "ട്യൂഷൻ", "ട്യൂട്ടർ", "പഠിപ്പിക്ക"],
  cook: ["cook", "meal", "tiffin", "chef", "food daily", "പാചക", "കുക്ക്", "ഭക്ഷണം", "അടുക്കള"],
  clean: ["clean", "dust", "sofa", "carpet", "deep clean", "ക്ലീനിംഗ്", "വൃത്തിയാക്ക"],
  beauty: ["facial", "waxing", "threading", "makeup", "bridal", "parlour", "salon", "nail", "ബ്യൂട്ടി", "മേക്കപ്പ്", "ഫേഷ്യൽ"],
  carp: ["furniture", "cupboard", "wardrobe", "door", "hinge", "wood", "carpenter", "cabinet", "മരപ്പണി", "ഫർണിച്ചർ", "ആശാരി"],
  pest: ["cockroach", "termite", "rat", "rodent", "mosquito", "bed bug", "pest", "lizard", "പെസ്റ്റ്", "കൂറ", "എലി"],
  physio: ["physio", "joint pain", "back pain", "knee", "rehab", "exercise therapy", "sprain", "ഫിസിയോ"],
  painter: ["paint", "wall", "whitewash", "texture", "waterproof", "putty", "പെയിന്റ്", "ചായം"],
  movers: ["shift", "move house", "relocat", "packers", "luggage", "transport furniture", "മാറ്റം", "പാക്കേഴ്സ്"],
  yoga: ["yoga", "meditation", "pranayama", "breathing", "asana", "യോഗ", "ധ്യാനം"],
  photo: ["photo", "shoot", "camera", "portfolio", "wedding album", "videographer", "ഫോട്ടോ", "ഫോട്ടോഗ്രാഫർ"],
  cctv: ["cctv", "camera install", "security camera", "surveillance", "dvr", "nvr", "സിസിടിവി"],
  ro: ["ro ", "water purifier", "filter", "aquaguard", "uv install", "വാട്ടർ പ്യൂരിഫയർ"],
  massage: ["massage", " spa ", "body pain relax", "reflexology", "മസാജ്"],
  violin: ["violin", "violinist", "വയലിൻ"],
  piano: ["piano", "pianist", "keyboard player", "പിയാനോ"],
  guitar: ["guitar", "guitarist", "ഗിറ്റാർ"],
  singer: ["singer", "singing", "vocal", "song performance", "ഗായക", "പാട്ട്"],
  dance: ["dance", "choreograph", "bharatanatyam", "ഡാൻസ്", "നൃത്തം"],
  babysitter: ["baby", "babysit", "infant", "toddler", "child care", "kids alone", "nanny", "കുഞ്ഞ്", "ബേബി", "കുട്ടിയെ നോക്ക"],
  maid: ["maid", "house help", "housekeeping", "domestic help", "വീട്ടുജോലി", "മെയ്ഡ്", "വേലക്കാരി"],
  eldercare: ["elder", "old age", "grandfather", "grandmother", "senior citizen", "caretaker", "care taker", "dementia", "വൃദ്ധ", "കെയർടേക്കർ", "കെയർ ടേക്കർ", "മുത്തശ്ശി", "അപ്പൂപ്പൻ", "വയോധിക"],
  // "Bystander" is the word Kerala hospitals actually use, and "കൂട്ടിരിപ്പ്" is
  // the word the family uses. Both have to match or the search finds nothing.
  bystander: ["bystander", "by stander", "attender", "attendant", "hospital stay", "stay with patient", "ward", "icu", "admitted", "night at hospital", "കൂട്ടിരി", "ആശുപത്രിയിൽ", "വാർഡ്", "കൂട്ടിന്"],
  // errands is going WITH someone; shopper is going INSTEAD of them. The
  // keywords are split along that line on purpose — "accompany" here, "buy for
  // me" there — because both matching everything makes the advisor useless.
  errands: ["errand", "accompany", "go with", "take her to", "take him to", "drop at hospital", "bank", "post office", "ration", "pension", "bill payment", "outing", "ബാങ്ക്", "കൂടെ പോക", "കൂടെ വര", "പെൻഷൻ"],
  shopper: ["buy for me", "buy me", "purchase", "purchaser", "shopper", "shop for me", "send a list", "shopping list", "get me", "pick up from shop", "delivery from shop", "supermarket", "grocery", "groceries", "provision", "pharmacy", "vegetable", "fish market", "hardware shop", "വാങ്ങിത്തര", "വാങ്ങിക്കൊണ്ടുവര", "സാധനം വാങ്ങ", "പലചരക്ക്", "സൂപ്പർമാർക്കറ്റ്", "പച്ചക്കറി", "ലിസ്റ്റ്", "കടയിൽ"],
  catering: ["catering", "buffet", "party food", "live counter", "wedding food", "കാറ്ററിംഗ്"],
  events: ["waiter", "event staff", "usher", "party help", "bartend", "serving staff", "വെയിറ്റർ"],
};

const URGENT_WORDS = ["emergency", "urgent", "immediately", "asap", "sparking", "shock", "flood", "burst", "fire", "accident", "bleeding", "unconscious"];

const SAFETY_TIPS: Partial<Record<CategoryId, string[]>> = {
  elec: ["Switch off the main MCB before touching any wiring", "Keep water away from the affected area"],
  plumb: ["Close the main water valve to stop active leaks", "Move electronics away from water seepage"],
  ac: ["Turn the AC off at the socket until inspected"],
  nurse: ["For medical emergencies call 102/108 first — KAAM nurses are for home care, not emergencies"],
  pest: ["Keep children and pets away from treated areas for 4–6 hours"],
  babysitter: ["Always verify the sitter's OTP and ID badge before handing over your child"],
  eldercare: ["Keep an updated medication list ready for the caretaker"],
  bystander: [
    "A bystander stays with the patient — they do not give medicines or treatment. Ask the ward nurse for anything clinical",
    "Tell the hospital who your bystander is; most wards need the name at the counter",
  ],
  errands: [
    "Send the money before they set off — your helper should never pay out of their own pocket",
    "Share the doctor's appointment card or token number so nothing is missed at the counter",
  ],
  shopper: [
    "Send the money for the shopping before they reach the shop, not after",
    "KAAM charges for the trip only — nothing is added to your shopping bill",
    "Ask for a photo of the bill in chat; the change comes back with the goods",
  ],
};

/** Score every category against the problem text; highest first. */
export function matchByRules(problem: string): AdvisorResult {
  const text = ` ${problem.toLowerCase()} `;
  const scores = CATEGORIES.map((cat) => {
    let score = 0;
    for (const kw of KEYWORDS[cat.id] ?? []) {
      if (text.includes(kw)) score += kw.length > 4 ? 2 : 1;
    }
    for (const sub of cat.subServices) {
      if (text.includes(sub.toLowerCase())) score += 2;
    }
    if (text.includes(cat.label.toLowerCase())) score += 3;
    return { id: cat.id, score };
  }).sort((a, b) => b.score - a.score);

  const [best, second] = scores;
  // Don't guess a wrong trade — only recommend when a keyword actually matched.
  const categoryId: CategoryId | null = best.score > 0 ? best.id : null;
  const urgency = URGENT_WORDS.some((w) => text.includes(w))
    ? "high"
    : best.score >= 4
      ? "medium"
      : "low";

  return {
    categoryId,
    altCategoryId: second && second.score > 0 && second.score >= best.score / 2 ? second.id : undefined,
    urgency,
    safetyTips: categoryId ? (SAFETY_TIPS[categoryId] ?? []) : [],
    note: categoryId
      ? "Matched by KAAM's built-in advisor. Add an ANTHROPIC_API_KEY to enable full AI analysis."
      : "എനിക്ക് കൃത്യമായി മനസ്സിലായില്ല — ദയവായി പ്രശ്നം വിവരിക്കുക അല്ലെങ്കിൽ ഒരു സേവനം തിരഞ്ഞെടുക്കുക. (Couldn't confidently match your request — please describe it in a few words or pick a service.)",
    source: "rules",
  };
}

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORIES.some((c) => c.id === value);
}
