#!/usr/bin/env node
/**
 * market-config-diff.cjs — snapshot the LIVE `market.config` and diff two snapshots.
 *
 *   node scripts/live/ops/market-config-diff.cjs save before
 *   node scripts/live/ops/market-config-diff.cjs diff before after
 *
 * ⛔ WHY THIS EXISTS. `/admin/config` posts EVERY field, and `persist()` writes the whole
 * config snapshot — so a save intended to change one number rewrites all of them from whatever
 * the form happened to render. `docs/RULES.md` §2.3 records exactly this costing a live defect:
 * an unrelated save re-froze a retired TZS 500 stake floor and production charged it for
 * nineteen days. A form default is not a live setting.
 *
 * So any deliberate change to one field is bracketed by a FULL snapshot either side, and the
 * diff must show that field and nothing else. Restoring is only believable if the restore is
 * byte-identical to the original.
 *
 * Snapshots are written beside this script and are gitignored along with `.env`.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || path.resolve(__dirname, "..", "..", ".."), "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const dir = path.join(__dirname, ".cfg-snapshots");
const file = (name) => path.join(dir, `${name}.json`);

async function read() {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`select value from "SystemConfig" where key = 'market.config'`);
  await c.end();
  if (!r.rows.length) throw new Error("market.config not found — is this really production?");
  return r.rows[0].value;
}

/** Flatten so nested objects diff field by field rather than as one opaque blob. */
function flat(o, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(o ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flat(v, key, out);
    else out[key] = JSON.stringify(v);
  }
  return out;
}

(async () => {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === "save") {
    fs.mkdirSync(dir, { recursive: true });
    const v = await read();
    fs.writeFileSync(file(a), JSON.stringify(v, null, 1));
    console.log(`saved snapshot "${a}"  objectionWindowHours=${v?.global?.objectionWindowHours}`);
    return;
  }
  if (cmd === "diff") {
    const A = flat(JSON.parse(fs.readFileSync(file(a), "utf8")));
    const B = b === "live" ? flat(await read()) : flat(JSON.parse(fs.readFileSync(file(b), "utf8")));
    const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])].sort();
    const changed = keys.filter((k) => A[k] !== B[k]);
    if (!changed.length) { console.log(`✅ IDENTICAL — "${a}" and "${b}" agree on all ${keys.length} fields.`); return; }
    console.log(`🔴 ${changed.length} field(s) differ between "${a}" and "${b}":`);
    for (const k of changed) console.log(`   ${k}:  ${A[k] ?? "(absent)"}  ->  ${B[k] ?? "(absent)"}`);
    process.exit(1);
  }
  console.error("usage: market-config-diff.cjs save <name> | diff <a> <b|live>");
  process.exit(2);
})().catch((e) => { console.error(e); process.exit(2); });
