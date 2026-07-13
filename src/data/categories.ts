import type { Category, CategoryGroup, CategoryId, GroupId } from "@/lib/types";

/** The six service sectors KAAM operates in. */
export const GROUPS: CategoryGroup[] = [
  { id: "maintenance", label: "Maintenance & Repair", icon: "🔧", tagline: "Electricians, plumbers, mechanics & more" },
  { id: "care", label: "Care & Health", icon: "❤️", tagline: "Nurses, physios, babysitters, house help" },
  { id: "art", label: "Art & Music", icon: "🎻", tagline: "Violinists, pianists, singers, dance teachers" },
  { id: "hospitality", label: "Hospitality", icon: "🍽️", tagline: "Cooks, catering & event staff" },
  { id: "wellness", label: "Beauty & Wellness", icon: "💆", tagline: "Beauticians, massage, yoga" },
  { id: "everyday", label: "Everyday Services", icon: "🚗", tagline: "Drivers, tutors, cleaners, movers" },
];

export const CATEGORIES: Category[] = [
  // ── Maintenance & Repair ──────────────────────────────
  { id: "elec", group: "maintenance", label: "Electrician", icon: "⚡", basePrice: 400, subServices: ["Fan Repair", "Wiring", "AC Install", "CCTV", "MCB / Panel", "Smart Home"] },
  { id: "plumb", group: "maintenance", label: "Plumber", icon: "🔧", basePrice: 350, subServices: ["Leak Fix", "Pipe Fitting", "Drain Clean", "Geyser", "Tap Replace"] },
  { id: "mech", group: "maintenance", label: "Mechanic", icon: "🔩", basePrice: 600, subServices: ["Car Service", "Bike Repair", "Battery", "AC Gas", "Tyre Change"] },
  { id: "ac", group: "maintenance", label: "AC Technician", icon: "❄️", basePrice: 500, subServices: ["AC Service", "Gas Refill", "Install", "PCB Repair"] },
  { id: "carp", group: "maintenance", label: "Carpenter", icon: "🪚", basePrice: 500, subServices: ["Furniture", "Kitchen Cabinets", "Doors", "Flooring"] },
  { id: "painter", group: "maintenance", label: "Painter", icon: "🖌️", basePrice: 350, subServices: ["Interior", "Exterior", "Texture", "Waterproofing"] },
  { id: "pest", group: "maintenance", label: "Pest Control", icon: "🐛", basePrice: 800, subServices: ["Cockroach", "Termite", "Rodent", "Mosquito"] },
  { id: "cctv", group: "maintenance", label: "CCTV Install", icon: "📹", basePrice: 1200, subServices: ["Home Security", "Office", "PTZ", "NVR Setup"] },
  { id: "ro", group: "maintenance", label: "RO / Water", icon: "💧", basePrice: 400, subServices: ["RO Service", "Filter Change", "UV Install", "Purifier"] },

  // ── Care & Health ─────────────────────────────────────
  { id: "nurse", group: "care", label: "Home Nurse", icon: "🏥", basePrice: 1200, subServices: ["Elder Care", "Post-Surgery", "IV Drip", "Wound Dressing"], femaleWorkersOnly: true },
  { id: "physio", group: "care", label: "Physiotherapist", icon: "💪", basePrice: 1000, subServices: ["Joint Pain", "Sports Rehab", "Post-Surgery", "Elderly"] },
  { id: "babysitter", group: "care", label: "Baby Sitter", icon: "👶", basePrice: 500, subServices: ["Infant Care", "Toddler Care", "After School", "Overnight"], femaleWorkersOnly: true },
  { id: "maid", group: "care", label: "House Maid", icon: "🏠", basePrice: 450, subServices: ["Cooking Help", "Cleaning", "Laundry", "Full-time Help"] },
  { id: "eldercare", group: "care", label: "Elder Caretaker", icon: "🧓", basePrice: 800, subServices: ["Companionship", "Medication Reminders", "Mobility Help", "Live-in Care"] },

  // ── Art & Music ───────────────────────────────────────
  { id: "violin", group: "art", label: "Violinist", icon: "🎻", basePrice: 1500, subServices: ["Wedding / Event", "Violin Lessons", "Recording Session", "Carnatic", "Western Classical"] },
  { id: "piano", group: "art", label: "Pianist", icon: "🎹", basePrice: 1500, subServices: ["Event Performance", "Piano Lessons", "Accompanist", "Trinity Grade Prep"] },
  { id: "guitar", group: "art", label: "Guitarist", icon: "🎸", basePrice: 1000, subServices: ["Guitar Lessons", "Event Performance", "Studio Session", "Acoustic / Electric"] },
  { id: "singer", group: "art", label: "Singer", icon: "🎤", basePrice: 2000, subServices: ["Wedding Sangeet", "Corporate Event", "Playback / Cover", "Vocal Lessons"] },
  { id: "dance", group: "art", label: "Dance Teacher", icon: "💃", basePrice: 800, subServices: ["Bollywood", "Classical (Bharatanatyam)", "Wedding Choreography", "Kids Classes"] },
  { id: "photo", group: "art", label: "Photographer", icon: "📷", basePrice: 2500, subServices: ["Events", "Portfolio", "Product", "Real Estate"] },

  // ── Hospitality ───────────────────────────────────────
  { id: "cook", group: "hospitality", label: "Home Cook", icon: "👨‍🍳", basePrice: 800, subServices: ["North Indian", "South Indian", "Continental", "Tiffin"] },
  { id: "catering", group: "hospitality", label: "Catering Staff", icon: "🍛", basePrice: 1500, subServices: ["Party Catering", "Live Counters", "Buffet Service", "Corporate Lunch"] },
  { id: "events", group: "hospitality", label: "Event Staff", icon: "🎪", basePrice: 700, subServices: ["Waiters", "Bartending (Mocktail)", "Hosting / Ushering", "Setup Crew"] },

  // ── Beauty & Wellness ─────────────────────────────────
  { id: "beauty", group: "wellness", label: "Beautician", icon: "💄", basePrice: 700, subServices: ["Facial", "Waxing", "Threading", "Nail Art"], femaleWorkersOnly: true },
  { id: "massage", group: "wellness", label: "Massage", icon: "🧖", basePrice: 900, subServices: ["Swedish", "Deep Tissue", "Reflexology"], femaleWorkersOnly: true },
  { id: "yoga", group: "wellness", label: "Yoga Teacher", icon: "🧘", basePrice: 600, subServices: ["Hatha", "Pranayama", "Meditation", "Prenatal"] },

  // ── Everyday Services ─────────────────────────────────
  { id: "driver", group: "everyday", label: "Driver", icon: "🚗", basePrice: 600, subServices: ["City Drive", "Airport Drop", "Outstation", "Corporate"] },
  { id: "tutor", group: "everyday", label: "Tutor", icon: "📚", basePrice: 700, subServices: ["Math", "Science", "English", "JEE", "NEET", "Board Prep"] },
  { id: "clean", group: "everyday", label: "Cleaner", icon: "🧹", basePrice: 400, subServices: ["Deep Clean", "Office", "Post-Event", "Sofa / Carpet"] },
  { id: "movers", group: "everyday", label: "Packers & Movers", icon: "📦", basePrice: 2000, subServices: ["Local Move", "Office Shift", "Car Transport", "Storage"] },
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
