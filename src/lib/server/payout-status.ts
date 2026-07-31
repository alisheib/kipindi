/**
 * Payout availability — what we are allowed to TELL A PLAYER about taking money out.
 *
 * 🔴 WHY THIS EXISTS. Since 2026-07-29, withdrawals on 50pick cannot be paid: Selcom's
 * `WALLET_CASHIN` rail rides an upstream (TIPS) that answers `999 "No reponse from upstream
 * system"`, and the two Selcom-internal rails that would bypass it are not enabled for this
 * vendor (`4035`). Two real payouts have been frozen since that date.
 *
 * The platform kept accepting deposits and kept offering a withdraw form that looked completely
 * normal. A player could fill it in, submit, and receive a generic failure. **An operator that
 * takes money in while it cannot pay money out has to say so, plainly, before the player tries.**
 * That is not a nicety on a licensed gambling platform — it is the single worst asymmetry we can
 * ship, and it is a licence question, not just an ops one.
 *
 * ── THE DESIGN RULE THAT MATTERS ─────────────────────────────────────────────────────────────
 *
 * The effective status is the WORST of two independent sources:
 *
 *   declared — what an officer has set, audited, with a note and a timestamp
 *   derived  — what the withdrawal queue actually looks like right now
 *
 * **Neither source can improve on the other. An officer cannot declare "operational" while
 * payouts are visibly stuck.** This is deliberate and it is the whole point. `/admin/compliance`
 * once rendered a hardcoded green tick claiming "auto-snapshot on every mutation · HMAC-signed ·
 * disk-backed" for backups that did not exist, and it sat beside a real card so it borrowed real
 * credibility. A payout banner an officer can force green is the same defect pointed at players
 * instead of auditors. So the flag may only ever make the picture WORSE.
 *
 * Guarded by `npm run test:cert-f1`.
 */
import { db } from "./store";
import { defineConfig } from "./define-config";
import { STUCK_PROCESSING_MS } from "./txn-filters";

