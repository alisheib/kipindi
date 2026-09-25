// The house desk's production read — SELECT-only, and unable to be anything else.
//
//   railway run --project <50pick> --environment production --service Postgres -- \
//     bash -c 'PROBE_DB_URL="$DATABASE_PUBLIC_URL" node plans/house-bots/tools/prod-probe.cjs'
//
// ⛔ The session is opened with default_transaction_read_only=on, so a write ERRORS rather than happens.
// ⛔ No id, account label, holder name or free-text reason is ever selected — the output is pasted into a PUBLIC repo.
// ⚠️ Every timestamp is rendered as TEXT in SQL. `x AT TIME ZONE 'z'` on a timestamptz yields a NAIVE value, and
//    node-pg re-parses a naive value in the LAPTOP's zone — that is how a 2026-09-24 instant once read as 09-21's.
const { Client } = require("pg");

const url = process.env.PROBE_DB_URL;
if (!url) { console.error("PROBE_DB_URL is unset — run this through `railway run` (see the header)."); process.exit(2); }
const c = new Client({ connectionString: url, options: "-c default_transaction_read_only=on" });
const EAT = (col) => `to_char(${col} AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM-DD HH24:MI:SS') || ' EAT'`;
const q = async (label, sql) => {
  try { const r = await c.query(sql); console.log(`\n## ${label}`); console.table(r.rows); }
  catch (e) { console.log(`\n## ${label} — ERROR ${e.message}`); }
};

(async () => {
  await c.connect();
  await q("clock", `SELECT ${EAT("now()")} AS now, current_setting('default_transaction_read_only') AS read_only`);
  await q("master switch", `SELECT enabled, ${EAT('"switchedAt"')} AS since, "offCause" FROM "HouseBotControl"`);
  await q("switch trail", `SELECT kind, ${EAT('"createdAt"')} AS at, ("actorId" IS NOT NULL) AS by_a_person
    FROM "HouseBotEvent" WHERE kind IN ('SWITCH_ON','SWITCH_OFF') ORDER BY "createdAt"`);
  await q("accounts", `SELECT status, count(*)::int AS n FROM "HouseBot" GROUP BY status ORDER BY status`);
  await q("engine beats", `SELECT round(extract(epoch FROM now() - "beatAt"))::int AS beat_age_s, "errorStreak"
    FROM "HouseBotRuntime" WHERE "beatAt" IS NOT NULL ORDER BY "beatAt" DESC LIMIT 3`);
  await q("placed per EAT day", `SELECT to_char("finishedAt" AT TIME ZONE 'Africa/Dar_es_Salaam','YYYY-MM-DD') AS day,
    count(*)::int AS placed, sum("stakeTzs")::bigint AS tzs FROM "HouseBotIntent" WHERE status = 'PLACED' GROUP BY 1 ORDER BY 1`);
  await q("how placed stakes ended", `SELECT p.status, count(*)::int AS n FROM "HouseBotIntent" i
    JOIN "Position" p ON p.id = i."positionId" WHERE i.status = 'PLACED' GROUP BY p.status ORDER BY n DESC`);
  await q("refusals, 48 h", `SELECT "reasonCode", count(*)::int AS n FROM "HouseBotIntent"
    WHERE "createdAt" > now() - interval '48 hours' AND "reasonCode" IS NOT NULL GROUP BY 1 ORDER BY n DESC LIMIT 8`);
  await c.end();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
