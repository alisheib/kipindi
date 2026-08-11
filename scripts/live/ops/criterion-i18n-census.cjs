#!/usr/bin/env node
/**
 * criterion-i18n-census.cjs — did F6 actually land on the LIVE database, and what does
 * the live data look like? READ-ONLY. No write of any kind.
 *
 * ⛔ WHY THIS EXISTS. Session 43 shipped two migrations to the live money DB and then
 * reported them "verified" on the strength of a page rendering without erroring. That
 * is an INFERENCE, not a verification: a page can render for many reasons, and Prisma
 * does not necessarily select a column the page never reads. The only thing that
 * settles it is asking the database.
 *
 * It also answers the question F10 raised and nobody measured: how many LIVE polls
 * carry a criterion that is not in English?
 *
 * Setup (never prints the secret):
 *   railway run -s 50pick -- node scripts/live/ops/mkenv.cjs
 *   node scripts/live/ops/criterion-i18n-census.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const q = (c, sql, params) => c.query(sql, params).then((r) => r.rows);
let fail = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // ── 0 · IDENTITY. A probe that cannot prove which database it read is not evidence.
  const [meta] = await q(c, `select current_database() as db, inet_server_addr()::text as addr, now()::text as server_now`);
  console.log("=== IDENTITY ===");
  console.log(`db=${meta.db}  server=${meta.addr}  server_now=${meta.server_now}`);
  // ⛔ Refuse to report anything if this is the local disposable cluster wearing a
  // production hat — the whole point is that these numbers are about PRODUCTION.
  ok("0: this is NOT the local load-test database", meta.db !== "kipindi_load", `db=${meta.db}`);

  // ── 1 · THE MIGRATIONS, by name, from _prisma_migrations ────────────────────
  console.log("\n=== 1 · MIGRATIONS ===");
  const migs = await q(c, `
    select migration_name, (finished_at is not null) as done, rolled_back_at::text as rolled_back
    from _prisma_migrations
    where migration_name in ($1, $2)
    order by migration_name`,
    ["20260811120000_market_resolution_criterion_i18n", "20260811150000_ai_resolution_criterion_i18n"]);
  for (const m of migs) console.log(`   ${m.migration_name} · done=${m.done} · rolled_back=${m.rolled_back ?? "no"}`);
  ok("1: both F6 migrations are recorded as applied", migs.length === 2 && migs.every((m) => m.done && !m.rolled_back),
     `${migs.length} found`);

  // ── 2 · THE COLUMNS THEMSELVES ──────────────────────────────────────────────
  // ⚠️ Filtered to table_schema='public'. The local cluster carries leftover scratch
  // schemas with the same table names, and an unfiltered count reads as success.
  console.log("\n=== 2 · COLUMNS (public schema) ===");
  const cols = await q(c, `
    select table_name, column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema='public'
      and column_name in ('resolutionCriterionSw','resolutionCriterionZh')
    order by table_name, column_name`);
  for (const r of cols) console.log(`   ${r.table_name}.${r.column_name} ${r.data_type} nullable=${r.is_nullable}`);
  for (const t of ["PredictionMarket", "AIPoll", "MarketCandidate"]) {
    const mine = cols.filter((r) => r.table_name === t);
    ok(`2: ${t} has BOTH columns, TEXT and NULLABLE`,
       mine.length === 2 && mine.every((r) => r.data_type === "text" && r.is_nullable === "YES"),
       `${mine.length} column(s)`);
  }

  // ── 3 · WHAT THE LIVE DATA ACTUALLY SAYS ────────────────────────────────────
  // Nothing writes translations yet on production, so the honest expectation is ZERO.
  // Stating the expectation and measuring it is the difference between a census and
  // a number.
  console.log("\n=== 3 · LIVE POLL DATA (productLine='MARKET') ===");
  const [counts] = await q(c, `
    select
      count(*)::int                                                        as polls,
      count(*) filter (where status='LIVE')::int                           as live,
      count(*) filter (where "resolutionCriterionSw" is not null)::int     as with_sw,
      count(*) filter (where "resolutionCriterionZh" is not null)::int     as with_zh,
      count(*) filter (where "resolutionCriterion" is null
                          or btrim("resolutionCriterion")='')::int         as empty_en
    from "PredictionMarket" where "productLine"='MARKET'`);
  console.log(`   polls=${counts.polls} live=${counts.live} withSw=${counts.with_sw} withZh=${counts.with_zh} emptyEn=${counts.empty_en}`);
  ok("3: no poll has an EMPTY English criterion (English is canonical and binding)", counts.empty_en === 0, `${counts.empty_en}`);

  // ⭐ THE ONE THAT MUST NEVER BE TRUE: a stored translation identical to the English.
  // That is F8's shape, and F6b/F6c exist to make it impossible at every writer.
  const [dupes] = await q(c, `
    select count(*)::int as n from "PredictionMarket"
    where "productLine"='MARKET'
      and ( lower(btrim(regexp_replace(coalesce("resolutionCriterionSw",''), '\\s+', ' ', 'g')))
            = lower(btrim(regexp_replace("resolutionCriterion",              '\\s+', ' ', 'g')))
            and "resolutionCriterionSw" is not null
         or lower(btrim(regexp_replace(coalesce("resolutionCriterionZh",''), '\\s+', ' ', 'g')))
            = lower(btrim(regexp_replace("resolutionCriterion",              '\\s+', ' ', 'g')))
            and "resolutionCriterionZh" is not null )`);
  ok("3: no stored translation is a copy of the English (the F8 shape)", dupes.n === 0, `${dupes.n}`);

  // ── 4 · F10, MEASURED AT LAST ───────────────────────────────────────────────
  // ⛔ The session-43 record says the live count of non-English criteria "has NOT been
  // measured". This measures it. Heuristic, and it says so: a criterion with no
  // ASCII-heavy English signature, or one carrying Han characters, is flagged for a
  // HUMAN to read — this counts candidates, it does not adjudicate language.
  console.log("\n=== 4 · F10 · criteria that may not be English (proposal-published polls) ===");
  const suspects = await q(c, `
    select m.id, m.status, left(m."resolutionCriterion", 90) as head, m."proposedBy"
    from "PredictionMarket" m
    where m."productLine"='MARKET'
      and ( m."resolutionCriterion" ~ '[\\u4e00-\\u9fff]'
         or m."resolutionCriterion" ~* '\\m(itakuwa|iwapo|kama|kwa mujibu|inatatuliwa|tarehe|matokeo|ndiyo|hapana)\\M' )
    order by m."createdAt" desc limit 40`);
  console.log(`   candidates: ${suspects.length}`);
  for (const s of suspects) console.log(`   · ${s.id} [${s.status}] ${s.head.replace(/\s+/g, " ")}`);
  console.log(`   ⚠️ HEURISTIC — a human must read these. Zero candidates is evidence of absence only for the patterns tested.`);

  // ── 5 · the AI pipeline tables, same question ───────────────────────────────
  console.log("\n=== 5 · AI PIPELINE ===");
  for (const t of ["AIPoll", "MarketCandidate"]) {
    const col = t === "AIPoll" ? "resolutionCriterionSw" : "resolutionCriterionSw";
    const [r] = await q(c, `select count(*)::int as n, count(*) filter (where "${col}" is not null)::int as with_sw from "${t}"`);
    console.log(`   ${t}: rows=${r.n} withSw=${r.with_sw}`);
  }

  await c.end();
  console.log(`\ncriterion-i18n-census: ${fail === 0 ? "all checks passed" : `${fail} FAILED`}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("PROBE FAILED:", e.message); process.exit(1); });
