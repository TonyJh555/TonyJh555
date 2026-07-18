"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import type { LatLng } from "@/lib/geo";
import type { Worker } from "@/lib/types";
import { getCategory } from "@/data/categories";
import { inr } from "@/lib/format";

/**
 * Uber-style live map of nearby workers (Leaflet + OpenStreetMap, no API key).
 * The customer is a 📍 pin; each worker is their category emoji, tap for a
 * popup with rating, price and a "View & book" link. Auto-fits to the workers
 * shown so the nearest are always in view.
 */
export function WorkersMap({
  center,
  workers,
  heightClass = "h-[62vh]",
}: {
  center: LatLng;
  workers: Worker[];
  heightClass?: string;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;

      const map = L.map(elRef.current, {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      // Customer location
      L.marker([center.lat, center.lng], {
        icon: L.divIcon({
          html: `<span style="font-size:28px;line-height:1">📍</span>`,
          className: "kaam-map-pin",
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        }),
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup("<b>You are here</b>");

      const points: [number, number][] = [[center.lat, center.lng]];
      for (const w of workers) {
        const cat = getCategory(w.categoryId);
        const marker = L.marker([w.coords.lat, w.coords.lng], {
          icon: L.divIcon({
            html: `<span style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))">${cat.icon}</span>`,
            className: "kaam-map-pin",
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }),
        }).addTo(map);
        marker.bindPopup(
          `<div style="font-family:ui-sans-serif,sans-serif;min-width:160px">` +
            `<b>${w.name}</b>${w.verified ? " ✅" : ""}<br/>` +
            `${cat.icon} ${cat.label}<br/>` +
            `⭐ ${w.rating} · ${inr(w.rate)}/${w.unit}<br/>` +
            `<a href="/app/worker/${w.id}" style="color:#c41e3a;font-weight:700;text-decoration:none">View &amp; book →</a>` +
            `</div>`,
        );
        points.push([w.coords.lat, w.coords.lng]);
      }

      if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points).pad(0.25));
      } else {
        map.setView([center.lat, center.lng], 12);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [center.lat, center.lng, workers]);

  return (
    <div
      ref={elRef}
      className={`${heightClass} w-full overflow-hidden rounded-2xl border border-line`}
      style={{ zIndex: 0 }}
    />
  );
}
