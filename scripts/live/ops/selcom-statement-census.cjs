#!/usr/bin/env node
/**
 * selcom-statement-census.cjs — the three numbers the Selcom statement prints, read
 * straight off production, so the page can be reconciled against something that did not
 * come from the page.
 *
 * ⛔ THE ONE MISTAKE THIS EXISTS TO CATCH, from `README.md` in this directory: `BET_PAYOUT`
 * is an internal wallet credit and `WITHDRAWAL` is money leaving to Selcom. It prints them
 * side by side with the ratio, because "payouts work" is what the conflated number reads
 * like, and on this platform the two differ by roughly 30×.
 *
 * ⚠️ `abs()` in SQL — withdrawals are stored NEGATIVE, and a signed sum prints a negative
 * "money out" and a net that adds when it should subtract. It also prints the SIGNED sum
 * beside it, so a type whose rows do NOT all share one sign is visible rather than silently
 * averaged: `sum(abs(x))` and `abs(sum(x))` are equal only when they do.
 *
 * Read-only. Run: node scripts/live/ops/selcom-statement-census.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || path.resolve(__dirname, "..", "..", ".."), "node_modules", "pg"));
for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("="); if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}
const q = (c, s, p) => c.query(s, p).then((r) => r.rows);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const [meta] = await q(c, `select current_database() as db, now()::text as server_now`);
  console.log(`=== IDENTITY ===\ndb=${meta.db}  server_now=${meta.server_now}\n`);

  const rows = await q(c, `
    select "type"::text as type,
           count(*)::int          as n,
           sum(abs("amount"))::text as abs_total,
           abs(sum("amount"))::text as signed_abs
      from "Transaction"
     where "status" = 'CONFIRMED'
       and "type" in ('DEPOSIT','WITHDRAWAL','BET_PAYOUT')
     group by "type" order by "type"`);

  const by = Object.fromEntries(rows.map((r) => [r.type, r]));
  const num = (t) => Number(by[t]?.abs_total ?? 0);
  const cnt = (t) => Number(by[t]?.n ?? 0);

  console.log("=== WHAT ACTUALLY CROSSED THE SELCOM RAIL ===");
  console.log(`  money IN   (DEPOSIT)     n=${String(cnt("DEPOSIT")).padStart(4)}  TZS ${num("DEPOSIT").toLocaleString()}`);
  console.log(`  money OUT  (WITHDRAWAL)  n=${String(cnt("WITHDRAWAL")).padStart(4)}  TZS ${num("WITHDRAWAL").toLocaleString()}`);
  console.log(`  net across the rail                 TZS ${(num("DEPOSIT") - num("WITHDRAWAL")).toLocaleString()}`);

  console.log("\n=== ⛔ NOT A RAIL FIGURE ===");
  console.log(`  in-wallet credits (BET_PAYOUT) n=${String(cnt("BET_PAYOUT")).padStart(4)}  TZS ${num("BET_PAYOUT").toLocaleString()}`);
  if (num("WITHDRAWAL") > 0) {
    console.log(`  quoting it as money paid out overstates the rail by ${(num("BET_PAYOUT") / num("WITHDRAWAL")).toFixed(1)}x`);
  }

  console.log("\n=== SIGN CHECK — sum(abs) vs abs(sum), per type ===");
  let mixed = 0;
  for (const r of rows) {
    const same = r.abs_total === r.signed_abs;
    if (!same) mixed++;
    console.log(`  ${r.type.padEnd(12)} sum(abs)=${String(r.abs_total).padStart(12)}  abs(sum)=${String(r.signed_abs).padStart(12)}  ${same ? "one sign" : "⛔ MIXED SIGNS"}`);
  }
  console.log(mixed === 0
    ? "\n  ✓ every confirmed type holds one sign — magnitudes are unambiguous"
    : `\n  ⛔ ${mixed} type(s) hold BOTH signs — a signed total would be wrong and this is a finding`);

  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
