import { CATEGORIES } from "@/data/categories";
import type { CategoryId } from "./types";

/**
 * Rule-based problem → category matcher.
 *
 * Serves as the AI Advisor's offline fallback when no ANTHROPIC_API_KEY is
 * configured, and as the validator for category ids returned by Claude.
 */

export interface AdvisorResult {
  categoryId: CategoryId;
  /** Secondary suggestion, when the problem spans two trades. */
  altCategoryId?: CategoryId;
  urgency: "low" | "medium" | "high";
  safetyTips: string[];
  note: string;
  source: "claude" | "rules";
}

/** Keywords → category, checked against the lowercased problem text. */
const KEYWORDS: Record<CategoryId, string[]> = {
  elec: ["light", "fan", "switch", "wiring", "wire", "spark", "current", "shock", "socket", "mcb", "fuse", "short circuit", "power", "bijli", "electricity"],
  plumb: ["leak", "tap", "pipe", "drain", "toilet", "flush", "geyser", "water tank", "blockage", "seepage", "nal", "pani"],
  mech: ["car", "bike", "scooter", "engine", "battery", "tyre", "puncture", "brake", "gaadi"],
  ac: ["ac ", " ac", "air condition", "cooling", "gas refill", "split ac", "window ac"],
  nurse: ["nurse", "injection", "iv drip", "wound", "dressing", "post surgery", "patient", "bedridden"],
  driver: ["driver", "drive", "airport", "outstation", "chauffeur"],
  tutor: ["tutor", "tuition", "math", "science", "exam", "jee", "neet", "homework", "study", "padhai"],
  cook: ["cook", "khana", "meal", "tiffin", "chef", "food daily"],
  clean: ["clean", "dust", "sofa", "carpet", "safai", "deep clean"],
  beauty: ["facial", "waxing", "threading", "makeup", "bridal", "parlour", "salon", "nail"],
  carp: ["furniture", "cupboard", "wardrobe", "door", "hinge", "wood", "carpenter", "cabinet"],
  pest: ["cockroach", "termite", "rat", "rodent", "mosquito", "bed bug", "pest", "lizard"],
  physio: ["physio", "joint pain", "back pain", "knee", "rehab", "exercise therapy", "sprain"],
  painter: ["paint", "wall", "whitewash", "texture", "waterproof", "putty"],
  movers: ["shift", "move house", "relocat", "packers", "luggage", "transport furniture"],
  yoga: ["yoga", "meditation", "pranayama", "breathing", "asana"],
  photo: ["photo", "shoot", "camera", "portfolio", "wedding album", "videographer"],
  cctv: ["cctv", "camera install", "security camera", "surveillance", "dvr", "nvr"],
  ro: ["ro ", "water purifier", "filter", "aquaguard", "uv install"],
  massage: ["massage", " spa ", "body pain relax", "reflexology"],
  violin: ["violin", "violinist"],
  piano: ["piano", "pianist", "keyboard player"],
  guitar: ["guitar", "guitarist"],
  singer: ["singer", "singing", "sangeet", "vocal", "song performance"],
  dance: ["dance", "choreograph", "bharatanatyam", "bollywood dance"],
  babysitter: ["baby", "babysit", "infant", "toddler", "child care", "kids alone", "nanny"],
  maid: ["maid", "house help", "housekeeping", "jhadu", "domestic help", "kaam wali"],
  eldercare: ["elder", "old age", "grandfather", "grandmother", "senior citizen", "caretaker", "dementia"],
  catering: ["catering", "buffet", "party food", "live counter", "wedding food"],
  events: ["waiter", "event staff", "usher", "party help", "bartend", "serving staff"],
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
  const categoryId = best.score > 0 ? best.id : "elec";
  const urgency = URGENT_WORDS.some((w) => text.includes(w))
    ? "high"
    : best.score >= 4
      ? "medium"
      : "low";

  return {
    categoryId,
    altCategoryId: second && second.score > 0 && second.score >= best.score / 2 ? second.id : undefined,
    urgency,
    safetyTips: SAFETY_TIPS[categoryId] ?? [],
    note:
      best.score > 0
        ? "Matched by KAAM's built-in advisor. Add an ANTHROPIC_API_KEY to enable full AI analysis."
        : "Couldn't confidently match your problem — showing our most-booked category. Try describing it differently.",
    source: "rules",
  };
}

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORIES.some((c) => c.id === value);
}
