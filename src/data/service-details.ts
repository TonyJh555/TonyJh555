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


/* ── Defined-scope jobs ─────────────────────────────────────────────
 *
 * These are not "how long did it take" work. An AC service is a known
 * forty-five minute job at a known price; a 2BHK deep clean is priced by the
 * flat, not the clock; a termite treatment is priced by the treatment. Putting
 * them on an hourly ladder invited the same nonsense mehendi had — and it also
 * punishes the fast, experienced worker, who finishes in half the time and
 * earns half as much.
 *
 * What stays on the meter, deliberately: electrician, plumber, mechanic,
 * carpenter, painter. Nobody can price a leak before looking at it, and the
 * per-minute meter is the fairest answer to that — it is KAAM's own idea and
 * removing it here would be throwing away the differentiator.
 */

const AC: Menu = {
  "AC Service": { minutes: 45, from: 500, note: "Per unit — coil clean, filter wash, gas check", noteMl: "ഒരു യൂണിറ്റിന് — കോയിൽ, ഫിൽട്ടർ, ഗ്യാസ് പരിശോധന" },
  "Deep Clean Service": { minutes: 75, from: 800, note: "Jet-pump cleaning of the indoor unit" },
  "Gas Refill": { minutes: 90, from: 2200, note: "Leak test, vacuum and refill" },
  Installation: { minutes: 120, from: 1500, note: "Split or window — bracket and piping extra" },
  Uninstallation: { minutes: 60, from: 800 },
  "PCB Repair": { minutes: 90, from: 1800, note: "Board diagnosis — part cost quoted before work" },
};

const RO: Menu = {
  "RO Service": { minutes: 45, from: 450, note: "Full service and sanitisation" },
  "Filter Change": { minutes: 40, from: 900, note: "Sediment and carbon filters included" },
  "Membrane Change": { minutes: 45, from: 1600 },
  "New Installation": { minutes: 90, from: 1200 },
  "UV Lamp Change": { minutes: 30, from: 800 },
  "Motor Repair": { minutes: 60, from: 900 },
};

const PEST: Menu = {
  "General Pest Control": { minutes: 60, from: 1000, note: "Whole flat — cockroach, ant and spider" },
  "Cockroach Treatment": { minutes: 45, from: 1200, note: "Gel and spray, kitchen focus" },
  "Termite Treatment": { minutes: 180, from: 6000, note: "Drill-and-fill — comes with a warranty" },
  "Rodent Control": { minutes: 60, from: 1500 },
  "Mosquito Fogging": { minutes: 45, from: 1800 },
  "Bed Bug Treatment": { minutes: 90, from: 2500, note: "Two visits, a fortnight apart" },
};

const CCTV: Menu = {
  "2-Camera Setup": { minutes: 180, from: 8000, note: "Cameras, DVR, wiring and app setup" },
  "4-Camera Setup": { minutes: 240, from: 14000 },
  "8-Camera Setup": { minutes: 300, from: 24000 },
  "NVR / DVR Setup": { minutes: 90, from: 3000 },
  "Camera Repair": { minutes: 60, from: 800 },
  "Mobile App Setup": { minutes: 30, from: 500, note: "Remote viewing on your phone" },
};

const CLEAN: Menu = {
  "1BHK Deep Clean": { minutes: 180, from: 2000, note: "Priced by the flat, not the hour", noteMl: "മണിക്കൂർ അല്ല, ഫ്ലാറ്റ് അനുസരിച്ച്" },
  "2BHK Deep Clean": { minutes: 270, from: 3000 },
  "3BHK Deep Clean": { minutes: 360, from: 4200 },
  "Kitchen Deep Clean": { minutes: 120, from: 1200, note: "Chimney, tiles, cabinets and slab" },
  "Bathroom Deep Clean": { minutes: 60, from: 700, note: "Per bathroom" },
  "Sofa / Carpet Shampoo": { minutes: 90, from: 1200, note: "Per set — wet vacuum" },
  "Office Cleaning": { minutes: 240, from: 3500 },
  "Post-Event Cleanup": { minutes: 180, from: 2500 },
};

const MOVERS: Menu = {
  "1BHK Local Move": { minutes: 240, from: 4000, note: "Within the district — packing included" },
  "2BHK Local Move": { minutes: 300, from: 6500 },
  "3BHK Local Move": { minutes: 300, from: 9000 },
  "Intercity Move": { minutes: 300, from: 12000, note: "Distance quoted after the survey" },
  "Office Shift": { minutes: 300, from: 15000 },
  "Bike / Car Transport": { minutes: 120, from: 3500 },
  "Single Item Shift": { minutes: 90, from: 1500, note: "Fridge, almirah, piano" },
};

const PHOTO: Menu = {
  "Wedding Full Day": { minutes: 300, from: 25000, note: "Two shooters, edited album" },
  "Half Day Event": { minutes: 240, from: 12000 },
  "Birthday / Party": { minutes: 180, from: 7000 },
  "Portfolio Shoot": { minutes: 180, from: 8000, note: "Studio or outdoor, 20 edited images" },
  "Product Shoot": { minutes: 240, from: 6000, note: "Priced per batch of products" },
  "Real Estate Shoot": { minutes: 120, from: 5000 },
  "Maternity / Newborn": { minutes: 180, from: 9000 },
};

const MENUS: Partial<Record<CategoryId, Menu>> = {
  nails: NAILS,
  mehendi: MEHENDI,
  hair: HAIR,
  makeup: MAKEUP,
  beauty: BEAUTY,
  massage: MASSAGE,
  ac: AC,
  ro: RO,
  pest: PEST,
  cctv: CCTV,
  clean: CLEAN,
  movers: MOVERS,
  photo: PHOTO,
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
