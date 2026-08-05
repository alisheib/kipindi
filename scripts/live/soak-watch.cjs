/**
 * SOAK WATCHER — one line per round a RUNNING chain finishes, plus every failure shape.
 *
 *   railway run -s 50pick -- node scripts/live/soak-watch.cjs [minutes]
 *
 * ⛔ IT MUST SPEAK UP WHEN THINGS GO WRONG, NOT ONLY WHEN THEY GO RIGHT. A watcher that
 * printed only settled rounds would be SILENT through exactly the failure it is watching for:
 * E-83's chain emitted nothing but voids, and a filter tuned to success would have reported an
 * hour of calm. So it emits on every terminal outcome — UP, DOWN and every VOID reason — and
 * separately on a round that has passed its own abandon deadline without resolving, and on a
 * chain that has stopped emitting at all.
 *
 * ⚠️ §3: `::text`-cast every timestamp. node-postgres builds a Date from a naive timestamp using
 * the LAPTOP's zone, which is 3 hours out here and has manufactured a fake finding before.
 * Elapsed times are computed in SQL against the DATABASE's own now(), never against this
 * machine's clock — which is ~93 seconds slow.
 */
const { Client } = require("pg");

const MINUTES = Number(process.argv[2] ?? 60);
const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!url) { console.error("no DATABASE_URL — run under `railway run -s 50pick --`"); process.exit(2); }

const SQL = `
  select r."id", a."key" as asset, c."durationMinutes" as dur, c."state" as chain_state,
         r."roundNumber" as n, r."outcome"::text as outcome,
         coalesce(r."voidReason",'-') as void_reason,
         r."boundaryAt"::text as boundary,
         r."openPrice" is null as no_open_price,
         round(extract(epoch from (now() - r."boundaryAt"))::numeric) as age_s,
         r."resolvedAt" is null as unresolved
  from "UpDownRound" r
  join "UpDownChain" c on c."id" = r."chainId"
  join "UpDownAsset" a on a."id" = c."assetId"
  where r."boundaryAt" > now() - interval '90 minutes'
  order by r."boundaryAt"
`;

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const seen = new Map();          // round id -> last reported state
  const started = Date.now();
  let quietPolls = 0, lastCount = -1;

  const poll = async () => {
    const { rows } = await c.query(SQL);
    for (const r of rows) {
      // A round is reported when it reaches a terminal state, and again if it goes overdue.
      const state = r.unresolved ? (Number(r.age_s) > 390 ? "OVERDUE" : "open") : `${r.outcome}/${r.void_reason}`;
      if (seen.get(r.id) === state) continue;
      seen.set(r.id, state);
      if (state === "open") continue;                       // not news
      if (state === "OVERDUE") {
        console.log(`🔴 OVERDUE ${r.asset} ${r.dur}m #${r.n} boundary ${r.boundary} — ${r.age_s}s, past the 390s deadline`);
        continue;
      }
      const bad = r.outcome === "VOID";
      const mark = bad ? (r.void_reason === "source-failed" ? "🔴" : "⚠️") : "✅";
      console.log(
        `${mark} ${r.asset} ${r.dur}m #${r.n} ${r.boundary} → ${r.outcome}` +
        `${bad ? ` (${r.void_reason})` : ""}${r.no_open_price ? " ⛔ NO OPEN PRICE" : ""}`,
      );
    }
    // A chain that stops producing is a failure too, and it is the silent one.
    const running = rows.filter((r) => r.chain_state === "RUNNING");
    if (running.length === lastCount) quietPolls++; else { quietPolls = 0; lastCount = running.length; }
    if (quietPolls === 8) console.log(`⚠️ no new round in ~8 minutes on a RUNNING chain — it may have stopped emitting`);
  };

  await poll();
  const timer = setInterval(async () => {
    try { await poll(); } catch (e) { console.log(`⚠️ poll failed: ${e.message}`); }
    if (Date.now() - started > MINUTES * 60_000) {
      clearInterval(timer);
      const { rows } = await c.query(SQL);
      const mine = rows.filter((r) => r.chain_state === "RUNNING" || seen.has(r.id));
      const voids = mine.filter((r) => r.outcome === "VOID");
      const sf = voids.filter((r) => r.void_reason === "source-failed");
      console.log(
        `SUMMARY after ${MINUTES}m — ${mine.length} rounds · ` +
        `${mine.filter((r) => r.outcome && r.outcome !== "VOID").length} settled · ` +
        `${voids.length} void (${sf.length} source-failed) · ` +
        `${mine.filter((r) => r.unresolved).length} still open`,
      );
      await c.end();
      process.exit(0);
    }
  }, 60_000);
})().catch((e) => { console.error("WATCH ERROR", e.message); process.exit(1); });