/** Ordered best → worst. Comparison relies on this order; do not reorder. */
export const PAYOUT_STATUSES = ["operational", "delayed", "unavailable"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

const rank = (s: PayoutStatus): number => PAYOUT_STATUSES.indexOf(s);
/** The worse (higher-ranked) of two statuses. */
export const worstOf = (a: PayoutStatus, b: PayoutStatus): PayoutStatus => (rank(a) >= rank(b) ? a : b);

/**
 * Thresholds for the DERIVED signal.
 *
 * "Stuck" reuses `STUCK_PROCESSING_MS` from `txn-filters` — the repo already decided that a
 * money movement in flight longer than 30 minutes "has outlived any sane gateway round-trip",
 * and it is the reconcile sweep's own cutoff. A second, different definition of stuck living in
 * this file would drift from that one, and the one that drifts is the one nobody drives.
 */
export const DELAYED_AFTER_MS = STUCK_PROCESSING_MS;
export const UNAVAILABLE_AFTER_HOURS = 6;
/** This many simultaneously-stuck payouts is a systemic failure, not bad luck. */
export const UNAVAILABLE_STUCK_COUNT = 3;

const config = defineConfig<{
  /** Officer-declared floor. `operational` means "I am not declaring a problem" — NOT
   *  "everything is fine"; the derived signal can still escalate past it. */
  declared: PayoutStatus;
  /** Shown to players verbatim when set. Keep it factual and locale-neutral, or leave null
   *  and the localised default is used. */
  note: string | null;
  /** ISO timestamp of the last officer change, for "since" on the player notice. */
  declaredAt: string | null;
}>({
  key: "payouts.availability",
  defaults: { declared: "operational", note: null, declaredAt: null },
  audit: { action: "payouts.availability.set", targetType: "PAYMENT" },
});

export type PayoutStatusView = {
  /** worstOf(declared, derived) — what the player is told. */
  status: PayoutStatus;
  declared: PayoutStatus;
  derived: PayoutStatus;
  /** Officer note, if any. */
  note: string | null;
  declaredAt: string | null;
  /** Withdrawals sitting in PENDING/PROCESSING past DELAYED_AFTER_MINUTES. */
  stuckCount: number;
  /** Age of the oldest such withdrawal, in hours. null when none. */
  oldestStuckHours: number | null;
  /** True when the derived signal is worse than what the officer declared — i.e. reality has
   *  overruled the console. Surfaced in admin so nobody thinks the flag is being ignored. */
  derivedOverrodeDeclared: boolean;
};

/**
 * Read the withdrawal queue and decide what it proves.
 *
 * ⚠️ Uses `txn.search`, NOT `txn.listAll`. `listAll` does a `findMany` with no filter or limit
 * and is already called from 12+ sites — `txn.search`'s own comment says this table "must never
 * be walked in memory", and it bites at ~1k users. This runs on a player-facing page load, so it
 * pushes the filter into SQL and takes the count from `total` rather than an array length.
 *
 * Deliberately tolerant: if the query fails we return `operational` for the DERIVED half only.
 * A database problem must not manufacture a payout outage — and it cannot suppress a declared
 * one either, because the caller takes the worst of the two.
 */
export async function derivePayoutStatus(now = Date.now()): Promise<{
  derived: PayoutStatus;
  stuckCount: number;
  oldestStuckHours: number | null;
}> {
  let stuckCount = 0;
  let oldestMs = 0;
  try {
    const res = await db.txn.search({
      types: ["WITHDRAWAL"],
      statuses: ["PENDING", "PROCESSING"],
      // createdAt < cutoff — i.e. in flight for longer than the stuck threshold.
      toMs: now - DELAYED_AFTER_MS,
      sort: { field: "createdAt", dir: "asc" },
      take: 1, // `total` carries the count; we only need the OLDEST row itself
    });
    stuckCount = res.total;
    const oldest = res.rows[0];
    if (oldest) oldestMs = now - Date.parse(String(oldest.createdAt));
  } catch {
    return { derived: "operational", stuckCount: 0, oldestStuckHours: null };
  }

  const oldestStuckHours = stuckCount > 0 && oldestMs > 0 ? oldestMs / 3_600_000 : null;
  let derived: PayoutStatus = "operational";
  if (stuckCount > 0) derived = "delayed";
  if (stuckCount >= UNAVAILABLE_STUCK_COUNT || (oldestStuckHours ?? 0) >= UNAVAILABLE_AFTER_HOURS) {
    derived = "unavailable";
  }
  return { derived, stuckCount, oldestStuckHours };
}

export async function getPayoutStatus(now = Date.now()): Promise<PayoutStatusView> {
  const c = config.get();
  const { derived, stuckCount, oldestStuckHours } = await derivePayoutStatus(now);
  return {
    status: worstOf(c.declared, derived),
    declared: c.declared,
    derived,
    note: c.note,
    declaredAt: c.declaredAt,
    stuckCount,
    oldestStuckHours,
    derivedOverrodeDeclared: rank(derived) > rank(c.declared),
  };
}

/** Officer action. Recorded and audited by `defineConfig`. */
export function setPayoutStatus(
  updates: { declared?: PayoutStatus; note?: string | null },
  officerId: string,
): { ok: true } | { ok: false; error: string } {
  if (updates.declared !== undefined && !PAYOUT_STATUSES.includes(updates.declared)) {
    return { ok: false, error: `Unknown payout status "${updates.declared}".` };
  }
  const note = updates.note === undefined ? undefined : (updates.note?.trim() || null);
  const r = config.set(
    { ...updates, ...(note === undefined ? {} : { note }), declaredAt: new Date().toISOString() },
    officerId,
  );
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

/**
 * The one question the withdraw form asks. Separated from the banner so a `delayed` status
 * still lets a player submit — their money is not at risk, the payout is merely slow, and
 * refusing it would be its own lie about what we can do.
 */
export const payoutsAcceptingRequests = (s: PayoutStatus): boolean => s !== "unavailable";

/**
 * ⏳ TEMPORARY TEST BYPASS — added 2026-07-31 on Ali's explicit instruction. REMOVE WHEN DONE.
 *
 * WHY IT EXISTS. The gate above is currently self-locking. Two payouts have been frozen at
 * `999` since 2026-07-29, so `derivePayoutStatus` reports `unavailable`, so no player may
 * request a withdrawal — including the one controlled test that would tell us whether Selcom's
 * rail is working again. We cannot test a payout because a payout is stuck. Only Selcom can
 * close the stuck two, and they have not.
 *
 * WHAT IT DOES NOT DO — this is the whole design, and it must stay this way:
 *   · It does NOT change `getPayoutStatus`, `derivePayoutStatus` or `worstOf`. The declared /
 *     derived asymmetry is untouched, and `test:cert-f1` still guards it.
 *   · It does NOT change what any player is TOLD. The "withdrawals cannot be paid" banner still
 *     renders for the tester too — they see the truth and choose to proceed anyway.
 *   · It is OFF unless `PAYOUT_TEST_BYPASS_MSISDN` names specific numbers. Empty or unset — the
 *     shipped default — means nobody bypasses anything.
 *
 * SEALING IT. Clear the Railway variable and the bypass is gone in seconds with no deploy. That
 * is deliberate: an outage control must be closable faster than a build takes. Deleting this
 * function afterwards is the tidy-up, not the kill switch.
 */
export function isPayoutTestBypass(phoneE164: string | null | undefined): boolean {
  const raw = process.env.PAYOUT_TEST_BYPASS_MSISDN ?? "";
  if (!raw.trim() || !phoneE164) return false;
  // Compare on digits alone — "+255757619808", "255757619808" and "0757 619 808" are one number
  // to a human, and a bypass that misses on punctuation is a bypass nobody can switch on.
  const digits = (s: string) => s.replace(/\D/g, "").replace(/^0/, "255");
  const me = digits(phoneE164);
  return raw.split(",").map((s) => digits(s.trim())).filter(Boolean).includes(me);
}
