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
import { audit } from "./audit";
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

/**
 * ⭐ THE PLATFORM SAYS WHEN IT HAS CLOSED ITS OWN WITHDRAWALS (2026-09-24).
 *
 * 🔴 WHY THIS EXISTS, MEASURED. On 2026-09-22 a single withdrawal — TZS 30,000 on the MIXX rail —
 * came back from Selcom as `resultcode=999 · AMBIGUOUS · "No reponse from upstream system"`. The
 * reconciler correctly refused to guess and left it PROCESSING. Six hours later the DERIVED status
 * escalated to `unavailable` and the withdraw form dimmed **for every player on the platform**.
 * It stayed that way for **33 hours**, and the only reason anyone found out is that the owner
 * happened to look. Nothing paged, nothing emailed, nothing alerted: the sweep that runs every five
 * minutes already knew, and only `console.log`ged it.
 *
 * ⛔ THIS DOES NOT WEAKEN THE GATE, AND THAT IS DELIBERATE. It changes nothing about when payouts
 * close — a stuck payout is unresolved money and it SHOULD stop the platform promising more. What
 * was broken was the silence, so silence is what is fixed. Two things were considered and rejected:
 *   · **A lower time bound on the stuck window.** It would not have helped here at all — the row
 *     was 33 hours old, inside any sane window — so it would be loosening a money gate for a
 *     failure nobody has seen, which is how a guard stops being able to fail.
 *   · **Excluding house-bot or test accounts.** Owner ruling D20 says house bots are normal
 *     players, and their withdrawals are real money leaving. A carve-out by account type is a
 *     guard exempting exactly what it polices.
 *
 * ⚠️ "ONCE" IS PER PROCESS, like `auditNeedsReviewOnce` beside it: a redeploy or a second
 * container speaks again. For an outage nobody is watching, repeating is the safe direction.
 */
const OUTAGE_SEEN = new Set<string>();

export async function escalatePayoutOutage(now = Date.now()): Promise<{ raised: boolean; key: string | null }> {
  const view = await getPayoutStatus(now);
  /* Only the DERIVED half. An officer who declared an outage themselves knows about it. */
  if (!view.derivedOverrodeDeclared || view.derived !== "unavailable") return { raised: false, key: null };
  /* ⛔ KEYED ON THE SHAPE OF THE OUTAGE, NOT THE CLOCK: while it is the same N payouts this stays
     one row, and the moment another joins them it speaks again — which is the transition an
     officer most needs to hear about. */
  const key = `payouts-unavailable::${view.stuckCount}`;
  if (OUTAGE_SEEN.has(key)) return { raised: false, key };
  if (OUTAGE_SEEN.size >= 50) OUTAGE_SEEN.clear();
  OUTAGE_SEEN.add(key);
  audit({
    category: "WALLET",
    action: "payouts.unavailable_derived",
    actorId: null,
    targetType: "PAYMENT",
    targetId: "payouts",
    payload: {
      reason: "the queue closed withdrawals for every player; no officer declared this",
      stuckCount: view.stuckCount,
      oldestStuckHours: view.oldestStuckHours,
      declared: view.declared,
      derived: view.derived,
      wayOut: "/admin/payments — Payout status, then the frozen payouts below it",
    },
  });
  return { raised: true, key };
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
