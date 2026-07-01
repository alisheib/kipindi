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

export async function notify(input: NotifyInput): Promise<StoredNotification | null> {
  // Best-effort by contract: notifications are paired with money/auth/compliance
  // flows that have ALREADY committed under a lock. A DB hiccup writing the inbox
  // row must never reject into (and crash) those callers — many fire this without
  // awaiting. So we swallow + log here, immunising every caller (current and
  // future) instead of relying on each call site to remember `.catch()`.
  try {
    const n: StoredNotification = {
      id: `ntf_${randomId(10)}`,
      userId: input.userId,
      kind: input.kind,
      titleEn: input.titleEn,
      titleSw: input.titleSw,
      titleZh: input.titleZh ?? null,
      bodyEn: input.bodyEn,
      bodySw: input.bodySw,
      bodyZh: input.bodyZh ?? null,
      href: input.href,
      readAt: null,
      dismissedAt: null,
      createdAt: new Date().toISOString(),
    };
    await db.notification.create(n);
    audit({
      category: "SYSTEM",
      action: "notification.delivered",
      actorId: null,
      targetType: "Notification",
      targetId: n.id,
      payload: { userId: n.userId, kind: n.kind },
    });
    return n;
  } catch (err) {
    console.error("[notify] failed to record notification:", (err as Error)?.message ?? err);
    return null;
  }
}

export async function listForUser(userId: string, limit = 30) {
  return await db.notification.findByUser(userId, limit);
}

export async function unreadCount(userId: string) {
  return await db.notification.countUnread(userId);
}

// markRead / dismiss are scoped to the OWNER: a notification id alone is not
// proof of ownership, so the userId is passed through and the mutation only
// touches a row that belongs to the caller (prevents cross-user inbox tampering).
export async function markRead(id: string, userId: string) {
  return await db.notification.markRead(id, userId);
}

export async function markAllRead(userId: string) {
  return await db.notification.markAllRead(userId);
}

export async function dismiss(id: string, userId: string) {
  return await db.notification.dismiss(id, userId);
}

export async function dismissAll(userId: string) {
  return await db.notification.dismissAll(userId);
}

/* ---- Convenience emitters used by other services ---- */

/**
 * Bet-placed receipt — fires from buyPosition() so the player has a
 * canonical record in the inbox they can click into. href points to
 * the market detail (where their conviction-dial state lives) so the
 * inbox click takes them back to the same market.
 */
