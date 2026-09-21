/**
 * THE TICKET GAP DETECTOR — how a hole in the compliance log becomes VISIBLE.
 *
 * ⛔ THE PROBLEM, RE-MEASURED AT `c52c5c44` AND NOT INHERITED. `audit()` is fire-and-forget on one
 * process-wide queue — **470 of the 496 `audit(` call lines** across 102 files in `src/` (excluding
 * `audit.ts` itself and comment lines) do not await it, deliberately, because a live bet must not
 * wait on an audit write — and `auditLog` has only `create` in all of `src/`:
 * no update, no delete, anywhere. So a queued append that never runs is lost permanently AND
 * invisibly: `seq` is allocated by Postgres at INSERT, a lost append consumes none, the `prevHash`
 * links still join up, and `verifyChainFull()` reported `{valid:true, verified:663,
 * linkBroken:false}` over a chain with 40 known-lost rows. The integrity mechanism is blind to this
 * class by construction, which is why nothing before this could tell.
 *
 * ⭐ THE DETECTOR, AND WHY IT IS THIS ONE. `audit()` now takes a per-process TICKET synchronously at
 * CALL time and stamps it into the row id (`aud_<boot>_<ticket>`, see `audit.ts`). The queue is
 * strictly FIFO and each append is awaited inside it, so landed rows carry contiguous tickets. A
 * ticket that is absent BETWEEN two landed tickets of the same boot is therefore a row that was
 * allocated and never written. Nothing else has to be true for that to hold.
 *
 * ⛔ NO GRACE PERIOD, AND THAT IS A PROPERTY OF THE MECHANISM, NOT AN OVERSIGHT. `audit-reconcile.ts`
 * needs ten minutes of grace because a `Position` can legitimately exist for a moment before its
 * audit row does. Here, ticket n+1 cannot be written before ticket n has been: they are awaited in
 * order on one queue. A gap below the highest landed ticket is final the instant it is observed.
 *
 * ⭐ WHAT THIS SEES THAT THE ANCHOR RECONCILER CANNOT — and it is the reason this exists at all.
 * `audit-reconcile.ts` can only find a lost row that some OTHER durable record implies: it
 * reconciles the bet row against the committed `Position`. The rows with no anchor anywhere —
 * `player.record_viewed`, `kyc_doc.viewed`, `agent_doc.viewed`, `transactions.exported`,
 * `privacy.dsar.exported`, the ISO 27001 A.12.4 access-logging class — have nothing to reconcile
 * against, and `docs/COMPLIANCE-DECISIONS.md` AR-1 records them as undetectable. A ticket gap is
 * anchor-free: it detects the loss of a row NOBODY can reconstruct, because it does not need to know
 * what the row would have said to know that it is missing.
 *
 * ⛔ AND IT SEES A CLASS NOTHING ELSE DOES: the FAIL-OPEN. When `appendPersisted` throws (a Postgres
 * blip), `audit()` keeps the entry in the in-memory ring and logs — and the durable row is silently
 * gone. That is an interior gap, and it was previously invisible in every artefact the platform
 * produces.
 *
 * ⛔ WHAT IT CANNOT SEE, stated plainly so the register is honest:
 *   · A loss at the TAIL. If a process dies with tickets 41..50 queued, there is no ticket 51 to
 *     bound the hole and nothing durable ever recorded that 50 were issued. The only mark is the
 *     ABSENCE of that boot's `system.shutdown_drain` row (`audit-drain.ts`). ⭐ The two together
 *     are a proof the platform did not have: the drain marker is queued BEHIND everything else, so
 *     a boot whose marker landed carrying ticket T, with tickets 1..T all present, wrote every
 *     append it ever issued.
 *   · Rows written BEFORE the ticket shipped (`aud_<time36>_<rand6>`). They are excluded from the
 *     population by the id pattern and `scannedRows` vs `scannedTicketed` states the size of the
 *     exclusion on every sweep — never counted as gap-free.
 *   · A gap older than the sweep's window. The periodic sweep reads a bounded `seq` window so its
 *     cost stays flat forever; `npm run audit:ticket-sweep -- --all` walks the whole table.
 *
 * ⛔ AND LIKE `audit-reconcile.ts`, THIS DECLARES — IT CANNOT REPAIR. A late insert would chain at
 * the CURRENT head and date the lost row to the sweep, which would make the log lie. What it writes
 * is a chained, tamper-evident `audit.rows_missing` row naming the boot, the ticket range and the
 * count. A permanent invisible hole becomes a permanent DECLARED one. ⛔ It cannot say what the lost
 * rows SAID — for the anchor-free class nothing can, and the declaration says so in its own text
 * rather than leaving a reader to assume otherwise.
 */
