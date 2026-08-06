import type { EventCompany } from "@/lib/event-store";

/**
 * A stand-in swatch so the seeded businesses show a portfolio strip. Real
 * companies upload photographs; these are plainly coloured tiles rather than
 * borrowed stock images, because a picture presented as a company's own work
 * when it is not is exactly the kind of claim this app has been stripping out.
 */
const swatch = (hex: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="${hex}"/></svg>`,
  )}`;

const SAMPLE = (a: string, b: string, c: string): EventCompany["portfolio"] => [
  { kind: "image", dataUrl: swatch(a) },
  { kind: "image", dataUrl: swatch(b) },
  { kind: "image", dataUrl: swatch(c) },
];

/**
 * Seed event companies, so the category is not an empty room on day one.
 *
 * Deliberately spread across the trade rather than clustered on weddings: a
 * sound-and-light crew doing college fests, a promoter running music nights,
 * a temple-festival outfit and a corporate conference team all live here. An
 * event is a date, a place, a crowd and a price — the house it happens in is
 * incidental, and treating weddings as the whole category would have shut out
 * half the Kerala event trade.
 *
 * These are demo businesses with demo ratings, replaced by real registrations
 * as they are approved.
 *
 * The numbers below are invented, and they exist so a demo company can sign in
 * the same way a real one does — see src/lib/company-auth.ts. They are not a
 * way to ring anybody: no customer-facing screen renders a company's phone,
 * which is the rule that actually protects it. Keep it that way.
 */
export const SEED_COMPANIES: EventCompany[] = [
  {
    id: "ec_seed_1",
    name: "Malabar Weddings & Events",
    contactName: "Suresh Nair",
    phone: "9876543211",
    district: "Ernakulam",
    city: "Kochi",
    yearsRunning: 14,
    crewSize: 40,
    services: ["Wedding stages", "Floral decor", "Lighting", "Live counters"],
    about:
      "Full wedding setups across central Kerala — mandapam decor, floral work, lighting and catering crew under one roof.",
    portfolio: SAMPLE("#0f6e4f", "#c99700", "#8a6d00"),
    status: "approved",
    submittedAt: "2026-01-12T09:00:00.000Z",
    reviewedAt: "2026-01-13T09:00:00.000Z",
    legalName: "Malabar Weddings & Events Pvt Ltd",
    gstin: "32AABCM1234K1ZM",
    pan: "AABCM1234K",
    agreement: { version: 1, acceptedAt: "2026-04-10T09:00:00.000Z", acceptedBy: "Suresh Nair" },
    rating: 4.8,
    reviewCount: 96,
    eventsDone: 210,
  },
  {
    id: "ec_seed_2",
    name: "Soundscape Live",
    contactName: "Rafi Muhammed",
    phone: "9876543212",
    district: "Kozhikode",
    city: "Kozhikode",
    yearsRunning: 9,
    crewSize: 22,
    services: ["Concert sound", "Stage & truss", "LED walls", "Artist management"],
    about:
      "Line-array sound and stage rigging for music shows and college festivals. We have run 300+ nights across north Kerala.",
    portfolio: SAMPLE("#1e293b", "#7c3aed", "#0369a1"),
    status: "approved",
    submittedAt: "2026-02-02T09:00:00.000Z",
    reviewedAt: "2026-02-03T09:00:00.000Z",
    legalName: "Soundscape Live Pvt Ltd",
    gstin: "32AABCT5678L1ZM",
    pan: "AABCT5678L",
    agreement: { version: 1, acceptedAt: "2026-04-10T09:00:00.000Z", acceptedBy: "Rafi Muhammed" },
    rating: 4.7,
    reviewCount: 61,
    eventsDone: 318,
  },
  {
    id: "ec_seed_3",
    name: "Thrissur Utsavam Works",
    contactName: "Krishnakumar P",
    phone: "9876543213",
    district: "Thrissur",
    city: "Thrissur",
    yearsRunning: 22,
    crewSize: 55,
    services: ["Festival pandals", "Temple decor", "Traditional lighting", "Crowd barricades"],
    about:
      "Three generations of utsavam and perunnal work. Pandals, panthal lighting and crowd management for temple and church festivals.",
    portfolio: SAMPLE("#b45309", "#7c2d12", "#c99700"),
    status: "approved",
    submittedAt: "2026-01-20T09:00:00.000Z",
    reviewedAt: "2026-01-21T09:00:00.000Z",
    legalName: "Thrissur Utsavam Works Pvt Ltd",
    gstin: "32AABCS9012M1ZM",
    pan: "AABCS9012M",
    agreement: { version: 1, acceptedAt: "2026-04-10T09:00:00.000Z", acceptedBy: "Krishnakumar P" },
    rating: 4.9,
    reviewCount: 143,
    eventsDone: 480,
  },
  {
    id: "ec_seed_4",
    name: "BlueRoom Corporate Events",
    contactName: "Anjali Menon",
    phone: "9876543214",
    district: "Ernakulam",
    city: "Kakkanad",
    yearsRunning: 7,
    crewSize: 18,
    services: ["Conferences", "Product launches", "AV & streaming", "Registration desks"],
    about:
      "Conferences, launches and offsites for the Infopark and Technopark crowd. Hybrid streaming and full AV in-house.",
    portfolio: SAMPLE("#0369a1", "#075985", "#1e293b"),
    status: "approved",
    submittedAt: "2026-03-01T09:00:00.000Z",
    reviewedAt: "2026-03-02T09:00:00.000Z",
    legalName: "BlueRoom Corporate Events Pvt Ltd",
    gstin: "32AABCK3456N1ZM",
    pan: "AABCK3456N",
    agreement: { version: 1, acceptedAt: "2026-04-10T09:00:00.000Z", acceptedBy: "Anjali Menon" },
    rating: 4.6,
    reviewCount: 38,
    eventsDone: 124,
  },
  {
    id: "ec_seed_5",
    name: "Kollam Kalyanam Decorators",
    contactName: "Beena Thomas",
    phone: "9876543215",
    district: "Kollam",
    city: "Kollam",
    yearsRunning: 11,
    crewSize: 26,
    services: ["Wedding decor", "Reception stages", "Car decoration", "Sadya catering"],
    about:
      "Traditional and modern wedding decor with our own sadya kitchen. We handle everything from nischayam to reception.",
    portfolio: SAMPLE("#0f6e4f", "#b91c1c", "#c99700"),
    status: "approved",
    submittedAt: "2026-02-14T09:00:00.000Z",
    reviewedAt: "2026-02-15T09:00:00.000Z",
    legalName: "Kollam Kalyanam Decorators Pvt Ltd",
    gstin: "32AABCP7890Q1ZM",
    pan: "AABCP7890Q",
    agreement: { version: 1, acceptedAt: "2026-04-10T09:00:00.000Z", acceptedBy: "Beena Thomas" },
    rating: 4.7,
    reviewCount: 72,
    eventsDone: 189,
  },
  {
    id: "ec_seed_6",
    name: "Campus Fest Crew",
    contactName: "Arun Dev",
    phone: "9876543216",
    district: "Thiruvananthapuram",
    city: "Thiruvananthapuram",
    yearsRunning: 5,
    crewSize: 30,
    services: ["College fests", "DJ nights", "Stage design", "Security & volunteers"],
    about:
      "Built by ex-students who ran their own college fests. Budget-aware packages for arts days, tech fests and DJ nights.",
    portfolio: SAMPLE("#7c3aed", "#4c1d95", "#0369a1"),
    status: "approved",
    submittedAt: "2026-04-05T09:00:00.000Z",
    reviewedAt: "2026-04-06T09:00:00.000Z",
    legalName: "Campus Fest Crew Pvt Ltd",
    gstin: "32AABCV2345R1ZM",
    pan: "AABCV2345R",
    agreement: { version: 1, acceptedAt: "2026-04-10T09:00:00.000Z", acceptedBy: "Arun Dev" },
    rating: 4.5,
    reviewCount: 44,
    eventsDone: 96,
  },
  {
    id: "ec_seed_7",
    name: "Kannur Event Solutions",
    contactName: "Faisal K",
    phone: "9876543217",
    district: "Kannur",
    city: "Kannur",
    yearsRunning: 12,
    crewSize: 24,
    services: ["Exhibitions", "Inaugurations", "Trade stalls", "Branding & signage"],
    about:
      "Expo stalls, shop inaugurations and trade fairs across north Kerala, with our own fabrication and printing unit.",
    portfolio: SAMPLE("#075985", "#0f6e4f", "#334155"),
    status: "approved",
    submittedAt: "2026-03-18T09:00:00.000Z",
    reviewedAt: "2026-03-19T09:00:00.000Z",
    legalName: "Kannur Event Solutions Pvt Ltd",
    gstin: "32AABCD6789S1ZM",
    pan: "AABCD6789S",
    agreement: { version: 1, acceptedAt: "2026-04-10T09:00:00.000Z", acceptedBy: "Faisal K" },
    rating: 4.6,
    reviewCount: 51,
    eventsDone: 167,
  },
  {
    id: "ec_seed_8",
    name: "Backwater Celebrations",
    contactName: "Divya Raj",
    phone: "9876543218",
    district: "Alappuzha",
    city: "Alappuzha",
    yearsRunning: 8,
    crewSize: 20,
    services: ["Houseboat events", "Beach weddings", "Birthday parties", "Photography"],
    about:
      "Destination functions on the backwaters and beaches — houseboat receptions, beach mandapams and small private parties.",
    portfolio: SAMPLE("#0891b2", "#c99700", "#0f6e4f"),
    status: "approved",
    submittedAt: "2026-02-25T09:00:00.000Z",
    reviewedAt: "2026-02-26T09:00:00.000Z",
    legalName: "Backwater Celebrations Pvt Ltd",
    gstin: "32AABCN0123T1ZM",
    pan: "AABCN0123T",
    agreement: { version: 1, acceptedAt: "2026-04-10T09:00:00.000Z", acceptedBy: "Divya Raj" },
    rating: 4.8,
    reviewCount: 67,
    eventsDone: 152,
  },
];
