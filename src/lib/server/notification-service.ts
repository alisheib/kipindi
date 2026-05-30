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
    bodyEn: `${opts.marketTitle.slice(0, 70)} · payout calculated at resolution.`,
    bodySw: `${opts.marketTitle.slice(0, 50)} · lipo itahesabiwa baada ya tukio.`,
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

/* ---- Affiliate / referral emitters ---- */

/** Referrer is told a friend joined with their link. */
export function notifyReferralJoined(referrerUserId: string, opts: { recruitMasked: string }) {
  return notify({
    userId: referrerUserId,
    kind: "AFFILIATE",
    titleEn: "Your friend just joined",
    titleSw: "Rafiki yako amejisajili",
    bodyEn: `${opts.recruitMasked} signed up with your link.`,
    bodySw: `${opts.recruitMasked} amejisajili kupitia kiungo chako.`,
    href: "/profile/invite",
  });
}

/** A reward (commission / prize / bonus) landed in someone's wallet. */
export function notifyReferralReward(userId: string, opts: { type: "COMMISSION" | "PRIZE" | "BONUS"; amountTzs: number }) {
  const amount = opts.amountTzs.toLocaleString();
  const titleEn =
    opts.type === "COMMISSION" ? `You earned TZS ${amount} from a referral`
    : opts.type === "PRIZE"    ? `Milestone reward · TZS ${amount}`
    :                            `Referral bonus · TZS ${amount}`;
  const titleSw =
    opts.type === "COMMISSION" ? `Umepata TZS ${amount} kutoka kwa rafiki`
    : opts.type === "PRIZE"    ? `Zawadi ya hatua · TZS ${amount}`
    :                            `Bonasi ya rafiki · TZS ${amount}`;
  const bodyEn =
    opts.type === "COMMISSION" ? "Commission from a friend's activity. Tap to view."
    : opts.type === "PRIZE"    ? "A friend hit a milestone. Tap to view."
    :                            "Credited to your wallet. Tap to view.";
  return notify({
    userId,
    kind: "AFFILIATE",
    titleEn,
    titleSw,
    bodyEn,
    bodySw: "Imewekwa kwenye pochi yako. Bonyeza kuona.",
    href: "/profile/invite",
  });
}

/* ---- Player market-proposal emitters ---- */

export function notifyProposalUnderReview(userId: string, opts: { titleEn: string }) {
  return notify({
    userId, kind: "PROPOSAL",
    titleEn: "Your proposal is under review",
    titleSw: "Pendekezo lako linakaguliwa",
    bodyEn: `"${opts.titleEn.slice(0, 60)}" — an officer will review it shortly.`,
    bodySw: "Afisa atalikagua hivi karibuni.",
    href: "/proposals",
  });
}

export function notifyProposalListed(userId: string, opts: { titleEn: string; marketId: string }) {
  return notify({
    userId, kind: "PROPOSAL",
    titleEn: "Your proposal is now live",
    titleSw: "Pendekezo lako sasa ni soko",
    bodyEn: `"${opts.titleEn.slice(0, 60)}" is a market now — share it.`,
    bodySw: "Sasa ni soko — lishiriki.",
    href: `/markets/${opts.marketId}`,
  });
}

export function notifyProposalChanges(userId: string, opts: { titleEn: string; note: string | null }) {
  return notify({
    userId, kind: "PROPOSAL",
    titleEn: "Changes requested on your proposal",
    titleSw: "Mabadiliko yanahitajika",
    bodyEn: opts.note ? `Officer note: ${opts.note.slice(0, 80)}` : `"${opts.titleEn.slice(0, 60)}" needs a tweak before listing.`,
    bodySw: "Rekebisha kabla ya kuorodheshwa.",
    href: "/proposals",
  });
}

export function notifyProposalDeclined(userId: string, opts: { titleEn: string; reason: string }) {
  return notify({
    userId, kind: "PROPOSAL",
    titleEn: "Your proposal was declined",
    titleSw: "Pendekezo limekataliwa",
    bodyEn: `"${opts.titleEn.slice(0, 50)}" — reason: ${opts.reason}.`,
    bodySw: `Sababu: ${opts.reason}.`,
    href: "/proposals",
  });
}

export function notifyProposalResolvedPaid(userId: string, opts: { titleEn: string; amountTzs: number }) {
  return notify({
    userId, kind: "PROPOSAL",
    titleEn: `Your proposal resolved — you earned TZS ${opts.amountTzs.toLocaleString()}`,
    titleSw: `Pendekezo limetatuliwa — umepata TZS ${opts.amountTzs.toLocaleString()}`,
    bodyEn: "Listed & resolved. Paid to your wallet. Tap to view.",
    bodySw: "Imeorodheshwa na kutatuliwa. Imelipwa kwenye pochi yako.",
    href: "/proposals",
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
