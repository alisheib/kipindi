#!/usr/bin/env node
/**
 * E-63 · PRODUCTION GUARD — no round is ever opened without an open price, and the
 * decisive rate per asset is visible in one read.
 *
 * The seal's two halves live elsewhere (the healer's open-side backfill +
 * `test:updown-heal` §2c); THIS is the standing production assertion the campaign's
 * session-31 handoff specified: `AuditLog` rows with `action = 'updown.round.opened'`
 * whose payload carries a NULL `openPrice` must stay at **zero**. It read 0/87 after
 * the E-83 fix and 176/197 before it — which is what proves the check CAN fail.
 *
 * ⚠️ Paired with a payload-SHAPE check on purpose: a rename of the `openPrice` key
 * would make a naive `->> 'openPrice' IS NULL` filter read as "all clean" forever.
 * Rows missing the key entirely are counted separately and FAIL the guard louder —
 * a guard that cannot see its subject must say so, not pass.
 *
 * Read-only. Run against production via the Postgres public URL:
 *   DATABASE_URL=... node scripts/ops-updown-open-guard.mjs
 * Exit 0 = sealed. Exit 1 = a priceless open exists (or the payload shape moved).
 */
import { PrismaClient } from "@prisma/client";

const DB = process.env.DATABASE_URL;
if (!DB) { console.error("FATAL: DATABASE_URL is not set."); process.exit(1); }
const host = (() => { try { return new URL(DB).host; } catch { return "unparseable"; } })();

const prisma = new PrismaClient();
const line = () => console.log("-".repeat(72));

line();
console.log(`  E-63 OPEN-PRICE GUARD (read-only) — ${host}`);
line();

// One pass over the opened-round audit rows: total · key-missing · null-price.
// Raw SQL because the payload is JSON and the shape check is the point.
//
// 🔴 THE ALL-TIME COUNT IS CONTEXT, NOT THE VERDICT — measured on production 2026-08-10.
// This guard used to FAIL on `priceless > 0` over every audit row ever written, with no
// time window and no join to a round that still exists. That can never return to zero
// once a bad era exists in history, so it fails forever on a product that is fixed:
// production read **1915 priceless of 3695**, and every single one of the 1915 belonged
// to a round DELETED in the 2026-08-04/05 board clear (`stillLive` below read 0). The
// last priceless open was 2026-08-05 06:44; the five days after it opened 879 rounds
// with a real price every time.
//
// ⛔ A guard that cries wolf on dead history is as harmful as one that sleeps through a
// live defect — it trains the operator to skip it. So the FAILING conditions are now the
// two that can still be true of the product:
//   · `stillNull`  — a round that EXISTS and STILL has no openPrice. Money-critical:
//                    this is a live round whose settlement has nothing to compare against.
//   · `recent`     — a priceless OPEN inside the window, i.e. the producing path firing
//                    again. Kept separate from `stillNull` because the healer backfills
//                    confirmed rounds, and a healed round would otherwise hide the caller.
// The all-time figure is still printed, with its era, so nobody reads 0 as "no history".
const WINDOW_DAYS = Number(process.env.E63_WINDOW_DAYS ?? 7);

const [row] = await prisma.$queryRaw`
  SELECT
    COUNT(*)::int                                                        AS total,
    COUNT(*) FILTER (WHERE NOT (payload ? 'openPrice'))::int             AS shape_moved,
    COUNT(*) FILTER (WHERE payload ? 'openPrice'
                       AND payload ->> 'openPrice' IS NULL)::int         AS priceless,
    MAX("createdAt") FILTER (WHERE payload ? 'openPrice'
                       AND payload ->> 'openPrice' IS NULL)              AS last_priceless
  FROM "AuditLog"
  WHERE action = 'updown.round.opened'
`;

// The two live assertions. Both join to the round, because an audit row whose round was
// deleted describes a world that no longer exists.
const [live] = await prisma.$queryRaw`
  SELECT
    COUNT(*)::int                                                        AS still_live,
    COUNT(*) FILTER (WHERE r."openPrice" IS NULL)::int                   AS still_null
  FROM "AuditLog" a
  JOIN "UpDownRound" r ON r.id = a."targetId"
  WHERE a.action = 'updown.round.opened'
    AND a.payload ? 'openPrice'
    AND a.payload ->> 'openPrice' IS NULL
`;

// ⚠️ THIS JOINS THE ROUND TOO, AND THE FIRST VERSION DID NOT — which made it read 358 on a
// product that had opened 879 consecutive rounds with a real price. A bare time window
// still counts the dead era's tail (it ended 2026-08-05, inside any window wider than a
// few days), so it measures the CALENDAR, not the code. A round that was deleted cannot
// tell you whether today's producing path is sound. Joining is also what makes this
// falsifiable in the direction that matters: a priceless open TODAY creates a round that
// exists, so it is counted here whether or not the healer later backfills it.
const [recent] = await prisma.$queryRaw`
  SELECT COUNT(*)::int AS n
  FROM "AuditLog" a
  JOIN "UpDownRound" r ON r.id = a."targetId"
  WHERE a.action = 'updown.round.opened'
    AND a.payload ? 'openPrice'
    AND a.payload ->> 'openPrice' IS NULL
    AND a."createdAt" > NOW() - (${WINDOW_DAYS} || ' days')::interval
`;

