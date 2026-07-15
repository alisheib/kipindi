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
import { emit } from "./event-bus";
import type { StoredNotification } from "./store";
import { formatTzs } from "@/lib/utils";

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
    // SSE: push to connected client so the bell updates instantly
    emit("notification:new", {
      userId: n.userId,
      notification: { id: n.id, title: n.titleEn, body: n.bodyEn },
    });
    // Web push (F4) — fan out to the user's subscribed devices in their own
    // locale. Fire-and-forget: sendPushToUser never throws, self-suppresses for
    // RG-locked players, and no-ops when VAPID is unconfigured. The inbox row
    // above stays the canonical record regardless of what the push channel does.
    void (async () => {
      try {
        const { sendPushToUser } = await import("./push-service");
        const user = await db.user.findById(n.userId);
        const loc = (user?.locale ?? "EN").toUpperCase();
        const title = loc === "SW" ? n.titleSw : loc === "ZH" ? (n.titleZh ?? n.titleEn) : n.titleEn;
        const body  = loc === "SW" ? n.bodySw  : loc === "ZH" ? (n.bodyZh  ?? n.bodyEn)  : n.bodyEn;
        await sendPushToUser(n.userId, { title, body, url: n.href ?? "/", tag: n.kind });
      } catch { /* push is a courtesy channel — never surfaces */ }
    })();
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
  /** The poll's OWN rates. Hardcoding these numbers is how the copy came to lie. */
  cashOutFeeRate: number; freeExitGraceMinutes: number;
}) {
  const ref = opts.positionId ? ` · ${opts.positionId}` : "";
  // These were hardcoded "free exit within 5 min, then 9% fee applies" (and the
  // Swahili silently omitted the fee entirely). Both numbers now come from the
  // poll's frozen snapshot, so they cannot drift from what we actually charge.
  const mins = opts.freeExitGraceMinutes;
  const pct = +(opts.cashOutFeeRate * 100).toFixed(1);
  return notify({
    userId,
    kind: "BET_PLACED",
    titleEn: `Bet placed · ${opts.side} ${formatTzs(opts.stake)}`,
    titleSw: `Dau limewekwa · ${opts.side} ${formatTzs(opts.stake)}`,
    bodyEn: `${opts.marketTitle.slice(0, 70)} · free exit within ${mins} min, then a ${pct}% fee applies.${ref}`,
    bodySw: `${opts.marketTitle.slice(0, 50)} · toka bila gharama ndani ya dakika ${mins}, baadaye ada ya ${pct}% itatumika.${ref}`,
    href: `/markets/${opts.marketId}`,
  });
}

export function notifyWin(userId: string, amount: number, label: string, href = "/positions") {
  return notify({
    userId,
    kind: "WIN",
    titleEn: `You won ${formatTzs(amount)}`,
    titleSw: `Umeshinda ${formatTzs(amount)}`,
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
    titleEn: `Bet lost · ${formatTzs(opts.stake)}`,
    titleSw: `Dau limepotea · ${formatTzs(opts.stake)}`,
    bodyEn: `${opts.marketTitle.slice(0, 70)} · your side didn't win.${ref}`,
    bodySw: `Upande wako haukushinda.${ref}`,
    href: `/markets/${opts.marketId}`,
  });
}

/**
 * F3 — a WATCHED market closes within the hour.
 *
 * RG WORDING RULE: this is a factual, time-based notice about something the player
 * explicitly asked to follow. It must NEVER be a call to action ("place your bet
 * now!", "last chance!") — that would be pressuring an opted-in user and is an RG
 * harm risk (LCCP SR 3.4). State the fact; let them decide.
 */
export function notifyWatchedClosingSoon(userId: string, opts: { marketTitle: string; marketId: string; minutes: number }) {
  return notify({
    userId,
    kind: "WATCHLIST",
    titleEn: "A market you follow closes soon",
    titleSw: "Soko unalofuatilia linafunga karibuni",
    titleZh: "你关注的市场即将关闭",
    bodyEn: `${opts.marketTitle.slice(0, 70)} · selections close in about ${opts.minutes} minutes.`,
    bodySw: `${opts.marketTitle.slice(0, 50)} · uchaguzi unafunga baada ya takriban dakika ${opts.minutes}.`,
    bodyZh: `${opts.marketTitle.slice(0, 50)} · 选择将在约 ${opts.minutes} 分钟后关闭。`,
    href: `/markets/${opts.marketId}`,
  });
}

/**
 * F3 — a WATCHED market has settled. Sent to followers who did NOT hold a
 * position (bettors already get their own win/loss receipt, which carries the
 * money). Purely informational: the outcome, not an invitation to bet again.
 */
