"use client";

import { useSyncExternalStore } from "react";
import { shortId } from "./format";
import { hashAdminPassword, type AdminRole } from "./admin-auth";
import { getSupabase, isSupabaseConfigured } from "./supabase";

/**
 * Admin team members the owner creates (verifiers / finance). Cloud-synced via
 * Supabase so a member can sign in on any device; the login route reads the
 * same admin_users table server-side. Passwords are SHA-256 hashed before they
 * leave the browser.
 */

export type { AdminRole };

export interface TeamMember {
  id: string;
  name: string;
  username: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
}

const STORAGE_KEY = "kaam.adminteam.v1";
const listeners = new Set<() => void>();
let cache: TeamMember[] | null = null;
let cloudInit = false;

function read(): TeamMember[] {
  if (typeof window === "undefined") return [];
  if (cache === null) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      cache = raw ? (JSON.parse(raw) as TeamMember[]) : [];
    } catch {
      cache = [];
    }
  }
  return cache;
}

function write(members: TeamMember[]) {
  cache = members;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

type Row = Record<string, unknown>;

function fromRow(r: Row): TeamMember {
  return {
    id: r.id as string,
    name: r.name as string,
    username: r.username as string,
    role: (r.role as AdminRole) ?? "verifier",
    active: Boolean(r.active),
    createdAt: r.created_at as string,
  };
}

async function refetchCloud() {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("admin_users")
      .select("id,name,username,role,active,created_at")
      .order("created_at", { ascending: false });
    if (error || !data) return;
    write(data.map(fromRow));
  } catch {
    /* keep local cache */
  }
}

function ensureCloud() {
  if (cloudInit || typeof window === "undefined" || !isSupabaseConfigured()) return;
  cloudInit = true;
  const sb = getSupabase();
  if (!sb) return;
  refetchCloud();
  try {
    sb.channel("kaam-admin-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_users" }, () => {
        refetchCloud();
      })
      .subscribe();
  } catch {
    /* realtime optional */
  }
}

export interface CreateMemberResult {
  ok: boolean;
  message: string;
}

/** Create a privileged sub-user. Username must be unique (case-insensitive). */
export async function createMember(
  name: string,
  username: string,
  password: string,
  role: AdminRole,
): Promise<CreateMemberResult> {
  const uname = username.trim().toLowerCase();
  if (!name.trim() || !uname || password.length < 4) {
    return { ok: false, message: "Enter a name, username, and a password of 4+ characters." };
  }
  if (read().some((m) => m.username.toLowerCase() === uname)) {
    return { ok: false, message: "That username is already taken." };
  }
  const member: TeamMember = {
    id: shortId(),
    name: name.trim(),
    username: uname,
    role,
    active: true,
    createdAt: new Date().toISOString(),
  };
  const password_hash = await hashAdminPassword(uname, password);

  write([member, ...read()]);
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb
      .from("admin_users")
      .insert({ ...member, password_hash, created_at: member.createdAt });
    if (error) {
      return {
        ok: false,
        message:
          "Saved on this device, but cloud sync failed — the member can only sign in once the database is connected.",
      };
    }
  } else {
    return {
      ok: false,
      message: "Saved locally. Connect the database so this member can sign in from any device.",
    };
  }
  return { ok: true, message: `${member.name} added as ${role}.` };
}

export function setMemberActive(id: string, active: boolean) {
  write(read().map((m) => (m.id === id ? { ...m, active } : m)));
  const sb = getSupabase();
  if (sb) {
    sb.from("admin_users").update({ active }).eq("id", id).then(({ error }) => {
      if (error) console.warn("KAAM: admin_users update failed", error.message);
    });
  }
}

export function removeMember(id: string) {
  write(read().filter((m) => m.id !== id));
  const sb = getSupabase();
  if (sb) {
    sb.from("admin_users").delete().eq("id", id).then(({ error }) => {
      if (error) console.warn("KAAM: admin_users delete failed", error.message);
    });
  }
}

function subscribe(fn: () => void) {
  ensureCloud();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const EMPTY: TeamMember[] = [];

export function useTeam(): TeamMember[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
