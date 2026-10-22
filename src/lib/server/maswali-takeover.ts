/**
 * MASWALI MILLIONEA — THE WINNER-TAKEOVER WATCH (MB-96; FAILURE-INVENTORY §9 TK.2; MASWALI-BUILD S7-F9).
 *
 * After a Millionea share is credited, the winning account may change hands before its money leaves. This read raises an
 * account that may have been taken over since its payout, for Compliance to review — on the console's alert strip as a
 * count per paying week (never a name: the trading console carries no holder, MR-14, MB-34), and by account on the
 * integrity page, where Compliance can hold the share (OD-07).
 *
 * ⛔ AN ALERT, NEVER A HOLD (the ruling of 2026-10-10; any hold needs its own ruling): nothing here writes, blocks or
 *    delays anything, and no money path is touched.
 * ⛔ THE REPOSITORY IS PUBLIC: this file says what the watch is FOR, never what makes an account look taken over; its
 *    windows are constants, and no string a page prints describes the pattern (the lead's ruling, 2026-10-22).
 * ⛔ A read that fails, or stops short of what it asked for, answers `readable: false` — the console says the watch could
 *    not be read — never an all clear.
 */
import { ticketStore, weekStore } from "./maswali-dal";
import { getAuditForActorDurable, getAuditForTargetsDurable } from "./audit";
import { db } from "./store";

const DAY = 86_400_000;
/** How long after a credit an account is watched. */
const WATCH_MS = 14 * DAY;
/** How long a finding stands on the console's alert strip after it was last seen (the integrity page keeps it). */
export const TAKEOVER_ALERT_MS = 3 * DAY;
/** The account ids a batched read asks about at a time. */
const BATCH = 1_000;
/** Rows a batched read takes before it reports that it stopped short. */
const READ_LIMIT = 500;

/** The account's own rows that open the pattern. */
const OPENING = ["password.changed", "password_reset.completed", "player.password_reset_by_officer"] as const;
/** …and the account's own rows that complete it — read by actor, so only the account's own acts count. */
const CLOSING = ["withdraw.initiated", "withdraw.destination_refused", "withdraw.kyc_blocked", "withdraw.email_unverified_blocked"] as const;

export type TakeoverFinding = {
  userId: string;
  /** The account as Compliance reads it (its display name, else the last four digits of its number). */
  holder: string;
  /** The paying week whose credit came first. */
  weekId: string;
  code: string;
  creditAt: string;
  /** When the pattern began, and when the account was last seen in it (and how many times, `more`: at least that many). */
  startedAt: string;
  flaggedAt: string;
  count: number;
  more: boolean;
};
export type TakeoverWatch = { readable: boolean; findings: TakeoverFinding[] };

const holderOf = async (userId: string) => {
  // ⚠️ The memory store answers synchronously: never `.catch` the call itself, catch the awaited read.
  let u: Awaited<ReturnType<typeof db.user.findById>> | null = null;
  try { u = await db.user.findById(userId); } catch { u = null; }
  return u ? (u.displayName?.trim() || `…${u.phoneE164.slice(-4)}`) : "(closed account)";
};

/**
 * ⭐ THE WATCH. Every winner credited by a paying week settled within the watch whose account then shows the pattern —
 * opened at or after one of its own credits, then completed — each once, by its newest credit before the pattern began.
 * Reads: the settled weeks, their winning tickets, the winners' opening rows in batches, and the closing rows of only
 * the accounts whose pattern opened.
 */
export async function takeoverWatch(now: Date = new Date()): Promise<TakeoverWatch> {
  const nowMs = now.getTime();
  try {
    const credits = new Map<string, Array<{ weekId: string; code: string; at: number }>>();
    for (const w of await weekStore.list({ states: ["SETTLED"] })) {
      const at = Date.parse(w.settledAt ?? "");
      if (!Number.isFinite(at) || at > nowMs || nowMs - at > WATCH_MS || !((w.paidTotal ?? 0) > 0)) continue;
      for (const t of await ticketStore.listForWeek(w.id, { won: true })) {
        if (!((t.payout ?? 0) > 0)) continue;
        const list = credits.get(t.userId) ?? [];
        if (!list.some((c) => c.weekId === w.id)) list.push({ weekId: w.id, code: w.code, at });
        credits.set(t.userId, list);
      }
    }
    if (credits.size === 0) return { readable: true, findings: [] };
    const users = [...credits.keys()];
    // The whole watch's rows, so the ONE rule below — a pattern counts only from one of its account's own credits —
    // decides, never the read's window.
    const since = new Date(nowMs - WATCH_MS).toISOString();
    let readable = true;
    const opened = new Map<string, number[]>();
    for (let i = 0; i < users.length; i += BATCH) {
      const r = await getAuditForTargetsDurable({ targetType: "User", targetIds: users.slice(i, i + BATCH), actions: OPENING, sinceIso: since, limit: READ_LIMIT });
      if (r.truncated) readable = false;
      for (const e of r.entries) {
        if (!e.targetId) continue;
        opened.set(e.targetId, [...(opened.get(e.targetId) ?? []), Date.parse(e.createdAt)]);
      }
    }
    const findings: TakeoverFinding[] = [];
    for (const [userId, starts] of opened) {
      const mine = credits.get(userId) ?? [];
      // The earliest opening at or after one of this account's credits, with the newest credit before it.
      let first: { at: number; credit: (typeof mine)[number] } | null = null;
      for (const at of starts) {
        const credit = mine.filter((c) => c.at <= at).sort((a, b) => b.at - a.at)[0];
        if (credit && (first === null || at < first.at)) first = { at, credit };
      }
      if (first === null) continue;
      const startAt = first.at;
      // Newest first: a read cut short still holds the newest rows, so a finding stands; only its count is then a lower
      // bound — unless the oldest row read already precedes the opening, when nothing after it was missed.
      const later = await getAuditForActorDurable(userId, { actions: CLOSING, limit: 50 });
      const after = later.entries.filter((e) => Date.parse(e.createdAt) >= startAt);
      if (after.length === 0) continue;
      findings.push({
        userId, holder: await holderOf(userId), weekId: first.credit.weekId, code: first.credit.code,
        creditAt: new Date(first.credit.at).toISOString(), startedAt: new Date(startAt).toISOString(),
        flaggedAt: after[0].createdAt, count: after.length, more: later.truncated && after.length === later.entries.length,
      });
    }
    findings.sort((a, b) => Date.parse(b.flaggedAt) - Date.parse(a.flaggedAt));
    return { readable, findings };
  } catch (err) {
    console.error("[maswali-takeover] the watch could not be read:", (err as Error)?.message ?? err);
    return { readable: false, findings: [] };
  }
}
