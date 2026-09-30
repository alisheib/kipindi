/**
 * qa:short-title-fit — READ-ONLY. What production's OPEN markets would put on a card today, per language
 * (the Vodacom plan S2, 2026-09-30). The pure half of the Done-when is `test:short-title-fit`; this is the half that
 * needs the rows, and it is a `qa:` key on purpose — `test:all` must never need a connection string.
 *
 *   npm run qa:short-title-fit
 *       reads PROD_DATABASE_PUBLIC_URL — from the environment, else from `.env.qa.local` (LIVE-QA-CAMPAIGN's recipe)
 *   railway run -s 50pick -- npx tsx scripts/qa-short-title-fit.mjs
 *       reads DATABASE_PUBLIC_URL, else DATABASE_URL rewritten onto the public proxy (`scripts/live/db.cjs`)
 *
 * WHAT IT READS: every open long-form market — status LIVE, selection not yet closed, productLine MARKET. The
 * "Demo · " rows no player sees are counted and left out; Up & Down rounds are out of S2 and are not read. For each
 * language it reports how many cards show a short title within budget, how many fall back to the full title (the
 * backfill's remaining work), and every STORED short title that breaks the rules of `src/lib/markets/short-title.ts`
 * — the module every writer uses, imported here, never copied.
 *
 * EXIT: 0 clean (fallbacks are work, not failure) · 1 a stored short title or competition key breaks the rules ·
 *       2 it could not read at all (no URL, no connection, or a session that would not go read-only).
 *
 * ⛔ READ-ONLY, TWICE OVER. Every statement goes through `select()`, which refuses anything that is not ONE plain
 * SELECT — and that refusal is itself proven against a write before the first connection. The session is opened with
 * `default_transaction_read_only=on`, and that is PROVEN (by a SELECT) before the first row is read.
 * ⛔ IT SAYS WHICH HOST IT READ — loopback, production or unrecognised — so a report about a laptop's database cannot
 * pass for production's. The URL itself is never printed (it carries the password).
 * ⚠️ Run it through tsx (the npm script does): it imports the rules module, which is TypeScript.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connect, publicUrl } from "./live/db.cjs";
import {
  SHORT_TITLE_MAX, SHORT_TITLE_LOCALES, HARD_ISSUES, codePoints, cleanShortTitle, shortTitleIssues, shortTitleFor,
} from "../src/lib/markets/short-title.ts";
import { isCompetition } from "../src/lib/markets/competitions.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIELD = { en: "shortTitleEn", sw: "shortTitleSw", zh: "shortTitleZh" };
const DEMO_PREFIX = "Demo " + String.fromCharCode(0xB7) + " ";

/* ══ THE SELECT-ONLY GUARD ═══════════════════════════════════════════════════ */

/** Words that have no place in a read. Checked with string literals and quoted identifiers blanked out, so a
 *  column called "updatedAt" or a literal 'LIVE' can never trip it, and a keyword hidden in one can never pass. */
const NOT_A_READ = /\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|copy|call|do|lock|vacuum|analyze|reindex|cluster|refresh|comment|set|reset|begin|commit|rollback|savepoint|prepare|execute|listen|notify|discard|into)\b/i;

function assertSelect(sql) {
  const bare = sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""')
    .trim()
    .replace(/;\s*$/, "");
  if (!/^select\b/i.test(bare)) throw new Error(`REFUSED — not a SELECT: ${bare.slice(0, 70)}`);
  if (bare.includes(";")) throw new Error("REFUSED — more than one statement");
  const word = NOT_A_READ.exec(bare);
  if (word) throw new Error(`REFUSED — "${word[1]}" has no place in a read: ${bare.slice(0, 70)}`);
}

/** The ONLY way this script talks to the database. */
async function select(client, sql, params = []) {
  assertSelect(sql);
  return (await client.query(sql, params)).rows;
}

