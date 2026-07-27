"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { KERALA_CENTER, nearestPlaceName, type LatLng } from "@/lib/geo";
import { useLanguage } from "@/components/language-provider";

/**
 * Full-screen map location picker (Uber/Swiggy pattern): the map moves under
 * a fixed centre pin, so whatever is under the pin is the selected location.
 * Includes "use my current location" and an editable address label.
 * Free — Leaflet + OpenStreetMap, no API key.
 */
export function LocationPicker({
  initial,
  onConfirm,
  onClose,
}: {
  initial?: LatLng;
  onConfirm: (result: { coords: LatLng; label: string }) => void;
  onClose: () => void;
}) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [center, setCenter] = useState<LatLng>(initial ?? KERALA_CENTER);
  const [label, setLabel] = useState<string>(initial ? nearestPlaceName(initial) : "");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;

      const map = L.map(elRef.current, { zoomControl: false, attributionControl: false });
      mapRef.current = map;
      map.setView([center.lat, center.lng], initial ? 16 : 9);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      const onMove = () => {
        const c = map.getCenter();
        const next = { lat: c.lat, lng: c.lng };
        setCenter(next);
        setLabel(nearestPlaceName(next));
      };
      map.on("moveend", onMove);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapRef.current?.setView([c.lat, c.lng], 16);
        setCenter(c);
        setLabel(nearestPlaceName(c));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-page">
      <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <button onClick={onClose} aria-label={ml ? "അടയ്ക്കൂ" : "Close"} className="text-lg text-mid">
          ✕
        </button>
        <h2 className="font-display text-base font-bold">
          {ml ? "നിങ്ങളുടെ സ്ഥലം തിരഞ്ഞെടുക്കൂ" : "Set your location"}
        </h2>
      </div>

      <div className="relative flex-1">
        <div ref={elRef} className="h-full w-full" style={{ zIndex: 0 }} />
        {/* Fixed centre pin */}
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
          <div className="-translate-y-4 text-center">
            <span className="text-3xl drop-shadow">📍</span>
          </div>
        </div>
        {/* Current location button */}
        <button
          onClick={useCurrentLocation}
          disabled={locating}
          className="absolute bottom-4 right-4 z-[2] flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink shadow-pop disabled:opacity-60"
        >
          🎯 {locating
            ? ml ? "കണ്ടെത്തുന്നു…" : "Locating…"
            : ml ? "ഇപ്പോഴത്തെ സ്ഥലം" : "Use current location"}
        </button>
      </div>

      <div className="border-t border-line bg-white p-4">
        <p className="mb-1 text-[11px] font-bold tracking-wide text-dim uppercase">
          {ml ? "തിരഞ്ഞെടുത്ത സ്ഥലം" : "Selected area"}
        </p>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={ml ? "വീട്ടുനമ്പർ, ലാൻഡ്‌മാർക്ക് ചേർക്കൂ" : "Add flat / house no. & landmark"}
          className="mb-1 w-full rounded-xl border border-line bg-surf px-4 py-3 text-sm outline-none focus:border-kaam"
        />
        <p className="mb-3 text-[10px] text-dim">
          📌 {center.lat.toFixed(4)}, {center.lng.toFixed(4)} —{" "}
          {ml ? "ശരിയാക്കാൻ മാപ്പ് നീക്കൂ." : "drag the map to adjust."}
        </p>
        <button
          onClick={() => onConfirm({ coords: center, label: label.trim() || nearestPlaceName(center) })}
          className="w-full rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam"
        >
          {ml ? "സ്ഥലം സ്ഥിരീകരിക്കൂ →" : "Confirm location →"}
        </button>
      </div>
    </div>
  );
}
