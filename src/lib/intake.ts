import type { Booking, CategoryId } from "./types";

/**
 * The few health questions that have to be asked before somebody works on
 * your body — and the answers the worker has to see before they arrive.
 *
 * A deep-tissue massage is contraindicated in pregnancy. A physio session
 * after spinal surgery is a different session. Hot stones on a diabetic foot
 * with reduced sensation can burn without the client noticing. A therapist
 * finding any of this out at the door has already wasted the trip, and one
 * who never finds out is the reason these trades ask on paper everywhere else
 * in the world. KAAM was asking nothing at all.
 *
 * Deliberately short. Six questions a customer will actually answer beat a
 * medical history nobody fills in, and every one here changes what the worker
 * does — nothing is collected because it might be interesting later. This is
 * health information about a named person: it goes to the worker assigned to
 * that booking and nowhere else.
 *
 * Pure and framework-free, so the warnings shown can be tested against the
 * answers that produced them.
 */

export type IntakeId =
  | "pregnant"
  | "surgery"
  | "injury"
  | "bloodPressure"
  | "diabetes"
  | "skin";

export interface IntakeQuestion {
  id: IntakeId;
  label: string;
  labelMl: string;
  /** Why it is being asked — nobody should have to guess. */
  why: string;
  whyMl: string;
  /** Trades that need this one. */
  categories: CategoryId[];
}

const BODYWORK: CategoryId[] = ["massage", "physio"];
const ON_SKIN: CategoryId[] = ["massage", "beauty", "nails", "hair", "makeup"];

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: "pregnant",
    label: "Pregnant, or recently given birth?",
    labelMl: "ഗർഭിണിയാണോ, അല്ലെങ്കിൽ അടുത്തിടെ പ്രസവിച്ചോ?",
    why: "Deep pressure and some oils aren't used in pregnancy — the therapist will change the session.",
    whyMl: "ഗർഭകാലത്ത് ശക്തമായ പ്രഷറും ചില എണ്ണകളും ഉപയോഗിക്കില്ല — സെഷൻ മാറ്റും.",
    categories: [...BODYWORK, "yoga", "beauty"],
  },
  {
    id: "surgery",
    label: "Any surgery in the last 6 months?",
    labelMl: "കഴിഞ്ഞ 6 മാസത്തിനുള്ളിൽ ശസ്ത്രക്രിയ ഉണ്ടായോ?",
    why: "The area around a healing scar is worked differently, or left alone.",
    whyMl: "ഉണങ്ങുന്ന മുറിവിന്റെ ഭാഗം വ്യത്യസ്തമായി കൈകാര്യം ചെയ്യും.",
    categories: [...BODYWORK, "yoga"],
  },
  {
    id: "injury",
    label: "Any injury, slipped disc or joint problem?",
    labelMl: "പരിക്ക്, ഡിസ്ക്, സന്ധി പ്രശ്നങ്ങൾ ഉണ്ടോ?",
    why: "So they plan the session around it instead of finding out mid-way.",
    whyMl: "സെഷന്റെ നടുവിൽ അറിയുന്നതിനു പകരം മുൻകൂട്ടി ആസൂത്രണം ചെയ്യാൻ.",
    categories: [...BODYWORK, "yoga"],
  },
  {
    id: "bloodPressure",
    label: "High or low blood pressure?",
    labelMl: "രക്തസമ്മർദ്ദം കൂടുതലോ കുറവോ ആണോ?",
    why: "Changes the pressure used and how quickly you're asked to sit up.",
    whyMl: "ഉപയോഗിക്കുന്ന പ്രഷറും എഴുന്നേൽക്കുന്ന വേഗതയും മാറും.",
    categories: BODYWORK,
  },
  {
    id: "diabetes",
    label: "Diabetes?",
    labelMl: "പ്രമേഹം ഉണ്ടോ?",
    why: "Reduced sensation in the feet means heat and sharp tools need extra care.",
    whyMl: "കാലിൽ സ്പർശനശേഷി കുറവായതിനാൽ ചൂടും ഉപകരണങ്ങളും ശ്രദ്ധിക്കണം.",
    categories: [...BODYWORK, "nails"],
  },
  {
    id: "skin",
    label: "Skin allergy, eczema or a reaction to products?",
    labelMl: "ചർമ്മ അലർജി, എക്സിമ, ഉൽപ്പന്നങ്ങളോട് പ്രതികരണം?",
    why: "So they bring products that suit you, or patch-test first.",
    whyMl: "അനുയോജ്യമായ ഉൽപ്പന്നങ്ങൾ കൊണ്ടുവരാൻ, അല്ലെങ്കിൽ പാച്ച് ടെസ്റ്റ് ചെയ്യാൻ.",
    categories: ON_SKIN,
  },
];

