import type { CategoryId } from "@/lib/types";

/**
 * How long a job takes and what it starts at, item by item.
 *
 * A customer choosing between "Manicure" and "Nail Extensions" is choosing
 * between forty minutes and two hours, and between ₹500 and ₹1,600. Showing
 * both under one category price tells them nothing, and it is the single
 * biggest difference between KAAM's old picker and the way Urban Company
 * presents the same trades: the *service* is the product, with its own
 * duration, its own price and its own description.
 *
 * Authored where item-level price genuinely differs — the wellness trades the
 * customer shops around in. Everything else keeps the category price it always
 * had, because inventing a per-item figure for "Leak Fix" would be precision
 * KAAM cannot back. `serviceDetail` returns null there, and the UI simply
 * shows what it showed before.
 *
 * `from` is the service amount before GST, so it lines up with every other
 * price in the app. It is a floor, not a quote — the worker's own rate still
 * decides the final number.
 */

export interface ServiceDetail {
  /** Typical minutes on site. */
  minutes: number;
  /** ₹ this item starts at, before tax. */
  from: number;
  /** One line, in the customer's words. */
  note?: string;
  noteMl?: string;
}

type Menu = Record<string, ServiceDetail>;

const NAILS: Menu = {
  Manicure: { minutes: 40, from: 500, note: "Shape, cuticle care, buff and massage", noteMl: "ഷേപ്പ്, ക്യൂട്ടിക്കിൾ, മസാജ്" },
  Pedicure: { minutes: 50, from: 650, note: "Soak, scrub, nail care and foot massage", noteMl: "സോക്ക്, സ്ക്രബ്, ഫൂട്ട് മസാജ്" },
  "Spa Pedicure": { minutes: 70, from: 950, note: "Longer soak with mask and heel treatment" },
  "Gel Polish": { minutes: 45, from: 800, note: "Lasts two to three weeks without chipping" },
  "Nail Extensions": { minutes: 120, from: 1600, note: "Acrylic or gel tips, shaped and painted" },
  "Nail Art": { minutes: 35, from: 450, note: "Priced per set — designs shown before starting" },
  "French Manicure": { minutes: 50, from: 700 },
  "Nail Removal": { minutes: 30, from: 350, note: "Safe soak-off, no filing damage" },
  "Cracked Heel Care": { minutes: 45, from: 600, note: "For dry and split heels" },
};

const MEHENDI: Menu = {
  "Bridal Mehendi": { minutes: 240, from: 6000, note: "Full hands and feet, intricate — book a day ahead", noteMl: "കൈകളും കാലുകളും, വിശദമായ ഡിസൈൻ" },
  "Arabic Mehendi": { minutes: 60, from: 900, note: "Bold flowing patterns, both hands" },
  "Party Mehendi": { minutes: 40, from: 600, note: "Simple designs for a function" },
  "Minimal / Tattoo Style": { minutes: 25, from: 400 },
  "Feet Mehendi": { minutes: 60, from: 1000 },
  "Family Booking": { minutes: 180, from: 3000, note: "Artist stays for the group — priced per hour after" },
};

const HAIR: Menu = {
  "Hair Cut": { minutes: 40, from: 400, note: "Wash, cut and blow dry", noteMl: "വാഷ്, കട്ട്, ബ്ലോ ഡ്രൈ" },
  "Hair Colour": { minutes: 120, from: 1800, note: "Global colour — ammonia-free options" },
  "Root Touch-Up": { minutes: 60, from: 900 },
  "Hair Spa": { minutes: 75, from: 1200, note: "Deep conditioning with a scalp massage" },
  "Keratin / Smoothening": { minutes: 180, from: 4500, note: "Results last three to five months" },
  "Blow Dry & Styling": { minutes: 45, from: 600 },
  "Kids Hair Cut": { minutes: 30, from: 300 },
  "Beard Trim & Shape": { minutes: 25, from: 250 },
};

