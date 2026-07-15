/** Lightweight geo helpers for map + ETA (no external API needed). */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Kerala cities and popular Kochi/Trivandrum areas → approximate coords. */
const KERALA_PLACES: Record<string, LatLng> = {
  // Kochi & areas
  "panampilly nagar": { lat: 9.9584, lng: 76.2996 },
  "marine drive": { lat: 9.9816, lng: 76.2757 },
  "kakkanad": { lat: 10.0158, lng: 76.3419 },
  "edappally": { lat: 10.0256, lng: 76.3086 },
  "fort kochi": { lat: 9.9658, lng: 76.2422 },
  "vyttila": { lat: 9.9676, lng: 76.3186 },
  "aluva": { lat: 10.1076, lng: 76.3516 },
  "kochi": { lat: 9.9312, lng: 76.2673 },
  "ernakulam": { lat: 9.9816, lng: 76.2999 },
  "cochin": { lat: 9.9312, lng: 76.2673 },
  // Other cities
  "thiruvananthapuram": { lat: 8.5241, lng: 76.9366 },
  "trivandrum": { lat: 8.5241, lng: 76.9366 },
  "technopark": { lat: 8.5566, lng: 76.8815 },
  "kowdiar": { lat: 8.5157, lng: 76.9557 },
  "kozhikode": { lat: 11.2588, lng: 75.7804 },
  "calicut": { lat: 11.2588, lng: 75.7804 },
  "thrissur": { lat: 10.5276, lng: 76.2144 },
  "kollam": { lat: 8.8932, lng: 76.6141 },
  "alappuzha": { lat: 9.4981, lng: 76.3388 },
  "alleppey": { lat: 9.4981, lng: 76.3388 },
  "palakkad": { lat: 10.7867, lng: 76.6548 },
  "kannur": { lat: 11.8745, lng: 75.3704 },
  "kottayam": { lat: 9.5916, lng: 76.5222 },
  "malappuram": { lat: 11.051, lng: 76.0711 },
};

const DEFAULT: LatLng = KERALA_PLACES["kochi"];

/** Center of Kerala, for the initial map view of the location picker. */
export const KERALA_CENTER: LatLng = { lat: 10.1, lng: 76.4 };

/** Nearest known place name to a coordinate — an offline reverse geocode. */
export function nearestPlaceName(point: LatLng): string {
  let best = "Kochi";
  let bestKm = Infinity;
  for (const [name, coords] of Object.entries(KERALA_PLACES)) {
    const km = haversineKm(point, coords);
    if (km < bestKm) {
      bestKm = km;
      best = name;
    }
  }
  const title = best.replace(/\b\w/g, (c) => c.toUpperCase());
  return bestKm < 2 ? title : `Near ${title}`;
}

/** Best-effort geocode of free-text address / city to Kerala coordinates. */
export function geocode(text?: string, fallbackCity = "Kochi"): LatLng {
  const s = (text ?? "").toLowerCase();
  // Longest place name first so "fort kochi" wins over "kochi".
  const keys = Object.keys(KERALA_PLACES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (s.includes(key)) return KERALA_PLACES[key];
  }
  return KERALA_PLACES[fallbackCity.toLowerCase()] ?? DEFAULT;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Stable small offset from a base point, seeded by an id (≈ up to `km`). */
export function jitter(base: LatLng, id: string, km = 2.5): LatLng {
  const h = hashString(id);
  const angle = ((h % 360) * Math.PI) / 180;
  const dist = (((h >> 4) % 100) / 100) * km;
  const dLat = (dist / 111) * Math.cos(angle);
  const dLng = (dist / (111 * Math.cos((base.lat * Math.PI) / 180))) * Math.sin(angle);
  return { lat: base.lat + dLat, lng: base.lng + dLng };
}

/** Straight-line distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Rough road ETA: straight-line × 1.4 detour ÷ Kerala city speed (~24 km/h). */
export function etaMinutes(km: number, speedKmh = 24): number {
  return Math.max(4, Math.round((km * 1.4) / speedKmh * 60));
}

/** Deep link that opens turn-by-turn navigation in the phone's maps app. */
export function directionsLink(to: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}`;
}
