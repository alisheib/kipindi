"use server";

import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { listForUser, unreadCount, markRead, markAllRead, dismiss, dismissAll, restore } from "@/lib/server/notification-service";
import type { StoredNotification } from "@/lib/server/store";

export async function fetchMyNotifications(): Promise<{ items: StoredNotification[]; unread: number }> {
  const session = await currentSession();
  if (!session) return { items: [], unread: 0 };
  return {
    items: await listForUser(session.userId, 30) as StoredNotification[],
    unread: await unreadCount(session.userId),
  };
}

export async function markNotifReadAction(id: string) {
  const session = await currentSession();
  if (!session) return { ok: false as const };
  await markRead(id, session.userId);
  return { ok: true as const };
}

export async function markAllReadAction() {
  const session = await currentSession();
  if (!session) return { ok: false as const, count: 0 };
  const count = await markAllRead(session.userId);
  return { ok: true as const, count };
}

export async function dismissNotifAction(id: string) {
  const session = await currentSession();
  if (!session) return { ok: false as const };
  await dismiss(id, session.userId);
  return { ok: true as const };
}

export async function dismissAllAction() {
  const session = await currentSession();
  if (!session) return { ok: false as const, count: 0 };
  const count = await dismissAll(session.userId);
  return { ok: true as const, count };
}

/**
 * Undo a dismissal, from the `/notifications` screen's **Cleared** lens.
 *
 * 🔴 The other half of `dismissAllAction`. Clearing the bell stamps `dismissedAt` and every
 * read door filters those rows out, so without this a player who tidied their bell had
 * permanently hidden their own money history with no way back.
 *
 * ⛔ Owner-scoped in the SERVICE, not here: `restore` narrows on `{ id, userId }` so a
 * notification id alone is never proof of ownership. Same shape as `markRead`/`dismiss`.
 * `revalidatePath` so the list and every pill count re-read rather than showing a row that
 * has just moved out of the lens the player is looking at.
 */
export async function restoreNotifAction(id: string) {
  const session = await currentSession();
  if (!session) return { ok: false as const };
  if (!id) return { ok: false as const };
  await restore(id, session.userId);
  revalidatePath("/notifications");
  return { ok: true as const };
}

/**
 * Mark one notification read from the `/notifications` screen.
 *
 * ⚠️ Distinct from `markNotifReadAction` only in that it revalidates the page — the bell is a
 * client list that refetches itself, the screen is server-rendered and would otherwise keep
 * showing the row as unread until a navigation.
 */
export async function markNotifReadOnPageAction(id: string) {
  const session = await currentSession();
  if (!session) return { ok: false as const };
  if (!id) return { ok: false as const };
  await markRead(id, session.userId);
  revalidatePath("/notifications");
  return { ok: true as const };
}

// ── Web push (F4) ───────────────────────────────────────────────────────────

/** Persist a browser push subscription for the signed-in user (explicit opt-in). */
export async function savePushSubscriptionAction(sub: { endpoint: string; p256dh: string; auth: string }) {
  const session = await currentSession();
  if (!session) return { ok: false as const };
  if (!sub?.endpoint || !sub.p256dh || !sub.auth) return { ok: false as const };
  const { savePushSubscription } = await import("@/lib/server/push-service");
  await savePushSubscription(session.userId, sub);
  return { ok: true as const };
}

/** Remove this device's subscription (opt-out). Owner-scoped. */
export async function deletePushSubscriptionAction(endpoint: string) {
  const session = await currentSession();
  if (!session) return { ok: false as const };
  if (!endpoint) return { ok: false as const };
  const { removePushSubscription } = await import("@/lib/server/push-service");
  await removePushSubscription(session.userId, endpoint);
  return { ok: true as const };
}

/** How many devices are subscribed for the signed-in user. */
export async function pushStatusAction(): Promise<{ ok: boolean; devices: number }> {
  const session = await currentSession();
  if (!session) return { ok: false, devices: 0 };
  const { pushDeviceCount } = await import("@/lib/server/push-service");
  return { ok: true, devices: await pushDeviceCount(session.userId) };
}
