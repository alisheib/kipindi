/**
 * Read-only live query runner. Reads SQL from a FILE, prints one JSON array on stdout.
 *
 *   railway run -s 50pick -- node scripts/live/q.cjs <path-to-sql-file>
 *
 * ⚠️ SQL comes from a file, never from `node -e` or an inline argument. Escaping a
 * multi-line query through cmd.exe → node -e mangles the backslashes and dies on
 * "Expected unicode escape"; a file has no escaping layer at all.
 *
 * ⚠️ §3: node-postgres builds a JS Date from a `timestamp WITHOUT time zone` using the
 * LAPTOP's zone, shifting UTC values by −3h here. Always `::text`-cast timestamps in the
 * query itself rather than trusting the driver.
 */
const { readFileSync } = require("node:fs");
const { Client } = require("C:/kipindi-main/node_modules/pg");

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/live/q.cjs <sql-file>"); process.exit(2); }

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!url) { console.error("no DATABASE_URL — run under `railway run -s 50pick --`"); process.exit(2); }

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(readFileSync(file, "utf8"));
  process.stdout.write(JSON.stringify(r.rows));
  await c.end();
})().catch((e) => { console.error("QUERY ERROR", e.message); process.exit(1); });