import { audit } from "./audit";
import { hasDatabase, prisma } from "./prisma";

/** The action a declaration is written under. ⚠️ Distinct from `audit-reconcile.ts`'s
 *  `audit.row_missing` (singular): that one names a BET and can describe it from the `Position`
 *  anchor; this one names a RANGE of appends nothing can describe. Two different findings must not
 *  share one action name, or a count of either becomes meaningless. */
export const TICKET_GAP_DECLARED_ACTION = "audit.rows_missing";

/** The `targetType` a declaration carries. The `targetId` is `<boot>#<from>-<to>`, which makes the
 *  sweep SELF-DEDUPLICATING through the same `@@index([targetType, targetId])` the detection query
 *  already uses — a declared range is no longer undeclared, so no cursor is needed to remember it. */
export const TICKET_GAP_TARGET_TYPE = "AuditTicket";

/** Ticketed ids only. Anything else is pre-ticket history and is excluded from the population. */
export const TICKETED_ID_RE = /^aud_(b[0-9a-z]+)_([0-9]{9})$/;

/** How many rows back from the head a periodic sweep looks. ~2 days at this platform's ~11.5k
 *  rows/day, and bounded on `seq` (the `@unique` index) so the sweep's cost does not grow with the
 *  table. ⛔ Older holes are reachable by hand; a sweep that walked 4M rows every five minutes would
 *  be switched off within a week, and a control that gets switched off is worse than a bounded one. */
export const TICKET_SWEEP_WINDOW_ROWS = 20_000;

/** Most declarations one sweep will append. A pass that hits this says so, and the next pass
 *  continues — an undeclared gap stays a gap. The cap exists because the append is DB-global and
 *  serialised, and the bet path shares that queue: a pathological hour must not flood it. */
export const TICKET_DECLARE_CAP = 50;

export type TicketGap = {
  /** The process that issued the missing appends. */
  boot: string;
  /** First missing ticket (inclusive). */
  from: number;
  /** Last missing ticket (inclusive). */
  to: number;
  /** How many appends were lost in this run. */
  missing: number;
  /** When the ticket immediately BEFORE the hole landed. */
  afterAt: string;
  /** When the ticket immediately AFTER the hole landed. The loss happened between the two. */
  beforeAt: string;
};

export type TicketGapScan = {
  /** ⭐ THE POPULATION, AND IT IS PRINTED EVERYWHERE THIS IS REPORTED. A sweep over zero ticketed
   *  rows passes VACUOUSLY — "no gaps" over an empty population is not evidence of anything, and a
   *  silent vacuous pass is how a dead check survives for months. */
  scannedTicketed: number;
  /** Rows in the window including the pre-ticket era. `scannedRows - scannedTicketed` is exactly
   *  what this detector is blind to. */
  scannedRows: number;
  /** Distinct boots seen in the window. */
  boots: number;
  gaps: TicketGap[];
  /** True when `gaps` was truncated at `cap` — more holes exist in this window than are listed. */
  capped: boolean;
  /** The `seq` the window starts after. 0 means the whole table was walked. */
  fromSeq: number;
};

const EMPTY: TicketGapScan = {
  scannedTicketed: 0, scannedRows: 0, boots: 0, gaps: [], capped: false, fromSeq: 0,
};

