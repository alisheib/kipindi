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

/**
 * Bet-placed receipt — fires from buyPosition() so the player has a
 * canonical record in the inbox they can click into. href points to
 * the market detail (where their conviction-dial state lives) so the
 * inbox click takes them back to the same market.
 */
export function notifyBetPlaced(userId: string, opts: {
  side: "YES" | "NO"; stake: number; payoutIfWin: number; marketTitle: string; marketId: string;
}) {
  return notify({
    userId,
    kind: "BET_PLACED",
    titleEn: `Bet placed · ${opts.side} TZS ${opts.stake.toLocaleString()}`,
    titleSw: `Dau limewekwa · ${opts.side} TZS ${opts.stake.toLocaleString()}`,
    bodyEn: `${opts.marketTitle.slice(0, 70)} · pays TZS ${opts.payoutIfWin.toLocaleString()} if right.`,
    bodySw: `Lipo TZS ${opts.payoutIfWin.toLocaleString()} ukishinda.`,
    href: `/markets/${opts.marketId}`,
  });
}

export function notifyWin(userId: string, amount: number, label: string, href = "/positions") {
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

/**
 * Loss receipt — kit-faithful copy reframes the loss as "the pool grew"
 * (per the design system's responsibility-first language rule).
 */
export function notifyLoss(userId: string, opts: { stake: number; marketTitle: string; marketId: string }) {
  return notify({
    userId,
    kind: "LOSS",
    titleEn: `Pool grew · TZS ${opts.stake.toLocaleString()} contributed`,
    titleSw: `Bwawa limeongezeka · TZS ${opts.stake.toLocaleString()}`,
    bodyEn: `${opts.marketTitle.slice(0, 70)} · the call didn't land this time.`,
    bodySw: `Wakati huu hujashinda. Jaribu tena.`,
    href: `/markets/${opts.marketId}`,
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

export function notifyWithdraw(
  userId: string,
  opts: {
    status: "INITIATED" | "CONFIRMED" | "AML_REVIEW" | "FAILED";
    amount: number;
    net?: number;
    provider: string;
    reason?: string;
  },
) {
  if (opts.status === "CONFIRMED") {
    const net = opts.net ?? opts.amount;
    return notify({
      userId,
      kind: "WITHDRAW",
      titleEn: `Withdrawal sent · TZS ${net.toLocaleString()}`,
      titleSw: `Pesa imetumwa · TZS ${net.toLocaleString()}`,
      bodyEn: `${opts.provider} should land in moments.`,
      bodySw: `${opts.provider} itafika sasa hivi.`,
      href: "/wallet",
    });
  }
  if (opts.status === "AML_REVIEW") {
    return notify({
      userId,
      kind: "WITHDRAW",
      titleEn: `Withdrawal under review · TZS ${opts.amount.toLocaleString()}`,
      titleSw: `Inakaguliwa · TZS ${opts.amount.toLocaleString()}`,
      bodyEn: "Compliance review takes up to 24h.",
      bodySw: "Ukaguzi unachukua hadi saa 24.",
      href: "/wallet",
    });
  }
  if (opts.status === "FAILED") {
    return notify({
      userId,
      kind: "WITHDRAW",
      titleEn: `Withdrawal failed · TZS ${opts.amount.toLocaleString()}`,
      titleSw: `Kutoa pesa kumeshindikana · TZS ${opts.amount.toLocaleString()}`,
      bodyEn: opts.reason ? `Funds returned. ${opts.reason}` : "Funds returned to your balance.",
      bodySw: "Pesa imerudishwa kwenye salio lako.",
      href: "/wallet",
    });
  }
  return notify({
    userId,
    kind: "WITHDRAW",
    titleEn: `Withdrawal in flight · TZS ${opts.amount.toLocaleString()}`,
    titleSw: `Inatuma · TZS ${opts.amount.toLocaleString()}`,
    bodyEn: `${opts.provider} processing.`,
    bodySw: `${opts.provider} inaendelea.`,
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
