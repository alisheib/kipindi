/**
 * READ-ONLY — did the Up & Down bell rows actually start landing on production?
 *
 *   railway run --service 50pick -- npx tsx scripts/ops-updown-bell-live-check.mts
 *
 * The owner decision of 2026-08-22 put every terminal Up & Down outcome into the bell. This
 * asks the only question that settles whether it works in the real world: **since the deploy,
 * has a settled Up & Down position produced a Notification row, and does that row point at
 * its own round?**
 *
 * ⛔ IT ANCHORS ON THE POSITION, NOT ON THE NOTIFICATION. Counting notifications alone cannot
 * distinguish "the feature works" from "nothing settled" — and E-37's original measurement was
 * nearly made blind the same way, by keying on an href pattern that could never match a win.
 * So it counts SETTLED POSITIONS first and asks what fraction of them were announced.
 *
 * ⛔ WRITES NOTHING.
 */
import { Client } from "pg";

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!url) { console.error("DATABASE_URL empty — run through `railway run`."); process.exit(1); }

const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const since = process.argv[2] ?? "2026-08-22 00:11:30"; // the deploy that shipped the change
console.log(`── server clock ── ${(await c.query("select now()::text as t")).rows[0].t}`);
console.log(`── window ── settledAt > '${since}' (UTC)\n`);

// 1 · What settled since the deploy — the population any announcement must cover.
const settled = await c.query(`
  SELECT p.status, count(*)::int AS n, count(DISTINCT p."userId")::int AS players
  FROM "Position" p JOIN "PredictionMarket" m ON m.id = p."marketId"
  WHERE m."productLine" = 'UPDOWN' AND p."settledAt" > $1
  GROUP BY 1 ORDER BY 2 DESC`, [since]);
console.log("1 · Up & Down positions SETTLED since the deploy");
if (!settled.rowCount) console.log("   (none yet — nothing has settled, so nothing could be announced)");
for (const r of settled.rows) console.log(`   ${String(r.status).padEnd(8)} ${String(r.n).padStart(4)}  across ${r.players} player(s)`);

// 2 · ⭐ THE PAIRING. For each settled position, was its owner told, in the ten minutes after?
//     Anchored on the position and on the ROUND'S OWN href, which is what the new rows carry.
const paired = await c.query(`
  WITH s AS (
    SELECT p.id, p."userId", p.status, p."settledAt", r.id AS round_id
    FROM "Position" p
    JOIN "PredictionMarket" m ON m.id = p."marketId"
    JOIN "UpDownRound" r ON r."marketId" = m.id
    WHERE m."productLine" = 'UPDOWN' AND p."settledAt" > $1
  )
  SELECT s.status,
         count(*)::int AS settled,
         count(*) FILTER (WHERE n.id IS NOT NULL)::int AS announced
  FROM s
  LEFT JOIN "Notification" n
    ON n."userId" = s."userId"
   AND n.href = '/updown/' || s.round_id
   AND n."createdAt" BETWEEN s."settledAt" - interval '2 minutes' AND s."settledAt" + interval '10 minutes'
  GROUP BY 1 ORDER BY 2 DESC`, [since]);
console.log("\n2 · ⭐ …and were those players TOLD? (row deep-linked to that exact round)");
if (!paired.rowCount) console.log("   (nothing to pair yet)");
let allCovered = true;
for (const r of paired.rows) {
  const gap = r.settled - r.announced;
  if (gap > 0) allCovered = false;
  console.log(`   ${String(r.status).padEnd(8)} settled ${String(r.settled).padStart(4)} · announced ${String(r.announced).padStart(4)}  ${gap === 0 ? "✅" : `🔴 ${gap} SILENT`}`);
}

// 3 · The rows themselves, so the copy can be read rather than assumed.
const rows = await c.query(`
  SELECT kind, "titleEn", "titleSw", "titleZh", href, "createdAt"
  FROM "Notification"
  WHERE href LIKE '/updown/%' AND href NOT LIKE '/updown/history%' AND "createdAt" > $1
  ORDER BY "createdAt" DESC LIMIT 12`, [since]);
console.log(`\n3 · the newest per-round rows (${rows.rowCount})`);
for (const r of rows.rows) {
  console.log(`   ${String(r.kind).padEnd(8)} ${r.titleEn}`);
  console.log(`            SW: ${r.titleSw}   ZH: ${r.titleZh}`);
  console.log(`            → ${r.href}`);
}

// 4 · 🔴 The string that was live and wrong (E-179). Must never appear again, in any row.
const bad = await c.query(`
  SELECT count(*)::int AS n FROM "Notification"
  WHERE "createdAt" > $1 AND ("titleZh" LIKE '%投注失败%' OR "bodyZh" LIKE '%投注失败%')`, [since]);
console.log(`\n4 · 🔴 rows saying the bet never went through (投注失败) since the deploy … ${bad.rows[0].n} ${bad.rows[0].n === 0 ? "✅" : "🔴"}`);

await c.end();
console.log("");
if (!settled.rowCount) { console.log("⏳ INCONCLUSIVE — nothing settled in the window yet. Re-run after a round closes."); process.exit(3); }
if (!allCovered || bad.rows[0].n > 0) { console.log("🔴 NOT PROVEN — see the lines marked SILENT above."); process.exit(1); }
console.log("✅ PROVEN ON PRODUCTION — every Up & Down position settled since the deploy produced a bell row deep-linked to its own round.");
