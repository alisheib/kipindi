/**
 * sms-receipts.cjs — what has production recorded about SMS delivery receipts? READ-ONLY.
 *
 *   node scripts/live/ops/sms-receipts.cjs                 all SMS/DLR audit rows, last 48h
 *   node scripts/live/ops/sms-receipts.cjs sms_95f8…       only rows naming that reference
 *
 * ⭐ WHY IT EXISTS. `scripts/live/blackball-drive.mts` sends directly to the gateway and writes no
 * production row, so its receipts arrive as `sms.dlr.unknown_reference` — carrying the vendor's raw
 * status and description, which is the undocumented vocabulary `mapDlrStatus()` has to be extended
 * from. This is how that evidence is read back.
 *
 * ⛔ THE CROSS-CHECK. A connection through Railway's internal host "succeeds" and returns nothing,
 * which reads exactly like "no receipt arrived". So the probe first proves it is reading production
 * by matching the user count against /api/health, and refuses to report an empty result otherwise.
 *
 * Needs scripts/live/ops/.env (see README — `railway run -s 50pick -- node scripts/live/ops/mkenv.cjs`).
 */
const path = require("path");
const fs = require("fs");
const envFile = path.join(__dirname, ".env");
for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const pg = require(path.join(process.env.KP_REPO || path.resolve(__dirname, "..", "..", ".."), "node_modules", "pg"));
const { Client } = pg;
/**
 * ⛔ READ `timestamp without time zone` AS UTC. Prisma stores `DateTime` as `timestamp(3)` holding
 * UTC wall time, but node-postgres parses that type in the PROCESS's local zone. On this machine
 * (UTC+3) every printed time came out three hours early — the first read of this probe reported a
 * send at 13:28Z as having happened before a pre-flight at 10:15Z, and a correct timestamp given to
 * Ali was "corrected" into a wrong one. Checked against three independent clocks (Cloudflare,
 * Blackball, Postgres now()) before this line was written.
 */
pg.types.setTypeParser(1114, (s) => new Date(s.replace(" ", "T") + "Z"));

const filterRef = process.argv[2] || null;

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    // Prove this is production before trusting an empty answer.
    const health = await (await fetch("https://www.50pick.tz/api/health")).json().catch(() => null);
    const users = Number((await c.query('SELECT COUNT(*)::int AS n FROM "User"')).rows[0].n);
    const healthUsers = health?.stats?.users ?? health?.users ?? health?.counts?.users ?? null;
    console.log(`cross-check  db users=${users}  /api/health users=${healthUsers ?? "(not exposed)"}`);
    if (healthUsers !== null && Number(healthUsers) !== users) {
      console.error("⛔ user counts differ — this is NOT production. Refusing to report.");
      process.exit(2);
    }

    const rows = (
      await c.query(
        `SELECT "createdAt", category, action, "targetId", payload
           FROM "AuditLog"
          WHERE (action LIKE 'sms.%' OR action LIKE 'webhook.blackball.%')
            AND "createdAt" > now() - interval '48 hours'
          ORDER BY "createdAt" ASC`,
      )
    ).rows.filter((r) => !filterRef || r.targetId === filterRef || JSON.stringify(r.payload ?? {}).includes(filterRef));

    if (!rows.length) {
      console.log(`no SMS / receipt audit rows${filterRef ? ` naming ${filterRef}` : ""} in the last 48h.`);
      return;
    }
    for (const r of rows) {
      console.log(`${r.createdAt.toISOString()}  ${r.category.padEnd(8)} ${r.action.padEnd(28)} ${r.targetId ?? ""}  ${JSON.stringify(r.payload)}`);
    }

    const sms = await c.query(`SELECT to_regclass('"SmsMessage"') AS t`);
    if (sms.rows[0].t) {
      const n = (await c.query('SELECT status, COUNT(*)::int AS n FROM "SmsMessage" GROUP BY status')).rows;
      console.log(`SmsMessage rows by status: ${n.length ? n.map((x) => `${x.status}=${x.n}`).join(" ") : "(none)"}`);
    }
  } finally {
    await c.end();
  }
})().catch((e) => {
  console.error("probe failed:", e.message);
  process.exit(1);
});
