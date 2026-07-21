import type { CategoryId, KeralaDistrict, PriceUnit, Worker } from "@/lib/types";
import { KERALA_DISTRICTS, etaMinutes, geocode, jitter } from "@/lib/geo";
import { getCategory } from "./categories";

/**
 * KAAM worker roster (demo). A curated set of hand-written profiles plus a
 * generated spread across ALL 14 Kerala districts, so a customer anywhere in
 * the state finds nearby workers. Each worker has home coordinates; search and
 * the home screen rank them nearest-first from the customer's location
 * (see lib/matching → rankByProximity), the way Uber and Swiggy do.
 */

/** How each category is priced — used when generating workers. */
const UNIT_BY_CATEGORY: Record<CategoryId, PriceUnit> = {
  elec: "visit", plumb: "visit", mech: "visit", ac: "visit", carp: "visit",
  painter: "visit", pest: "visit", cctv: "visit", ro: "visit", clean: "visit",
  beauty: "visit", massage: "visit", physio: "visit",
  nurse: "day", maid: "day", eldercare: "day", cook: "day", catering: "day",
  events: "day", driver: "day", movers: "day", photo: "day",
  babysitter: "hr",
  tutor: "session", yoga: "session",
  violin: "session", piano: "session", guitar: "session", singer: "session", dance: "session",
};

const CITY_DISTRICT: Record<string, KeralaDistrict> = {
  Kochi: "Ernakulam",
  Thiruvananthapuram: "Thiruvananthapuram",
  Kozhikode: "Kozhikode",
  Thrissur: "Thrissur",
};

// ── Curated profiles (location attached below) ──────────────────────────────
type CuratedWorker = Omit<Worker, "district" | "coords">;

