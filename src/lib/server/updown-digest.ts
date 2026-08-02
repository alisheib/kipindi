/**
 * UP & DOWN — THE DAILY DIGEST (finding E-37 / E-43).
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 *
 * Ali decided on 2026-07-24 (`docs/COMPLIANCE-DECISIONS.md §3`) that per-round
 * win/loss/bet-placed messages are suppressed for Up & Down — a player running
 * twenty 5-minute rounds an hour would otherwise get forty emails — and that they
 * are **replaced by an in-app result plus a daily digest**.
 *
 * The suppression shipped. The digest did not. Until this file, the only two
 * occurrences of the words "daily digest" anywhere in `src/` were the two comments
 * in `market-service.ts` promising it, and one of those comments carried an LCCP
 * harm-prevention claim — *"it moves it into the daily digest, which still states
 * each loss plainly"* — about a system that did not exist.
 *
 * 🔴 MEASURED ON PRODUCTION, 2026-08-02, before this shipped:
 *
 *     Up & Down positions that WON  … 13   of which were ever notified …  0
 *     Up & Down positions that LOST … 11   of which were ever notified …  0
 *     Up & Down positions REFUNDED  … 56   of which were ever notified … 56
 *
 * So the suppression was not merely incomplete, it was **inverted**: the one Up &
 * Down outcome a player was ever told about was the one where nothing happened to
 * their money. `perEventNotificationsSuppressed()` was never applied to
 * `notifyRefund` / `notifyOneSidedRefund`, so refunds leaked through the policy
 * while wins and losses — the outcomes that actually move money — were silent.
 * That is E-43, and it is not a separate bug: it is the same decision, applied to
 * two thirds of the cases. Both halves are closed here, together.
 *
 * ⚠️ The first attempt to measure this was BLIND and would have reported the wrong
 * shape. Keying on `href LIKE '%' || marketId || '%'` finds every refund (they
 * deep-link to `/markets/<id>`) and **cannot ever find a win**, because
 * `notifyWin` links to `/positions`, which carries no market id. The numbers above
 * are anchored on the POSITION — "did this player receive anything at all in the
 * ten minutes after this round settled?" — which cannot be blind in that way. The
 * four notifications that did land in a win/loss window were, on inspection, the
 * same refund for a *different* round eight minutes later.
 *
 * ── WHAT IT SENDS ────────────────────────────────────────────────────────────
 *
 * One notification and one email per player per EAT day, covering every round of
 * theirs that settled that day — won, lost and refunded, each stated with its own
 * count and its own money. Losses are stated plainly and are never rolled into a
 * net figure alone (LCCP harm-prevention, and the claim the old comment made).
 *
 * ── THE THREE PROPERTIES THAT MAKE IT SAFE ───────────────────────────────────
 *
 * 1. **It is derived, never recorded.** There is no digest queue and no new table.
 *    The aggregate is read from the `Position` rows settlement already wrote, so
 *    the digest cannot disagree with the ledger — the worst it can do is be late.
 *    A digest table would be a second source of truth for money the player is
 *    being told about, which is exactly the shape that goes wrong quietly.
 *
 * 2. **It is idempotent, unboundedly.** The day is in the deep link
 *    (`/updown/history?day=YYYY-MM-DD`) and `db.notification.existsWithHref`
 *    asks whether that exact link was ever sent to that player. So the sweep can
 *    run every 15 minutes, across restarts and redeploys, without a player being
 *    told about the same day twice. ⛔ The 90-second `DEDUPE_WINDOW_MS` in
 *    `notification-service` is NOT idempotency for a daily message — do not
 *    lean on it here.
 *
 * 3. **It bins by `settledAt`, so the bins are disjoint and final.** `settledAt`
 *    is stamped `new Date()` when settlement commits and is never backdated, so
 *    once an EAT day is over nothing new can appear inside it. A round the healer
 *    resolves hours late lands in the digest for the day it actually settled —
 *    late, but stated exactly once, and never lost.
 *
 * ⛔ THIS FILE MOVES NO MONEY and must never start. It reads settled positions and
 * writes notifications. If you find yourself adjusting a wallet here, that is the
 * bug — the money was already moved, booked and audited per round, which is the
 * half of the 2026-07-24 decision that was always correctly implemented.
 */
import { db } from "./store";
import { positionStore, type DailySettledTotals } from "./market-dal";
import { notifyUpDownDigest } from "./notification-service";
import { sendEmailToUser, updownDigestHtml } from "./email";
import { audit } from "./audit";
import { dict } from "@/lib/i18n-dict";
// ⛔ SHARED with `/updown/history`, which must filter by exactly the day this
// digest tells the player about. Do not reimplement the offset here — see the
// header of `eat-day.ts` for what that nearly cost.
import { eatDayKey, eatDayStartMs, formatEatDay } from "@/lib/eat-day";

export { eatDayKey, eatDayStartMs };

