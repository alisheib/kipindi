/**
 * MASWALI MILLIONEA — THE WINNER-TAKEOVER WATCH (MB-96; FAILURE-INVENTORY §9 TK.2; MASWALI-BUILD S7-F9).
 *
 * After a Millionea share is credited, the account's password changing and then a withdrawal being asked for is the shape
 * of a takeover: whoever holds the password now is moving the winnings out. This read finds that shape in the account's
 * own durable records and raises it for Compliance — on the console's alert strip as a count per week (never a name: the
 * trading console carries no holder, MR-14, MB-34), and by account on the integrity page, where Compliance can hold the
 * share (OD-07).
 *
 * ⛔ AN ALERT, NEVER A HOLD. 2026-10-10 removed withdrawal holds, and any hold needs its own ruling: nothing here writes,
 *    blocks or delays anything, and the withdrawal path is untouched.
 * ⛔ PASSWORD WRITES ONLY (the lead's ruling, 2026-10-22) — the player's own change, a reset by link, a reset by support —
 *    until the platform has a device identity. A number change has no flow at all: a payout goes only to the account's
 *    own number (E-215).
 * ⛔ The repository is public: this file says what the watch is FOR; its windows are constants, not documentation.
 * ⛔ A read that fails, or stops short of what it asked for, answers `readable: false` — the console says the watch could
 *    not be read — never an all clear.
 */
import { ticketStore, weekStore } from "./maswali-dal";
import { getAuditForActorDurable, getAuditForTargetsDurable } from "./audit";
import { db } from "./store";

const DAY = 86_400_000;
/** How long after a credit the account is watched. */
const WATCH_MS = 14 * DAY;
/** How long a finding stands on the console's alert strip after its latest attempt (the integrity page keeps it). */
export const TAKEOVER_ALERT_MS = 3 * DAY;
/** The account ids a batched read asks about at a time. */
const BATCH = 1_000;
/** Rows a batched read takes before it reports that it stopped short. */
const READ_LIMIT = 500;

/** Each way the account's password can be written, and what the page calls it. */
const PASSWORD_WRITES = { "password.changed": "changed by the player", "password_reset.completed": "reset by link", "player.password_reset_by_officer": "reset by support" } as const;
type PasswordWrite = keyof typeof PASSWORD_WRITES;
/**
 * A withdrawal asked for by the account itself: sent (`withdraw.initiated`), or refused at one of its gates before any
 * money moved. Read by ACTOR, so an officer's return of refused funds — another actor — is never counted.
 */
const WITHDRAW_ATTEMPTS = ["withdraw.initiated", "withdraw.destination_refused", "withdraw.kyc_blocked", "withdraw.email_unverified_blocked"] as const;

export type TakeoverFinding = {
  userId: string;
  /** The account as Compliance reads it (its display name, else the last four digits of its number). */
  holder: string;
  /** The paying week whose credit came before the password write. */
  weekId: string;
  code: string;
  creditAt: string;
  passwordAt: string;
  passwordHow: (typeof PASSWORD_WRITES)[PasswordWrite];
  /** The newest withdrawal asked for after the password write, and how many there were (`more`: at least that many). */
  attemptAt: string;
  attempts: number;
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
 * ⭐ THE WATCH. Every winner credited by a paying week settled within the watch, whose password was written at or after
 * that credit, and who then asked for a withdrawal at or after that write — each once, by its newest credit before the
 * write. Reads: the settled weeks, their winning tickets, the winners' password writes in batches, and the withdrawal
 * attempts of only the accounts whose password changed.
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
    // The whole watch's writes, so the ONE rule below — a write counts only at or after one of its account's own credits —
    // decides, never the read's window.
    const since = new Date(nowMs - WATCH_MS).toISOString();
    let readable = true;
    const writes = new Map<string, Array<{ at: number; how: PasswordWrite }>>();
    for (let i = 0; i < users.length; i += BATCH) {
      const r = await getAuditForTargetsDurable({ targetType: "User", targetIds: users.slice(i, i + BATCH),
        actions: Object.keys(PASSWORD_WRITES), sinceIso: since, limit: READ_LIMIT });
      if (r.truncated) readable = false;
      for (const e of r.entries) {
        if (!e.targetId) continue;
        const list = writes.get(e.targetId) ?? [];
        list.push({ at: Date.parse(e.createdAt), how: e.action as PasswordWrite });
        writes.set(e.targetId, list);
      }
    }
    const findings: TakeoverFinding[] = [];
    for (const [userId, written] of writes) {
      const mine = credits.get(userId) ?? [];
      // The earliest password write at or after one of this account's credits, with the newest credit before it.
      let first: { at: number; how: PasswordWrite; credit: (typeof mine)[number] } | null = null;
      for (const x of written) {
        const credit = mine.filter((c) => c.at <= x.at).sort((a, b) => b.at - a.at)[0];
        if (credit && (first === null || x.at < first.at)) first = { ...x, credit };
      }
      if (first === null) continue;
      const writeAt = first.at;
      // Newest first: a read cut short still holds the newest attempts, so a finding stands; only its count is then a
      // lower bound — unless the oldest attempt read already precedes the write, when nothing after it was missed.
      const asked = await getAuditForActorDurable(userId, { actions: WITHDRAW_ATTEMPTS, limit: 50 });
      const after = asked.entries.filter((e) => Date.parse(e.createdAt) >= writeAt);
      if (after.length === 0) continue;
      findings.push({
        userId, holder: await holderOf(userId), weekId: first.credit.weekId, code: first.credit.code,
        creditAt: new Date(first.credit.at).toISOString(), passwordAt: new Date(writeAt).toISOString(),
        passwordHow: PASSWORD_WRITES[first.how], attemptAt: after[0].createdAt, attempts: after.length,
        more: asked.truncated && after.length === asked.entries.length,
      });
    }
    findings.sort((a, b) => Date.parse(b.attemptAt) - Date.parse(a.attemptAt));
    return { readable, findings };
  } catch (err) {
    console.error("[maswali-takeover] the watch could not be read:", (err as Error)?.message ?? err);
    return { readable: false, findings: [] };
  }
}
