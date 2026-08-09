import type { Category, CategoryGroup, CategoryId, GroupId } from "@/lib/types";

/** The six service sectors KAAM operates in. */
export const GROUPS: CategoryGroup[] = [
  { id: "maintenance", label: "Maintenance & Repair", icon: "🔧", tagline: "Electricians, plumbers, mechanics & more" },
  { id: "care", label: "Care & Health", icon: "❤️", tagline: "Nurses, hospital bystanders, babysitters, house help" },
  { id: "art", label: "Art & Music", icon: "🎻", tagline: "Violinists, pianists, singers, dance teachers" },
  { id: "hospitality", label: "Hospitality", icon: "🍽️", tagline: "Cooks, catering & event staff" },
  { id: "wellness", label: "Beauty & Wellness", icon: "💆", tagline: "Beauticians, massage, yoga" },
  { id: "everyday", label: "Everyday Services", icon: "🚗", tagline: "Drivers, tutors, cleaners, shopping runs" },
];

export const CATEGORIES: Category[] = [
  // ── Maintenance & Repair ──────────────────────────────
  { id: "elec", group: "maintenance", label: "Electrician", icon: "⚡", basePrice: 400, subServices: ["Fan Repair", "Wiring", "AC Install", "CCTV", "MCB / Panel", "Smart Home"] },
  { id: "plumb", group: "maintenance", label: "Plumber", icon: "🔧", basePrice: 350, subServices: ["Leak Fix", "Pipe Fitting", "Drain Clean", "Geyser", "Tap Replace"] },
  { id: "mech", group: "maintenance", label: "Mechanic", icon: "🔩", basePrice: 600, subServices: ["Car Service", "Bike Repair", "Battery", "AC Gas", "Tyre Change"] },
  { id: "ac", group: "maintenance", label: "AC Technician", icon: "❄️", basePrice: 500, subServices: ["AC Service", "Deep Clean Service", "Gas Refill", "Installation", "Uninstallation", "PCB Repair"] },
  { id: "carp", group: "maintenance", label: "Carpenter", icon: "🪚", basePrice: 500, subServices: ["Furniture", "Kitchen Cabinets", "Doors", "Flooring"] },
  { id: "painter", group: "maintenance", label: "Painter", icon: "🖌️", basePrice: 350, subServices: ["Interior", "Exterior", "Texture", "Waterproofing"] },
  { id: "pest", group: "maintenance", label: "Pest Control", icon: "🐛", basePrice: 800, subServices: ["General Pest Control", "Cockroach Treatment", "Termite Treatment", "Rodent Control", "Mosquito Fogging", "Bed Bug Treatment"] },
  { id: "cctv", group: "maintenance", label: "CCTV Install", icon: "📹", basePrice: 1200, subServices: ["2-Camera Setup", "4-Camera Setup", "8-Camera Setup", "NVR / DVR Setup", "Camera Repair", "Mobile App Setup"] },
  { id: "ro", group: "maintenance", label: "RO / Water", icon: "💧", basePrice: 400, subServices: ["RO Service", "Filter Change", "Membrane Change", "New Installation", "UV Lamp Change", "Motor Repair"] },

  // ── Care & Health ─────────────────────────────────────
  { id: "nurse", group: "care", label: "Home Nurse", icon: "🏥", basePrice: 1200, subServices: ["Elder Care", "Post-Surgery Care", "IV Drip", "Wound Dressing", "Injection at Home", "Catheter Care", "Bed-Ridden Patient Care", "Vitals Monitoring", "Post-Natal Care", "Palliative Care"], femaleWorkersOnly: true },
  { id: "physio", group: "care", label: "Physiotherapist", icon: "💪", basePrice: 1000, subServices: ["Back & Neck Pain", "Knee & Joint Pain", "Sports Rehab", "Post-Surgery Recovery", "Stroke Rehab", "Elderly Mobility", "Paediatric Physio", "Post-Natal Recovery"] },
  { id: "babysitter", group: "care", label: "Baby Sitter", icon: "👶", basePrice: 500, subServices: ["Infant Care", "Toddler Care", "After School", "Overnight"], femaleWorkersOnly: true },
  { id: "maid", group: "care", label: "House Maid", icon: "🏠", basePrice: 450, subServices: ["Cooking Help", "Cleaning", "Laundry", "Full-time Help"] },
  { id: "eldercare", group: "care", label: "Elder Caretaker", icon: "🧓", basePrice: 800, subServices: ["Companionship", "Medication Reminders", "Mobility Help", "Live-in Care"] },
  // Kerala hospitals expect a bystander to stay with the patient — a job the
  // family does itself until nobody is free to do it, which is most families
  // with children working outside the state.
  { id: "bystander", group: "care", label: "Hospital Bystander", icon: "🛏️", basePrice: 900, subServices: ["Day Shift (12 hr)", "Night Shift (12 hr)", "24-Hour Stay", "ICU Waiting", "Post-Surgery Ward", "Scan & OP Queue Help"] },
  // Elder care that happens OUTSIDE the house. `eldercare` is someone who comes
  // to them; this is someone who goes with them — to the hospital, the bank,
  // the market — which is the part a family abroad cannot do over the phone.
  { id: "errands", group: "care", label: "Errand Helper", icon: "🛍️", basePrice: 400, subServices: ["Hospital / Doctor Visit", "Bank & Post Office", "Market & Shopping", "Medicine Pickup", "Bill Payments", "Pension & Govt Office", "Temple / Church Visit"] },

  // ── Art & Music ───────────────────────────────────────
  { id: "violin", group: "art", label: "Violinist", icon: "🎻", basePrice: 1500, subServices: ["Wedding / Event", "Violin Lessons", "Recording Session", "Carnatic", "Western Classical"] },
  { id: "piano", group: "art", label: "Pianist", icon: "🎹", basePrice: 1500, subServices: ["Event Performance", "Piano Lessons", "Accompanist", "Trinity Grade Prep"] },
  { id: "guitar", group: "art", label: "Guitarist", icon: "🎸", basePrice: 1000, subServices: ["Guitar Lessons", "Event Performance", "Studio Session", "Acoustic / Electric"] },
  { id: "singer", group: "art", label: "Singer", icon: "🎤", basePrice: 2000, subServices: ["Wedding Sangeet", "Corporate Event", "Playback / Cover", "Vocal Lessons"] },
  { id: "dance", group: "art", label: "Dance Teacher", icon: "💃", basePrice: 800, subServices: ["Bollywood", "Classical (Bharatanatyam)", "Wedding Choreography", "Kids Classes"] },
  { id: "photo", group: "art", label: "Photographer", icon: "📷", basePrice: 2500, subServices: ["Wedding Full Day", "Half Day Event", "Birthday / Party", "Portfolio Shoot", "Product Shoot", "Real Estate Shoot", "Maternity / Newborn"] },

  // ── Hospitality ───────────────────────────────────────
  { id: "cook", group: "hospitality", label: "Home Cook", icon: "👨‍🍳", basePrice: 800, subServices: ["North Indian", "South Indian", "Continental", "Tiffin"] },
  { id: "catering", group: "hospitality", label: "Catering Staff", icon: "🍛", basePrice: 1500, subServices: ["Party Catering", "Live Counters", "Buffet Service", "Corporate Lunch"] },
  { id: "events", group: "hospitality", label: "Event Staff", icon: "🎪", basePrice: 700, subServices: ["Waiters", "Bartending (Mocktail)", "Hosting / Ushering", "Setup Crew"] },

  // ── Beauty & Wellness ─────────────────────────────────
  { id: "beauty", group: "wellness", label: "Beautician", icon: "💄", basePrice: 700, subServices: ["Clean-up", "Fruit Facial", "Gold Facial", "De-Tan Facial", "Bridal Facial", "Full Arms Waxing", "Full Legs Waxing", "Underarm Waxing", "Full Body Waxing", "Eyebrow Threading", "Upper Lip Threading", "Face Bleach", "Head Massage"], femaleWorkersOnly: true },
  { id: "massage", group: "wellness", label: "Massage", icon: "🧖", basePrice: 900, subServices: ["Relaxation Massage", "Deep Tissue Massage", "Hot Stone Massage", "Thai Herbal Massage", "Ayurvedic Abhyanga", "Pregnancy Massage", "Foot Reflexology", "Head & Shoulder", "Body Scrub", "Post-Workout Recovery"], femaleWorkersOnly: true },
  { id: "nails", group: "wellness", label: "Nail Studio", icon: "💅", basePrice: 600, subServices: ["Manicure", "Pedicure", "Spa Pedicure", "Gel Polish", "Nail Extensions", "Nail Art", "French Manicure", "Nail Removal", "Cracked Heel Care"] },
  { id: "mehendi", group: "wellness", label: "Mehendi Artist", icon: "🌿", basePrice: 800, subServices: ["Bridal Mehendi", "Arabic Mehendi", "Party Mehendi", "Minimal / Tattoo Style", "Feet Mehendi", "Family Booking"] },
  { id: "hair", group: "wellness", label: "Hair Stylist", icon: "💇", basePrice: 500, subServices: ["Hair Cut", "Hair Colour", "Root Touch-Up", "Hair Spa", "Keratin / Smoothening", "Blow Dry & Styling", "Kids Hair Cut", "Beard Trim & Shape"] },
  { id: "makeup", group: "wellness", label: "Makeup Artist", icon: "✨", basePrice: 2500, subServices: ["Bridal Makeup", "Engagement Makeup", "Party Makeup", "Saree Draping", "Hair Styling", "Trial Session"] },
  { id: "yoga", group: "wellness", label: "Yoga Teacher", icon: "🧘", basePrice: 600, subServices: ["Hatha Yoga", "Power Yoga", "Pranayama", "Meditation", "Prenatal Yoga", "Yoga for Back Pain", "Weight Loss Yoga", "Kids Yoga", "Senior Citizen Yoga"] },

  // ── Everyday Services ─────────────────────────────────
  { id: "driver", group: "everyday", label: "Driver", icon: "🚗", basePrice: 600, subServices: ["City Drive", "Airport Drop", "Outstation", "Corporate"] },
  { id: "tutor", group: "everyday", label: "Tutor", icon: "📚", basePrice: 700, subServices: ["Math", "Science", "English", "JEE", "NEET", "Board Prep"] },
  { id: "clean", group: "everyday", label: "Cleaner", icon: "🧹", basePrice: 400, subServices: ["1BHK Deep Clean", "2BHK Deep Clean", "3BHK Deep Clean", "Kitchen Deep Clean", "Bathroom Deep Clean", "Sofa / Carpet Shampoo", "Office Cleaning", "Post-Event Cleanup"] },
  { id: "movers", group: "everyday", label: "Packers & Movers", icon: "📦", basePrice: 2000, subServices: ["1BHK Local Move", "2BHK Local Move", "3BHK Local Move", "Intercity Move", "Office Shift", "Bike / Car Transport", "Single Item Shift"] },
  // Send a list, somebody buys it. Not elder-specific — anyone stuck at work,
  // ill, or without a vehicle. Note this prices the TRIP: what the shopping
  // itself costs is the customer's own money passing through, and KAAM takes
  // no commission on it (see SHOPPING_MONEY in lib/shopping.ts).
  { id: "shopper", group: "everyday", label: "Buy For Me", icon: "🛒", basePrice: 300, subServices: ["Grocery & Supermarket", "Medicines from Pharmacy", "Vegetables & Fish Market", "Bakery & Sweets", "Hardware & Building Shop", "Gift & Occasion Shopping", "Documents & Printouts", "Anything Else — Send a List"] },
];

export function getCategory(id: CategoryId): Category {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}

export function getGroup(id: GroupId): CategoryGroup {
  const group = GROUPS.find((g) => g.id === id);
  if (!group) throw new Error(`Unknown group: ${id}`);
  return group;
}

export function categoriesInGroup(id: GroupId): Category[] {
  return CATEGORIES.filter((c) => c.group === id);
}