// ⛔ THE CORPUS IS PART OF THE CLAIM. Both live assertions are JOINS, and a join that
// matches nothing reports 0 exactly like a sealed product does. `test:m1-light` printed
// "⭐ THE M1 SWEEP IS COMPLETE" over a corpus that contained no component files, and the
// number was 0 because it had read nothing. So this guard states what it counted, and
// refuses to return success over an empty set.
const [corpus] = await prisma.$queryRaw`
  SELECT COUNT(*)::int AS joined,
         COUNT(*) FILTER (WHERE a."createdAt" > NOW() - (${WINDOW_DAYS} || ' days')::interval)::int AS in_window
  FROM "AuditLog" a
  JOIN "UpDownRound" r ON r.id = a."targetId"
  WHERE a.action = 'updown.round.opened'
`;

const era = row.last_priceless ? new Date(row.last_priceless).toISOString().replace("T", " ").slice(0, 19) : "never";
console.log(`  opened-round audit rows ......... ${row.total}`);
console.log(`  payload missing 'openPrice' ..... ${row.shape_moved}`);
console.log(`  priceless opens, ALL TIME ....... ${row.priceless}   (context — last one ${era})`);
console.log(`  ...still backed by a live round .. ${live.still_live}`);
console.log(`  CORPUS the live checks read ..... ${corpus.joined} rounds (${corpus.in_window} inside ${WINDOW_DAYS}d)`);
console.log(`  ⭐ rounds STILL without a price ... ${live.still_null}   (must be 0 — settlement has nothing to compare)`);
console.log(`  ⭐ priceless opens in last ${String(WINDOW_DAYS).padStart(2)}d ..... ${recent.n}   (must be 0 — the producing path)`);

// The decisive-rate read the same handoff asked to sit beside it: per asset, how many
// rounds resolved UP/DOWN vs voided, and why — a rate is not a diagnosis (E-58), so the
// void REASONS are printed with it.
const rates = await prisma.$queryRaw`
  SELECT a.key AS asset,
         COUNT(*)::int                                                   AS rounds,
         COUNT(*) FILTER (WHERE r.outcome IN ('UP','DOWN'))::int         AS decisive,
         COUNT(*) FILTER (WHERE r."voidReason" = 'source-failed')::int   AS source_failed,
         COUNT(*) FILTER (WHERE r."voidReason" = 'no-move')::int         AS no_move,
         COUNT(*) FILTER (WHERE r."voidReason" = 'operator')::int        AS operator,
         COUNT(*) FILTER (WHERE r."openPrice" IS NULL)::int              AS open_null
  FROM "UpDownRound" r
  JOIN "UpDownChain" c ON c.id = r."chainId"
  JOIN "UpDownAsset" a ON a.id = c."assetId"
  WHERE r."resolvedAt" IS NOT NULL
  GROUP BY a.key ORDER BY a.key
`;
line();
console.log("  asset · rounds · decisive · source-failed · no-move · operator · openPrice NULL");
for (const r of rates) {
  const pct = r.rounds ? ((100 * r.decisive) / r.rounds).toFixed(1) : "–";
  console.log(
    `  ${String(r.asset).padEnd(6)} ${String(r.rounds).padStart(6)} ${String(r.decisive).padStart(9)}` +
    ` (${pct}%) ${String(r.source_failed).padStart(8)} ${String(r.no_move).padStart(9)}` +
    ` ${String(r.operator).padStart(9)} ${String(r.open_null).padStart(8)}`,
  );
}
line();

await prisma.$disconnect();

if (row.shape_moved > 0) {
  console.error(`  ✗ FAIL — ${row.shape_moved} row(s) no longer carry an 'openPrice' key: the payload
    shape moved and this guard can no longer see its subject. Fix the guard WITH the shape.`);
  process.exit(1);
}
if (corpus.joined === 0) {
  console.error(`  ✗ INCONCLUSIVE — the audit→round join matched NOTHING, so both live checks below
    would read 0 whatever the product did. Either no round survives, or 'targetId' no
    longer holds the round id. A guard that cannot see its subject must say so, not pass.`);
  process.exit(2);
}
// ⛔ AND THE WINDOW HAS ITS OWN EMPTY CASE, which the first version computed, PRINTED, and then
// never asserted. After a board clear — exactly the event that produced E-135 — `in_window` can
// be 0 while `joined` is not, and the ⭐ "priceless opens in last Nd · must be 0 · the producing
// path" line then reads 0 because it counted nothing, and the script prints ✓ SEALED over a
// question it never asked. That is verbatim the failure this file condemns in its own header,
// reappearing one variable along. **A number is only evidence once its corpus is asserted.**
if (corpus.in_window === 0) {
  console.error(`  ✗ INCONCLUSIVE — no opened-round audit row inside the ${WINDOW_DAYS}-day window joins a
    surviving round, so the 'producing path' check below counted NOTHING and its 0 means
    "not measured", not "sealed". Widen E63_WINDOW_DAYS, or wait for rounds to open.`);
  process.exit(2);
}
if (live.still_null > 0) {
  console.error(`  ✗ FAIL — ${live.still_null} round(s) that STILL EXIST have no openPrice. Settlement has
    nothing to compare a close against. This is the money-critical half; fix it first.`);
  process.exit(1);
}
if (recent.n > 0) {
  console.error(`  ✗ FAIL — ${recent.n} round(s) were OPENED without an open price in the last
    ${WINDOW_DAYS} days. E-63's producing path has reappeared; the healer will rescue confirmed
    ones, which is exactly why this is measured SEPARATELY — find the caller.`);
  process.exit(1);
}
console.log(
  row.priceless > 0
    ? `  ✓ SEALED — 0 live rounds lack a price, and 0 priceless opens in ${WINDOW_DAYS}d.\n` +
      `    (${row.priceless} historical priceless opens remain in the audit trail, all from rounds\n` +
      `     deleted with the board; that era ended ${era} and is evidence, not a defect.)`
    : "  ✓ SEALED — every round ever opened carried a real open price.",
);
