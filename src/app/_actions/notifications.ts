"use server";

import { currentSession } from "@/lib/server/auth-service";
import { listForUser, unreadCount, markRead, markAllRead, dismiss, dismissAll } from "@/lib/server/notification-service";
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