export function notifyWatchedSettled(userId: string, opts: { marketTitle: string; marketId: string; outcome: string }) {
  return notify({
    userId,
    kind: "WATCHLIST",
    titleEn: "A market you follow has settled",
    titleSw: "Soko unalofuatilia limetatuliwa",
    titleZh: "你关注的市场已结算",
    bodyEn: `${opts.marketTitle.slice(0, 70)} · resolved ${opts.outcome}.`,
    bodySw: `${opts.marketTitle.slice(0, 50)} · matokeo: ${opts.outcome}.`,
    bodyZh: `${opts.marketTitle.slice(0, 50)} · 结果：${opts.outcome}。`,
    href: `/markets/${opts.marketId}`,
  });
}

/**
 * Betting has closed — and with the pools now frozen, we can tell the player the
 * EXACT amount he receives if he is right. Not an estimate: `settledPayoutFor`,
 * the same function that pays him, computed it from the final pools and the
 * poll's own frozen rates.
 *
 * A player holding both sides gets both figures.
 */
export function notifySelectionClosed(userId: string, opts: {
  marketTitle: string; marketId: string;
  payoutIfYes: number; payoutIfNo: number;
  hasYes: boolean; hasNo: boolean;
}) {
  const both = opts.hasYes && opts.hasNo;
  const only = opts.hasYes ? opts.payoutIfYes : opts.payoutIfNo;
  const side = opts.hasYes ? "YES" : "NO";

  const bodyEn = both
    ? `${opts.marketTitle.slice(0, 60)} · Betting is closed. If YES wins you receive ${formatTzs(opts.payoutIfYes)}; if NO wins you receive ${formatTzs(opts.payoutIfNo)}.`
    : `${opts.marketTitle.slice(0, 60)} · Betting is closed. If ${side} wins you receive ${formatTzs(only)}.`;
  const bodySw = both
    ? `Kuweka dau kumefungwa. YES ikishinda utapata ${formatTzs(opts.payoutIfYes)}; NO ikishinda utapata ${formatTzs(opts.payoutIfNo)}.`
    : `Kuweka dau kumefungwa. ${side} ikishinda utapata ${formatTzs(only)}.`;

  return notify({
    userId,
    kind: "SELECTION_CLOSED",
    titleEn: both ? "Betting closed — your payouts are set" : `Betting closed — you receive ${formatTzs(only)} if you're right`,
    titleSw: both ? "Dau limefungwa — malipo yako yamewekwa" : `Dau limefungwa — utapata ${formatTzs(only)} ukiwa sahihi`,
    bodyEn,
    bodySw,
    href: `/markets/${opts.marketId}`,
  });
}