/** Answers as given: yes, no, or a note the customer typed. */
export interface IntakeAnswers {
  yes: IntakeId[];
  /** Free text the customer added — "left knee", "peanut allergy". */
  note?: string;
  answeredAt: string;
}

/** Trades where the body is being worked on and this must be asked. */
export function intakeRequired(categoryId: CategoryId): boolean {
  return INTAKE_QUESTIONS.some((q) => q.categories.includes(categoryId));
}

/** The questions that apply to this trade, in order. */
export function questionsFor(categoryId: CategoryId): IntakeQuestion[] {
  return INTAKE_QUESTIONS.filter((q) => q.categories.includes(categoryId));
}

/** Has the customer answered for this booking? */
export function intakeDone(booking: Pick<Booking, "intake">): boolean {
  return Boolean(booking.intake?.answeredAt);
}

export interface IntakeFlag {
  id: IntakeId;
  /** What the worker must actually do differently. */
  action: string;
  actionMl: string;
  /** True where the default treatment is not safe as-is. */
  serious: boolean;
}

const FLAGS: Record<IntakeId, Omit<IntakeFlag, "id">> = {
  pregnant: {
    action: "Pregnancy — no deep pressure, side-lying only, avoid the abdomen and lower back.",
    actionMl: "ഗർഭിണി — ശക്തമായ പ്രഷർ വേണ്ട, വശം ചരിഞ്ഞ് മാത്രം, വയറും അരക്കെട്ടും ഒഴിവാക്കൂ.",
    serious: true,
  },
  surgery: {
    action: "Recent surgery — do not work the scar area. Ask where before starting.",
    actionMl: "അടുത്തിടെ ശസ്ത്രക്രിയ — മുറിവിന്റെ ഭാഗം ഒഴിവാക്കൂ. തുടങ്ങും മുൻപ് എവിടെയെന്ന് ചോദിക്കൂ.",
    serious: true,
  },
  injury: {
    action: "Existing injury — ask where it is and work around it.",
    actionMl: "പരിക്ക് ഉണ്ട് — എവിടെയെന്ന് ചോദിച്ച് ഒഴിവാക്കി ചെയ്യൂ.",
    serious: false,
  },
  bloodPressure: {
    action: "Blood pressure — lighter pressure, and let them sit up slowly at the end.",
    actionMl: "രക്തസമ്മർദ്ദം — മൃദുവായ പ്രഷർ, അവസാനം പതിയെ എഴുന്നേൽപ്പിക്കൂ.",
    serious: false,
  },
  diabetes: {
    action: "Diabetes — no hot stones or hot compress on the feet; take care with cuticle tools.",
    actionMl: "പ്രമേഹം — കാലിൽ ചൂടുള്ള കല്ലോ കമ്പ്രസ്സോ വേണ്ട; ഉപകരണങ്ങൾ ശ്രദ്ധിക്കൂ.",
    serious: true,
  },
  skin: {
    action: "Skin sensitivity — patch-test before any new product.",
    actionMl: "ചർമ്മ സെൻസിറ്റിവിറ്റി — പുതിയ ഉൽപ്പന്നം പാച്ച് ടെസ്റ്റ് ചെയ്യൂ.",
    serious: false,
  },
};

/**
 * What the worker is told, most serious first. Only what changes their work —
 * a list of conditions with no instruction attached is a privacy cost with no
 * safety benefit.
 */
export function intakeFlags(answers: IntakeAnswers | undefined): IntakeFlag[] {
  if (!answers) return [];
  return answers.yes
    .filter((id) => FLAGS[id])
    .map((id) => ({ id, ...FLAGS[id] }))
    .sort((a, b) => Number(b.serious) - Number(a.serious));
}

/** True when something here makes the standard treatment unsafe as-is. */
export function hasSeriousFlag(answers: IntakeAnswers | undefined): boolean {
  return intakeFlags(answers).some((f) => f.serious);
}