const CURATED: CuratedWorker[] = [
  { id: "w1", name: "Rahul Sharma", categoryId: "elec", rating: 4.9, reviewCount: 214, rate: 500, unit: "hr", distanceKm: 0.8, initials: "RS", verified: true, experienceYears: 8, city: "Kochi", etaMinutes: 12, jobsDone: 847, bio: "Certified electrician. Smart home & commercial wiring expert. 24/7 emergency available.", skills: ["Fan", "Smart Home", "CCTV", "AC Wiring"], badges: ["Top Rated ⭐", "Police Verified 🔵", "Insured 🛡️"], surge: false, online: true, acceptRate: 0.94 },
  { id: "w2", name: "Priya Verma", categoryId: "nurse", rating: 4.9, reviewCount: 96, rate: 1500, unit: "day", distanceKm: 2.1, initials: "PV", verified: true, experienceYears: 10, city: "Thiruvananthapuram", etaMinutes: 30, jobsDone: 520, bio: "Registered nurse. ICU-trained. Post-surgery & senior care specialist.", skills: ["Elder Care", "Post-Surgery", "IV Drip"], badges: ["Police Verified 🔵", "Nursing License ✅"], surge: false, online: true, acceptRate: 0.9 },
  { id: "w3", name: "Meena Singh", categoryId: "tutor", rating: 5.0, reviewCount: 74, rate: 800, unit: "session", distanceKm: 1.8, initials: "MS", verified: true, experienceYears: 6, city: "Thiruvananthapuram", etaMinutes: 40, jobsDone: 290, bio: "Math & Science Gr 6–12. JEE/NEET coaching. 100% board results.", skills: ["Math", "Physics", "Chemistry", "JEE"], badges: ["Top Rated ⭐", "Background Verified"], surge: false, online: true, acceptRate: 0.88 },
  { id: "w4", name: "Ravi Malhotra", categoryId: "driver", rating: 4.7, reviewCount: 389, rate: 700, unit: "day", distanceKm: 0.3, initials: "RM", verified: true, experienceYears: 7, city: "Kozhikode", etaMinutes: 8, jobsDone: 1430, bio: "Professional driver. Airport & outstation specialist. Clean record.", skills: ["City", "Airport", "Outstation", "Corporate"], badges: ["Police Verified 🔵", "Clean License ✅"], surge: true, online: true, acceptRate: 0.97 },
  { id: "w5", name: "Kavya Iyer", categoryId: "beauty", rating: 4.9, reviewCount: 128, rate: 800, unit: "visit", distanceKm: 1.2, initials: "KI", verified: true, experienceYears: 6, city: "Thiruvananthapuram", etaMinutes: 20, jobsDone: 634, bio: "Home salon. Premium cruelty-free products. Female clients only.", skills: ["Facial", "Waxing", "Nail Art", "Bridal"], badges: ["Top Rated ⭐", "POSH Verified"], surge: false, online: true, acceptRate: 0.91 },
  { id: "w6", name: "Arjun Mehta", categoryId: "mech", rating: 4.8, reviewCount: 241, rate: 700, unit: "hr", distanceKm: 2.0, initials: "AM", verified: true, experienceYears: 13, city: "Kochi", etaMinutes: 18, jobsDone: 1205, bio: "Multi-brand mechanic. Doorstep service. Diagnostic equipment on-site.", skills: ["Engine", "AC Gas", "Battery", "Tyres"], badges: ["Expert Badge 🏅", "Background Verified"], surge: true, online: false, acceptRate: 0.85 },
  { id: "w7", name: "Deepak Yadav", categoryId: "plumb", rating: 4.6, reviewCount: 178, rate: 450, unit: "hr", distanceKm: 1.0, initials: "DY", verified: true, experienceYears: 9, city: "Kochi", etaMinutes: 15, jobsDone: 612, bio: "Plumbing expert. All fixtures, geyser, RO installation.", skills: ["Leak Fix", "Drainage", "Geyser", "Tap"], badges: ["Background Checked ✅"], surge: false, online: true, acceptRate: 0.89 },
  { id: "w8", name: "Sunita Rao", categoryId: "cook", rating: 4.8, reviewCount: 156, rate: 900, unit: "day", distanceKm: 1.5, initials: "SR", verified: true, experienceYears: 12, city: "Thiruvananthapuram", etaMinutes: 25, jobsDone: 980, bio: "Home cook — North & South Indian. Tiffin service and party catering.", skills: ["North Indian", "South Indian", "Tiffin"], badges: ["Top Rated ⭐", "FSSAI Trained"], surge: false, online: true, acceptRate: 0.93 },
  { id: "w9", name: "Vikram Joshi", categoryId: "ac", rating: 4.7, reviewCount: 203, rate: 550, unit: "hr", distanceKm: 2.4, initials: "VJ", verified: true, experienceYears: 9, city: "Kochi", etaMinutes: 22, jobsDone: 890, bio: "AC specialist — all brands. Gas refill, PCB repair, installations.", skills: ["Split AC", "Window AC", "Gas Refill", "PCB"], badges: ["Background Verified", "Insured 🛡️"], surge: false, online: true, acceptRate: 0.9 },
  { id: "w10", name: "Anita Kumari", categoryId: "clean", rating: 4.6, reviewCount: 312, rate: 450, unit: "visit", distanceKm: 0.6, initials: "AK", verified: true, experienceYears: 5, city: "Kochi", etaMinutes: 10, jobsDone: 1120, bio: "Deep cleaning specialist. Homes, offices, post-event cleanup.", skills: ["Deep Clean", "Office", "Sofa / Carpet"], badges: ["Police Verified 🔵"], surge: false, online: true, acceptRate: 0.95 },
  { id: "w11", name: "Mohan Das", categoryId: "carp", rating: 4.8, reviewCount: 145, rate: 550, unit: "hr", distanceKm: 3.1, initials: "MD", verified: true, experienceYears: 15, city: "Thiruvananthapuram", etaMinutes: 35, jobsDone: 760, bio: "Master carpenter. Modular kitchens, wardrobes, custom furniture.", skills: ["Furniture", "Kitchen Cabinets", "Doors"], badges: ["Expert Badge 🏅", "Background Verified"], surge: false, online: false, acceptRate: 0.82 },
  { id: "w12", name: "Farhan Ali", categoryId: "painter", rating: 4.5, reviewCount: 98, rate: 400, unit: "hr", distanceKm: 2.8, initials: "FA", verified: true, experienceYears: 7, city: "Thrissur", etaMinutes: 28, jobsDone: 430, bio: "Interior & exterior painting. Texture finishes, waterproofing.", skills: ["Interior", "Texture", "Waterproofing"], badges: ["Background Checked ✅"], surge: false, online: true, acceptRate: 0.87 },
  { id: "w13", name: "Ananya Krishnan", categoryId: "violin", rating: 5.0, reviewCount: 87, rate: 2000, unit: "session", distanceKm: 3.4, initials: "AK", verified: true, experienceYears: 12, city: "Thiruvananthapuram", etaMinutes: 45, jobsDone: 340, bio: "Carnatic & Western classical violinist. Weddings, corporate events, and Trinity-grade lessons.", skills: ["Carnatic", "Western Classical", "Wedding / Event", "Lessons"], badges: ["Top Rated ⭐", "Trinity Certified 🎼"], surge: false, online: true, acceptRate: 0.92, social: { instagram: "ananya.violin", youtube: "@ananyakrishnanviolin" } },
  { id: "w14", name: "Joshua D'Souza", categoryId: "piano", rating: 4.9, reviewCount: 64, rate: 1800, unit: "session", distanceKm: 4.2, initials: "JD", verified: true, experienceYears: 15, city: "Thiruvananthapuram", etaMinutes: 50, jobsDone: 410, bio: "Concert pianist & accompanist. Trinity/ABRSM exam prep, hotel & event performances.", skills: ["Event Performance", "Lessons", "Accompanist", "Jazz"], badges: ["Top Rated ⭐", "ABRSM Certified 🎹"], surge: false, online: true, acceptRate: 0.9, social: { youtube: "@joshuapiano", website: "joshuadsouza.in" } },
  { id: "w15", name: "Gopika Menon", categoryId: "singer", rating: 4.8, reviewCount: 112, rate: 2500, unit: "session", distanceKm: 5.0, initials: "GM", verified: true, experienceYears: 9, city: "Kochi", etaMinutes: 60, jobsDone: 280, bio: "Playback-style vocalist. Sangeet nights, corporate galas, Malayalam & Sufi covers.", skills: ["Wedding Sangeet", "Malayalam", "Sufi", "Vocal Lessons"], badges: ["Background Verified", "Stage Pro 🎤"], surge: true, online: true, acceptRate: 0.88, social: { instagram: "gopika.sings", youtube: "@gopikamenon" } },
  { id: "w16", name: "Nandini Pillai", categoryId: "dance", rating: 4.9, reviewCount: 93, rate: 900, unit: "session", distanceKm: 2.6, initials: "NP", verified: true, experienceYears: 10, city: "Thiruvananthapuram", etaMinutes: 35, jobsDone: 520, bio: "Bharatanatyam exponent & Bollywood choreographer. Wedding choreography and kids' batches.", skills: ["Bharatanatyam", "Bollywood", "Wedding Choreography", "Kids"], badges: ["Top Rated ⭐", "Kalakshetra Trained 💃"], surge: false, online: true, acceptRate: 0.93, social: { instagram: "nandini.dance" } },
  { id: "w17", name: "Rekha Nair", categoryId: "babysitter", rating: 4.9, reviewCount: 141, rate: 550, unit: "hr", distanceKm: 1.4, initials: "RN", verified: true, experienceYears: 8, city: "Kochi", etaMinutes: 20, jobsDone: 760, bio: "Trained childcare professional. Infant & toddler care, first-aid certified, overnight available.", skills: ["Infant Care", "Toddler Care", "First Aid", "Overnight"], badges: ["Police Verified 🔵", "First-Aid Certified ⛑️"], surge: false, online: true, acceptRate: 0.96 },
  { id: "w18", name: "Shanti Devi", categoryId: "maid", rating: 4.7, reviewCount: 205, rate: 500, unit: "day", distanceKm: 0.9, initials: "SD", verified: true, experienceYears: 11, city: "Kochi", etaMinutes: 15, jobsDone: 1340, bio: "Experienced house help — cooking assistance, cleaning, laundry. Full-time and part-time.", skills: ["Cooking Help", "Cleaning", "Laundry"], badges: ["Police Verified 🔵", "Background Checked ✅"], surge: false, online: true, acceptRate: 0.95 },
  { id: "w19", name: "Gopal Menon", categoryId: "eldercare", rating: 4.8, reviewCount: 58, rate: 900, unit: "day", distanceKm: 3.0, initials: "GM", verified: true, experienceYears: 7, city: "Thiruvananthapuram", etaMinutes: 40, jobsDone: 230, bio: "Compassionate elder caretaker. Mobility support, medication schedules, live-in care.", skills: ["Companionship", "Mobility Help", "Live-in Care"], badges: ["Police Verified 🔵", "Geriatric Care Trained"], surge: false, online: true, acceptRate: 0.91 },
  { id: "w20", name: "Imtiaz Qureshi", categoryId: "catering", rating: 4.8, reviewCount: 176, rate: 1800, unit: "day", distanceKm: 4.5, initials: "IQ", verified: true, experienceYears: 14, city: "Thiruvananthapuram", etaMinutes: 55, jobsDone: 690, bio: "Catering crew lead. Weddings, live counters, corporate lunches — team of 12 available.", skills: ["Party Catering", "Live Counters", "Buffet Service"], badges: ["FSSAI Trained", "Background Verified"], surge: true, online: true, acceptRate: 0.89 },
];

