/**
 * Player notifications — the in-app inbox (the bell).
 *
 * ⚠️ Corrected 2026-07-31 against the running platform. This header used to say
 * the copy lives in `lib/notification-templates.ts` and is "bilingual EN + SW".
 * **That file has never existed** — every message is built inline below — and
 * "bilingual" is the wrong target on a trilingual product. It also claimed FCM /
 * APN / SMS fan-out: there is no FCM, no APN and no SMS here (SMS is OTP-only,
 * in `sms.ts`). Web push via `push-service` is the one real extra channel.
 *
 * What is actually true:
 *  · Each row carries all three locales — `titleEn/Sw/Zh`, `bodyEn/Sw/Zh`. The
 *    bell picks by locale and falls back to English, so a missing `*Zh` shows a
 *    Chinese reader English WITHOUT saying so. Completeness is therefore a
 *    correctness property, not a nicety — guarded by `npm run test:cert-c3`.
 *  · The inventory of every emitter lives in `comms-registry.ts`; adding one
 *    without registering it fails that gate.
 *  · `db.notification.create` is the only writer and it writes `channel: IN_APP`.
 *    This table is the inbox, not a unified delivery log — see the registry.
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

/**
 * How long two byte-identical notifications to the same player are treated as
 * the same event rather than two.
 *
 * 🔴 MEASURED, not guessed. On production 2026-07-31, **28 notifications were
 * byte-identical to the one before them — deep-link included — inside 60
 * seconds**: WIN ×3, BET_PLACED ×4, DEPOSIT ×20, WITHDRAW ×1. Among them
 * *"You won TZS 23,349"* twice **84 ms apart**, and a TZS 5,000 refund notice
 * twice 1.25 s apart. A player told twice that they won can reasonably believe
 * they won twice.
 *
 * The contrast that proves the cause: `notifySelectionClosedForMarket` is the
 * ONE path with an idempotency guard (it stamps `selectionClosedNotifiedAt`
 * inside `withLock`) — and SELECTION_CLOSED does not appear once in that set.
 * Every path without a guard produced duplicates. The window covers all 28
 * observed gaps (max 45.5 s) with margin.
 */
const DEDUPE_WINDOW_MS = 90_000;

