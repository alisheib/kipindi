/**
 * Player notifications — in-app inbox.
 *
 * In production this is paired with FCM (Android push) + APN (iOS push) + SMS
 * via the same aggregator that delivers OTPs. The in-app store is the canonical
 * record; channel delivery is best-effort.
 *
 * Templates live in `lib/notification-templates.ts` and are bilingual EN + SW.
 */
import { audit } from "./audit";
import { db } from "./store";
import { randomId } from "./crypto";
import type { StoredNotification } from "./store";

export type NotifyInput = Omit<StoredNotification, "id" | "userId" | "readAt" | "dismissedAt" | "createdAt"> & {
  userId: string;
};

export function notify(input: NotifyInput): StoredNotification {
  const n: StoredNotification = {
    id: `ntf_${randomId(10)}`,
    userId: input.userId,
    kind: input.kind,
    titleEn: input.titleEn,
    titleSw: input.titleSw,
    bodyEn: input.bodyEn,
    bodySw: input.bodySw,
    href: input.href,
    readAt: null,
    dismissedAt: null,
    createdAt: new Date().toISOString(),
  };
  db.notification.create(n);
  audit({
    category: "SYSTEM",
    action: "notification.delivered",
    actorId: null,
    targetType: "Notification",
    targetId: n.id,
    payload: { userId: n.userId, kind: n.kind },
  });
  return n;
}

export function listForUser(userId: string, limit = 30) {
  return db.notification.findByUser(userId, limit);
}

export function unreadCount(userId: string) {
  return db.notification.countUnread(userId);
}

export function markRead(id: string) {
  return db.notification.markRead(id);
}

export function markAllRead(userId: string) {
  return db.notification.markAllRead(userId);
}

export function dismiss(id: string) {
  return db.notification.dismiss(id);
}

/* ---- Convenience emitters used by other services ---- */

export function notifyWin(userId: string, amount: number, label: string, href = "/bets") {
  return notify({
    userId,
    kind: "WIN",
    titleEn: `You won TZS ${amount.toLocaleString()}`,
    titleSw: `Umeshinda TZS ${amount.toLocaleString()}`,
    bodyEn: `${label} paid out. Tap to view.`,
    bodySw: `${label} kimelipa. Bonyeza kuona.`,
    href,
  });
}

export function notifyDeposit(userId: string, amount: number, provider: string) {
  return notify({
    userId,
    kind: "DEPOSIT",
    titleEn: `Deposit confirmed · TZS ${amount.toLocaleString()}`,
    titleSw: `Amana imethibitishwa · TZS ${amount.toLocaleString()}`,
    bodyEn: `Funds added via ${provider}.`,
    bodySw: `Pesa imeingia kupitia ${provider}.`,
    href: "/wallet",
  });
}

export function notifyKyc(userId: string, status: "APPROVED" | "REJECTED" | "PENDING_REVIEW") {
  if (status === "APPROVED") {
    return notify({
      userId,
      kind: "KYC",
      titleEn: "Identity verified",
      titleSw: "Kitambulisho kimethibitishwa",
      bodyEn: "You can now withdraw winnings.",
      bodySw: "Sasa unaweza kutoa pesa zako.",
      href: "/wallet",
    });
  }
  if (status === "REJECTED") {
    return notify({
      userId,
      kind: "KYC",
      titleEn: "Identity needs review",
      titleSw: "Kitambulisho kinahitaji ukaguzi",
      bodyEn: "Please re-submit. Support can help.",
      bodySw: "Tafadhali tuma tena.",
      href: "/profile/kyc",
    });
  }
  return notify({
    userId,
    kind: "KYC",
    titleEn: "Identity submitted",
    titleSw: "Kitambulisho kimewasilishwa",
    bodyEn: "Compliance review takes 24h.",
    bodySw: "Ukaguzi unachukua saa 24.",
    href: "/profile/kyc",
  });
}
