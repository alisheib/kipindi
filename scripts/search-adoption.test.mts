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
import { decomment } from "./lib/decomment.mts";

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

// ── 5. What is ADVERTISED is what is EXECUTED ────────────────────────────────
/**
 * The defect (2026-08-11, `regex-advertised-never-executed`): three admin surfaces
 * passed `allowRegex` to SearchBox — which makes SearchHelp render the regex row —
 * while EVERY call site that actually filters called `parseQuery` without it. The
 * flag reached exactly one thing: SearchBox's own echo line. So an operator typing
 * `/^mkt_8/` saw the help chip, saw the echo read "pattern", and got zero rows —
 * three independent signals that the pattern had run, over a filter that had
 * matched the literal characters `/^mkt_8/` and found nothing.
 *
 * ⛔ THE OBVIOUS GUARD IS THE USELESS ONE. Asserting that `allowRegex: true` appears
 * at the filtering call sites just re-states the fix; the whole defect is that the
 * string was present in one place and absent in another, so a check that greps for
 * it in one place cannot see the disagreement. This asserts the AGREEMENT.
 *
 * The join key is structural and needs no hand-maintained map: an advertising
 * surface always names its entity in the same JSX element it advertises in
 * (`helpFields={fieldNames(POLL_SEARCH)} allowRegex`), and every executing call
 * site names the same schema (`parseQuery(q, { fields: fieldNames(POLL_SEARCH) })`).
 * So: if a schema is advertised anywhere, every non-player parse of it must honour
 * the advertisement.
 *
 * Player routes are excluded because rule 4 above forbids regex there outright —
 * requiring it here would make the two rules contradict each other on any schema
 * shared between an admin and a player surface (MARKET_SEARCH is).
 */
/**
 * The search atom — the two kit files that DEFINE the flag rather than use it.
 * `search-box.tsx` takes it as a prop and forwards it; `search-help.tsx` is what
 * renders the regex row, i.e. it IS the advertisement's implementation. Neither is
 * a surface, so neither can be reconciled against a `<SearchBox/>` element.
 */
const SEARCH_ATOM = new Set(["src/components/ui/search-box.tsx", "src/components/ui/search-help.tsx"]);

/** Text between `open(` and its matching `)` — parseQuery calls span lines. */
function balanced(src: string, from: number): string {
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")") { depth--; if (depth === 0) return src.slice(from + 1, i); }
  }
  return "";
}

const advertised = new Set<string>();
const executed = new Map<string, { rel: string; regex: boolean }[]>();
/** Files mentioning allowRegex at all — the reconciliation population, see below. */
const mentionsFlag = new Set<string>();
let adElements = 0;

for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  if (SEARCH_ATOM.has(rel)) continue; // the atom itself — it is the messenger, not a surface
  const src = decomment(readFileSync(f, "utf8"));
  if (/\ballowRegex\b/.test(src)) mentionsFlag.add(rel);

  // ADVERTISED — a <SearchBox …> element carrying both `allowRegex` and its schema.
  for (const m of src.matchAll(/<SearchBox\b([^<]*?)\/>/g)) {
    const el = m[1];
    if (!/\ballowRegex\b/.test(el)) continue;
    adElements++;
    const schema = el.match(/fieldNames\(\s*(\w+_SEARCH)\s*\)/);
    check(`advertising SearchBox in ${rel} names its entity schema`, !!schema,
      "allowRegex with no fieldNames(X_SEARCH) — the guard cannot tell what it filters");
    if (schema) advertised.add(schema[1]);
  }

  // EXECUTED — a parseQuery call, the schema it filters, and whether it honours regex.
  for (const m of src.matchAll(/\bparseQuery\s*\(/g)) {
    const args = balanced(src, m.index! + m[0].length - 1);
    const schema = args.match(/fieldNames\(\s*(\w+_SEARCH)\s*\)/);
    if (!schema) continue;
    if (PLAYER_ROUTE_RE.test(rel)) continue; // rule 4 owns these
    const list = executed.get(schema[1]) ?? [];
    list.push({ rel, regex: /\ballowRegex\b/.test(args) });
    executed.set(schema[1], list);
  }
}