export function notifyBetPlaced(userId: string, opts: {
  side: "YES" | "NO"; stake: number; payoutIfWin: number; marketTitle: string; marketId: string; positionId?: string;
}) {
  const ref = opts.positionId ? ` · ${opts.positionId}` : "";
  return notify({
    userId,
    kind: "BET_PLACED",
    titleEn: `Bet placed · ${opts.side} TZS ${opts.stake.toLocaleString()}`,
    titleSw: `Dau limewekwa · ${opts.side} TZS ${opts.stake.toLocaleString()}`,
    bodyEn: `${opts.marketTitle.slice(0, 70)} · free exit within 5 min, then 9% fee applies.${ref}`,
    bodySw: `${opts.marketTitle.slice(0, 50)} · toka bila gharama ndani ya dakika 5.${ref}`,
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
 * Loss receipt — direct, respectful language. No euphemisms that could
 * delay the player's awareness of their loss (LCCP harm-prevention).
 */
export function notifyLoss(userId: string, opts: { stake: number; marketTitle: string; marketId: string; positionId?: string }) {
  const ref = opts.positionId ? ` · ${opts.positionId}` : "";
  return notify({
    userId,
    kind: "LOSS",
    titleEn: `Bet lost · TZS ${opts.stake.toLocaleString()}`,
    titleSw: `Dau limepotea · TZS ${opts.stake.toLocaleString()}`,
    bodyEn: `${opts.marketTitle.slice(0, 70)} · your side didn't win.${ref}`,
    bodySw: `Upande wako haukushinda.${ref}`,
    href: `/markets/${opts.marketId}`,
  });
}

export function notifySelectionClosed(userId: string, opts: { marketTitle: string; marketId: string }) {
  return notify({
    userId,
    kind: "SELECTION_CLOSED",
    titleEn: "Selections closed — waiting for results",
    titleSw: "Uchaguzi umefungwa — tunasubiri matokeo",
    bodyEn: `${opts.marketTitle.slice(0, 70)} · betting is now closed. We'll notify you with your result as soon as it's settled.`,
    bodySw: `Kuweka dau kumefungwa. Tutakujulisha matokeo mara yatakapotolewa.`,
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

/* ---- Bonus-wallet emitters ---- */

/** A bonus was credited to the player's bonus wallet. */
export function notifyBonusCredited(userId: string, opts: { amountTzs: number; wagerRequiredTzs: number; queued?: boolean }) {
  const amount = Math.round(opts.amountTzs).toLocaleString();
  const target = Math.round(opts.wagerRequiredTzs).toLocaleString();
  if (opts.queued) {
    return notify({
      userId,
      kind: "BONUS",
      titleEn: `Bonus queued · TZS ${amount}`,
      titleSw: `Bonasi imepangwa · TZS ${amount}`,
      bodyEn: `Your current bonus must be completed first. This TZS ${amount} bonus will activate automatically when ready.`,
      bodySw: `Bonasi yako ya sasa lazima ikamilishwe kwanza. Bonasi ya TZS ${amount} itaamilishwa moja kwa moja.`,
      href: "/wallet",
    });
  }
  return notify({
    userId,
    kind: "BONUS",
    titleEn: `Bonus credited · TZS ${amount}`,
    titleSw: `Bonasi imewekwa · TZS ${amount}`,
    bodyEn: `Play TZS ${target} to unlock it as withdrawable cash. Tap to view.`,
    bodySw: `Cheza TZS ${target} ili kuibadilisha kuwa pesa unayoweza kutoa. Bonyeza kuona.`,
    href: "/wallet",
  });
}

/** A bonus finished its wagering and converted to real, withdrawable balance. */
export function notifyBonusFulfilled(userId: string, opts: { amountTzs: number }) {
  const amount = Math.round(opts.amountTzs).toLocaleString();
  return notify({
    userId,
    kind: "BONUS",
    titleEn: `Bonus unlocked · TZS ${amount} is now withdrawable!`,
    titleSw: `Bonasi imefunguliwa · TZS ${amount} sasa unaweza kuitoa!`,
    bodyEn: "Your bonus is now real cash in your main wallet. Tap to view.",
    bodySw: "Bonasi yako sasa ni pesa halisi kwenye pochi yako kuu. Bonyeza kuona.",
    href: "/wallet",
  });
}

/** An unfulfilled bonus expired and was removed from the bonus wallet. */
export function notifyBonusExpired(userId: string, opts: { amountTzs: number }) {
  const amount = Math.round(opts.amountTzs).toLocaleString();
  return notify({
    userId,
    kind: "BONUS",
    titleEn: `Bonus expired · TZS ${amount}`,
    titleSw: `Bonasi imeisha muda · TZS ${amount}`,
    bodyEn: "An unfinished bonus reached its expiry date and was removed.",
    bodySw: "Bonasi ambayo haikukamilika imefikia tarehe ya mwisho na imeondolewa.",
    href: "/wallet",
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

/** Refund receipt — when a market is voided and stakes are returned. */
export function notifyRefund(userId: string, opts: { stake: number; marketTitle: string; marketId: string }) {
  return notify({
    userId,
    kind: "DEPOSIT",
    titleEn: `Refund · TZS ${opts.stake.toLocaleString()} returned`,
    titleSw: `Kurudishiwa · TZS ${opts.stake.toLocaleString()}`,
    bodyEn: `${opts.marketTitle.slice(0, 70)} was voided. Your stake has been returned.`,
    bodySw: `Soko limebatilishwa. Dau lako limerudishwa.`,
    href: `/markets/${opts.marketId}`,
  });
}

/** Player notice: a market they had a stake in was cancelled (emergency void).
 *  Carries the admin's reason and confirms the full refund. */
export function notifyMarketCancelled(userId: string, opts: { stake: number; marketTitle: string; marketId: string; reason: string }) {
  return notify({
    userId,
    kind: "DEPOSIT", // money returned to the wallet
    titleEn: `Market cancelled · TZS ${opts.stake.toLocaleString()} refunded`,
    titleSw: `Soko limefutwa · TZS ${opts.stake.toLocaleString()} imerejeshwa`,
    bodyEn: `"${opts.marketTitle.slice(0, 60)}" was cancelled: ${opts.reason.slice(0, 120)}. Your full stake has been returned to your wallet.`,
    bodySw: `Soko limefutwa. Dau lako lote limerejeshwa kwenye pochi yako.`,
    href: "/wallet",
  });
}

/** Officer confirmation that an emergency void completed — who/what/how-many. */
export function notifyAdminMarketCancelled(adminUserId: string, opts: { title: string; reason: string; refundedCount: number; refundedTzs: number }) {
  return notify({
    userId: adminUserId,
    kind: "SECURITY",
    titleEn: `Market cancelled · ${opts.refundedCount} refunded`,
    titleSw: `Soko limefutwa · ${opts.refundedCount} wamerejeshewa`,
    bodyEn: `"${opts.title.slice(0, 60)}" was emergency-voided — TZS ${opts.refundedTzs.toLocaleString()} refunded to ${opts.refundedCount} ${opts.refundedCount === 1 ? "player" : "players"}. Reason: ${opts.reason.slice(0, 100)}`,
    bodySw: `Soko limefutwa kwa dharura. TZS ${opts.refundedTzs.toLocaleString()} imerejeshwa.`,
    href: "/admin/markets",
  });
}

/** Cashout receipt — when a player sells a position early. */
export function notifyCashout(userId: string, opts: { amount: number; marketTitle: string; marketId: string; inGracePeriod?: boolean; positionId?: string }) {
  const ref = opts.positionId ? ` · ${opts.positionId}` : "";
  return notify({
    userId,
    kind: "WIN",
    titleEn: `${opts.inGracePeriod ? "Free exit" : "Cashed out"} · TZS ${opts.amount.toLocaleString()}`,
    titleSw: `${opts.inGracePeriod ? "Toka bila gharama" : "Umetoa"} · TZS ${opts.amount.toLocaleString()}`,
    bodyEn: opts.inGracePeriod
      ? `Full stake returned — sold within the 5-min grace window, no fee.${ref}`
      : `Early exit from ${opts.marketTitle.slice(0, 60)}. Funds in wallet.${ref}`,
    bodySw: opts.inGracePeriod
      ? `Pesa yote imerudishwa — umetoka ndani ya dakika 5.${ref}`
      : `Umetoka mapema. Pesa imo kwenye pochi yako.${ref}`,
    href: `/markets/${opts.marketId}`,
  });
}

/** One-sided refund — all bets were on the same side so everyone gets their stake back at 0% fee. */
export function notifyOneSidedRefund(userId: string, opts: { stake: number; marketTitle: string; marketId: string; positionId?: string }) {
  const ref = opts.positionId ? ` · ${opts.positionId}` : "";
  return notify({
    userId,
    kind: "WIN",
    titleEn: `Full refund · TZS ${opts.stake.toLocaleString()}`,
    titleSw: `Pesa imerudishwa · TZS ${opts.stake.toLocaleString()}`,
    bodyEn: `${opts.marketTitle.slice(0, 60)} — all bets were on one side. Full stake returned, no fee.${ref}`,
    bodySw: `Dau lako lote limerudishwa bila gharama — wote walibetia upande mmoja.${ref}`,
    href: `/markets/${opts.marketId}`,
  });
}

/**
 * In-app alert to an officer that a player's KYC is waiting for review. Lands
 * in the platform's main notification bell (admins use the same bell as players)
 * and deep-links straight to the player's KYC review tab.
 */
export function notifyAdminKycReview(adminUserId: string, opts: { playerLabel: string; userId: string }) {
  return notify({
    userId: adminUserId,
    kind: "KYC",
    titleEn: "New KYC to review",
    titleSw: "KYC mpya ya kukagua",
    bodyEn: `${opts.playerLabel} submitted identity documents — tap to review.`,
    bodySw: `${opts.playerLabel} amewasilisha nyaraka — bonyeza kukagua.`,
    href: `/admin/players/${opts.userId}?tab=kyc`,
  });
}

/**
 * In-app alert to an officer that a market has closed and is waiting for the
 * two-officer resolution. Lands in the main bell and deep-links to the resolver
 * queue. Fired once per market by the resolution-due sweep.
 */
export function notifyAdminMarketResolution(adminUserId: string, opts: { title: string; marketId: string }) {
  return notify({
    userId: adminUserId,
    kind: "PROPOSAL", // closest existing admin/ops kind; routed to the resolver queue
    titleEn: "Market awaiting resolution",
    titleSw: "Soko linasubiri uamuzi",
    bodyEn: `"${opts.title.slice(0, 70)}" has closed — resolve the outcome.`,
    bodySw: `"${opts.title.slice(0, 50)}" limefungwa — tatua matokeo.`,
    href: "/admin/resolver-queue",
  });
}

export function notifyKyc(userId: string, status: "APPROVED" | "REJECTED" | "PENDING_REVIEW" | "ADDITIONAL_INFO") {
  if (status === "ADDITIONAL_INFO") {
    return notify({
      userId,
      kind: "KYC",
      titleEn: "More information needed",
      titleSw: "Tunahitaji maelezo zaidi",
      bodyEn: "Open verification to update your documents and resubmit.",
      bodySw: "Fungua uthibitishaji urekebishe nyaraka zako.",
      href: "/profile/kyc",
    });
  }
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

/** Security alert: the account password just changed. Pairs with the email
 *  alert; the in-app copy guarantees email-less (pre-KYC) users still see it. */
export function notifyPasswordChanged(userId: string) {
  return notify({
    userId,
    kind: "SECURITY",
    titleEn: "Your password was changed",
    titleSw: "Nenosiri lako limebadilishwa",
    bodyEn: "If this wasn't you, reset it now and contact support.",
    bodySw: "Kama si wewe, libadilishe sasa na uwasiliane na msaada.",
    href: "/profile/account",
  });
}

/** Confirmation that self-exclusion is active. Email is the durable record; this
 *  in-app copy ensures the player sees it even with no email on file. */
export function notifySelfExclusion(userId: string, opts: { until: string }) {
  return notify({
    userId,
    kind: "RG",
    titleEn: "Self-exclusion active",
    titleSw: "Kujizuia kumeanza",
    bodyEn: `Your account is closed to betting and deposits until ${opts.until.slice(0, 10)}.`,
    bodySw: `Akaunti yako imefungwa kuweka dau na amana hadi ${opts.until.slice(0, 10)}.`,
    href: "/profile/responsible-gambling",
  });
}

export function notifyCoolOff(userId: string, opts: { until: string }) {
  return notify({
    userId,
    kind: "RG",
    titleEn: "Cool-off break active",
    titleSw: "Mapumziko yameanza",
    bodyEn: `Betting and deposits are paused until ${opts.until.slice(0, 10)}.`,
    bodySw: `Kuweka dau na amana kumesimamishwa hadi ${opts.until.slice(0, 10)}.`,
    href: "/profile/responsible-gambling",
  });
}

/**
 * Alert every compliance/admin officer (in-app bell + email) that a transaction
 * has hit AML review — so officers act on the queue instead of polling it.
 * Best-effort throughout; never blocks the transaction.
 */
export async function notifyAdminsAmlReview(opts: { txnKind: "WITHDRAWAL" | "DEPOSIT"; amountTzs: number; reference: string }) {
  const officers = (await db.user.list()).filter((u) => ["ADMIN", "COMPLIANCE"].includes(u.role));
  const label = opts.txnKind === "WITHDRAWAL" ? "withdrawal" : "deposit";
  for (const o of officers) {
    await notify({
      userId: o.id,
      kind: "SECURITY",
      titleEn: `AML review: ${label} TZS ${opts.amountTzs.toLocaleString()}`,
      titleSw: `Ukaguzi wa AML · TZS ${opts.amountTzs.toLocaleString()}`,
      bodyEn: `A ${label} of TZS ${opts.amountTzs.toLocaleString()} is awaiting AML clearance — open the queue.`,
      bodySw: "Muamala unasubiri ukaguzi wa AML — fungua foleni.",
      href: "/admin/aml",
    }).catch(() => {});
  }
  // Email the same officers (lazy import keeps the static graph free of an
  // email ↔ notification cycle).
  try {
    const { sendEmail, amlReviewAdminHtml } = await import("./email");
    const { resolvePhoneEmail } = await import("./email-map");
    const emails = [...new Set(
      officers
        .map((o) => (o.email || resolvePhoneEmail(o.phoneE164) || "").trim().toLowerCase())
        .filter((e) => e && !e.endsWith("@stub") && !e.endsWith("@none")),
    )];
    for (const to of emails) {
      sendEmail({
        to,
        subject: `AML review needed · TZS ${opts.amountTzs.toLocaleString()}`,
        html: amlReviewAdminHtml({ amount: opts.amountTzs, kind: opts.txnKind, reference: opts.reference }),
        tag: "aml-review-admin",
        trackLinks: false,
      }).catch(() => {});
    }
  } catch { /* officer email is best-effort */ }
}

/** Operational alert: the Market Sentinel (the AI that auto-closes already-settled
 *  live markets) is failing its checks — most often an exhausted Anthropic API
 *  balance or an invalid key. Without this alert the sentinel can silently stop
 *  protecting live markets and players could bet on known outcomes. Fired
 *  debounced by the sentinel runner; in-app SECURITY bell + best-effort email to
 *  every ADMIN/COMPLIANCE officer. */
export async function notifyAdminsSentinelDown(opts: { reason: string; errorCount: number; sampleError: string }) {
  const officers = (await db.user.list()).filter((u) => ["ADMIN", "COMPLIANCE"].includes(u.role));
  for (const o of officers) {
    await notify({
      userId: o.id,
      kind: "SECURITY",
      titleEn: `⚠️ Market Sentinel is failing (${opts.reason})`,
      titleSw: `⚠️ Mlinzi wa Soko umeshindwa (${opts.reason})`,
      bodyEn: `The live auto-close AI could not check ${opts.errorCount} market(s) on its last sweep — live markets may be unprotected. Most likely: Anthropic billing/API key. Check now.`,
      bodySw: `AI ya kufunga soko imeshindwa kukagua masoko ${opts.errorCount}. Angalia malipo/API key ya Anthropic mara moja.`,
      href: "/admin/system",
    }).catch(() => {});
  }
  try {
    const { sendEmail, sentinelDownAdminHtml } = await import("./email");
    const { resolvePhoneEmail } = await import("./email-map");
    const emails = [...new Set(
      officers
        .map((o) => (o.email || resolvePhoneEmail(o.phoneE164) || "").trim().toLowerCase())
        .filter((e) => e && !e.endsWith("@stub") && !e.endsWith("@none")),
    )];
    const html = sentinelDownAdminHtml({ reason: opts.reason, errorCount: opts.errorCount, sampleError: opts.sampleError });
    for (const to of emails) {
      sendEmail({
        to,
        subject: `⚠️ Market Sentinel failing — ${opts.reason}`,
        html,
        tag: "sentinel-health",
        trackLinks: false,
      }).catch(() => {});
    }
  } catch { /* officer email is best-effort */ }
}

/** AI spend alert: cycle spend has crossed the warn (≈80%) or the hard limit
 *  (100%) of the configured budget. Emails + in-app SECURITY bell to every
 *  ADMIN/COMPLIANCE officer so credit can be topped up before the AI goes dark.
 *  Fired once per level by the usage meter (re-armed when the cycle resets). */
export async function notifyAdminsAiCreditLimit(opts: { level: "warn" | "limit"; spentUsd: number; limitUsd: number }) {
  const officers = (await db.user.list()).filter((u) => ["ADMIN", "COMPLIANCE"].includes(u.role));
  const spent = `$${opts.spentUsd.toFixed(2)}`;
  const limit = `$${opts.limitUsd.toFixed(2)}`;
  const reached = opts.level === "limit";
  const titleEn = reached
    ? `🛑 AI spend reached the ${limit} limit`
    : `⚠️ AI spend nearing the ${limit} limit (${spent})`;
  const bodyEn = reached
    ? `AI usage has reached your ${limit} budget for this cycle (spent ${spent}). Top up Anthropic credit and reset the cycle on the AI usage page, or the AI features will stop.`
    : `AI usage is at ${spent} of your ${limit} budget this cycle. Plan a top-up soon — you'll get one more alert if it hits the limit.`;
  for (const o of officers) {
    await notify({
      userId: o.id,
      kind: "SECURITY",
      titleEn,
      titleSw: reached ? `🛑 Matumizi ya AI yamefikia kikomo cha ${limit}` : `⚠️ Matumizi ya AI yanakaribia kikomo cha ${limit} (${spent})`,
      bodyEn,
      bodySw: reached
        ? `Matumizi ya AI yamefikia bajeti ya ${limit} (umetumia ${spent}). Ongeza salio la Anthropic na uweke upya mzunguko kwenye ukurasa wa matumizi ya AI.`
        : `Matumizi ya AI yako ${spent} kati ya ${limit}. Panga kuongeza salio hivi karibuni.`,
      href: "/admin/ai-usage",
    }).catch(() => {});
  }
  try {
    const { sendEmail, aiCreditLimitAdminHtml } = await import("./email");
    const { resolvePhoneEmail } = await import("./email-map");
    const emails = [...new Set(
      officers
        .map((o) => (o.email || resolvePhoneEmail(o.phoneE164) || "").trim().toLowerCase())
        .filter((e) => e && !e.endsWith("@stub") && !e.endsWith("@none")),
    )];
    const html = aiCreditLimitAdminHtml({ level: opts.level, spentUsd: opts.spentUsd, limitUsd: opts.limitUsd });
    for (const to of emails) {
      sendEmail({
        to,
        subject: reached ? `🛑 50pick AI spend reached ${limit}` : `⚠️ 50pick AI spend nearing ${limit} (${spent})`,
        html,
        tag: "ai-credit-limit",
        trackLinks: false,
      }).catch(() => {});
    }
  } catch { /* officer email is best-effort */ }
}

/** Source-of-funds review outcome. ACCEPTED unblocks the deposit gate; REJECTED
 *  asks the player to re-declare (deposits over the threshold stay blocked). */
export function notifySof(userId: string, status: "ACCEPTED" | "REJECTED" | "MORE_INFO") {
  if (status === "ACCEPTED") {
    return notify({
      userId,
      kind: "KYC",
      titleEn: "Source of funds approved",
      titleSw: "Asili ya pesa imethibitishwa",
      bodyEn: "Your declaration was accepted — you can deposit as normal.",
      bodySw: "Tamko lako limekubaliwa — unaweza kuweka pesa kama kawaida.",
      href: "/wallet",
    });
  }
  if (status === "MORE_INFO") {
    return notify({
      userId,
      kind: "KYC",
      titleEn: "More info needed for source of funds",
      titleSw: "Taarifa zaidi zinahitajika",
      bodyEn: "Our compliance team needs a bit more information about your source of funds. Please check your email and update your declaration.",
      bodySw: "Timu yetu inahitaji maelezo zaidi kuhusu chanzo chako cha fedha. Tafadhali angalia barua pepe yako na usasishe tamko lako.",
      href: "/profile/source-of-funds",
    });
  }
  return notify({
    userId,
    kind: "KYC",
    titleEn: "Source of funds needs review",
    titleSw: "Asili ya pesa inahitaji ukaguzi",
    bodyEn: "Please update your source-of-funds declaration and resubmit.",
    bodySw: "Tafadhali sasisha tamko la asili ya pesa na uwasilishe tena.",
    href: "/profile/source-of-funds",
  });
}
