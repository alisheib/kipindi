// The ONE read-only production count Ali pre-approved (2026-10-22): the size of the "SmsMessage" table, numbers only,
// before S6's migration adds a unique partial index on it. A READ ONLY transaction, rolled back; the URL is read from the
// gitignored env file and never printed.
const fs = require("fs");
const { createRequire } = require("module");
const req = createRequire("C:/50pick-ssd/maswali-coord-20261019/package.json");
const { Client } = req("pg");
const line = fs.readFileSync("F:/kipindi-main/.env.qa.local", "utf8").split(/\r?\n/).find((l) => l.startsWith("PROD_DATABASE_PUBLIC_URL="));
if (!line) { console.log("no PROD_DATABASE_PUBLIC_URL"); process.exit(2); }
const url = line.slice("PROD_DATABASE_PUBLIC_URL=".length).trim().replace(/^["']|["']$/g, "");
(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, statement_timeout: 30000 });
  await c.connect();
  try {
    await c.query("BEGIN TRANSACTION READ ONLY");
    const n = await c.query('SELECT count(*)::bigint AS rows FROM "SmsMessage"');
    const s = await c.query(`SELECT pg_size_pretty(pg_total_relation_size('"SmsMessage"')) AS total, pg_size_pretty(pg_relation_size('"SmsMessage"')) AS heap`);
    console.log(`SmsMessage rows: ${n.rows[0].rows} · total size: ${s.rows[0].total} · table heap: ${s.rows[0].heap}`);
  } finally {
    await c.query("ROLLBACK").catch(() => {});
    await c.end();
  }
})().catch((e) => { console.log("read failed:", e.message.replace(/postgres(ql)?:\/\/\S+/g, "<url>")); process.exit(1); });
