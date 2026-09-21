/**
 * THE COMPLIANCE-ROW RECONCILER — the hole in the audit chain that the chain cannot see.
 *
 * ⛔ WHY THIS FILE EXISTS, measured not assumed (`npm run rehearse:audit-loss-window`, 2026-09-21):
 *
 *   · `market-service.ts:1699` writes the bet's statutory row with a BARE, un-awaited `audit({…})`,
 *     deliberately — a live bet must not wait on an audit write. 467 of the 489 `audit(` call sites
 *     in `src/` are un-awaited, and `auditFlush()` is called from production code ZERO times.
 *   · The append is queued on one process-wide promise chain. A process that ENDS takes whatever is
 *     queued with it: driven, a SIGTERM lost 10 of 10, a sequential producer lost exactly 1, and
 *     Next's own handler calls `process.exit(143)` about 30 ms in — so no grace period drains it.
 *   · The chain CANNOT SEE the loss. A lost append consumes no `seq` and leaves no dangling
 *     `prevHash`: `verifyChainFull()` returned `{valid:true, verified:663, linkBroken:false}` over a
 *     chain with 40 known-lost appends. The integrity mechanism is blind to this by construction.
 *   · `auditLog` has only `create` in all of `src/` — no update, no delete, anywhere. A row that was
 *     never written can NEVER be added later. The hole is permanent.
 *
 * ⭐ SO THIS IS A DETECTOR, AND IT SAYS SO. It cannot restore a lost row: a late insert would chain
 * at the CURRENT head, which would date the bet to the sweep and make the log lie. What it produces
 * is a REGISTER of known-missing rows — one chained, tamper-evident `audit.row_missing` declaration
 * naming the bet, the player, the market, the stake and the bot. A permanent invisible hole becomes
 * a permanent DECLARED hole. That is the whole of the remedy this layer can honestly offer, and it
 * is the only option that makes an already-accumulated hole visible.
 *
 * ⭐ WHY THE ANCHOR HOLDS. `Position` is written inside the bet's own money transaction, under the
 * wallet lock, and `market-service.ts` only reaches the audit call AFTER that transaction committed.
 * So a committed `Position` with no `market.position.opened` row is exactly the defect, never a
 * rolled-back bet. For a house stake the linkage is tighter still: `HouseBotIntent.positionId` is
 * `@unique`, and `market-service.ts:1709` is the ONLY place `intentId` ever reaches an audit payload
 * — so when that row is lost, the intent↔bet compliance linkage dies with it, and the declaration
 * below is the only thing that can name it again.
 *
 * ⛔ D20 · A HOUSE BET IS AN ORDINARY PLAYER BET IN EVERY REPORT. A lost row for a house stake is a
 * missing PLAYER row, and it is declared with exactly the same action and shape as any other. The
 * `houseBotId` field is carried because the row it replaces carried it, and for no other reason.
 *
 * ⛔ THE GRACE IS NOT OPTIONAL. Declaring a gap that is merely still in flight would write a false
 * compliance statement into an append-only log — the same permanence working against us. Nothing
 * inside `graceMs` is ever looked at. The measured floor is ~4 ms per append and ~200 ms to drain a
 * 50-append burst on loopback; the default grace is 10 minutes, three orders of magnitude clear.
 *
 * ⛔ AND THE DECLARATION IS AWAITED — the one `audit()` in this file that must be. Everything here
 * runs on the lifecycle leader, off every money path and every request, so it costs nothing a player
 * waits for; a fire-and-forget declaration could be lost to the very defect it is declaring.
 *
 * SCOPE, stated so it is not mistaken for more than it is: this reconciles the BET row against the
 * `Position` anchor. The other reconstructable events the sweep measured — `withdraw.confirmed`,
 * `deposit.confirmed`, `market.settled`, `bet.payout` — each have a durable anchor of their own and
 * can be added here as further anchors. They are NOT covered yet, and nothing in this file pretends
 * they are. ⛔ The irrecoverable class (`player.record_viewed`, `kyc_doc.viewed`,
 * `transactions.exported`, `privacy.dsar.exported`) has NO anchor at all: nothing else records that
 * the viewing happened, so no reconciler can ever detect its loss. That class needs a different
 * remedy and is out of scope here.
 */
import { audit } from "./audit";
import { hasDatabase, prisma } from "./prisma";

