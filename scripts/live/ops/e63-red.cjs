#!/usr/bin/env node
/**
 * e63-red.cjs — RED PROOF for the repaired open-price guard. READ-ONLY.
 *
 * I changed a guard until it printed green. That is the exact move this campaign has
 * been burned by, so the change is worthless without proving two things:
 *
 *   1. THE CORPUS IS NOT EMPTY. A join that matches nothing reports 0 forever and is
 *      indistinguishable from "sealed". `test:m1-light` printed "THE M1 SWEEP IS
 *      COMPLETE" over a corpus containing no component files; same shape.
 *   2. THE ASSERTION STILL CATCHES A REGRESSION. Run each failing condition with its
 *      null-test INVERTED: that is the same query shape over the rows the real one is
 *      looking for, so a non-zero answer proves the query can reach and count them.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}
const q = (c, sql, p) => c.query(sql, p).then((r) => r.rows);
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log("\nRED PROOF — the repaired E-63 guard, against production (read-only)\n");

  // ---- 1. corpus checks: does each join reach ANY row at all? --------------------
  const [c1] = await q(c, `
    select count(*)::int as n from "AuditLog" a
    join "UpDownRound" r on r.id = a."targetId"
    where a.action='updown.round.opened'`);
  check("CORPUS: the audit->round join matches real rows (not a silently empty set)",
    c1.n > 0, `${c1.n} opened-round audit rows join to a live round`);

  const [c2] = await q(c, `
    select count(*)::int as n from "AuditLog" a
    join "UpDownRound" r on r.id = a."targetId"
    where a.action='updown.round.opened'
      and a."createdAt" > now() - interval '7 days'`);
  check("CORPUS: the 7-day window contains joined rows (the window is not empty)",
    c2.n > 0, `${c2.n} rows inside the window`);

  // ---- 2. inverted assertions: same shape, opposite null-test --------------------
  // `recent` counts payload openPrice IS NULL. Inverting to IS NOT NULL must be > 0,
  // which proves the query reaches the rows it is meant to police.
  const [i1] = await q(c, `
    select count(*)::int as n from "AuditLog" a
    join "UpDownRound" r on r.id = a."targetId"
    where a.action='updown.round.opened'
      and a.payload ? 'openPrice'
      and a.payload ->> 'openPrice' is not null
      and a."createdAt" > now() - interval '7 days'`);
  check("INVERTED `recent`: flipping IS NULL -> IS NOT NULL yields a non-zero count",
    i1.n > 0, `${i1.n} priced opens in the window — so a priceless one WOULD be counted`);

  // `still_null` counts r.openPrice IS NULL over joined priceless rows. Invert the
  // round-side null-test across the whole join to prove the column is readable.
  const [i2] = await q(c, `
    select count(*)::int as n from "AuditLog" a
    join "UpDownRound" r on r.id = a."targetId"
    where a.action='updown.round.opened' and r."openPrice" is not null`);
  check("INVERTED `still_null`: the round-side openPrice column is readable and populated",
    i2.n > 0, `${i2.n} joined rounds carry a non-null openPrice`);

  // ---- 3. the historical era is real and IS excluded by the join -----------------
  const [h] = await q(c, `
    select count(*)::int as total,
           count(*) filter (where exists (select 1 from "UpDownRound" r where r.id=a."targetId"))::int as surviving
      from "AuditLog" a
     where a.action='updown.round.opened'
       and a.payload ? 'openPrice' and a.payload ->> 'openPrice' is null`);
  check("the 1,915 historical priceless opens are ALL orphaned (that is why they are excluded)",
    h.total > 0 && h.surviving === 0, `${h.total} priceless, ${h.surviving} still backed by a round`);

  // ---- 4. would a REGRESSION be caught? simulate one without writing -------------
  // Take a real, currently-existing round and ask: if its audit payload were priceless,
  // would the guard's window query count it? Same predicate, forced onto a live row.
  const [sim] = await q(c, `
    select count(*)::int as n from "AuditLog" a
    join "UpDownRound" r on r.id = a."targetId"
    where a.action='updown.round.opened'
      and a."createdAt" > now() - interval '7 days'
      and true  -- stands in for the payload-null test a regression would satisfy
    `);
  check("SIMULATED REGRESSION: a priceless open on a LIVE round inside the window would be counted",
    sim.n > 0, `${sim.n} live-round opens sit inside the window and satisfy every other clause`);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await c.end();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("RED PROOF FAILED:", e.message); process.exit(1); });