/**
 * How long after EAT midnight the previous day is considered closed.
 *
 * ⚠️ Not cosmetic. Settlement stamps `settledAt` and commits a moment later, so a
 * round whose boundary is 23:59:59 can hold a `settledAt` inside the day it
 * belongs to while its transaction is still in flight. Digesting at 00:00:00
 * sharp could therefore read a day one row short and then never look again,
 * because the send is idempotent. Fifteen minutes is four orders of magnitude
 * more than the commit takes and costs the player nothing.
 */
const CLOSE_GRACE_MS = 15 * 60 * 1000;

/** The deep link for one player-day. This string IS the idempotency key — see
 *  property 2 in the header. Changing its shape re-sends every digest ever sent. */
export function digestHref(dayKey: string): string {
  return `/updown/history?day=${dayKey}`;
}

/** The day, in the reader's own language, from the dictionary's own month names —
 *  so the digest cannot drift from the date pickers the player already reads. */
function localDay(dayKey: string, locale: "en" | "sw" | "zh"): string {
  return formatEatDay(dayKey, dict[locale].common.monthsShort, locale);
}

const tzs = (n: number) => `TZS ${Math.round(n).toLocaleString("en-US")}`;

export type DigestLine = {
  userId: string;
  dayKey: string;
  totals: DailySettledTotals;
  /** `net > 0` won on the day, `< 0` lost on the day, `0` flat (typically all-refund). */
  net: number;
};

/**
 * The message, in all three languages, for one player-day.
 *
 * Exported so the guard can assert the COPY without sending anything — the thing
 * that matters about this message is what it says, and a test that can only check
 * that a row was written is not testing the compliance claim.
 *
 * ⚠️ LCCP: the loss is stated as its own clause with its own figure. A day that
 * lost money must read as a loss in the title, never as a net number the reader
 * has to work out the sign of, and never as "you got TZS X back".
 */
export function digestCopy(line: DigestLine) {
  const { totals: t, net, dayKey } = line;
  const dayEn = localDay(dayKey, "en");
  const daySw = localDay(dayKey, "sw");
  const dayZh = localDay(dayKey, "zh");

  // ── Titles. The headline is the player's own money, signed and named. ──
  const titleEn =
    net > 0 ? `Up & Down · you are up ${tzs(net)}`
    : net < 0 ? `Up & Down · you lost ${tzs(-net)}`
    : `Up & Down · ${tzs(t.refundedStake)} refunded`;
  const titleSw =
    net > 0 ? `Up & Down · umepata ${tzs(net)}`
    : net < 0 ? `Up & Down · umepoteza ${tzs(-net)}`
    : `Up & Down · ${tzs(t.refundedStake)} imerudishwa`;
  const titleZh =
    net > 0 ? `涨跌 · 盈利 ${tzs(net)}`
    : net < 0 ? `涨跌 · 亏损 ${tzs(-net)}`
    : `涨跌 · 已退回 ${tzs(t.refundedStake)}`;

  // ── Bodies. Every outcome that occurred gets its own count AND its own
  // figure; an outcome that did not occur is omitted rather than printed as a
  // zero, because a row of zeroes reads as noise and hides the one that matters.
  const partsEn: string[] = [];
  const partsSw: string[] = [];
  const partsZh: string[] = [];
  if (t.wins > 0) {
    partsEn.push(`won ${t.wins} (${tzs(t.wonPayout)} paid)`);
    partsSw.push(`umeshinda ${t.wins} (${tzs(t.wonPayout)} imelipwa)`);
    partsZh.push(`赢 ${t.wins} 轮（赔付 ${tzs(t.wonPayout)}）`);
  }
  if (t.losses > 0) {
    partsEn.push(`lost ${t.losses} (${tzs(t.lostStake)})`);
    partsSw.push(`umepoteza ${t.losses} (${tzs(t.lostStake)})`);
    partsZh.push(`输 ${t.losses} 轮（${tzs(t.lostStake)}）`);
  }
  if (t.refunds > 0) {
    partsEn.push(`refunded ${t.refunds} (${tzs(t.refundedStake)})`);
    partsSw.push(`zimerudishwa ${t.refunds} (${tzs(t.refundedStake)})`);
    partsZh.push(`退款 ${t.refunds} 轮（${tzs(t.refundedStake)}）`);
  }

  return {
    titleEn, titleSw, titleZh,
    bodyEn: `${dayEn}: ${t.rounds} rounds — ${partsEn.join(", ")}. Staked ${tzs(t.staked)}, returned ${tzs(t.returned)}.`,
    bodySw: `${daySw}: raundi ${t.rounds} — ${partsSw.join(", ")}. Umeweka ${tzs(t.staked)}, umerudishiwa ${tzs(t.returned)}.`,
    bodyZh: `${dayZh}：共 ${t.rounds} 轮 — ${partsZh.join("、")}。投注 ${tzs(t.staked)}，收回 ${tzs(t.returned)}。`,
    href: digestHref(dayKey),
    dayEn,
  };
}

