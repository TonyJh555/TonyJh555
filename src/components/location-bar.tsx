"use client";
import { useLanguage } from "@/components/language-provider";

import { useState } from "react";
import { KERALA_DISTRICTS, nearestPlaceName, type LatLng } from "@/lib/geo";
import { setSearchLocation, useSearchLocation } from "@/lib/location";
import { useAddresses, addressesFor, displayName } from "@/lib/addresses";
import { useCustomer } from "@/lib/auth";

/**
 * "Showing workers near …" bar — the Swiggy/Zomato location header. Lets the
 * customer set where they are (GPS, a saved address, or any of Kerala's 14
 * districts) so results rank nearest-first from that point.
 */
export function LocationBar() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const loc = useSearchLocation();
  const customer = useCustomer();
  const savedAddresses = addressesFor(useAddresses(), customer?.id);
  const [open, setOpen] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const useGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError(ml ? "ഈ ഉപകരണത്തിൽ ലൊക്കേഷൻ ലഭ്യമല്ല." : "Location not available on this device.");
      return;
    }
    setGpsBusy(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setSearchLocation({ label: nearestPlaceName(coords), coords, source: "gps" });
        setGpsBusy(false);
        setOpen(false);
      },
      () => {
        setGpsBusy(false);
        setGpsError("Couldn't get your location. Pick a district instead.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-left shadow-card"
      >
        <span className="text-base">📍</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold text-dim">{ml ? "അടുത്തുള്ള തൊഴിലാളികൾ" : "Showing workers near"}</span>
          <span className="block truncate text-sm font-bold text-ink">{loc.label}</span>
        </span>
        <span className="text-xs font-bold text-kaam">Change ▾</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="max-h-[80vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-page p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-extrabold">{ml ? "നിങ്ങളുടെ സ്ഥലം സെറ്റ് ചെയ്യൂ" : "Set your location"}</h2>
              <button onClick={() => setOpen(false)} className="text-lg text-mid">✕</button>
            </div>

            <button
              onClick={useGps}
              disabled={gpsBusy}
              className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-kaam-mid bg-kaam-light px-4 py-3 text-left"
            >
              <span className="text-xl">🎯</span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-kaam">
                  {gpsBusy ? (ml ? "കണ്ടെത്തുന്നു…" : "Locating…") : ml ? "എന്റെ ഇപ്പോഴത്തെ സ്ഥലം ഉപയോഗിക്കൂ" : "Use my current location"}
                </span>
                <span className="block text-[11px] text-mid">{ml ? "ഏറ്റവും കൃത്യം — അടുത്തുള്ളവർ ആദ്യം" : "Most accurate — nearest workers first"}</span>
              </span>
            </button>
            {gpsError && <p className="mb-3 text-[11px] font-semibold text-kaam">{gpsError}</p>}

            {savedAddresses.length > 0 && (
              <>
                <p className="mb-1.5 text-[10px] font-bold tracking-wide text-dim uppercase">{ml ? "സേവ് ചെയ്ത വിലാസങ്ങൾ" : "Saved addresses"}</p>
                <div className="mb-3 flex flex-col gap-2">
                  {savedAddresses
                    .filter((a) => a.coords)
                    .map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setSearchLocation({ label: displayName(a), coords: a.coords!, source: "address" });
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-left text-sm font-semibold"
                      >
                        {a.label === "Home" ? "🏠" : a.label === "Office" ? "🏢" : "📍"} {displayName(a)}
                        <span className="ml-auto truncate text-[11px] text-dim">{a.line}</span>
                      </button>
                    ))}
                </div>
              </>
            )}

            <p className="mb-1.5 text-[10px] font-bold tracking-wide text-dim uppercase">
              Choose a district (all 14)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {KERALA_DISTRICTS.map((d) => {
                const active = loc.label.includes(d.name);
                return (
                  <button
                    key={d.name}
                    onClick={() => {
                      setSearchLocation({ label: `${d.name}`, coords: d.coords, source: "district" });
                      setOpen(false);
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold ${
                      active ? "border-kaam bg-kaam-light text-kaam" : "border-line bg-white text-ink"
                    }`}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
