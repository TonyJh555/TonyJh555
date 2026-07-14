"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { LatLng } from "@/lib/geo";

/**
 * Free map (Leaflet + OpenStreetMap, no API key) showing a worker and a
 * customer. When `animateWorker` is set, the worker marker glides toward
 * the customer over `arriveSeconds` — a simple live-tracking simulation.
 * In production the worker's marker follows real device GPS.
 */
export function LiveMap({
  worker,
  customer,
  animateWorker = false,
  arriveSeconds = 75,
  heightClass = "h-52",
}: {
  worker: LatLng;
  customer: LatLng;
  animateWorker?: boolean;
  arriveSeconds?: number;
  heightClass?: string;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const workerMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;

      const map = L.map(elRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const pin = (emoji: string, anchor: [number, number]) =>
        L.divIcon({
          html: `<span style="font-size:24px;line-height:1">${emoji}</span>`,
          className: "kaam-map-pin",
          iconSize: [26, 26],
          iconAnchor: anchor,
        });

      L.marker([customer.lat, customer.lng], { icon: pin("📍", [13, 26]) }).addTo(map);
      workerMarkerRef.current = L.marker([worker.lat, worker.lng], {
        icon: pin("🔨", [13, 13]),
      }).addTo(map);

      const line = L.polyline(
        [
          [worker.lat, worker.lng],
          [customer.lat, customer.lng],
        ],
        { color: "#C41E3A", weight: 3, dashArray: "6 8", opacity: 0.8 },
      ).addTo(map);
      map.fitBounds(line.getBounds().pad(0.5));

      if (animateWorker) {
        const start = Date.now();
        timer = setInterval(() => {
          const t = Math.min(1, (Date.now() - start) / (arriveSeconds * 1000));
          const lat = worker.lat + (customer.lat - worker.lat) * t;
          const lng = worker.lng + (customer.lng - worker.lng) * t;
          workerMarkerRef.current?.setLatLng([lat, lng]);
          line.setLatLngs([
            [lat, lng],
            [customer.lat, customer.lng],
          ]);
          if (t >= 1 && timer) clearInterval(timer);
        }, 1000);
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      mapRef.current?.remove();
      mapRef.current = null;
      workerMarkerRef.current = null;
    };
  }, [worker.lat, worker.lng, customer.lat, customer.lng, animateWorker, arriveSeconds]);

  return (
    <div
      ref={elRef}
      className={`${heightClass} w-full overflow-hidden rounded-2xl border border-line`}
      style={{ zIndex: 0 }}
    />
  );
}