const broken: string[] = [];
for (const schema of advertised) {
  for (const site of executed.get(schema) ?? []) {
    if (!site.regex) broken.push(`${schema} advertised, but ${site.rel} parses it without allowRegex`);
  }
}
check("every schema advertised as regex-capable is parsed with allowRegex",
  broken.length === 0, broken.join(" · "));

// A schema advertised but never executed anywhere is the same lie by omission.
const orphanAds = [...advertised].filter((s) => !(executed.get(s) ?? []).length);
check("every advertised schema has at least one non-player parse site",
  orphanAds.length === 0, orphanAds.join(", "));

/**
 * ⛔ RECONCILIATION — what stops the two checks above from passing VACUOUSLY.
 *
 * Everything above hangs off one regex, `<SearchBox …/>`. The day someone writes
 * `<SearchBox …></SearchBox>`, or wraps it, that regex matches nothing, `advertised`
 * is empty, and BOTH checks go green while reporting on an empty set — a guard whose
 * silence means "I found nothing to look at", rendered identically to "I looked and
 * it was fine". That is the failure this repo has already paid for four times on the
 * handoff locator (E-108): a check and its own proof agreeing on the wrong anchor.
 *
 * So: every file that MENTIONS the flag must also have yielded a parsed advertising
 * element. Mentions are cheap to count and impossible to miss; parsed elements are
 * the thing that can silently fall to zero. If they diverge, the parser has drifted
 * from the JSX and the guard says so instead of passing.
 *
 * ⚠️ AND THIS RECONCILIATION CAUGHT ITSELF BEING WRONG ONCE, WHICH IS WHY THE
 * ATTRIBUTE CLASS IS `[^<]` AND NOT `[\s\S]`. Rewriting one SearchBox as
 * `></SearchBox>` — the exact drift above — did NOT go red, because a lazy
 * `[\s\S]*?` simply ran past the closing tag to the NEXT `/>` in the file and
 * stitched two elements into one phantom advertisement that still contained both
 * `allowRegex` and a `fieldNames(…)`. The reconciliation shared that matcher, so it
 * agreed. `[^<]` cannot leave the element it started in. ⛔ A reconciliation built on
 * the same locator as the thing it reconciles is not independent — it only catches
 * the matcher matching too LITTLE, never too much.
 */