/** CONTROL, before any connection: the guard refuses writes (including one hidden after a SELECT) and passes a read. */
{
  const refuses = (sql) => { try { assertSelect(sql); return false; } catch { return true; } };
  const proven =
    refuses(`update "PredictionMarket" set "shortTitleSw" = null`)
    && refuses(`select 1; drop table "PredictionMarket"`)
    && refuses(`with x as (delete from "PredictionMarket" returning id) select * from x`)
    && refuses(`select * into "Copy" from "PredictionMarket"`)
    && !refuses(`select "updatedAt", 'set' as label from "PredictionMarket" where status::text = 'LIVE'`);
  if (!proven) { console.error("REFUSING TO RUN: the SELECT-only guard failed its own control."); process.exit(2); }
}

/* ══ WHERE TO READ ═══════════════════════════════════════════════════════════ */

function fromQaEnv(key) {
  const p = join(ROOT, ".env.qa.local");
  if (!existsSync(p)) return undefined;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z_0-9]+)=(.*)$/.exec(line);
    if (m && m[1] === key) return m[2].trim();
  }
  return undefined;
}

const SOURCES = [
  ["PROD_DATABASE_PUBLIC_URL", process.env.PROD_DATABASE_PUBLIC_URL],
  ["PROD_DATABASE_PUBLIC_URL from .env.qa.local", fromQaEnv("PROD_DATABASE_PUBLIC_URL")],
  ["DATABASE_PUBLIC_URL", process.env.DATABASE_PUBLIC_URL],
  ["DATABASE_URL", process.env.DATABASE_URL],
];
const picked = SOURCES.find(([, v]) => typeof v === "string" && v.length > 0);
if (!picked) {
  console.error("No database to read. Set PROD_DATABASE_PUBLIC_URL (or keep it in .env.qa.local), or run under");
  console.error("  railway run -s 50pick -- npx tsx scripts/qa-short-title-fit.mjs");
  process.exit(2);
}
const [sourceName, rawUrl] = picked;
let url;
try { url = new URL(publicUrl(rawUrl)); }
catch { console.error(`${sourceName} is not a URL — refusing.`); process.exit(2); }
const host = url.hostname;
if (host.endsWith(".railway.internal")) {
  console.error(`REFUSING: ${sourceName} still points at ${host}, which only resolves inside Railway.`);
  process.exit(2);
}
const where = /^(localhost|127(?:\.\d+){3}|\[?::1\]?)$/.test(host)
  ? "LOOPBACK — a local database, NOT production"
  : /\.rlwy\.net$|\.railway\.app$/.test(host)
    ? "PRODUCTION (Railway's public proxy)"
    : "an UNRECOGNISED host — not known to be production";
// Belt and braces: the session itself refuses writes. Not a statement, so it does not pass through select().
url.searchParams.set("options", "-c default_transaction_read_only=on");

/* ══ THE READ ════════════════════════════════════════════════════════════════ */

let client;
try { client = await connect(url.toString()); }
catch (e) { console.error(`Could not connect to ${host}: ${e instanceof Error ? e.message : String(e)}`); process.exit(2); }