/** Curated workers who are women (for the women-preference filter). */
const FEMALE_CURATED = new Set(["w2", "w3", "w5", "w8", "w10", "w13", "w15", "w16", "w17", "w18"]);

function withLocation(w: CuratedWorker): Worker {
  const district = CITY_DISTRICT[w.city] ?? "Ernakulam";
  const base = geocode(w.city);
  return { ...w, district, coords: jitter(base, w.id, 5), female: FEMALE_CURATED.has(w.id) };
}

// ── Generated roster across every district ──────────────────────────────────

const MALE_FIRST = ["Arun", "Vishnu", "Sreejith", "Jibin", "Nithin", "Manoj", "Prakash", "Sabu", "Rejin", "Vinod", "Aneesh", "Shibu", "Jomon", "Rijo", "Harikrishnan", "Muhammed", "Ashraf", "Faisal", "Noufal", "Binoy", "Sanoop", "Tijo", "Renjith", "Ajmal"];
const FEMALE_FIRST = ["Anjali", "Divya", "Reshma", "Lakshmi", "Gayathri", "Soumya", "Ancy", "Neethu", "Sruthi", "Aswathy", "Meera", "Fathima", "Ayesha", "Jaseela", "Reema", "Bindu", "Sini", "Deepa", "Rincy", "Sandra", "Nimmy", "Sajitha"];
const LAST = ["Nair", "Menon", "Pillai", "Kurup", "Krishnan", "Warrier", "Thomas", "Mathew", "Varghese", "Sebastian", "George", "Rahman", "Basheer", "Haneef", "Das", "Kumar", "Raj", "Prasad", "Mohan", "Antony"];