/** The action the bet's statutory row is written under (`market-service.ts:1699`). */
export const BET_AUDIT_ACTION = "market.position.opened";

/** The declaration this reconciler appends for a bet whose statutory row was never written.
 *  ⭐ It carries `targetType: "Position"` / `targetId: <positionId>` for two reasons: it names the
 *  bet a regulator would be looking for, and it makes the sweep SELF-DEDUPLICATING through the same
 *  `@@index([targetType, targetId])` the detection query already uses — a declared gap is no longer
 *  a gap, so the sweep never declares the same bet twice and needs no cursor to remember it. */
export const GAP_DECLARED_ACTION = "audit.row_missing";

/** Nothing younger than this is ever examined. See the header. */
export const RECONCILE_GRACE_MS = 10 * 60 * 1000;
/** How far back a periodic sweep looks. Older holes are reachable with `scripts/audit-gap-sweep.mts`. */
export const RECONCILE_LOOKBACK_MS = 24 * 60 * 60 * 1000;
/** Most declarations one sweep will append. A pass that hits this says so; the rest are found by the
 *  next one, because an undeclared gap stays a gap. The cap exists so a pathological hour cannot
 *  flood the chain — the append is DB-global and serialised, and the bet path shares that queue. */
export const RECONCILE_DECLARE_CAP = 50;

export type BetAuditGap = {
  positionId: string;
  userId: string;
  marketId: string;
  /** The bot that placed it, or null for a player. D20: the declaration is identical either way. */
  houseBotId: string | null;
  stake: string;
  placedAt: string;
};

export type BetAuditScan = {
  /** ⭐ THE POPULATION. A sweep over zero positions passes vacuously; the caller prints this. */
  scanned: number;
  gaps: BetAuditGap[];
  /** True when `gaps` was truncated at `cap` — more holes exist in this window than were listed. */
  capped: boolean;
  windowFrom: string;
  windowUntil: string;
};

/**
 * Find committed bets in `[now - lookbackMs, now - graceMs)` that have no statutory audit row and
 * no standing declaration. Read-only: this writes nothing.
 *
 * ⛔ BOTH ACTIONS ARE IN THE ANTI-JOIN. `market.position.opened` is the row that should exist;
 * `audit.row_missing` is the declaration that it does not. A query that checked only the first would
 * re-declare every known hole on every sweep, which would bury the chain in duplicates of the same
 * finding and make the register useless as a count.
 */
