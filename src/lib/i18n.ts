/** Lightweight i18n for the three launch languages. */

export type Lang = "en" | "hi" | "ta" | "ml";

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
  hi: {
    name: "हिंदी",
    flag: "🇮🇳",
    bookNow: "अभी बुक करें",
    findWorker: "काम वाला खोजें",
    greeting: "सुप्रभात",
    nearby: "पास के काम वाले",
    viewAll: "सब देखें",
    away: "दूर",
    payNow: "पेमेंट करें",
    rateWorker: "रेट करें",
    submitRating: "रेटिंग दें",
    hello: "नमस्ते",
    searchPlaceholder: "इलेक्ट्रीशियन, प्लंबर, नर्स खोजें…",
    myBookings: "मेरी बुकिंग",
    home: "होम",
    search: "खोजें",
    bookings: "बुकिंग",
  },
  ta: {
    name: "தமிழ்",
    flag: "🇮🇳",
    bookNow: "இப்போது பதிவு செய்",
    findWorker: "தொழிலாளரை தேடு",
    greeting: "காலை வணக்கம்",
    nearby: "அருகில் தொழிலாளர்",
    viewAll: "அனைத்தும் காண்க",
    away: "தூரம்",
    payNow: "செலுத்து",
    rateWorker: "மதிப்பிடு",
    submitRating: "சமர்ப்பி",
    hello: "வணக்கம்",
    searchPlaceholder: "எலக்ட்ரீஷியன், பிளம்பர் தேடு…",
    myBookings: "என் பதிவுகள்",
    home: "முகப்பு",
    search: "தேடு",
    bookings: "பதிவுகள்",
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

export const LANGS: Lang[] = ["en", "hi", "ta", "ml"];

export function getDictionary(lang: Lang): Dictionary {
  return dictionaries[lang];
}
