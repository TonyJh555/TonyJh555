"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";
import type { CategoryId } from "./types";

/**
 * Worker onboarding applications with KYC + experience documents.
 *
 * Flow: worker signs up at /worker/signup → application lands in the
 * admin verification desk → the KAAM team approves or rejects within the
 * 24-hour SLA. Demo storage is localStorage (media as compressed data
 * URLs); production stores files in S3/R2 and runs HyperVerge +
 * DigiLocker + police verification per the build guide.
 */

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface WorkerApplication {
  id: string;
  name: string;
  phone: string;
  city: string;
  categoryId: CategoryId;
  experienceYears: number;
  bio: string;
  /** Optional public profiles — mainly for artists showcasing their work. */
  social?: {
    instagram?: string;
    youtube?: string;
    facebook?: string;
    website?: string;
  };
  /** KYC documents (compressed image data URLs). */
  docs: {
    aadhaarFront?: string;
    aadhaarBack?: string;
    certificate?: string;
  };
  /** Optional work-proof photos/videos. */
  media: { kind: "image" | "video"; dataUrl: string }[];
  status: ApplicationStatus;
  submittedAt: string; // ISO
  reviewedAt?: string;
  rejectReason?: string;
}

const STORAGE_KEY = "kaam.applications.v1";
const listeners = new Set<() => void>();

let cache: WorkerApplication[] | null = null;

function read(): WorkerApplication[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as WorkerApplication[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(applications: WorkerApplication[]): boolean {
  const previous = cache;
  cache = applications;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  } catch {
    cache = previous;
    return false;
  }
  listeners.forEach((fn) => fn());
  return true;
}

export type NewApplication = Omit<WorkerApplication, "id" | "status" | "submittedAt">;

/** Returns the new application id, or null if storage is full. */
export function submitApplication(input: NewApplication): string | null {
  const application: WorkerApplication = {
    ...input,
    id: shortId(),
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  return write([application, ...read()]) ? application.id : null;
}

export function reviewApplication(
  id: string,
  decision: "approved" | "rejected",
  rejectReason?: string,
) {
  write(
    read().map((a) =>
      a.id === id
        ? { ...a, status: decision, reviewedAt: new Date().toISOString(), rejectReason }
        : a,
    ),
  );
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const EMPTY: WorkerApplication[] = [];

export function useApplications(): WorkerApplication[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Hours remaining in the 24h review SLA (0 when breached). */
export function slaHoursLeft(application: WorkerApplication): number {
  const deadline = new Date(application.submittedAt).getTime() + 24 * 3600 * 1000;
  return Math.max(0, Math.round((deadline - Date.now()) / 3600 / 1000));
}

export const KERALA_CITIES = [
  "Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam",
  "Alappuzha", "Palakkad", "Kannur", "Kottayam", "Malappuram",
];
