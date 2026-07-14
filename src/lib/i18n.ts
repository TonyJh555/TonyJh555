/** Lightweight i18n — Kerala launch languages: English and Malayalam. */

export type Lang = "en" | "ml";

const dictionaries = {
  en: {
    name: "EN",
    flag: "🇬🇧",
    bookNow: "Book Now",
    findWorker: "Find a Worker",
    greeting: "Good morning",
    nearby: "Nearby Workers",
    viewAll: "View all",
    away: "away",
    payNow: "Pay Now",
    rateWorker: "Rate Worker",
    submitRating: "Submit Rating",
    hello: "Hello",
    searchPlaceholder: "Search electrician, plumber, nurse…",
    myBookings: "My Bookings",
    home: "Home",
    search: "Search",
    bookings: "Bookings",
  },
  ml: {
    name: "മലയാളം",
    flag: "🇮🇳",
    bookNow: "ഇപ്പോൾ ബുക്ക് ചെയ്യൂ",
    findWorker: "തൊഴിലാളിയെ കണ്ടെത്തൂ",
    greeting: "സുപ്രഭാതം",
    nearby: "അടുത്തുള്ള തൊഴിലാളികൾ",
    viewAll: "എല്ലാം കാണുക",
    away: "അകലെ",
    payNow: "പണമടയ്ക്കൂ",
    rateWorker: "റേറ്റ് ചെയ്യൂ",
    submitRating: "റേറ്റിംഗ് നൽകൂ",
    hello: "നമസ്കാരം",
    searchPlaceholder: "ഇലക്ട്രീഷ്യൻ, പ്ലംബർ തിരയൂ…",
    myBookings: "എന്റെ ബുക്കിംഗുകൾ",
    home: "ഹോം",
    search: "തിരയൂ",
    bookings: "ബുക്കിംഗുകൾ",
  },
} satisfies Record<Lang, Record<string, string>>;

export type Dictionary = { [K in keyof (typeof dictionaries)["en"]]: string };

export const LANGS: Lang[] = ["en", "ml"];

export function getDictionary(lang: Lang): Dictionary {
  return dictionaries[lang];
}