const MAKEUP: Menu = {
  "Bridal Makeup": { minutes: 180, from: 12000, note: "HD makeup, hair and draping — trial recommended", noteMl: "HD മേക്കപ്പ്, ഹെയർ, ഡ്രേപ്പിംഗ്" },
  "Engagement Makeup": { minutes: 120, from: 7000 },
  "Party Makeup": { minutes: 75, from: 2500 },
  "Saree Draping": { minutes: 30, from: 800, note: "Kerala, Bengali or lehenga style" },
  "Hair Styling": { minutes: 45, from: 1200 },
  "Trial Session": { minutes: 90, from: 3500, note: "Before the wedding, so there are no surprises" },
};

const BEAUTY: Menu = {
  "Clean-up": { minutes: 30, from: 450 },
  "Fruit Facial": { minutes: 50, from: 700 },
  "Gold Facial": { minutes: 60, from: 1100 },
  "De-Tan Facial": { minutes: 45, from: 850, note: "For sun exposure — face, neck and arms" },
  "Bridal Facial": { minutes: 90, from: 2200 },
  "Full Arms Waxing": { minutes: 30, from: 400 },
  "Full Legs Waxing": { minutes: 40, from: 600 },
  "Underarm Waxing": { minutes: 15, from: 180 },
  "Full Body Waxing": { minutes: 90, from: 1800 },
  "Eyebrow Threading": { minutes: 10, from: 80 },
  "Upper Lip Threading": { minutes: 5, from: 50 },
  "Face Bleach": { minutes: 30, from: 400 },
  "Head Massage": { minutes: 30, from: 400 },
};

const MASSAGE: Menu = {
  "Relaxation Massage": { minutes: 60, from: 1200, note: "Light to medium pressure, full body", noteMl: "മൃദുവായ പ്രഷർ, ഫുൾ ബോഡി" },
  "Deep Tissue Massage": { minutes: 60, from: 1500, note: "High pressure — for muscle stiffness" },
  "Hot Stone Massage": { minutes: 75, from: 1900, note: "Warm basalt stones, medium pressure" },
  "Thai Herbal Massage": { minutes: 75, from: 1800, note: "Heated herbal compress" },
  "Ayurvedic Abhyanga": { minutes: 90, from: 2200, note: "Warm medicated oil, traditional strokes", noteMl: "ചൂടുള്ള ഔഷധ എണ്ണ, പരമ്പരാഗത രീതി" },
  "Pregnancy Massage": { minutes: 60, from: 1600, note: "Second and third trimester, side-lying" },
  "Foot Reflexology": { minutes: 45, from: 900 },
  "Head & Shoulder": { minutes: 30, from: 700 },
  "Body Scrub": { minutes: 45, from: 1300 },
  "Post-Workout Recovery": { minutes: 45, from: 1200 },
};

const MENUS: Partial<Record<CategoryId, Menu>> = {
  nails: NAILS,
  mehendi: MEHENDI,
  hair: HAIR,
  makeup: MAKEUP,
  beauty: BEAUTY,
  massage: MASSAGE,
};

/** Duration and starting price for one item, or null where none is authored. */
export function serviceDetail(categoryId: CategoryId, name: string): ServiceDetail | null {
  return MENUS[categoryId]?.[name] ?? null;
}

/** Does this whole category carry item-level detail? */
export function hasMenu(categoryId: CategoryId): boolean {
  return Boolean(MENUS[categoryId]);
}

/** The cheapest authored item in a category, for a "from ₹X" tile. */
export function cheapestItem(categoryId: CategoryId): ServiceDetail | null {
  const menu = MENUS[categoryId];
  if (!menu) return null;
  return Object.values(menu).reduce<ServiceDetail | null>(
    (best, item) => (!best || item.from < best.from ? item : best),
    null,
  );
}

/** "1 hr 15 min" — durations read badly in raw minutes past an hour. */
export function readableMinutes(minutes: number, ml = false): string {
  if (minutes < 60) return ml ? `${minutes} മിനിറ്റ്` : `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = ml ? `${h} മണിക്കൂർ` : `${h} hr`;
  if (m === 0) return hours;
  return ml ? `${hours} ${m} മിനിറ്റ്` : `${hours} ${m} min`;
}