/**
 * Find ticket ranges that were allocated and never written. Read-only: this writes nothing.
 *
 * ⛔ THE ANTI-JOIN CARRIES THE DECLARATION TOO, so a known hole is not re-reported on every sweep.
 * Without it the register would fill with duplicates of one finding and stop being a count.
 */
export async function findAuditTicketGaps(opts: {
  /** 0 walks the whole table. Defaults to `TICKET_SWEEP_WINDOW_ROWS`. */
  windowRows?: number;
  cap?: number;
} = {}): Promise<TicketGapScan> {
  const db = prisma();
  if (!db || !hasDatabase()) return EMPTY;
  const windowRows = opts.windowRows ?? TICKET_SWEEP_WINDOW_ROWS;
  const cap = opts.cap ?? TICKET_DECLARE_CAP;

  // ⚠️ `seq` is int8. The window bound is computed IN SQL from the head rather than round-tripped as
  // a JS number — `$queryRaw` binds a JS number as bigint and the arithmetic has to stay in the
  // database anyway (the raw-SQL bigint trap: int4 functions need an explicit `::int`).
  //
  // 🔴 `windowRows <= 0` MEANS THE WHOLE TABLE, AND IT IS BRANCHED ON EXPLICITLY. Letting it fall
  // through the arithmetic computed `max(seq) - 0`, i.e. `seq > max(seq)` — which selects NOTHING.
  // `--all` therefore scanned an EMPTY population and reported no gaps over a database that had
  // five known-missing rows in it, while printing a confident "every ticket landed". Caught by
  // `rehearse:audit-hole` §3.1 on its first run, which is exactly what a population count is for.
  const fromSeq = windowRows <= 0
    ? 0
    : Number((await db.$queryRaw<Array<{ from_seq: string }>>`
        SELECT greatest(0, coalesce((SELECT max("seq") FROM "AuditLog"), 0) - ${windowRows}::bigint)::text AS from_seq
      `)[0]?.from_seq ?? 0);

  const [pop] = await db.$queryRaw<Array<{ rows: number; ticketed: number; boots: number }>>`
    SELECT count(*)::int AS rows,
           count(*) FILTER (WHERE "id" ~ '^aud_b[0-9a-z]+_[0-9]{9}$')::int AS ticketed,
           count(DISTINCT substring("id" from '^aud_(b[0-9a-z]+)_[0-9]{9}$'))::int AS boots
      FROM "AuditLog"
     WHERE "seq" > ${fromSeq}::bigint`;

  // ⛔ THE GAP IS A WINDOW FUNCTION OVER ONE BOOT'S TICKETS, and it needs no ordering assumption
  // about `seq`, `createdAt` or anything else: it partitions by boot and orders by the ticket
  // itself. A boot whose FIRST row in the window is not its first ticket produces no finding (lag
  // is NULL), so a truncated window under-reports and never over-reports.
  const rows = await db.$queryRaw<Array<{
    boot: string; gap_from: number; gap_to: number; missing: number; after_at: Date; before_at: Date;
  }>>`
    WITH t AS (
      SELECT substring("id" from '^aud_(b[0-9a-z]+)_[0-9]{9}$') AS boot,
             (substring("id" from '^aud_b[0-9a-z]+_([0-9]{9})$'))::bigint AS tick,
             "createdAt" AS at
        FROM "AuditLog"
       WHERE "seq" > ${fromSeq}::bigint
         AND "id" ~ '^aud_b[0-9a-z]+_[0-9]{9}$'
    ),
    s AS (
      SELECT boot, tick, at,
             lag(tick) OVER (PARTITION BY boot ORDER BY tick) AS ptick,
             lag(at)   OVER (PARTITION BY boot ORDER BY tick) AS pat
        FROM t
    ),
    g AS (
      SELECT boot,
             (ptick + 1)::int AS gap_from,
             (tick - 1)::int  AS gap_to,
             (tick - ptick - 1)::int AS missing,
             pat AS after_at,
             at  AS before_at
        FROM s
       WHERE ptick IS NOT NULL AND tick - ptick > 1
    )
    SELECT g.* FROM g
     WHERE NOT EXISTS (
       SELECT 1 FROM "AuditLog" a
        WHERE a."targetType" = ${TICKET_GAP_TARGET_TYPE}
          AND a."targetId" = g.boot || '#' || g.gap_from || '-' || g.gap_to
          AND a."action" = ${TICKET_GAP_DECLARED_ACTION}
     )
     ORDER BY g.boot ASC, g.gap_from ASC
     LIMIT ${cap + 1}::int`;

  return {
    scannedTicketed: Number(pop?.ticketed ?? 0),
    scannedRows: Number(pop?.rows ?? 0),
    boots: Number(pop?.boots ?? 0),
    capped: rows.length > cap,
    fromSeq,
    gaps: rows.slice(0, cap).map((r) => ({
      boot: r.boot,
      from: Number(r.gap_from),
      to: Number(r.gap_to),
      missing: Number(r.missing),
      afterAt: new Date(r.after_at).toISOString(),
      beforeAt: new Date(r.before_at).toISOString(),
    })),
  };
}