export async function notify(input: NotifyInput): Promise<StoredNotification | null> {
  // Best-effort by contract: notifications are paired with money/auth/compliance
  // flows that have ALREADY committed under a lock. A DB hiccup writing the inbox
  // row must never reject into (and crash) those callers — many fire this without
  // awaiting. So we swallow + log here, immunising every caller (current and
  // future) instead of relying on each call site to remember `.catch()`.
  try {
    // ── DEDUPE ────────────────────────────────────────────────────────────────
    // Suppress a repeat of the SAME message to the SAME player inside the window.
    // Identity is the rendered message plus its deep link, so two genuinely
    // different events can never collide: every money emitter now carries a
    // unique reference (position id, or the receipt href). Fail OPEN — if the
    // lookup errors we deliver, because a missing notification is worse than a
    // duplicate one.
    try {
      const dup = await db.notification.findRecentDuplicate({
        userId: input.userId,
        kind: input.kind,
        titleEn: input.titleEn,
        bodyEn: input.bodyEn,
        href: input.href ?? null,
        sinceMs: DEDUPE_WINDOW_MS,
      });
      if (dup) {
        audit({
          category: "SYSTEM",
          action: "notification.deduped",
          actorId: null,
          targetType: "Notification",
          targetId: dup.id,
          payload: { userId: input.userId, kind: input.kind },
        });
        return dup;
      }
    } catch { /* fail open — deliver rather than drop */ }

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
    // SSE: nudge the connected client so the bell updates instantly.
    //
    // ⚠️ This used to carry `title: n.titleEn, body: n.bodyEn` — English, to
    // every client, on a trilingual product. It carries all three now, so a
    // consumer picks the reader's locale instead of inheriting ours. The bell
    // itself only uses this as a REFRESH trigger and re-fetches the row, which
    // is why the English payload was invisible; anything that starts rendering
    // it (a toast, a service-worker banner) would have shipped the bug.
    emit("notification:new", {
      userId: n.userId,
      notification: {
        id: n.id, kind: n.kind, href: n.href,
        title: n.titleEn, body: n.bodyEn,
        titleSw: n.titleSw, bodySw: n.bodySw,
        titleZh: n.titleZh ?? null, bodyZh: n.bodyZh ?? null,
      },
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
/**
 * PUSH WITHOUT AN INBOX ROW — the Up & Down channel (E-57).
 *
 * Every other message on this platform is an inbox row that also happens to push, because
 * `notify()` fans out to `sendPushToUser` after it writes. Up & Down cannot use that path:
 * `perEventNotificationsSuppressed()` deliberately silences its per-event messages, and the
 * reason is written into `market-service.ts` — *"forty inbox entries an hour is noise, not
 * information"*. Suppressing the row also suppressed the push, so a player betting on Up &
 * Down heard nothing at all until the digest.
 *
 * ⭐ THE TWO CHANNELS ARE NOT THE SAME QUESTION, AND THIS IS WHY THEY GET TWO PREDICATES.
 * An inbox accumulates: forty rows is forty things to dismiss. A push COALESCES — the Web
 * Push `tag` makes a new notification REPLACE the previous one on the device, so forty
 * rounds produce one live notification per chain showing the latest state. Collapsing two
 * different questions into one predicate is exactly what produced E-56 earlier today.
 *
 * ⛔ Everything protective still applies, because this goes through the SAME
 * `sendPushToUser`: a self-excluded or cooling-off player is suppressed and audited (push
 * is outbound engagement — LCCP SR 3.4), a missing VAPID key is a silent no-op, and dead
 * endpoints are pruned. It never throws, so no money path can be affected by it.
 *
 * The message is NOT recorded anywhere, by design: the money record (txn, ledger, audit)
 * is already written by the caller, and the digest remains the readable account.
 */
export function pushOnly(userId: string, copy: {
  titleEn: string; titleSw: string; titleZh: string;
  bodyEn: string; bodySw: string; bodyZh: string;
  url?: string;
  /** Collapse key. Same tag → the device REPLACES rather than stacks. */
  tag: string;
}): void {
  void (async () => {
    try {
      const { sendPushToUser } = await import("./push-service");
      const user = await db.user.findById(userId);
      // ⚠️ Resolve the reader's locale, never ours. The SSE payload above carries all
      // three languages for exactly this reason; a push carries one, so it must pick.
      const loc = (user?.locale ?? "EN").toUpperCase();
      const title = loc === "SW" ? copy.titleSw : loc === "ZH" ? copy.titleZh : copy.titleEn;
      const body  = loc === "SW" ? copy.bodySw  : loc === "ZH" ? copy.bodyZh  : copy.bodyEn;
      await sendPushToUser(userId, { title, body, url: copy.url ?? "/updown", tag: copy.tag });
    } catch { /* a courtesy channel must never surface */ }
  })();
}

export function notifyBetPlaced(userId: string, opts: {
  side: "YES" | "NO"; stake: number; payoutIfWin: number; marketTitle: string; marketId: string; positionId?: string;
  /** The poll's OWN rates. Hardcoding these numbers is how the copy came to lie. */
  cashOutFeeRate: number; freeExitGraceMinutes: number; paidExitWindowMinutes?: number;
}) {
  const ref = opts.positionId ? ` · ${opts.positionId}` : "";
  // These were hardcoded "free exit within 5 min, then 9% fee applies" (and the
  // Swahili silently omitted the fee entirely). Both numbers now come from the
  // poll's frozen snapshot, so they cannot drift from what we actually charge.
  const mins = opts.freeExitGraceMinutes;
  const pct = +(opts.cashOutFeeRate * 100).toFixed(1);
  const paid = opts.paidExitWindowMinutes ?? 0;
  // Default policy: no paid tail — after the free window it locks to settlement.
  const bodyEn = paid > 0
    ? `${opts.marketTitle.slice(0, 70)} · free exit within ${mins} min, then a ${pct}% fee applies.${ref}`
    : `${opts.marketTitle.slice(0, 70)} · free exit within ${mins} min, then it locks to settlement.${ref}`;
  const bodySw = paid > 0
    ? `${opts.marketTitle.slice(0, 50)} · toka bila gharama ndani ya dakika ${mins}, baadaye ada ya ${pct}% itatumika.${ref}`
    : `${opts.marketTitle.slice(0, 50)} · toka bila gharama ndani ya dakika ${mins}, kisha linafungwa hadi malipo.${ref}`;
  const bodyZh = paid > 0
    ? `${opts.marketTitle.slice(0, 50)} · ${mins} 分钟内可免费退出，之后按 ${pct}% 收取手续费。${ref}`
    : `${opts.marketTitle.slice(0, 50)} · ${mins} 分钟内可免费退出，之后将锁定至结算。${ref}`;
  return notify({
    userId,
    kind: "BET_PLACED",
    titleEn: `Bet placed · ${opts.side} ${formatTzs(opts.stake)}`,
    titleSw: `Dau limewekwa · ${opts.side} ${formatTzs(opts.stake)}`,
    titleZh: `已下注 · ${opts.side} ${formatTzs(opts.stake)}`,
    bodyEn,
    bodySw,
    bodyZh,
    href: `/markets/${opts.marketId}`,
  });
}

/**
 * ⭐ E-101 · `href` IS REQUIRED, and the default it replaced was the defect.
 *
 * It used to default to `"/positions"`, so a win notification landed the player on the
 * long-form list whatever they had won — and `/positions` queries `productLine: "MARKET"`,
 * so an Up & Down win pointed at a page that structurally cannot show it. A default that is
 * wrong for one of two products is not a safe default; it is a decision nobody made. Callers
 * now state where the money is, and `positionPermalinkHref` is how they say it.
 */
export function notifyWin(userId: string, amount: number, label: string, href: string) {
  return notify({
    userId,
    kind: "WIN",
    titleEn: `You won ${formatTzs(amount)}`,
    titleSw: `Umeshinda ${formatTzs(amount)}`,
    titleZh: `您赢得 ${formatTzs(amount)}`,
    bodyEn: `${label} paid out. Tap to view.`,
    bodySw: `${label} kimelipa. Bonyeza kuona.`,
    bodyZh: `${label} 已赔付。点击查看。`,
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
    // Direct in all three languages. A softened Chinese line would be the same
    // LCCP harm-prevention failure as a softened English one — the loss and the
    // amount are named outright, everywhere.
    titleEn: `Bet lost · ${formatTzs(opts.stake)}`,
    titleSw: `Dau limepotea · ${formatTzs(opts.stake)}`,
    titleZh: `投注失败 · ${formatTzs(opts.stake)}`,
    bodyEn: `${opts.marketTitle.slice(0, 70)} · your side didn't win.${ref}`,
    bodySw: `Upande wako haukushinda.${ref}`,
    bodyZh: `${opts.marketTitle.slice(0, 50)} · 您所选的一方未获胜。${ref}`,
    href: `/markets/${opts.marketId}`,
  });
}

/**
 * THE UP & DOWN DAILY DIGEST — one message covering a whole day of rounds (E-37).
 *
 * The other half of the 2026-07-24 owner decision: per-round win/loss messages are
 * suppressed for Up & Down and replaced by this. Until it existed, a player who won
 * on Up & Down was told nothing at all — measured 0 of 13 on production.
 *
 * ⚠️ The copy is composed in `updown-digest.ts` and passed in whole, which is the
 * opposite of every other emitter here and is deliberate: this message is an
 * aggregate whose sentences depend on which outcomes actually occurred, and
 * rebuilding that logic inside the notifier would put the LCCP loss wording in two
 * places. `digestCopy()` is exported and asserted directly by `test:updown-digest`.
 * All three languages are still REQUIRED here — the caller cannot opt out.
 *
 * `kind: ROUND_RESULT` — declared in `comms-registry` since the bell was written,
 * with an icon and a tint, and until now it had no emitter at all.
 */
export function notifyUpDownDigest(userId: string, opts: {
  dayKey: string;
  titleEn: string; titleSw: string; titleZh: string;
  bodyEn: string; bodySw: string; bodyZh: string;
}) {
  return notify({
    userId,
    kind: "ROUND_RESULT",
    titleEn: opts.titleEn, titleSw: opts.titleSw, titleZh: opts.titleZh,
    bodyEn: opts.bodyEn, bodySw: opts.bodySw, bodyZh: opts.bodyZh,
    // ⛔ The day is IN the link, and that is what makes the daily send idempotent
    // (`db.notification.existsWithHref`). Do not "tidy" this to `/updown/history`.
    href: `/updown/history?day=${opts.dayKey}`,
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
  const bodyZh = both
    ? `${opts.marketTitle.slice(0, 50)} · 投注已截止。若 YES 获胜您将获得 ${formatTzs(opts.payoutIfYes)}；若 NO 获胜您将获得 ${formatTzs(opts.payoutIfNo)}。`
    : `${opts.marketTitle.slice(0, 50)} · 投注已截止。若 ${side} 获胜您将获得 ${formatTzs(only)}。`;

  return notify({
    userId,
    kind: "SELECTION_CLOSED",
    titleEn: both ? "Betting closed — your payouts are set" : `Betting closed — you receive ${formatTzs(only)} if you're right`,
    titleSw: both ? "Dau limefungwa — malipo yako yamewekwa" : `Dau limefungwa — utapata ${formatTzs(only)} ukiwa sahihi`,
    titleZh: both ? "投注已截止 — 您的赔付已确定" : `投注已截止 — 若判断正确您将获得 ${formatTzs(only)}`,
    bodyEn,
    bodySw,
    bodyZh,
    href: `/markets/${opts.marketId}`,
  });
}

/**
 * Deposit inbox entry — every terminal AND non-terminal state, not just the
 * happy one.
 *
 * This used to fire ONLY on CONFIRMED, which meant a player whose card was
 * declined, whose payment sat processing for half an hour, or whose deposit was
 * auto-reversed on a self-exclusion got an empty inbox and had to guess. On a
 * real-money platform every state the money can be in is a state the player is
 * entitled to see.
 *
 * `href` points at the addressable receipt when we have a txn id, so the player
 * lands on the identifiers (ours AND the gateway's) rather than a wallet list
 * they then have to search.
 */
export function notifyDeposit(
  userId: string,
  opts: {
    status: "PROCESSING" | "CONFIRMED" | "FAILED" | "REVERSED";
    amount: number;
    provider: string;
    /** Internal txn id — makes the notification deep-link to its own receipt. */
    txnId?: string;
    /** Friendly, player-safe reason. Never a raw gateway code. */
    reason?: string;
  },
) {
  const amt = formatTzs(opts.amount);
  const href = opts.txnId ? `/wallet/receipt/${opts.txnId}` : "/wallet";

  if (opts.status === "CONFIRMED") {
    return notify({
      userId,
      kind: "DEPOSIT",
      titleEn: `Deposit confirmed · ${amt}`,
      titleSw: `Amana imethibitishwa · ${amt}`,
      titleZh: `充值已确认 · ${amt}`,
      bodyEn: `Funds added via ${opts.provider}.`,
      bodySw: `Pesa imeingia kupitia ${opts.provider}.`,
      bodyZh: `已通过 ${opts.provider} 入账。`,
      href,
    });
  }

  if (opts.status === "PROCESSING") {
    // The anti-double-pay message. A player who navigates away mid-collection
    // has no other signal that we are still waiting, and paying twice is the
    // expensive mistake this line exists to prevent.
    return notify({
      userId,
      kind: "DEPOSIT",
      titleEn: `Deposit processing · ${amt}`,
      titleSw: `Amana inashughulikiwa · ${amt}`,
      titleZh: `充值处理中 · ${amt}`,
      bodyEn: `Waiting for ${opts.provider} to confirm. Don't pay again — we'll tell you as soon as it clears.`,
      bodySw: `Tunasubiri ${opts.provider} kuthibitisha. Usilipe tena — tutakujulisha itakapokamilika.`,
      bodyZh: `正在等待 ${opts.provider} 确认。请勿重复支付，款项到账后我们会立即通知您。`,
      href,
    });
  }

  if (opts.status === "FAILED") {
    // "No money was taken" is the whole point of this one — without it a failed
    // deposit reads as a charge that vanished.
    return notify({
      userId,
      kind: "DEPOSIT",
      titleEn: `Deposit failed · ${amt}`,
      titleSw: `Amana imeshindikana · ${amt}`,
      titleZh: `充值失败 · ${amt}`,
      bodyEn: opts.reason
        ? `No money was taken. ${opts.reason}`
        : "No money was taken. Your balance is unchanged.",
      bodySw: "Hakuna pesa iliyochukuliwa. Salio lako halijabadilika.",
      bodyZh: "未扣除任何款项，您的余额未发生变化。",
      href,
    });
  }

  // REVERSED — arrived while the account was self-excluded / cooling off.
  return notify({
    userId,
    kind: "DEPOSIT",
    titleEn: `Deposit reversed · ${amt}`,
    titleSw: `Amana imerudishwa · ${amt}`,
    titleZh: `充值已退回 · ${amt}`,
    bodyEn: "Your account is self-excluded, so this deposit was not added. It has been returned to where it came from.",
    bodySw: "Akaunti yako imejifungia, hivyo amana hii haikuongezwa. Imerudishwa ilikotoka.",
    bodyZh: "您的账户处于自我限制状态，此笔充值未入账，已原路退回。",
    href,
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
      titleZh: `提现已发出 · ${formatTzs(net)}`,
      bodyEn: `${opts.provider} should land in moments.`,
      bodySw: `${opts.provider} itafika sasa hivi.`,
      bodyZh: `${opts.provider} 稍后即可到账。`,
      href: "/wallet",
    });
  }
  if (opts.status === "AML_REVIEW") {
    return notify({
      userId,
      kind: "WITHDRAW",
      titleEn: `Withdrawal under review · ${formatTzs(opts.amount)}`,
      titleSw: `Inakaguliwa · ${formatTzs(opts.amount)}`,
      titleZh: `提现审核中 · ${formatTzs(opts.amount)}`,
      bodyEn: "Compliance review takes up to 24h.",
      bodySw: "Ukaguzi unachukua hadi saa 24.",
      bodyZh: "合规审核最长需要 24 小时。",
      href: "/wallet",
    });
  }
  if (opts.status === "FAILED") {
    return notify({
      userId,
      kind: "WITHDRAW",
      titleEn: `Withdrawal failed · ${formatTzs(opts.amount)}`,
      titleSw: `Kutoa pesa kumeshindikana · ${formatTzs(opts.amount)}`,
      titleZh: `提现失败 · ${formatTzs(opts.amount)}`,
      bodyEn: opts.reason ? `Funds returned. ${opts.reason}` : "Funds returned to your balance.",
      bodySw: "Pesa imerudishwa kwenye salio lako.",
      bodyZh: opts.reason ? `款项已退回您的余额。${opts.reason}` : "款项已退回您的余额。",
      href: "/wallet",
    });
  }
  return notify({
    userId,
    kind: "WITHDRAW",
    titleEn: `Withdrawal in flight · ${formatTzs(opts.amount)}`,
    titleSw: `Inatuma · ${formatTzs(opts.amount)}`,
    titleZh: `提现处理中 · ${formatTzs(opts.amount)}`,
    bodyEn: `${opts.provider} processing.`,
    bodySw: `${opts.provider} inaendelea.`,
    bodyZh: `${opts.provider} 正在处理。`,
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
    titleZh: "您的朋友已加入",
    bodyEn: `${opts.recruitMasked} signed up with your link.`,
    bodySw: `${opts.recruitMasked} amejisajili kupitia kiungo chako.`,
    bodyZh: `${opts.recruitMasked} 已通过您的链接注册。`,
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
  const titleZh =
    opts.type === "COMMISSION" ? `您从推荐中获得 ${amount}`
    : opts.type === "PRIZE"    ? `里程碑奖励 · ${amount}`
    :                            `推荐奖金 · ${amount}`;
  const bodyZh =
    opts.type === "COMMISSION" ? "来自好友活动的佣金。点击查看。"
    : opts.type === "PRIZE"    ? "一位好友达成里程碑。点击查看。"
    :                            "已存入您的钱包。点击查看。";
  return notify({
    userId,
    kind: "AFFILIATE",
    titleEn,
    titleSw,
    titleZh,
    bodyEn,
    bodySw: "Imewekwa kwenye pochi yako. Bonyeza kuona.",
    bodyZh,
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
      titleZh: `奖金已排队 · ${amount}`,
      bodyEn: `Your current bonus must be completed first. This ${amount} bonus will activate automatically when ready.`,
      bodySw: `Bonasi yako ya sasa lazima ikamilishwe kwanza. Bonasi ya ${amount} itaamilishwa moja kwa moja.`,
      bodyZh: `需先完成当前奖金。这笔 ${amount} 奖金将在条件满足后自动激活。`,
      href: "/wallet",
    });
  }
  return notify({
    userId,
    kind: "BONUS",
    titleEn: `Bonus credited · ${amount}`,
    titleSw: `Bonasi imewekwa · ${amount}`,
    titleZh: `奖金已到账 · ${amount}`,
    bodyEn: `Play ${target} to unlock it as withdrawable cash. Tap to view.`,
    bodySw: `Cheza ${target} ili kuibadilisha kuwa pesa unayoweza kutoa. Bonyeza kuona.`,
    bodyZh: `完成 ${target} 的投注即可解锁为可提现现金。点击查看。`,
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
    titleZh: `奖金已解锁 · ${amount} 现在可以提现！`,
    bodyEn: "Your bonus is now real cash in your main wallet. Tap to view.",
    bodySw: "Bonasi yako sasa ni pesa halisi kwenye pochi yako kuu. Bonyeza kuona.",
    bodyZh: "您的奖金已成为主钱包中的真实现金。点击查看。",
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
    titleZh: `奖金已过期 · ${amount}`,
    bodyEn: "An unfinished bonus reached its expiry date and was removed.",
    bodySw: "Bonasi ambayo haikukamilika imefikia tarehe ya mwisho na imeondolewa.",
    bodyZh: "一笔未完成的奖金已到期并被移除。",
    href: "/wallet",
  });
}

/* ---- Player market-proposal emitters ---- */

export function notifyProposalUnderReview(userId: string, opts: { titleEn: string }) {
  return notify({
    userId, kind: "PROPOSAL",
    titleEn: "Your proposal is under review",
    titleSw: "Pendekezo lako linakaguliwa",
    titleZh: "您的提案正在审核中",
    bodyEn: `"${opts.titleEn.slice(0, 60)}" — the 50pick team is reviewing it. We'll notify you ASAP.`,
    bodySw: "Timu ya 50pick inalikagua. Tutakujulisha haraka iwezekanavyo.",
    bodyZh: `"${opts.titleEn.slice(0, 60)}" — 50pick 团队正在审核。我们会尽快通知您。`,
    href: "/proposals",
  });
}

/**
 * F11 — tell every officer that a player has objected to a verdict. This is not a
 * courtesy ping: an OPEN objection FREEZES that market's settlement, so until an
 * officer rules, nobody in that market gets paid. Fans out to all console roles.
 */
export async function notifyAdminObjectionFiled(objectionId: string, marketTitle: string): Promise<void> {
  const officers = await db.user.listByRoles(["ADMIN", "COMPLIANCE", "MODERATOR"]); // audit M5
  for (const o of officers) {
    await notify({
      userId: o.id, kind: "OBJECTION",
      titleEn: "Objection filed · settlement frozen",
      titleSw: "Pingamizi limewasilishwa · malipo yamesimamishwa",
      titleZh: "已提出异议 · 结算已冻结",
      bodyEn: `A player disputes the result of "${marketTitle.slice(0, 55)}". No money moves until you rule.`,
      bodySw: `Mchezaji anapinga matokeo ya soko hili. Hakuna malipo hadi utakapoamua.`,
      bodyZh: `有玩家对 "${marketTitle.slice(0, 55)}" 的结果提出异议。在您裁定前不会有任何资金变动。`,
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
    titleZh: opts.upheld ? "您的异议已获支持" : "您的异议已审核",
    bodyEn: opts.upheld
      ? `An officer agreed with you and corrected the result before any payout. ${opts.note.slice(0, 120)}`
      : `An officer reviewed your objection and the result stands. ${opts.note.slice(0, 120)}`,
    bodySw: opts.upheld
      ? "Afisa amekubaliana nawe na amerekebisha matokeo kabla ya malipo yoyote."
      : "Afisa amekagua pingamizi lako na matokeo yamebaki vilevile.",
    bodyZh: opts.upheld
      ? `审核人员认同您的意见，并已在赔付前更正结果。${opts.note.slice(0, 120)}`
      : `审核人员已审核您的异议，原结果维持不变。${opts.note.slice(0, 120)}`,
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
    titleZh: "有新提案待审核",
    bodyEn: `${opts.proposerLabel} proposed "${opts.titleEn.slice(0, 60)}" — tap to review.`,
    bodySw: `${opts.proposerLabel} amependekeza soko jipya — bonyeza kukagua.`,
    bodyZh: `${opts.proposerLabel} 提交了 "${opts.titleEn.slice(0, 60)}" — 点击审核。`,
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
        titleZh: `提案已通过 · 已预留 ${amount} 奖金`,
        bodyEn: `"${opts.titleEn.slice(0, 55)}" was approved. Your ${amount} bonus activates automatically once your current bonus completes.`,
        bodySw: `Pendekezo lako limekubaliwa. Bonasi ya ${amount} itaanza mara bonasi yako ya sasa itakapokamilika.`,
        bodyZh: `"${opts.titleEn.slice(0, 55)}" 已通过审核。您的 ${amount} 奖金将在当前奖金完成后自动激活。`,
        href: "/wallet",
      });
    }
    return notify({
      userId, kind: "PROPOSAL",
      titleEn: `Proposal approved · bonus ${amount} credited`,
      titleSw: `Pendekezo limekubaliwa · bonasi ${amount}`,
      titleZh: `提案已通过 · ${amount} 奖金已到账`,
      bodyEn: `"${opts.titleEn.slice(0, 55)}" was approved. ${amount} is in your bonus wallet.`,
      bodySw: `Pendekezo lako limekubaliwa. ${amount} ipo kwenye pochi yako ya bonasi.`,
      bodyZh: `"${opts.titleEn.slice(0, 55)}" 已通过审核。${amount} 已存入您的奖金钱包。`,
      href: "/wallet",
    });
  }
  return notify({
    userId, kind: "PROPOSAL",
    titleEn: "Your proposal was approved",
    titleSw: "Pendekezo lako limekubaliwa",
    titleZh: "您的提案已通过",
    bodyEn: `"${opts.titleEn.slice(0, 60)}" was approved by the 50pick team.`,
    bodySw: "Pendekezo lako limekubaliwa na timu ya 50pick.",
    bodyZh: `"${opts.titleEn.slice(0, 60)}" 已获 50pick 团队通过。`,
    href: "/proposals",
  });
}

export function notifyProposalListed(userId: string, opts: { titleEn: string; marketId: string }) {
  return notify({
    userId, kind: "PROPOSAL",
    titleEn: "Your proposal is now live",
    titleSw: "Pendekezo lako sasa ni soko",
    titleZh: "您的提案已上线",
    bodyEn: `"${opts.titleEn.slice(0, 60)}" is a market now — share it.`,
    bodySw: "Sasa ni soko — lishiriki.",
    bodyZh: `"${opts.titleEn.slice(0, 60)}" 现已成为市场 — 分享出去吧。`,
    href: `/markets/${opts.marketId}`,
  });
}

export function notifyProposalChanges(userId: string, opts: { titleEn: string; note: string | null }) {
  return notify({
    userId, kind: "PROPOSAL",
    titleEn: "Changes requested on your proposal",
    titleSw: "Mabadiliko yanahitajika",
    titleZh: "您的提案需要修改",
    bodyEn: opts.note ? `Officer note: ${opts.note.slice(0, 80)}` : `"${opts.titleEn.slice(0, 60)}" needs a tweak before listing.`,
    bodySw: "Rekebisha kabla ya kuorodheshwa.",
    bodyZh: opts.note ? `审核意见：${opts.note.slice(0, 80)}` : `"${opts.titleEn.slice(0, 60)}" 上架前需要做一处调整。`,
    href: "/proposals",
  });
}

export function notifyProposalDeclined(userId: string, opts: { titleEn: string; reason: string }) {
  return notify({
    userId, kind: "PROPOSAL",
    titleEn: "Your proposal was declined",
    titleSw: "Pendekezo limekataliwa",
    titleZh: "您的提案未被采纳",
    bodyEn: `"${opts.titleEn.slice(0, 50)}" — reason: ${opts.reason}.`,
    bodySw: `Sababu: ${opts.reason}.`,
    bodyZh: `"${opts.titleEn.slice(0, 50)}" — 原因：${opts.reason}。`,
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
    titleZh: `退款 · 已退回 ${formatTzs(opts.stake)}`,
    bodyEn: `${opts.marketTitle.slice(0, 70)} was voided. Your stake has been returned.`,
    bodySw: `Soko limebatilishwa. Dau lako limerudishwa.`,
    bodyZh: `${opts.marketTitle.slice(0, 50)} 已作废。您的本金已全额退回。`,
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
    titleZh: `市场已取消 · 已退款 ${formatTzs(opts.stake)}`,
    bodyEn: `"${opts.marketTitle.slice(0, 60)}" was cancelled: ${opts.reason.slice(0, 120)}. Your full stake has been returned to your wallet.`,
    bodySw: `Soko limefutwa. Dau lako lote limerejeshwa kwenye pochi yako.`,
    bodyZh: `"${opts.marketTitle.slice(0, 60)}" 已取消：${opts.reason.slice(0, 120)}。您的本金已全额退回钱包。`,
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
    titleZh: `市场已取消 · ${opts.refundedCount} 人已退款`,
    bodyEn: `"${opts.title.slice(0, 60)}" was emergency-voided — ${formatTzs(opts.refundedTzs)} refunded to ${opts.refundedCount} ${opts.refundedCount === 1 ? "player" : "players"}. Reason: ${opts.reason.slice(0, 100)}`,
    bodySw: `Soko limefutwa kwa dharura. ${formatTzs(opts.refundedTzs)} imerejeshwa.`,
    bodyZh: `"${opts.title.slice(0, 60)}" 已紧急作废 — 已向 ${opts.refundedCount} 位玩家退款 ${formatTzs(opts.refundedTzs)}。原因：${opts.reason.slice(0, 100)}`,
    href: "/admin/markets",
  });
}

/**
 * Cash-out receipt — when a player sells a position early.
 *
 * 🔴 `freeExitGraceMinutes` is a PARAMETER, not the literal 5 this copy used to
 * carry ("sold within the 5-min grace window" / "ndani ya dakika 5"). It is the
 * identical defect `notifyBetPlaced` was fixed for one function above, left
 * behind in the message that confirms the money moved: the window is per-poll
 * and admin-tunable, so the moment anyone changed it this receipt stated a rule
 * the platform was not applying. The caller passes the poll's own frozen rate.
 */
export function notifyCashout(userId: string, opts: {
  amount: number; marketTitle: string; marketId: string; inGracePeriod?: boolean; positionId?: string;
  /** The poll's OWN frozen free-exit window. Never hardcode it here. */
  freeExitGraceMinutes: number;
}) {
  const ref = opts.positionId ? ` · ${opts.positionId}` : "";
  const mins = opts.freeExitGraceMinutes;
  return notify({
    userId,
    kind: "WIN",
    titleEn: `${opts.inGracePeriod ? "Free exit" : "Cashed out"} · ${formatTzs(opts.amount)}`,
    titleSw: `${opts.inGracePeriod ? "Toka bila gharama" : "Umetoa"} · ${formatTzs(opts.amount)}`,
    titleZh: `${opts.inGracePeriod ? "免费退出" : "已套现"} · ${formatTzs(opts.amount)}`,
    bodyEn: opts.inGracePeriod
      ? `Full stake returned — sold within the ${mins}-min grace window, no fee.${ref}`
      : `Early exit from ${opts.marketTitle.slice(0, 60)}. Funds in wallet.${ref}`,
    bodySw: opts.inGracePeriod
      ? `Pesa yote imerudishwa — umetoka ndani ya dakika ${mins}.${ref}`
      : `Umetoka mapema. Pesa imo kwenye pochi yako.${ref}`,
    bodyZh: opts.inGracePeriod
      ? `本金已全额退回 — 在 ${mins} 分钟免费窗口内卖出，不收取手续费。${ref}`
      : `已从 ${opts.marketTitle.slice(0, 50)} 提前退出。款项已存入钱包。${ref}`,
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
    titleZh: `全额退款 · ${formatTzs(opts.stake)}`,
    bodyEn: `${opts.marketTitle.slice(0, 60)} — all bets were on one side. Full stake returned, no fee.${ref}`,
    bodySw: `Dau lako lote limerudishwa bila gharama — wote walibetia upande mmoja.${ref}`,
    bodyZh: `${opts.marketTitle.slice(0, 50)} — 所有投注都在同一方。本金全额退回，不收取手续费。${ref}`,
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
    titleZh: "有新的身份审核",
    bodyEn: `${opts.playerLabel} submitted identity documents — tap to review.`,
    bodySw: `${opts.playerLabel} amewasilisha nyaraka — bonyeza kukagua.`,
    bodyZh: `${opts.playerLabel} 已提交身份证件 — 点击审核。`,
    href: `/admin/players/${opts.userId}?tab=kyc`,
  });
}

/**
 * In-app alert to an officer that a market has closed and is waiting to be
 * resolved. Lands in the main bell and deep-links to the resolver
 * queue. Fired once per market by the resolution-due sweep.
 */
export function notifyAdminMarketResolution(adminUserId: string, opts: { title: string; marketId: string }) {
  return notify({
    userId: adminUserId,
    kind: "PROPOSAL", // closest existing admin/ops kind; routed to the resolver queue
    titleEn: "Market awaiting resolution",
    titleSw: "Soko linasubiri uamuzi",
    titleZh: "市场等待裁定",
    bodyEn: `"${opts.title.slice(0, 70)}" has closed — resolve the outcome.`,
    bodySw: `"${opts.title.slice(0, 50)}" limefungwa — tatua matokeo.`,
    bodyZh: `"${opts.title.slice(0, 50)}" 已关闭 — 请裁定结果。`,
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
      titleZh: "需要更多信息",
      bodyEn: "Open verification to update your documents and resubmit.",
      bodySw: "Fungua uthibitishaji urekebishe nyaraka zako.",
      bodyZh: "请打开身份验证页面，更新证件后重新提交。",
      href: "/profile/kyc",
    });
  }
  if (status === "APPROVED") {
    return notify({
      userId,
      kind: "KYC",
      titleEn: "Identity verified",
      titleSw: "Kitambulisho kimethibitishwa",
      titleZh: "身份已验证",
      bodyEn: "You can now withdraw winnings.",
      bodySw: "Sasa unaweza kutoa pesa zako.",
      bodyZh: "您现在可以提现奖金了。",
      href: "/wallet",
    });
  }
  if (status === "REJECTED") {
    return notify({
      userId,
      kind: "KYC",
      titleEn: "Identity needs review",
      titleSw: "Kitambulisho kinahitaji ukaguzi",
      titleZh: "身份需要复核",
      bodyEn: "Please re-submit. Support can help.",
      bodySw: "Tafadhali tuma tena.",
      bodyZh: "请重新提交。如需协助请联系客服。",
      href: "/profile/kyc",
    });
  }
  return notify({
    userId,
    kind: "KYC",
    titleEn: "Identity submitted",
    titleSw: "Kitambulisho kimewasilishwa",
    titleZh: "身份信息已提交",
    bodyEn: "Compliance review takes 24h.",
    bodySw: "Ukaguzi unachukua saa 24.",
    bodyZh: "合规审核需要 24 小时。",
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
    titleZh: "您的密码已更改",
    bodyEn: "If this wasn't you, reset it now and contact support.",
    bodySw: "Kama si wewe, libadilishe sasa na uwasiliane na msaada.",
    bodyZh: "如果这不是您本人操作，请立即重置密码并联系客服。",
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
    titleZh: "自我限制已生效",
    bodyEn: `Your account is closed to betting and deposits until ${opts.until.slice(0, 10)}.`,
    bodySw: `Akaunti yako imefungwa kuweka dau na amana hadi ${opts.until.slice(0, 10)}.`,
    bodyZh: `您的账户已停止投注与充值，直至 ${opts.until.slice(0, 10)}。`,
    href: "/profile/responsible-gambling",
  });
}

export function notifyCoolOff(userId: string, opts: { until: string }) {
  return notify({
    userId,
    kind: "RG",
    titleEn: "Cool-off break active",
    titleSw: "Mapumziko yameanza",
    titleZh: "冷静期已开始",
    bodyEn: `Betting and deposits are paused until ${opts.until.slice(0, 10)}.`,
    bodySw: `Kuweka dau na amana kumesimamishwa hadi ${opts.until.slice(0, 10)}.`,
    bodyZh: `投注与充值已暂停，直至 ${opts.until.slice(0, 10)}。`,
    href: "/profile/responsible-gambling",
  });
}

/**
 * Alert every compliance/admin officer (in-app bell + email) that a transaction
 * has hit AML review — so officers act on the queue instead of polling it.
 * Best-effort throughout; never blocks the transaction.
 */
export async function notifyAdminsAmlReview(opts: { txnKind: "WITHDRAWAL" | "DEPOSIT"; amountTzs: number; reference: string }) {
  const officers = await db.user.listByRoles(["ADMIN", "COMPLIANCE"]); // audit M5
  const label = opts.txnKind === "WITHDRAWAL" ? "withdrawal" : "deposit";
  for (const o of officers) {
    await notify({
      userId: o.id,
      kind: "SECURITY",
      titleEn: `AML review: ${label} ${formatTzs(opts.amountTzs)}`,
      titleSw: `Ukaguzi wa AML · ${formatTzs(opts.amountTzs)}`,
      titleZh: `反洗钱审核 · ${formatTzs(opts.amountTzs)}`,
      bodyEn: `A ${label} of ${formatTzs(opts.amountTzs)} is awaiting AML clearance — open the queue.`,
      bodySw: "Muamala unasubiri ukaguzi wa AML — fungua foleni.",
      bodyZh: `一笔 ${formatTzs(opts.amountTzs)} 的交易正在等待反洗钱审核 — 请打开队列。`,
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
  const officers = await db.user.listByRoles(["ADMIN", "COMPLIANCE"]); // audit M5
  for (const o of officers) {
    await notify({
      userId: o.id,
      kind: "SECURITY",
      // No emoji in UI copy (CLAUDE.md design rule) — the bell already carries a
      // SECURITY tint and icon, so the warning glyph was decoration that broke a
      // stated rule on the one surface an officer scans under pressure.
      titleEn: `Market Sentinel is failing (${opts.reason})`,
      titleSw: `Mlinzi wa Soko umeshindwa (${opts.reason})`,
      titleZh: `市场哨兵运行失败（${opts.reason}）`,
      bodyEn: `The live auto-close AI could not check ${opts.errorCount} market(s) on its last sweep — live markets may be unprotected. Most likely: Anthropic billing/API key. Check now.`,
      bodySw: `AI ya kufunga soko imeshindwa kukagua masoko ${opts.errorCount}. Angalia malipo/API key ya Anthropic mara moja.`,
      bodyZh: `自动关闭 AI 在上一次巡检中未能检查 ${opts.errorCount} 个市场 — 进行中的市场可能失去保护。最可能的原因：Anthropic 账单或 API 密钥。请立即检查。`,
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
        subject: `Market Sentinel failing — ${opts.reason}`,
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
  const officers = await db.user.listByRoles(["ADMIN", "COMPLIANCE"]); // audit M5
  const spent = `$${opts.spentUsd.toFixed(2)}`;
  const limit = `$${opts.limitUsd.toFixed(2)}`;
  const reached = opts.level === "limit";
  // No emoji in UI copy (CLAUDE.md design rule) — see notifyAdminsSentinelDown.
  const titleEn = reached
    ? `AI spend reached the ${limit} limit`
    : `AI spend nearing the ${limit} limit (${spent})`;
  const bodyEn = reached
    ? `AI usage has reached your ${limit} budget for this cycle (spent ${spent}). Top up Anthropic credit and reset the cycle on the AI usage page, or the AI features will stop.`
    : `AI usage is at ${spent} of your ${limit} budget this cycle. Plan a top-up soon — you'll get one more alert if it hits the limit.`;
  for (const o of officers) {
    await notify({
      userId: o.id,
      kind: "SECURITY",
      titleEn,
      titleSw: reached ? `Matumizi ya AI yamefikia kikomo cha ${limit}` : `Matumizi ya AI yanakaribia kikomo cha ${limit} (${spent})`,
      titleZh: reached ? `AI 支出已达到 ${limit} 上限` : `AI 支出接近 ${limit} 上限（${spent}）`,
      bodyEn,
      bodySw: reached
        ? `Matumizi ya AI yamefikia bajeti ya ${limit} (umetumia ${spent}). Ongeza salio la Anthropic na uweke upya mzunguko kwenye ukurasa wa matumizi ya AI.`
        : `Matumizi ya AI yako ${spent} kati ya ${limit}. Panga kuongeza salio hivi karibuni.`,
      bodyZh: reached
        ? `本周期 AI 使用已达到 ${limit} 预算（已花费 ${spent}）。请为 Anthropic 充值，并在 AI 用量页面重置周期，否则 AI 功能将停止。`
        : `本周期 AI 使用已达 ${limit} 中的 ${spent}。请尽快计划充值。`,
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
        subject: reached ? `50pick AI spend reached ${limit}` : `50pick AI spend nearing ${limit} (${spent})`,
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
      titleZh: "资金来源已通过",
      bodyEn: "Your declaration was accepted — you can deposit as normal.",
      bodySw: "Tamko lako limekubaliwa — unaweza kuweka pesa kama kawaida.",
      bodyZh: "您的声明已被接受 — 您可以正常充值。",
      href: "/wallet",
    });
  }
  if (status === "MORE_INFO") {
    return notify({
      userId,
      kind: "KYC",
      titleEn: "More info needed for source of funds",
      titleSw: "Taarifa zaidi zinahitajika",
      titleZh: "资金来源需要补充信息",
      bodyEn: "Our compliance team needs a bit more information about your source of funds. Please check your email and update your declaration.",
      bodySw: "Timu yetu inahitaji maelezo zaidi kuhusu chanzo chako cha fedha. Tafadhali angalia barua pepe yako na usasishe tamko lako.",
      bodyZh: "我们的合规团队需要更多关于您资金来源的信息。请查收邮件并更新您的声明。",
      href: "/profile/source-of-funds",
    });
  }
  return notify({
    userId,
    kind: "KYC",
    titleEn: "Source of funds needs review",
    titleSw: "Asili ya pesa inahitaji ukaguzi",
    titleZh: "资金来源需要复核",
    bodyEn: "Please update your source-of-funds declaration and resubmit.",
    bodySw: "Tafadhali sasisha tamko la asili ya pesa na uwasilishe tena.",
    bodyZh: "请更新您的资金来源声明并重新提交。",
    href: "/profile/source-of-funds",
  });
}
