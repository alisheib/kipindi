#!/usr/bin/env node
/**
 * predictor-zero.cjs — WHY do markets with ZERO positions carry a predictorCount of 8-11?
 *
 * Before writing 107 rows I have to know which POPULATION they are. Three candidates:
 *   · demo/seed markets given a synthetic count so the board looks populated (A-5 territory)
 *   · real markets whose positions were deleted by a board clear (the counter outlived them)
 *   · something else entirely, in which case do not write anything
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));
for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("="); if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}
const q = (c, s, p) => c.query(s, p).then((r) => r.rows);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  console.log("=== markets with predictorCount > 0 but ZERO positions ===");
  const z = await q(c, `
    select m.id, m."titleEn", m.status::text as status, m."productLine"::text as line,
           m."predictorCount"::int as stored, m."createdAt"::text as created
      from "PredictionMarket" m
     where m."predictorCount" > 0
       and not exists (select 1 from "Position" p where p."marketId" = m.id)
     order by m."predictorCount" desc limit 12`);
  console.log(`  count: ${z.length} shown`);
  z.forEach((r) => console.log(`  ${r.id}  stored=${String(r.stored).padStart(3)}  ${r.line.padEnd(7)} ${r.status.padEnd(9)} ${r.created.slice(0,10)}  "${String(r.titleEn).slice(0,52)}"`));

  console.log("\n=== how many of those are DEMO markets (titleEn starts 'Demo · ')? ===");
  const [d] = await q(c, `
    select count(*)::int as total,
           count(*) filter (where m."titleEn" like 'Demo · %')::int as demo
      from "PredictionMarket" m
     where m."predictorCount" > 0
       and not exists (select 1 from "Position" p where p."marketId" = m.id)`);
  console.log(`  total zero-position markets with a count: ${d.total}`);
  console.log(`  ...of which DEMO: ${d.demo}   ...non-demo: ${d.total - d.demo}`);

  console.log("\n=== the whole 107, split by demo vs real ===");
  const [s] = await q(c, `
    select count(*)::int as drifting,
           count(*) filter (where m."titleEn" like 'Demo · %')::int as demo
      from "PredictionMarket" m
      left join "Position" p on p."marketId" = m.id
     group by m.id, m."predictorCount", m."titleEn"
     having m."predictorCount" <> count(distinct p."userId")`).then((rows) => [{
       drifting: rows.length,
       demo: rows.filter((r) => r.demo > 0).length,
     }]).catch(() => [{ drifting: -1, demo: -1 }]);
  // the grouped form above is awkward; ask it plainly instead
  const plain = await q(c, `
    select (m."titleEn" like 'Demo · %') as is_demo, count(*)::int as n
      from (select m2.id, m2."titleEn", m2."predictorCount", count(distinct p."userId")::int as people
              from "PredictionMarket" m2 left join "Position" p on p."marketId"=m2.id
             group by m2.id, m2."titleEn", m2."predictorCount") m
     where m."predictorCount" <> m.people
     group by 1`);
  plain.forEach((r) => console.log(`  ${r.is_demo ? "DEMO" : "REAL"}: ${r.n} market(s) drifting`));

  console.log("\n=== do any REAL, non-demo markets with REAL bets drift? (the ones that matter) ===");
  const real = await q(c, `
    select m.id, m."titleEn", m."predictorCount"::int as stored,
           count(distinct p."userId")::int as people, count(p.id)::int as bets
      from "PredictionMarket" m join "Position" p on p."marketId"=m.id
     where m."titleEn" not like 'Demo · %'
     group by m.id, m."titleEn", m."predictorCount"
    having m."predictorCount" <> count(distinct p."userId")
     order by (m."predictorCount" - count(distinct p."userId")) desc limit 10`);
  console.log(`  ${real.length} shown`);
  real.forEach((r) => console.log(`  ${r.id}  stored=${String(r.stored).padStart(3)} → people=${String(r.people).padStart(3)}  bets=${String(r.bets).padStart(3)}  "${String(r.titleEn).slice(0,46)}"`));

  await c.end();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