try {
  const [session] = await select(client, `select current_setting('transaction_read_only') as ro, now()::text as clock`);
  if (session?.ro !== "on") {
    console.error(`REFUSING: the session on ${host} did not go read-only (transaction_read_only = ${session?.ro}).`);
    process.exitCode = 2;
  } else {
    console.log(`qa:short-title-fit — READ-ONLY · host ${host}${url.port ? `:${url.port}` : ""} · ${where}`);
    console.log(`  via ${sourceName} · session read-only ${session.ro} · database clock ${session.clock}`);
    process.exitCode = await report(client);
  }
} catch (e) {
  console.error(`READ FAILED on ${host}: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 2;
} finally {
  await client.end().catch(() => {});
}

async function report(c) {
  const cols = (await select(c, `select column_name::text as col from information_schema.columns
      where table_name = 'PredictionMarket' and column_name in ('shortTitleEn', 'shortTitleSw', 'shortTitleZh', 'competition')`))
    .map((r) => r.col);
  const hasColumns = cols.length === 4;
  const rows = await select(c, `select id, "titleEn", "titleSw", "titleZh"${hasColumns ? `, "shortTitleEn", "shortTitleSw", "shortTitleZh", "competition"` : ""}
      from "PredictionMarket"
     where status::text = 'LIVE' and "productLine" = 'MARKET'
       and ("selectionClosedAt" is null or "selectionClosedAt" > (now() at time zone 'UTC'))
     order by "resolutionAt" asc`);
  const open = rows.filter((r) => !String(r.titleEn ?? "").startsWith(DEMO_PREFIX));
  console.log(`\n  ${open.length} open long-form market(s)${rows.length - open.length ? ` (+ ${rows.length - open.length} "Demo" row(s) no player sees, left out)` : ""}`);
  if (!hasColumns) {
    console.log(`  ⚠ The S2 columns are NOT on this database yet (found ${cols.length} of 4): migration 20260930200000 is not deployed.`);
    console.log(`    Every card falls back to its full title — ${open.length * 3} market-language(s) of backfill work, and nothing stored to break.`);
    return 0;
  }

  const within = { en: 0, sw: 0, zh: 0 };
  const fallback = { en: 0, sw: 0, zh: 0 };
  const broken = { en: 0, sw: 0, zh: 0 };
  const violations = [];
  const warnings = [];
  let noneAtAll = 0, withCompetition = 0;
  for (const r of open) {
    let any = false;
    for (const l of SHORT_TITLE_LOCALES) {
      const stored = r[FIELD[l]];
      const shown = shortTitleFor(l, r);
      if (!shown) {
        fallback[l]++;
        // NULL is "no short title". A stored blank is not NULL — some writer skipped the normaliser.
        if (typeof stored === "string" && stored.length > 0) violations.push({ id: r.id, what: l, issues: ["stored_blank"], value: stored });
        continue;
      }
      const full = l === "en" ? r.titleEn : l === "sw" ? r.titleSw : r.titleZh;
      const ctx = {
        full: typeof full === "string" && full.trim() ? full : r.titleEn,
        englishFull: r.titleEn,
        englishShort: l === "en" ? null : shortTitleFor("en", r),
      };
      const issues = shortTitleIssues(l, shown, ctx);
      const hard = issues.filter((i) => HARD_ISSUES.has(i));
      if (cleanShortTitle(l, shown) !== shown) hard.push("not_stored_clean");
      if (hard.length) {
        broken[l]++;
        violations.push({ id: r.id, what: l, issues: hard, value: shown, size: `${codePoints(shown)}/${SHORT_TITLE_MAX[l]}` });
      } else {
        within[l]++;
        any = true;
      }
      if (issues.includes("number_drift")) warnings.push({ id: r.id, what: l, value: shown });
    }
    if (!any) noneAtAll++;
    if (r.competition != null) {
      if (isCompetition(r.competition)) withCompetition++;
      else violations.push({ id: r.id, what: "competition", issues: ["unknown_key"], value: r.competition });
    }
  }

  console.log("");
  for (const l of SHORT_TITLE_LOCALES) {
    console.log(`  ${l}: ${within[l]} within budget (≤ ${SHORT_TITLE_MAX[l]}) · ${fallback[l]} fall back to the full title · ${broken[l]} BREAK THE RULES`);
  }
  console.log(`  competition: ${withCompetition} of ${open.length} carry a known key`);
  if (warnings.length) {
    console.log(`\n  WARNINGS — ${warnings.length} short title(s) carry a number the full question does not (an officer may have accepted it):`);
    for (const w of warnings.slice(0, 20)) console.log(`    ${w.id} [${w.what}] ${JSON.stringify(w.value)}`);
  }
  if (violations.length) {
    console.log(`\n  VIOLATIONS — ${violations.length} stored value(s) break the rules of src/lib/markets/short-title.ts:`);
    for (const v of violations.slice(0, 50)) {
      console.log(`    ${v.id} [${v.what}] ${v.issues.join(",")}${v.size ? ` ${v.size}` : ""} ${JSON.stringify(v.value)}`);
    }
  }
  const remaining = fallback.en + fallback.sw + fallback.zh;
  console.log(`\n  BACKFILL REMAINING: ${remaining} market-language(s) fall back (en ${fallback.en} · sw ${fallback.sw} · zh ${fallback.zh});`);
  console.log(`  ${noneAtAll} of ${open.length} open market(s) have no usable short title in any language.`);
  console.log(violations.length ? "\n  RESULT: RED — a stored short title breaks the rules." : "\n  RESULT: clean — nothing stored breaks the rules.");
  return violations.length ? 1 : 0;
}
