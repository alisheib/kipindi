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
const [row] = await prisma.$queryRaw`
  SELECT
    COUNT(*)::int                                                        AS total,
    COUNT(*) FILTER (WHERE NOT (payload ? 'openPrice'))::int             AS shape_moved,
    COUNT(*) FILTER (WHERE payload ? 'openPrice'
                       AND payload ->> 'openPrice' IS NULL)::int         AS priceless
  FROM "AuditLog"
  WHERE action = 'updown.round.opened'
`;

console.log(`  opened-round audit rows ......... ${row.total}`);
console.log(`  payload missing 'openPrice' ..... ${row.shape_moved}`);
console.log(`  opened with NULL openPrice ...... ${row.priceless}`);

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
if (row.priceless > 0) {
  console.error(`  ✗ FAIL — ${row.priceless} round(s) were OPENED without an open price. E-63's producing
    path has reappeared; the healer will rescue confirmed ones, but find the caller.`);
  process.exit(1);
}
console.log("  ✓ SEALED — every round ever opened carried a real open price.");