export async function findBetAuditGaps(opts: {
  nowMs?: number;
  lookbackMs?: number;
  graceMs?: number;
  cap?: number;
} = {}): Promise<BetAuditScan> {
  const db = prisma();
  const nowMs = opts.nowMs ?? Date.now();
  const graceMs = opts.graceMs ?? RECONCILE_GRACE_MS;
  const lookbackMs = opts.lookbackMs ?? RECONCILE_LOOKBACK_MS;
  const cap = opts.cap ?? RECONCILE_DECLARE_CAP;
  const from = new Date(nowMs - lookbackMs);
  const until = new Date(nowMs - graceMs);
  const empty: BetAuditScan = {
    scanned: 0, gaps: [], capped: false,
    windowFrom: from.toISOString(), windowUntil: until.toISOString(),
  };
  // No database means the in-memory ring is the whole store and there is no durable Position to
  // reconcile against (audit.ts header). Nothing to say, and nothing to declare.
  if (!db || !hasDatabase()) return empty;
  if (until <= from) return empty;

  // ⛔ THE WINDOW IS ANCHORED TO UTC EXPLICITLY, AND THAT IS NOT DECORATION — it was a real defect,
  // found by driving this on a scratch cluster whose session timezone is Asia/Beirut (2026-09-21).
  // `Position.placedAt` is `TIMESTAMP(3)` WITHOUT time zone and `market-service.ts:1369` writes it
  // as `new Date().toISOString()`, i.e. UTC. Comparing that naive column against a bound Date makes
  // Postgres resolve the parameter in the SESSION's timezone, so on a +03:00 session the window ran
  // three hours past `now` and the ten-minute grace became NEGATIVE: a bet placed a second ago, with
  // its append still legitimately in flight, was reported as a missing compliance row. Binding the
  // instant as an ISO string and converting it `AT TIME ZONE 'UTC'` gives the same naive UTC value
  // Prisma stores, on every session timezone. Production's Postgres is UTC today — which is exactly
  // why this would never have been noticed until the day it wasn't.
  const fromUtc = from.toISOString();
  const untilUtc = until.toISOString();

  const counted = await db.$queryRaw<Array<{ n: number }>>`
    SELECT count(*)::int AS n FROM "Position"
     WHERE "placedAt" >= ${fromUtc}::timestamptz AT TIME ZONE 'UTC'
       AND "placedAt" <  ${untilUtc}::timestamptz AT TIME ZONE 'UTC'`;
  const scanned = Number(counted[0]?.n ?? 0);

  // LIMIT cap+1 so the caller can tell "exactly cap" from "more than cap" without a second count.
  const rows = await db.$queryRaw<Array<{
    id: string; userId: string; marketId: string; houseBotId: string | null; stake: string; placedAt: Date;
  }>>`
    SELECT p."id", p."userId", p."marketId", p."houseBotId", p."stake"::text AS "stake", p."placedAt"
      FROM "Position" p
     WHERE p."placedAt" >= ${fromUtc}::timestamptz AT TIME ZONE 'UTC'
       AND p."placedAt" <  ${untilUtc}::timestamptz AT TIME ZONE 'UTC'
       AND NOT EXISTS (
         SELECT 1 FROM "AuditLog" a
          WHERE a."targetType" = 'Position'
            AND a."targetId" = p."id"
            AND a."action" IN (${BET_AUDIT_ACTION}, ${GAP_DECLARED_ACTION})
       )
     ORDER BY p."placedAt" ASC, p."id" ASC
     LIMIT ${cap + 1}::int`;

  const capped = rows.length > cap;
  return {
    scanned,
    capped,
    gaps: rows.slice(0, cap).map((r) => ({
      positionId: r.id,
      userId: r.userId,
      marketId: r.marketId,
      houseBotId: r.houseBotId,
      stake: r.stake,
      placedAt: new Date(r.placedAt).toISOString(),
    })),
    windowFrom: empty.windowFrom,
    windowUntil: empty.windowUntil,
  };
}

export type BetAuditDeclaration = BetAuditScan & { declared: number };

/**
 * Find the gaps and DECLARE each one — one chained `audit.row_missing` row per bet whose statutory
 * row was never written.
 *
 * ⛔ WHAT THE DECLARATION IS AND IS NOT. It is a record that the row is missing, written now, dated
 * now. It is NOT the missing row and must never be read as one: it says what the bet was, not what
 * the bet's own audit entry said. Everything it can state it takes from the durable `Position` row.
 *
 * ⛔ IT NEVER BACK-DATES. `createdAt` is the sweep's time, as it is for every other append. The bet's
 * own `placedAt` travels in the payload where it cannot be mistaken for the entry's time.
 */
export async function declareBetAuditGaps(opts: {
  nowMs?: number;
  lookbackMs?: number;
  graceMs?: number;
  cap?: number;
} = {}): Promise<BetAuditDeclaration> {
  const scan = await findBetAuditGaps(opts);
  let declared = 0;
  for (const g of scan.gaps) {
    // ⛔ AWAITED, ONE AT A TIME. See the header: a declaration lost to the queue would be the defect
    // declaring itself away. Sequential because the appends serialise on a DB-global advisory lock
    // anyway — firing them together would only deepen the queue the bet path shares.
    await audit({
      category: "COMPLIANCE",
      action: GAP_DECLARED_ACTION,
      actorId: null,
      targetType: "Position",
      targetId: g.positionId,
      payload: {
        missingAction: BET_AUDIT_ACTION,
        reason: "The audit append for this bet was queued and never written — the process ended first.",
        note: "This is a RECORD OF A MISSING ROW, not the row. The audit log is append-only, so the original entry can never be added.",
        positionId: g.positionId,
        playerId: g.userId,
        marketId: g.marketId,
        stake: g.stake,
        placedAt: g.placedAt,
        houseBotId: g.houseBotId,
        sweep: {
          scanned: scan.scanned,
          found: scan.gaps.length,
          cap: opts.cap ?? RECONCILE_DECLARE_CAP,
          capped: scan.capped,
          windowFrom: scan.windowFrom,
          windowUntil: scan.windowUntil,
        },
      },
    });
    declared += 1;
  }
  return { ...scan, declared };
}
