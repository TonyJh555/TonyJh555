"use client";

/**
 * Lightweight notifications built on the browser Notification API + the KAAM
 * service worker. Works today for alerts while the app is open or backgrounded
 * (another tab / minimised). True push-when-fully-closed needs a push server
 * (a Supabase Edge Function with VAPID keys) — the service worker's `push`
 * handler is already in place for when that's wired.
 */

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Current permission: "granted" | "denied" | "default" | "unsupported". */
export function notifyPermission(): NotificationPermission | "unsupported" {
  if (!notifySupported()) return "unsupported";
  return Notification.permission;
}

/** Ask the user to allow alerts (call from a click, not on page load). */
export async function ensureNotifyPermission(): Promise<boolean> {
  if (!notifySupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Show a notification (via the service worker when available for reliability). */
export function notify(title: string, body: string, url = "/app"): void {
  if (!notifySupported() || Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url },
  };
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(title, options))
      .catch(() => {
        try {
          new Notification(title, options);
        } catch {
          /* ignore */
        }
      });
  } else {
    try {
      new Notification(title, options);
    } catch {
      /* ignore */
    }
  }
}
