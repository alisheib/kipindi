/**
 * Search adoption guard.
 *
 * The defect this locks shut: TWELVE hand-rolled search implementations that did
 * not agree. Ten did a single contiguous `.toLowerCase().includes(q)`, so a
 * two-word query returned nothing; two did token-AND. Fixing them once is easy —
 * keeping them fixed is what needs a guard, because the cheapest way to add a
 * filter will always be to type `.includes()` again.
 *
 * Four rules:
 *   1. No `.toLowerCase().includes(` search filter outside src/lib/search.
 *      The ALLOWLIST below is the migration checklist. It must reach zero, and
 *      once it does, nothing may be added back to it without a reason in writing.
 *   2. No raw `type="search"` input outside the SearchBox atom.
 *   3. Every column named in fields.ts resolves to a real field in the Prisma
 *      schema — otherwise `queryToWhere` would emit a `where` on a column that
 *      does not exist and fail at runtime, in production, on an admin surface.
 *   4. `allowRegex` NEVER appears on a player route. Regex is admin-only by
 *      construction, not by convention: Postgres `~*` is an unindexable
 *      sequential scan that holds a pooled connection, and `admission.ts` sizes
 *      the bet gate off that same pool.
 *
 * Run: npm run test:search-adoption
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

/**
 * Files still doing their own substring search. GOAL: EMPTY.
 * Each entry must be a genuine non-search use or a scheduled migration.
 */
const ALLOWLIST = new Set<string>([
  // Not a search — these match a known token against a fixed set, not user text.
  "src/lib/server/txn-filters.ts",     // migrates with the SQL twin (money-adjacent, own deploy)
  "src/lib/server/ai-usage-dal.ts",    // ditto — the other SQL search
]);

/** Player routes must never enable regex. */
const PLAYER_ROUTE_RE = /^src[\\/]app[\\/](markets|results|live|proposals|positions|wallet|profile|leaderboard|watchlist|updown|help|fairness|legal|auth)[\\/]/;

const decomment = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

function walk(dir: string, re: RegExp): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, re));
    else if (re.test(e)) out.push(p);
  }
  return out;
}

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("Search adoption guard\n");

const files = walk(SRC, /\.(tsx?|mts)$/);

// ── 1. No hand-rolled substring search ───────────────────────────────────────
const strays: string[] = [];
for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  if (rel.startsWith("src/lib/search/")) continue;
  if (ALLOWLIST.has(rel)) continue;
  const src = decomment(readFileSync(f, "utf8"));
  // The exact shape the ten defective call sites used.
  if (/\.toLowerCase\(\)\s*\.includes\(/.test(src)) strays.push(rel);
}
check("no hand-rolled `.toLowerCase().includes()` search outside src/lib/search",
  strays.length === 0, strays.length ? strays.join(", ") : "");

log(`  (allowlist holds ${ALLOWLIST.size} file(s) — target is 0)`);

// ── 2. One search input ──────────────────────────────────────────────────────
const rawInputs: string[] = [];
for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  if (rel === "src/components/ui/search-box.tsx") continue;
  const src = decomment(readFileSync(f, "utf8"));
  if (/type=["']search["']/.test(src)) rawInputs.push(rel);
}
check("no raw type=\"search\" input outside the SearchBox atom",
  rawInputs.length === 0, rawInputs.join(", "));

// ── 3. Registry columns exist in the Prisma schema ───────────────────────────
const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8");
const fieldsSrc = readFileSync(join(SRC, "lib", "search", "fields.ts"), "utf8");
// Skip schemas explicitly marked `viewModel: true` — their names are a
// client-side shape (masked PII, flattened titles), not table columns, and they
// are never passed to queryToWhere.
const clean = decomment(fieldsSrc);
const blocks = clean.split(/export const /).filter((b) => b.includes("EntitySchema"));
const cols = new Set<string>();
for (const b of blocks) {
  if (/viewModel:\s*true/.test(b)) continue;
  for (const m of b.matchAll(/columns:\s*\[([^\]]+)\]/g)) {
    for (const c of m[1].split(",")) {
      const name = c.trim().replace(/^["']|["']$/g, "");
      if (name) cols.add(name);
    }
  }
}
// Computed, documented as JS-only in fields.ts — it has no column by design.
const COMPUTED = new Set(["displayLabel"]);
const missing = [...cols].filter((c) => !COMPUTED.has(c) && !new RegExp(`^\\s*${c}\\s`, "m").test(schema));
check("every searchable column exists in prisma/schema.prisma",
  missing.length === 0, missing.join(", "));

// ── 4. Regex is admin-only, by construction ──────────────────────────────────
const leaked: string[] = [];
for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  if (!PLAYER_ROUTE_RE.test(rel.replace(/\//g, "/"))) continue;
  const src = decomment(readFileSync(f, "utf8"));
  if (/allowRegex/.test(src)) leaked.push(rel);
}
check("allowRegex appears on NO player route", leaked.length === 0, leaked.join(", "));

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILURE(S)`} — ${files.length} source files`);
process.exit(fail ? 1 : 0);
