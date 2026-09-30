/**
 * qa:journey-funnel — READ-ONLY. The journey funnel's daily totals on production (the Vodacom plan S3b, §0f): proves
 * the S3b migrations finished, the `Transaction.origin` column and the `JourneyFunnelDay` table exist, and prints the
 * newest totals — the check behind S3b's "counts appear daily" (run it on the days after the deploy).
 *
 *   cd <a Railway-linked tree> && railway run -s 50pick -- node <journey tree>/scripts/qa-journey-funnel.cjs
 *
 * ⛔ READ-ONLY: the session is set READ ONLY and that is printed before any row is read; every statement is a SELECT.
 * The URL is never printed.
 */
const { connect, publicUrl } = require("./live/db.cjs");
(async () => {
  const c = await connect(process.env.DATABASE_PUBLIC_URL || publicUrl());
  try {
    await c.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
    console.log("read-only:", (await c.query("SHOW transaction_read_only")).rows[0].transaction_read_only);
    const m = await c.query(`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name LIKE '20261001%' ORDER BY migration_name`);
    for (const r of m.rows) console.log(r.migration_name, "| finished", r.finished_at, "| rolled back", r.rolled_back_at);
    console.log("unfinished:", (await c.query(`SELECT count(*)::int n FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL`)).rows[0].n);
    const col = await c.query(`SELECT data_type, is_nullable FROM information_schema.columns WHERE table_name='Transaction' AND column_name='origin'`);
    console.log("Transaction.origin:", JSON.stringify(col.rows));
    const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='JourneyFunnelDay' ORDER BY ordinal_position`);
    console.log("JourneyFunnelDay columns:", cols.rows.map((r) => r.column_name).join(", "));
    const rows = await c.query(`SELECT day, step, origin, variant, "utmCampaign", count FROM "JourneyFunnelDay" ORDER BY day DESC, step, origin LIMIT 40`);
    console.log("totals so far:", rows.rows.length);
    for (const r of rows.rows) console.log(" ", r.day, r.step, r.origin, r.variant, r.utmCampaign || "-", r.count);
    const dep = await c.query(`SELECT count(*)::int n FROM "Transaction" WHERE origin IS NOT NULL`);
    console.log("deposits carrying an origin:", dep.rows[0].n);
  } finally { await c.end(); }
})().catch((e) => { console.error("FAILED:", e.message); process.exit(2); });
