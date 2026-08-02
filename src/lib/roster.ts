"use client";

import { useMemo } from "react";
import { WORKERS } from "@/data/workers";
import { getCategory } from "@/data/categories";
import { etaMinutes, geocode, haversineKm, jitter, KERALA_DISTRICTS } from "./geo";
import { currentApplications, useApplications, type WorkerApplication } from "./applications";
import type { KeralaDistrict, Worker } from "./types";

/**
 * Who is actually on KAAM.
 *
 * Approving a KYC application used to do nothing but flip a status. The
 * roster, the customer's search, the home screen and dispatch all read a
 * hardcoded seed array, so an approved worker was approved onto nothing: not
 * in the owner's roster, not findable by a customer, not bookable. Someone
 * uploaded their Aadhaar, waited a day, was told "You're verified!" — and the
 * platform had no record of them anywhere it mattered.
 *
 * This is the one list everything should read. Seed profiles stay (they are
 * what makes a new district look alive); real approved workers are appended,
 * and they are marked so nothing pretends they have a history they haven't
 * earned.
 */

/** True for someone who joined through KYC rather than shipping with the app. */
export function isRealWorker(w: Worker): boolean {
  return w.id.startsWith("kw-");
}

/** The district whose towns or name best match a free-text city. */
function districtFor(city: string): KeralaDistrict {
  const s = city.trim().toLowerCase();
  const byName = KERALA_DISTRICTS.find((d) => d.name.toLowerCase() === s);
  if (byName) return byName.name as KeralaDistrict;
  const byTown = KERALA_DISTRICTS.find((d) =>
    d.towns.some((t) => t.toLowerCase() === s),
  );
  if (byTown) return byTown.name as KeralaDistrict;
  // Not a name we know: fall back to whichever district HQ is nearest the
  // geocoded point, so a worker in a small village still lands somewhere real.
  const here = geocode(city);
  let best = KERALA_DISTRICTS[0];
  let bestKm = Infinity;
  for (const d of KERALA_DISTRICTS) {
    const km = haversineKm(here, d.coords);
    if (km < bestKm) {
      bestKm = km;
      best = d;
    }
  }
  return best.name as KeralaDistrict;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * An approved application, as a bookable worker.
 *
 * Everything that has to be *earned* starts at zero: no rating, no reviews, no
 * jobs. `verified` is true because KYC is exactly what was checked, and that
 * is the one thing this person really has.
 */
export function workerFromApplication(app: WorkerApplication): Worker {
  const cat = getCategory(app.categoryId);
  const district = districtFor(app.city);
  const home = KERALA_DISTRICTS.find((d) => d.name === district)!;
  const coords = jitter(geocode(app.city, home.towns[0]), app.id);
  const distanceKm = Math.round(haversineKm(coords, home.coords) * 10) / 10;
  return {
    id: `kw-${app.id}`,
    name: app.name,
    categoryId: app.categoryId,
    rating: 0,
    reviewCount: 0,
    rate: cat.basePrice,
    unit: "hr",
    distanceKm,
    district,
    coords,
    initials: initialsOf(app.name),
    verified: true,
    experienceYears: app.experienceYears,
    city: app.city,
    etaMinutes: etaMinutes(distanceKm),
    jobsDone: 0,
    bio: app.bio,
    skills: cat.subServices.slice(0, 4),
    surge: false,
    // A new worker starts offline; they go online from their own dashboard,
    // which is the only honest signal that they are ready for a job.
    online: false,
    acceptRate: 1,
  };
}

/** Seed roster + everyone who has actually been approved. */
export function rosterFrom(applications: WorkerApplication[]): Worker[] {
  const approved = applications.filter((a) => a.status === "approved");
  // Newest first among real joiners, so the owner sees today's arrivals first.
  const real = approved
    .slice()
    .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))
    .map(workerFromApplication);
  return [...real, ...WORKERS];
}

/** The live roster. Re-renders when an application is approved. */
export function useRoster(): Worker[] {
  const applications = useApplications();
  return useMemo(() => rosterFrom(applications), [applications]);
}

/**
 * The roster outside React, for the synchronous lookups — `getWorker`, the
 * dispatch engine — that cannot use a hook. Same list, same order.
 */
export function currentRoster(): Worker[] {
  return rosterFrom(currentApplications());
}

/** Find anyone on the platform by id, seeded or real. */
export function findWorker(id: string): Worker | undefined {
  return currentRoster().find((w) => w.id === id);
}