/** How many appends a scan says are missing, across every range it found. */
export function ticketGapTotal(scan: TicketGapScan): number {
  return scan.gaps.reduce((n, g) => n + g.missing, 0);
}

export type TicketGapDeclaration = TicketGapScan & { declared: number; declaredAppends: number };

/**
 * Find the gaps and DECLARE each range — one chained `audit.rows_missing` row per contiguous run of
 * appends that were allocated and never written.
 *
 * ⛔ WHAT THE DECLARATION IS AND IS NOT. It records that N appends are missing, written now, dated
 * now. It is NOT those appends and must never be read as them: for this class there is no anchor
 * anywhere, so what they said is unknowable and the payload says exactly that rather than leaving a
 * reader to assume the range was reconstructed.
 *
 * ⛔ IT NEVER BACK-DATES. `createdAt` is the sweep's time, as it is for every other append. The
 * window in which the loss happened travels in the payload, where it cannot be mistaken for the
 * entry's own time.
 *
 * ⛔ AND THE DECLARATION IS AWAITED — one of the few `audit()` calls that must be. It runs on the
 * lifecycle leader, off every money path and every request, so it costs nothing a player waits for;
 * a fire-and-forget declaration could be lost to the very defect it is declaring.
 */
export async function declareAuditTicketGaps(opts: {
  windowRows?: number;
  cap?: number;
} = {}): Promise<TicketGapDeclaration> {
  const scan = await findAuditTicketGaps(opts);
  let declared = 0;
  let declaredAppends = 0;
  for (const g of scan.gaps) {
    // ⛔ AWAITED, ONE AT A TIME. Sequential because the appends serialise on a DB-global advisory
    // lock anyway — firing them together would only deepen the queue the bet path shares.
    await audit({
      category: "COMPLIANCE",
      action: TICKET_GAP_DECLARED_ACTION,
      actorId: null,
      targetType: TICKET_GAP_TARGET_TYPE,
      targetId: `${g.boot}#${g.from}-${g.to}`,
      payload: {
        boot: g.boot,
        firstMissingTicket: g.from,
        lastMissingTicket: g.to,
        missing: g.missing,
        reason:
          "These audit appends were allocated a ticket and never written — the process ended, or the "
          + "durable write failed and the entry was kept in memory only.",
        note:
          "This is a RECORD OF MISSING ROWS, not the rows. What they said is not recoverable: unlike a "
          + "bet (which has a Position to reconcile against), an append is only known to have existed "
          + "because its ticket was issued. The audit log is append-only, so they can never be added.",
        lostBetween: { afterLanded: g.afterAt, beforeLanded: g.beforeAt },
        sweep: {
          scannedTicketed: scan.scannedTicketed,
          scannedRows: scan.scannedRows,
          boots: scan.boots,
          fromSeq: scan.fromSeq,
          found: scan.gaps.length,
          cap: opts.cap ?? TICKET_DECLARE_CAP,
          capped: scan.capped,
        },
      },
    });
    declared += 1;
    declaredAppends += g.missing;
  }
  return { ...scan, declared, declaredAppends };
}
