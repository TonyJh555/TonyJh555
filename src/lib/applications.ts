"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";
import type { CategoryId } from "./types";
import { getSupabase, isSupabaseConfigured } from "./supabase";

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
  /** Email for KYC-decision notifications (from OTP signup or entered). */
  email?: string;
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
let cloudInit = false;

function read(): WorkerApplication[] {
  if (typeof window === "undefined") return [];
  if (cache === null) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      cache = raw ? (JSON.parse(raw) as WorkerApplication[]) : [];
    } catch {
      cache = [];
    }
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

/* ── Supabase mapping ────────────────────────────────────────────── */
type Row = Record<string, unknown>;

function toRow(a: WorkerApplication): Row {
  return {
    id: a.id,
    name: a.name,
    phone: a.phone,
    email: a.email ?? null,
    city: a.city,
    category_id: a.categoryId,
    experience_years: a.experienceYears,
    bio: a.bio,
    social: a.social ?? {},
    docs: a.docs ?? {},
    media: a.media ?? [],
    status: a.status,
    reject_reason: a.rejectReason ?? null,
    submitted_at: a.submittedAt,
    reviewed_at: a.reviewedAt ?? null,
  };
}

function fromRow(r: Row): WorkerApplication {
  return {
    id: r.id as string,
    name: r.name as string,
    phone: r.phone as string,
    email: (r.email as string) ?? undefined,
    city: r.city as string,
    categoryId: r.category_id as CategoryId,
    experienceYears: (r.experience_years as number) ?? 0,
    bio: (r.bio as string) ?? "",
    social: (r.social as WorkerApplication["social"]) ?? undefined,
    docs: (r.docs as WorkerApplication["docs"]) ?? {},
    media: (r.media as WorkerApplication["media"]) ?? [],
    status: r.status as ApplicationStatus,
    submittedAt: r.submitted_at as string,
    reviewedAt: (r.reviewed_at as string) ?? undefined,
    rejectReason: (r.reject_reason as string) ?? undefined,
  };
}

/** True once the admin desk is reading via the privileged server route. */
let privileged = false;

/**
 * Admin desk: pull applications through /api/admin/applications (service
 * role), so KYC stays readable after Stage-1 hardening removes public reads
 * (supabase/hardening.sql). Returns false (and changes nothing) when the
 * route isn't configured (401/501) — the public path keeps working in demo.
 */
export async function refreshPrivileged(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/admin/applications");
    if (!res.ok) return false;
    const data = (await res.json()) as { applications?: Row[] };
    if (!Array.isArray(data.applications)) return false;
    privileged = true;
    cache = data.applications.map(fromRow);
    listeners.forEach((fn) => fn());
    return true;
  } catch {
    return false;
  }
}

async function refetchCloud() {
  // Once privileged reads are active, the anon refetch (empty under
  // hardening) must not clobber them.
  if (privileged) return;
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("worker_applications")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error || !data) return;
    if (privileged) return;
    cache = data.map(fromRow);
    listeners.forEach((fn) => fn());
  } catch {
    // keep local cache on failure
  }
}

function ensureCloud() {
  if (cloudInit || typeof window === "undefined" || !isSupabaseConfigured()) return;
  cloudInit = true;
  const sb = getSupabase();
  if (!sb) return;
  refetchCloud();
  try {
    sb.channel("kaam-applications")
      .on("postgres_changes", { event: "*", schema: "public", table: "worker_applications" }, () => {
        refetchCloud();
      })
      .subscribe();
  } catch {
    // realtime unavailable — cloud still works via manual refetch
  }
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
  if (!write([application, ...read()])) return null;
  const sb = getSupabase();
  if (sb) {
    sb.from("worker_applications")
      .insert(toRow(application))
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud application insert failed, using local", error.message);
      });
  }
  return application.id;
}

/** Insert a fully-formed application (used by the owner's sample-data loader). */
export function addApplication(application: WorkerApplication): boolean {
  if (!write([application, ...read()])) return false;
  const sb = getSupabase();
  if (sb) {
    sb.from("worker_applications")
      .insert(toRow(application))
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud application insert failed, using local", error.message);
      });
  }
  return true;
}

export function removeApplication(id: string) {
  write(read().filter((a) => a.id !== id));
  const sb = getSupabase();
  if (sb) {
    sb.from("worker_applications")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud application delete failed, using local", error.message);
      });
  }
}

export function reviewApplication(
  id: string,
  decision: "approved" | "rejected",
  rejectReason?: string,
) {
  const reviewedAt = new Date().toISOString();
  const app = read().find((a) => a.id === id);
  write(
    read().map((a) =>
      a.id === id ? { ...a, status: decision, reviewedAt, rejectReason } : a,
    ),
  );
  const sb = getSupabase();
  if (sb) {
    sb.from("worker_applications")
      .update({ status: decision, reviewed_at: reviewedAt, reject_reason: rejectReason ?? null })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.warn("KAAM: cloud application update failed, using local", error.message);
      });
  }
  // Also persist via the privileged admin route — under Stage-1 hardening this
  // is the write that actually lands (the public update above is denied).
  if (typeof fetch !== "undefined") {
    fetch("/api/admin/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: decision, rejectReason }),
    }).catch(() => {});
  }
  // Email the worker their decision (best-effort; no-ops without RESEND_API_KEY).
  if (app?.email && typeof fetch !== "undefined") {
    fetch("/api/notify-worker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: app.email, name: app.name, decision, reason: rejectReason }),
    }).catch(() => {});
  }
}

function subscribe(fn: () => void) {
  ensureCloud();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const EMPTY: WorkerApplication[] = [];

export function useApplications(): WorkerApplication[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/**
 * Email address for a worker, taken from their approved KYC application.
 * The roster and the application list are separate stores (a worker is
 * onboarded through KYC, then appears on the roster), so the name is the link
 * between them. Returns undefined when the worker signed up by phone only —
 * callers must treat the email as optional.
 */
export function workerEmailFor(workerName: string): string | undefined {
  const wanted = workerName.trim().toLowerCase();
  return read().find(
    (a) => a.status === "approved" && a.email && a.name.trim().toLowerCase() === wanted,
  )?.email;
}

/** Hours remaining in the 24h review SLA (0 when breached). */
export function slaHoursLeft(application: WorkerApplication): number {
  const deadline = new Date(application.submittedAt).getTime() + 24 * 3600 * 1000;
  return Math.max(0, Math.round((deadline - Date.now()) / 3600 / 1000));
}

/* ── "My application" — remembers the application this device submitted, so a
 *    worker can see their own approval status in the worker portal. ───────── */
const MY_APP_KEY = "kaam.myapplication.v1";
const myAppListeners = new Set<() => void>();

export function setMyApplicationId(id: string) {
  try {
    window.localStorage.setItem(MY_APP_KEY, id);
  } catch {
    /* ignore */
  }
  myAppListeners.forEach((fn) => fn());
}

function readMyApplicationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(MY_APP_KEY);
  } catch {
    return null;
  }
}

export function useMyApplicationId(): string | null {
  return useSyncExternalStore(
    (fn) => {
      myAppListeners.add(fn);
      return () => myAppListeners.delete(fn);
    },
    readMyApplicationId,
    () => null,
  );
}

export const KERALA_CITIES = [
  "Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam",
  "Alappuzha", "Palakkad", "Kannur", "Kottayam", "Malappuram",
];
