import type { Category, CategoryId } from "@/lib/types";

export const CATEGORIES: Category[] = [
  { id: "elec", label: "Electrician", icon: "⚡", basePrice: 400, subServices: ["Fan Repair", "Wiring", "AC Install", "CCTV", "MCB / Panel", "Smart Home"] },
  { id: "plumb", label: "Plumber", icon: "🔧", basePrice: 350, subServices: ["Leak Fix", "Pipe Fitting", "Drain Clean", "Geyser", "Tap Replace"] },
  { id: "mech", label: "Mechanic", icon: "🔩", basePrice: 600, subServices: ["Car Service", "Bike Repair", "Battery", "AC Gas", "Tyre Change"] },
  { id: "ac", label: "AC Technician", icon: "❄️", basePrice: 500, subServices: ["AC Service", "Gas Refill", "Install", "PCB Repair"] },
  { id: "nurse", label: "Home Nurse", icon: "🏥", basePrice: 1200, subServices: ["Elder Care", "Post-Surgery", "IV Drip", "Wound Dressing"], femaleWorkersOnly: true },
  { id: "driver", label: "Driver", icon: "🚗", basePrice: 600, subServices: ["City Drive", "Airport Drop", "Outstation", "Corporate"] },
  { id: "tutor", label: "Tutor", icon: "📚", basePrice: 700, subServices: ["Math", "Science", "English", "JEE", "NEET", "Board Prep"] },
  { id: "cook", label: "Home Cook", icon: "👨‍🍳", basePrice: 800, subServices: ["North Indian", "South Indian", "Continental", "Tiffin"] },
  { id: "clean", label: "Cleaner", icon: "🧹", basePrice: 400, subServices: ["Deep Clean", "Office", "Post-Event", "Sofa / Carpet"] },
  { id: "beauty", label: "Beautician", icon: "💄", basePrice: 700, subServices: ["Facial", "Waxing", "Threading", "Nail Art"], femaleWorkersOnly: true },
  { id: "carp", label: "Carpenter", icon: "🪚", basePrice: 500, subServices: ["Furniture", "Kitchen Cabinets", "Doors", "Flooring"] },
  { id: "pest", label: "Pest Control", icon: "🐛", basePrice: 800, subServices: ["Cockroach", "Termite", "Rodent", "Mosquito"] },
  { id: "physio", label: "Physiotherapist", icon: "💪", basePrice: 1000, subServices: ["Joint Pain", "Sports Rehab", "Post-Surgery", "Elderly"] },
  { id: "painter", label: "Painter", icon: "🖌️", basePrice: 350, subServices: ["Interior", "Exterior", "Texture", "Waterproofing"] },
  { id: "movers", label: "Packers & Movers", icon: "📦", basePrice: 2000, subServices: ["Local Move", "Office Shift", "Car Transport", "Storage"] },
  { id: "yoga", label: "Yoga Teacher", icon: "🧘", basePrice: 600, subServices: ["Hatha", "Pranayama", "Meditation", "Prenatal"] },
  { id: "photo", label: "Photographer", icon: "📷", basePrice: 2500, subServices: ["Events", "Portfolio", "Product", "Real Estate"] },
  { id: "cctv", label: "CCTV Install", icon: "📹", basePrice: 1200, subServices: ["Home Security", "Office", "PTZ", "NVR Setup"] },
  { id: "ro", label: "RO / Water", icon: "💧", basePrice: 400, subServices: ["RO Service", "Filter Change", "UV Install", "Purifier"] },
  { id: "massage", label: "Massage", icon: "🧖", basePrice: 900, subServices: ["Swedish", "Deep Tissue", "Reflexology"], femaleWorkersOnly: true },
];

export function getCategory(id: CategoryId): Category {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}