const BADGE_POOL = ["Police Verified 🔵", "Background Checked ✅", "Top Rated ⭐", "Insured 🛡️", "Expert Badge 🏅", "KAAM Pro 💚"];

/** Categories every district should have so nearby search always finds help. */
const ESSENTIAL: CategoryId[] = ["elec", "plumb", "ac", "nurse", "maid", "cook", "clean", "driver"];
/** High-demand categories that get a second worker per district for choice. */
const HIGH_DEMAND: CategoryId[] = ["elec", "plumb", "nurse", "maid", "cook"];
/** Extra categories rotated per district for variety. */
const ROTATING: CategoryId[] = ["tutor", "eldercare", "carp", "painter", "babysitter", "physio", "beauty", "yoga", "mech", "pest", "movers", "ro"];
/** Performing-arts categories seeded in the larger districts only. */
const ARTS: CategoryId[] = ["violin", "dance", "singer", "guitar"];
const ARTS_DISTRICTS = new Set(["Ernakulam", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam", "Kannur"]);

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function makeWorker(
  categoryId: CategoryId,
  district: (typeof KERALA_DISTRICTS)[number],
  seq: number,
  forceOnline = false,
): Worker {
  const id = `kl-${district.name.slice(0, 3).toLowerCase()}-${categoryId}-${seq}`;
  const r = mulberry32(hashString(id));
  const cat = getCategory(categoryId);
  const female = cat.femaleWorkersOnly === true || r() > 0.55;
  const first = (female ? FEMALE_FIRST : MALE_FIRST)[Math.floor(r() * (female ? FEMALE_FIRST.length : MALE_FIRST.length))];
  const last = LAST[Math.floor(r() * LAST.length)];
  const name = `${first} ${last}`;
  const city = district.towns[Math.floor(r() * district.towns.length)];
  const rate = Math.round((cat.basePrice * (0.9 + r() * 0.35)) / 10) * 10;
  const distanceKm = Math.round((1 + r() * 6) * 10) / 10;
  const badges = [BADGE_POOL[Math.floor(r() * BADGE_POOL.length)]];
  if (r() > 0.5) {
    const b2 = BADGE_POOL[Math.floor(r() * BADGE_POOL.length)];
    if (!badges.includes(b2)) badges.push(b2);
  }
  return {
    id,
    name,
    categoryId,
    rating: Math.round((4.3 + r() * 0.7) * 10) / 10,
    reviewCount: 15 + Math.floor(r() * 380),
    rate,
    unit: UNIT_BY_CATEGORY[categoryId],
    distanceKm,
    district: district.name as KeralaDistrict,
    coords: jitter(district.coords, id, 12),
    initials: `${first[0]}${last[0]}`.toUpperCase(),
    verified: true,
    experienceYears: 2 + Math.floor(r() * 17),
    city,
    etaMinutes: etaMinutes(distanceKm),
    jobsDone: 50 + Math.floor(r() * 1500),
    bio: `${cat.label} serving ${city} and nearby. ${cat.subServices.slice(0, 3).join(", ")}. Background-verified KAAM professional.`,
    skills: cat.subServices.slice(0, 4),
    badges,
    surge: r() > 0.85,
    // Essential-service workers are kept online so every district reliably has
    // a nearby available worker; others vary for realism.
    online: forceOnline || r() > 0.2,
    female,
    acceptRate: Math.round((0.82 + r() * 0.16) * 100) / 100,
  };
}

function generateRoster(): Worker[] {
  const out: Worker[] = [];
  KERALA_DISTRICTS.forEach((district, di) => {
    // Essentials — always present and online, so nearby search never comes up
    // empty in any district.
    ESSENTIAL.forEach((categoryId) => out.push(makeWorker(categoryId, district, 1, true)));
    // A second option for high-demand services, so there's real choice nearby.
    HIGH_DEMAND.forEach((categoryId) => out.push(makeWorker(categoryId, district, 2)));
    // Rotating variety (offset per district) + arts in the larger districts.
    const extras: CategoryId[] = [ROTATING[di % ROTATING.length], ROTATING[(di + 5) % ROTATING.length]];
    if (ARTS_DISTRICTS.has(district.name)) {
      extras.push(ARTS[di % ARTS.length], ARTS[(di + 2) % ARTS.length]);
    }
    [...new Set(extras)].forEach((categoryId) => out.push(makeWorker(categoryId, district, 1)));
  });
  return out;
}

export const WORKERS: Worker[] = [...CURATED.map(withLocation), ...generateRoster()];

export function getWorker(id: string): Worker | undefined {
  return WORKERS.find((w) => w.id === id);
}