export function notifyDeposit(userId: string, amount: number, provider: string) {
  return notify({
    userId,
    kind: "DEPOSIT",
    titleEn: `Deposit confirmed · ${formatTzs(amount)}`,
    titleSw: `Amana imethibitishwa · ${formatTzs(amount)}`,
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
      titleEn: `Withdrawal sent · ${formatTzs(net)}`,
      titleSw: `Pesa imetumwa · ${formatTzs(net)}`,
      bodyEn: `${opts.provider} should land in moments.`,
      bodySw: `${opts.provider} itafika sasa hivi.`,
      href: "/wallet",
    });
  }
  if (opts.status === "AML_REVIEW") {
    return notify({
      userId,
      kind: "WITHDRAW",
      titleEn: `Withdrawal under review · ${formatTzs(opts.amount)}`,
      titleSw: `Inakaguliwa · ${formatTzs(opts.amount)}`,
      bodyEn: "Compliance review takes up to 24h.",
      bodySw: "Ukaguzi unachukua hadi saa 24.",
      href: "/wallet",
    });
  }
  if (opts.status === "FAILED") {
    return notify({
      userId,
      kind: "WITHDRAW",
      titleEn: `Withdrawal failed · ${formatTzs(opts.amount)}`,
      titleSw: `Kutoa pesa kumeshindikana · ${formatTzs(opts.amount)}`,
      bodyEn: opts.reason ? `Funds returned. ${opts.reason}` : "Funds returned to your balance.",
      bodySw: "Pesa imerudishwa kwenye salio lako.",
      href: "/wallet",
    });
  }
  return notify({
    userId,
    kind: "WITHDRAW",
    titleEn: `Withdrawal in flight · ${formatTzs(opts.amount)}`,
    titleSw: `Inatuma · ${formatTzs(opts.amount)}`,
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
  const amount = formatTzs(opts.amountTzs);
  const titleEn =
    opts.type === "COMMISSION" ? `You earned ${amount} from a referral`
    : opts.type === "PRIZE"    ? `Milestone reward · ${amount}`
    :                            `Referral bonus · ${amount}`;
  const titleSw =
    opts.type === "COMMISSION" ? `Umepata ${amount} kutoka kwa rafiki`
    : opts.type === "PRIZE"    ? `Zawadi ya hatua · ${amount}`
    :                            `Bonasi ya rafiki · ${amount}`;
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
  const amount = formatTzs(opts.amountTzs);
  const target = formatTzs(opts.wagerRequiredTzs);
  if (opts.queued) {
    return notify({
      userId,
      kind: "BONUS",
      titleEn: `Bonus queued · ${amount}`,
      titleSw: `Bonasi imepangwa · ${amount}`,
      bodyEn: `Your current bonus must be completed first. This ${amount} bonus will activate automatically when ready.`,
      bodySw: `Bonasi yako ya sasa lazima ikamilishwe kwanza. Bonasi ya ${amount} itaamilishwa moja kwa moja.`,
      href: "/wallet",
    });
  }
  return notify({
    userId,
    kind: "BONUS",
    titleEn: `Bonus credited · ${amount}`,
    titleSw: `Bonasi imewekwa · ${amount}`,
    bodyEn: `Play ${target} to unlock it as withdrawable cash. Tap to view.`,
    bodySw: `Cheza ${target} ili kuibadilisha kuwa pesa unayoweza kutoa. Bonyeza kuona.`,
    href: "/wallet",
  });
}

/** A bonus finished its wagering and converted to real, withdrawable balance. */
export function notifyBonusFulfilled(userId: string, opts: { amountTzs: number }) {
  const amount = formatTzs(opts.amountTzs);
  return notify({
    userId,
    kind: "BONUS",
    titleEn: `Bonus unlocked · ${amount} is now withdrawable!`,
    titleSw: `Bonasi imefunguliwa · ${amount} sasa unaweza kuitoa!`,
    bodyEn: "Your bonus is now real cash in your main wallet. Tap to view.",
    bodySw: "Bonasi yako sasa ni pesa halisi kwenye pochi yako kuu. Bonyeza kuona.",
    href: "/wallet",
  });
}

/** An unfulfilled bonus expired and was removed from the bonus wallet. */
export function notifyBonusExpired(userId: string, opts: { amountTzs: number }) {
  const amount = formatTzs(opts.amountTzs);
  return notify({
    userId,
    kind: "BONUS",
    titleEn: `Bonus expired · ${amount}`,
    titleSw: `Bonasi imeisha muda · ${amount}`,
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
    bodyEn: `"${opts.titleEn.slice(0, 60)}" — the 50pick team is reviewing it. We'll notify you ASAP.`,
    bodySw: "Timu ya 50pick inalikagua. Tutakujulisha haraka iwezekanavyo.",
    href: "/proposals",
  });
}

/**
 * F11 — tell every officer that a player has objected to a verdict. This is not a
 * courtesy ping: an OPEN objection FREEZES that market's settlement, so until an
 * officer rules, nobody in that market gets paid. Fans out to all console roles.
 */
export async function notifyAdminObjectionFiled(objectionId: string, marketTitle: string): Promise<void> {
  const officers = (await db.user.list()).filter((u) => ["ADMIN", "COMPLIANCE", "MODERATOR"].includes(u.role));
  for (const o of officers) {
    await notify({
      userId: o.id, kind: "OBJECTION",
      titleEn: "Objection filed · settlement frozen",
      titleSw: "Pingamizi limewasilishwa · malipo yamesimamishwa",
      bodyEn: `A player disputes the result of "${marketTitle.slice(0, 55)}". No money moves until you rule.`,
      bodySw: `Mchezaji anapinga matokeo ya soko hili. Hakuna malipo hadi utakapoamua.`,
      href: "/admin/objections",
    });
  }
}

/** F11 — tell the objector how their dispute was decided. */
export function notifyObjectionDecided(userId: string, opts: { upheld: boolean; marketId: string; note: string }) {
  return notify({
    userId, kind: "OBJECTION",
    titleEn: opts.upheld ? "Your objection was upheld" : "Your objection was reviewed",
    titleSw: opts.upheld ? "Pingamizi lako limekubaliwa" : "Pingamizi lako limekaguliwa",
    bodyEn: opts.upheld
      ? `An officer agreed with you and corrected the result before any payout. ${opts.note.slice(0, 120)}`
      : `An officer reviewed your objection and the result stands. ${opts.note.slice(0, 120)}`,
    bodySw: opts.upheld
      ? "Afisa amekubaliana nawe na amerekebisha matokeo kabla ya malipo yoyote."
      : "Afisa amekagua pingamizi lako na matokeo yamebaki vilevile.",
    href: `/markets/${opts.marketId}`,
  });
}

/** In-app alert to an officer that a NEW proposal is awaiting review. Lands in
 *  the main admin bell and deep-links to the proposals review console. */
export function notifyAdminProposalReview(adminUserId: string, opts: { proposerLabel: string; titleEn: string; proposalId: string }) {
  return notify({
    userId: adminUserId, kind: "PROPOSAL",
    titleEn: "New proposal to review",
    titleSw: "Pendekezo jipya la kukagua",
    bodyEn: `${opts.proposerLabel} proposed "${opts.titleEn.slice(0, 60)}" — tap to review.`,
    bodySw: `${opts.proposerLabel} amependekeza soko jipya — bonyeza kukagua.`,
    href: "/admin/proposals",
  });
}

/** Proposer notice: their proposal was approved and the reward bonus was credited
 *  (or queued behind an active bonus in sequential mode). */
export function notifyProposalApproved(userId: string, opts: { titleEn: string; amountTzs: number; queued?: boolean }) {
  if (opts.amountTzs > 0) {
    const amount = formatTzs(opts.amountTzs);
    if (opts.queued) {
      return notify({
        userId, kind: "PROPOSAL",
        titleEn: `Proposal approved · bonus ${amount} reserved`,
        titleSw: `Pendekezo limekubaliwa · bonasi ${amount} imehifadhiwa`,
        bodyEn: `"${opts.titleEn.slice(0, 55)}" was approved. Your ${amount} bonus activates automatically once your current bonus completes.`,
        bodySw: `Pendekezo lako limekubaliwa. Bonasi ya ${amount} itaanza mara bonasi yako ya sasa itakapokamilika.`,
        href: "/wallet",
      });
    }
    return notify({
      userId, kind: "PROPOSAL",
      titleEn: `Proposal approved · bonus ${amount} credited`,
      titleSw: `Pendekezo limekubaliwa · bonasi ${amount}`,
      bodyEn: `"${opts.titleEn.slice(0, 55)}" was approved. ${amount} is in your bonus wallet.`,
      bodySw: `Pendekezo lako limekubaliwa. ${amount} ipo kwenye pochi yako ya bonasi.`,
      href: "/wallet",
    });
  }
  return notify({
    userId, kind: "PROPOSAL",
    titleEn: "Your proposal was approved",
    titleSw: "Pendekezo lako limekubaliwa",
    bodyEn: `"${opts.titleEn.slice(0, 60)}" was approved by the 50pick team.`,
    bodySw: "Pendekezo lako limekubaliwa na timu ya 50pick.",
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

/** Refund receipt — when a market is voided and stakes are returned. */
export function notifyRefund(userId: string, opts: { stake: number; marketTitle: string; marketId: string }) {
  return notify({
    userId,
    kind: "DEPOSIT",
    titleEn: `Refund · ${formatTzs(opts.stake)} returned`,
    titleSw: `Kurudishiwa · ${formatTzs(opts.stake)}`,
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
    titleEn: `Market cancelled · ${formatTzs(opts.stake)} refunded`,
    titleSw: `Soko limefutwa · ${formatTzs(opts.stake)} imerejeshwa`,
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
    bodyEn: `"${opts.title.slice(0, 60)}" was emergency-voided — ${formatTzs(opts.refundedTzs)} refunded to ${opts.refundedCount} ${opts.refundedCount === 1 ? "player" : "players"}. Reason: ${opts.reason.slice(0, 100)}`,
    bodySw: `Soko limefutwa kwa dharura. ${formatTzs(opts.refundedTzs)} imerejeshwa.`,
    href: "/admin/markets",
  });
}

/** Cashout receipt — when a player sells a position early. */
export function notifyCashout(userId: string, opts: { amount: number; marketTitle: string; marketId: string; inGracePeriod?: boolean; positionId?: string }) {
  const ref = opts.positionId ? ` · ${opts.positionId}` : "";
  return notify({
    userId,
    kind: "WIN",
    titleEn: `${opts.inGracePeriod ? "Free exit" : "Cashed out"} · ${formatTzs(opts.amount)}`,
    titleSw: `${opts.inGracePeriod ? "Toka bila gharama" : "Umetoa"} · ${formatTzs(opts.amount)}`,
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
    titleEn: `Full refund · ${formatTzs(opts.stake)}`,
    titleSw: `Pesa imerudishwa · ${formatTzs(opts.stake)}`,
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
      titleEn: `AML review: ${label} ${formatTzs(opts.amountTzs)}`,
      titleSw: `Ukaguzi wa AML · ${formatTzs(opts.amountTzs)}`,
      bodyEn: `A ${label} of ${formatTzs(opts.amountTzs)} is awaiting AML clearance — open the queue.`,
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
        subject: `AML review needed · ${formatTzs(opts.amountTzs)}`,
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