const unparsed = [...mentionsFlag].filter((rel) => {
  const src = decomment(readFileSync(join(ROOT, rel), "utf8"));
  const parsed = [...src.matchAll(/<SearchBox\b([^<]*?)\/>/g)].filter((m) => /\ballowRegex\b/.test(m[1]));
  const isCallSite = /\bparseQuery\s*\(/.test(src);   // execution sites mention it legitimately
  return parsed.length === 0 && !isCallSite;
});
check("every file mentioning allowRegex was actually PARSED as an advertisement",
  unparsed.length === 0,
  unparsed.length ? `${unparsed.join(", ")} — the <SearchBox/> matcher has drifted from the JSX` : "");
check("the advertisement matcher found something at all", adElements > 0,
  "0 advertising elements parsed — the checks above would be vacuous");

log(`  (advertised: ${[...advertised].join(", ") || "none"} · parse sites checked: ${[...executed.values()].flat().length})`);

// ── 6. A url-mode SearchBox OWNS its param — the file may not keep a second copy ─
/**
 * The defect (S-06, scan #1, 2026-08-28, `/admin/candidates`): the toolbar mounted a
 * url-mode <SearchBox/> — which holds the input in its OWN state and debounces it into
 * `?q` — and ALSO kept a `useState` seeded from `?q` at mount, behind a primary
 * "Search" button that pushed that second copy. Nothing ever wrote the second copy
 * except the Clear handler, setting it to "".
 *
 * So the button was inert on a fresh load, and after a Clear it was DESTRUCTIVE: the
 * officer types a query (the atom debounces it into `?q`), clicks the largest affordance
 * on the rail, and `push({ q: "" })` wipes it. The strongest control on the bar undid
 * the work.
 *
 * ⛔ THE OBVIOUS GUARDS ARE THE USELESS ONES, and all three were considered:
 *   · "no dead useState" — a lint, and it would NOT have fired. `search` was read; the
 *     button read it. Deadness was never the defect.
 *   · "no button labelled Search beside a SearchBox" — a VOCABULARY check. A rename to
 *     "Apply" walks straight past it and the harm is identical.
 *   · "nothing else writes ?q in this file" — a SYNTAX check, and it is actively WRONG
 *     here: three files legitimately carry `?q` forward (results/page.tsx preserves it
 *     across pagination, transactions/page.tsx re-submits it in a hidden input, and
 *     markets/page.tsx has an unrelated i18n key spelled `q:`). Carrying a value forward
 *     is not owning it, and a guard that cannot tell the difference would have to be
 *     suppressed on three files — at which point it guards nothing.
 *
 * The defect is TWO OWNERS of one piece of state. That is a relationship, not a spelling,
 * so this asserts the relationship: mount a url-mode SearchBox and the file has handed
 * `?<param>` to the atom. A React state seeded from that same param is a second home for
 * the value, and two homes cannot stay in agreement — whatever the control that reads it
 * happens to be called.
 */
const secondOwners: string[] = [];
let urlModeBoxes = 0;
const rendersBox = new Set<string>();

for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  if (SEARCH_ATOM.has(rel)) continue; // the atom defines the prop; it is not a surface
  const src = decomment(readFileSync(f, "utf8"));
  if (/<SearchBox\b/.test(src)) rendersBox.add(rel);

  for (const m of src.matchAll(/<SearchBox\b([^<]*?)\/>/g)) {
    const el = m[1];
    if (/\bmode=\{?"controlled"/.test(el)) continue; // client-only filter — owns no param
    urlModeBoxes++;
    const param = el.match(/\bparam=\{?"(\w+)"/)?.[1] ?? "q";
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Names bound to this param in the file (`const cur = searchParams.get("q") ?? ""`).
    const aliases = new Set<string>();
    for (const g of src.matchAll(
      new RegExp(`const\\s+(\\w+)\\s*=\\s*searchParams\\.get\\(\\s*["']${esc(param)}["']\\s*\\)`, "g"),
    )) {
      aliases.add(g[1]);
    }

    // A useState seeded from the param — directly, or through one of those names.
    for (const u of src.matchAll(/useState(?:<[^>]*>)?\(\s*([^)]*)\)/g)) {
      const seed = u[1];
      const direct = new RegExp(`searchParams\\.get\\(\\s*["']${esc(param)}["']`).test(seed);
      const viaAlias = [...aliases].some((a) => new RegExp(`\\b${esc(a)}\\b`).test(seed));
      if (direct || viaAlias) {
        secondOwners.push(
          `${rel} — useState(${seed.trim()}) duplicates ?${param}, already owned by the url-mode <SearchBox/>`,
        );
      }
    }
  }
}
check("no file keeps a React copy of a param its url-mode SearchBox already owns",
  secondOwners.length === 0, secondOwners.join(" · "));

/**
 * ⛔ RECONCILIATION — the check above hangs off the same `<SearchBox …/>` locator as §5
 * and inherits its failure mode: reformat the JSX to `></SearchBox>` and the matcher
 * yields nothing, so the check passes while reporting on an empty set. §5 paid for that
 * once already (hence `[^<]` and not `[\s\S]`). A count alone is not enough either — a
 * file could render a box the matcher never parsed — so both are asserted.
 */
check("the url-mode SearchBox matcher found something at all", urlModeBoxes > 0,
  "0 url-mode <SearchBox/> elements parsed — the ownership check above would be vacuous");
const unparsedBoxes = [...rendersBox].filter((rel) => {
  const src = decomment(readFileSync(join(ROOT, rel), "utf8"));
  return [...src.matchAll(/<SearchBox\b([^<]*?)\/>/g)].length === 0;
});
check("every file rendering a <SearchBox> was actually PARSED as an element",
  unparsedBoxes.length === 0,
  unparsedBoxes.length ? `${unparsedBoxes.join(", ")} — the matcher has drifted from the JSX` : "");

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILURE(S)`} — ${files.length} source files`);
process.exit(fail ? 1 : 0);