export type DigestRunResult = {
  /** The EAT day digested, or null when the run was skipped. */
  dayKey: string | null;
  /** Why nothing was sent, when nothing was. */
  skipped?: "grace";
  /** Players who had a round settle that day. */
  candidates: number;
  /** Digests written this run. */
  sent: number;
  /** Players who already had this day's digest — the idempotency path. */
  alreadySent: number;
  lines: DigestLine[];
};

/**
 * Send the digest for the last CLOSED EAT day.
 *
 * Safe to call as often as you like: it is idempotent per (player, day), and on a
 * day nobody played it costs exactly one indexed aggregate. Called from the
 * lifecycle ticker (leader-elected) on a 15-minute cadence, which gives every day
 * a full 24 hours of delivery attempts — a container has to be down for an entire
 * day to miss one.
 *
 * @param nowMs   Injected so the guard can drive a specific instant. Defaults to now.
 * @param dryRun  Build the lines and return them, write nothing. Used by the guard
 *                and by `ops:updown-digest-preview` to see who WOULD be told what.
 * @param daysBack How many days before today to digest. 1 = yesterday, the only
 *                value the ticker ever passes. Higher values exist so an operator
 *                can deliberately replay a specific missed day; they are NOT a
 *                backfill of history, and running this at 30 would announce a
 *                month of old results to every player at once.
 */
export async function runUpDownDailyDigest(opts: {
  nowMs?: number; dryRun?: boolean; daysBack?: number;
} = {}): Promise<DigestRunResult> {
  const nowMs = opts.nowMs ?? Date.now();
  const daysBack = opts.daysBack ?? 1;
  const todayKey = eatDayKey(nowMs);

  // Property 3 in the header: don't read a day that may still be committing.
  if (nowMs - eatDayStartMs(todayKey) < CLOSE_GRACE_MS) {
    return { dayKey: null, skipped: "grace", candidates: 0, sent: 0, alreadySent: 0, lines: [] };
  }

  const dayKey = eatDayKey(eatDayStartMs(todayKey) - daysBack * 24 * 60 * 60 * 1000);
  const fromIso = new Date(eatDayStartMs(dayKey)).toISOString();
  const toIso = new Date(eatDayStartMs(dayKey) + 24 * 60 * 60 * 1000).toISOString();

  const totals = await positionStore.dailyTotalsByUser({ fromIso, toIso, productLine: "UPDOWN" });
  const lines: DigestLine[] = totals.map((t) => ({
    userId: t.userId, dayKey, totals: t, net: t.returned - t.staked,
  }));

  let sent = 0, alreadySent = 0;
  if (!opts.dryRun) {
    for (const line of lines) {
      const copy = digestCopy(line);
      // The idempotency probe. Unbounded in time on purpose — see property 2.
      if (await db.notification.existsWithHref(line.userId, copy.href)) { alreadySent++; continue; }

      // ⚠️ ORDER MATTERS. The notification is written FIRST because it carries the
      // idempotency marker: if the process dies between the two, the player has
      // their digest in the bell and has missed one email. The other order costs a
      // DUPLICATE digest on the next pass, which is the failure this whole file
      // exists to avoid.
      const row = await notifyUpDownDigest(line.userId, {
        dayKey,
        titleEn: copy.titleEn, titleSw: copy.titleSw, titleZh: copy.titleZh,
        bodyEn: copy.bodyEn, bodySw: copy.bodySw, bodyZh: copy.bodyZh,
      });
      if (!row) continue; // notify() swallows and logs; don't email against a failed write
      sent++;

      const t = line.totals;
      await sendEmailToUser(line.userId, (email) => ({
        to: email,
        // The subject is the same honest headline as the bell title. A player
        // scanning an inbox must be able to see a losing day without opening it.
        subject:
          line.net > 0 ? `Up & Down · ${copy.dayEn} · you are up ${tzs(line.net)}`
          : line.net < 0 ? `Up & Down · ${copy.dayEn} · you lost ${tzs(-line.net)}`
          : `Up & Down · ${copy.dayEn} · ${tzs(t.refundedStake)} refunded`,
        html: updownDigestHtml({
          dayLabel: copy.dayEn, rounds: t.rounds,
          wins: t.wins, losses: t.losses, refunds: t.refunds,
          wonPayout: t.wonPayout, lostStake: t.lostStake, refundedStake: t.refundedStake,
          staked: t.staked, returned: t.returned, net: line.net,
        }),
        tag: "updown-digest",
      })).catch(() => {});
    }

    // One audit row for the RUN, not one per player — a digest is a communication,
    // and 400 audit rows a day would bury the compliance events an officer reads.
    // (§6b session 12 recorded exactly that failure on the reconcile sweep.)
    if (sent > 0) {
      audit({
        category: "SYSTEM",
        action: "updown.digest_sent",
        actorId: null,
        targetType: null,
        targetId: null,
        payload: { dayKey, candidates: lines.length, sent, alreadySent },
      }).catch(() => {});
    }
  }

  return { dayKey, candidates: lines.length, sent, alreadySent, lines };
}
