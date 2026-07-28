import type { Faq } from "@/lib/faqs";

/**
 * The questions customers actually ask, as shipped.
 *
 * These are the defaults: the Help centre reads them through the content
 * store, so the owner can fix a wrong answer or add the question everybody
 * started asking this week from the admin console instead of waiting for a
 * deploy. Deleting the edit anywhere restores exactly this list.
 *
 * Both languages, always. An English-only answer is no answer for most of the
 * people this app is for.
 */
export const DEFAULT_FAQS: Faq[] = [
  {
    q: "How do I book a worker?",
    qMl: "എങ്ങനെ ഒരു തൊഴിലാളിയെ ബുക്ക് ചെയ്യാം?",
    a: "Open Home or Search, pick a service, choose a verified worker, select date & time (or ‘as soon as possible’), and pay. The worker confirms your slot and you can track them live.",
    aMl: "ഹോം അല്ലെങ്കിൽ സെർച്ച് തുറക്കൂ, ഒരു സേവനം തിരഞ്ഞെടുക്കൂ, വെരിഫൈഡ് തൊഴിലാളിയെ തിരഞ്ഞെടുക്കൂ, തീയതി & സമയം (അല്ലെങ്കിൽ 'എത്രയും വേഗം') തിരഞ്ഞെടുത്ത് പണമടയ്ക്കൂ. തൊഴിലാളി സ്ഥിരീകരിക്കും, നിങ്ങൾക്ക് തത്സമയം ട്രാക്ക് ചെയ്യാം.",
  },
  {
    q: "When can I chat with the worker?",
    qMl: "തൊഴിലാളിയുമായി എപ്പോൾ ചാറ്റ് ചെയ്യാം?",
    a: "Chat opens right after you book, from My Bookings → Chat. You can share photos or videos of the problem, and the worker can share their work. For your safety, keep all conversation inside KAAM.",
    aMl: "ബുക്ക് ചെയ്ത ഉടൻ ചാറ്റ് തുറക്കും — എന്റെ ബുക്കിംഗുകൾ → ചാറ്റ്. പ്രശ്നത്തിന്റെ ഫോട്ടോ/വീഡിയോ ഷെയർ ചെയ്യാം. സുരക്ഷയ്ക്കായി എല്ലാ സംഭാഷണവും കാമിനുള്ളിൽ സൂക്ഷിക്കൂ.",
  },
  {
    q: "What is the start code / OTP?",
    qMl: "സ്റ്റാർട്ട് കോഡ് / OTP എന്താണ്?",
    a: "When the worker arrives, share the 4-digit start code shown on your booking. The job only begins once they enter it — so no one can start work on your behalf.",
    aMl: "തൊഴിലാളി എത്തുമ്പോൾ, ബുക്കിംഗിൽ കാണിക്കുന്ന 4-അക്ക സ്റ്റാർട്ട് കോഡ് നൽകൂ. അവർ അത് നൽകുമ്പോൾ മാത്രമേ ജോലി തുടങ്ങൂ — നിങ്ങളറിയാതെ ആരും ജോലി തുടങ്ങില്ല.",
  },
  {
    q: "How are prices calculated?",
    qMl: "വില എങ്ങനെ കണക്കാക്കുന്നു?",
    a: "Every price is all-inclusive — service amount plus GST, shown upfront, with nothing extra to hand the worker. For repairs the base hour covers the worker's time & travel, and past a 5-minute grace you pay only for the extra minutes actually worked (1h 08m bills 68 minutes, never a rounded-up second hour). Events take a small advance with the balance after; fixed visits and care plans are prepaid. See Account → How you pay for the full breakdown.",
    aMl: "ഓരോ വിലയും എല്ലാം ഉൾപ്പെട്ടത് — സേവന തുകയും GST-യും, മുൻകൂട്ടി കാണിക്കും, തൊഴിലാളിക്ക് അധികമായി ഒന്നും നൽകേണ്ട. അറ്റകുറ്റപ്പണിക്ക് ബേസ് അവർ സമയവും യാത്രയും മൂടും, 5 മിനിറ്റ് ഗ്രേസിന് ശേഷം ജോലി ചെയ്ത അധിക മിനിറ്റുകൾക്ക് മാത്രം പണം. ഇവന്റുകൾക്ക് ചെറിയ അഡ്വാൻസ്; സ്ഥിര സന്ദർശനങ്ങളും കെയർ പ്ലാനുകളും മുൻകൂർ. കൂടുതൽ വിവരം: അക്കൗണ്ട് → എങ്ങനെ പണമടയ്ക്കും.",
  },
  {
    q: "Can I cancel a booking?",
    qMl: "ബുക്കിംഗ് റദ്ദാക്കാമോ?",
    a: "Yes. Go to My Bookings and tap Cancel. Cancelling before the worker accepts is free and fully refunded to KAAM Cash. After acceptance a small convenience fee may apply.",
    aMl: "അതെ. എന്റെ ബുക്കിംഗുകളിൽ പോയി റദ്ദാക്കൂ. തൊഴിലാളി സ്വീകരിക്കുന്നതിന് മുൻപ് സൗജന്യമായി റദ്ദാക്കാം, മുഴുവൻ കാം ക്യാഷിലേക്ക്. സ്വീകരിച്ച ശേഷം ചെറിയ ഫീസ് ബാധകമായേക്കാം.",
  },
  {
    q: "What is KAAM Cash?",
    qMl: "കാം ക്യാഷ് എന്താണ്?",
    a: "Your in-app wallet. Earn it from welcome and referral bonuses and refunds, and use it at checkout. Refer a friend with your code and you both get ₹100.",
    aMl: "നിങ്ങളുടെ ആപ്പ് വാലറ്റ്. വെൽക്കം/റഫറൽ ബോണസുകൾ, റീഫണ്ട് എന്നിവയിലൂടെ നേടൂ, ചെക്ക്ഔട്ടിൽ ഉപയോഗിക്കൂ. കോഡ് ഉപയോഗിച്ച് സുഹൃത്തിനെ ചേർത്താൽ രണ്ടു പേർക്കും ₹100.",
  },
  {
    q: "How do you verify workers?",
    qMl: "തൊഴിലാളികളെ എങ്ങനെ വെരിഫൈ ചെയ്യുന്നു?",
    a: "Every worker submits KYC (Aadhaar), experience proof and, where relevant, certificates. Our team reviews each application within 24 hours before they can take jobs.",
    aMl: "ഓരോ തൊഴിലാളിയും KYC (ആധാർ), പരിചയ തെളിവ്, ആവശ്യമെങ്കിൽ സർട്ടിഫിക്കറ്റുകൾ സമർപ്പിക്കുന്നു. ജോലി എടുക്കുന്നതിന് മുൻപ് ഞങ്ങളുടെ ടീം 24 മണിക്കൂറിനുള്ളിൽ ഓരോ അപേക്ഷയും അവലോകനം ചെയ്യുന്നു.",
  },
];
