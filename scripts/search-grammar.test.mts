/**
 * Search grammar guard.
 *
 * Four things this proves, in order of how much damage each prevents:
 *
 *  1. EXECUTOR PARITY. `matchesQuery` (JS, used by the in-memory store and the two
 *     client filters) and `queryToWhere` (SQL) must agree on every query. Two
 *     definitions of one truth that can drift is the exact failure `txn-filters.ts`
 *     was written to avoid; this asserts it instead of hoping. The Prisma `where`
 *     is interpreted by a small evaluator below that understands only the four
 *     operators we emit.
 *
 *  2. BACKWARD COMPATIBILITY. For any SINGLE-token query, the new grammar must
 *     return exactly what the old `hay.includes(q)` returned. That is what makes
 *     swapping the ten hand-rolled call sites a no-op for existing behaviour, and
 *     it is why the multi-token change is safe to describe as purely additive.
 *
 *  3. THE PARSE TABLE. Including the rule that matters most for a non-technical
 *     operator: the grammar NEVER errors. An unknown field degrades to a token.
 *
 *  4. THE ReDoS BUDGET. A list of known-catastrophic patterns, each asserted
 *     REJECTED BY THE PARSER. They are never executed — the point is that they
 *     cannot reach an engine, not that they run quickly.
 *
 * Run: npm run test:search
 */
import { parseQuery, matchesQuery, queryToWhere, isSafeRegex } from "../src/lib/search/index.js";
import { MARKET_SEARCH, USER_SEARCH } from "../src/lib/search/fields.js";

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("Search grammar guard\n");

// ── 1. Parse table ───────────────────────────────────────────────────────────
log("Parse");
const P = (s: string, o = {}) => parseQuery(s, o);

check("empty -> empty", P("").mode === "empty");
check("whitespace-only -> empty", P("   ").mode === "empty");
check("single token", (() => { const q = P("simba"); return q.mode === "terms" && q.terms.length === 1 && q.terms[0].value === "simba"; })());
check("multi-token -> AND of 2", (() => { const q = P("simba win"); return q.mode === "terms" && q.terms.length === 2; })());
check("case is normalised", (() => { const q = P("SIMBA"); return q.mode === "terms" && q.terms[0].value === "simba"; })());
check('quoted phrase kept whole', (() => { const q = P('"long rains"'); return q.mode === "terms" && q.terms[0].kind === "phrase" && q.terms[0].value === "long rains"; })());
check("negation", (() => { const q = P("-crypto"); return q.mode === "terms" && q.terms[0].negated === true; })());
check("negated phrase", (() => { const q = P('-"long rains"'); return q.mode === "terms" && q.terms[0].negated && q.terms[0].kind === "phrase"; })());
check("field:value", (() => { const q = P("category:sports", { fields: ["category"] }); return q.mode === "terms" && q.terms[0].field === "category" && q.terms[0].value === "sports"; })());
check("negated field:value", (() => { const q = P("-category:sports", { fields: ["category"] }); return q.mode === "terms" && q.terms[0].negated && q.terms[0].field === "category"; })());
// THE rule for a non-technical operator: never error, always degrade.
check("unknown field degrades to a plain token", (() => {
  const q = P("http://x", { fields: ["category"] });
  return q.mode === "terms" && q.terms[0].field === undefined && q.terms[0].value === "http://x";
})());
check("a bare colon is not a field", (() => { const q = P(":x", { fields: ["category"] }); return q.mode === "terms" && q.terms[0].field === undefined; })());
check("over-long query is clamped to 120", (() => { const q = P("a".repeat(300)); return q.mode === "terms" && q.terms[0].value.length === 120; })());
check("/re/ is literal without allowRegex", (() => { const q = P("/simba/"); return q.mode === "terms"; })());
check("/re/ parses with allowRegex", (() => { const q = P("/simba/", { allowRegex: true }); return q.mode === "regex"; })());
check("/re/i keeps the flag", (() => { const q = P("/simba/i", { allowRegex: true }); return q.mode === "regex" && q.flags === "i"; })());
check("/re/g is NOT a regex (only i allowed)", (() => { const q = P("/simba/g", { allowRegex: true }); return q.mode === "terms"; })());
check("broken regex -> invalid, not empty", (() => { const q = P("/(unclosed/", { allowRegex: true }); return q.mode === "invalid"; })());
check("65-char pattern -> invalid", (() => { const q = P(`/${"a".repeat(65)}/`, { allowRegex: true }); return q.mode === "invalid" && q.reason === "regex-too-long"; })());

// ── 2. ReDoS budget — asserted REJECTED, never executed ──────────────────────
log("\nReDoS budget (rejected by the parser, never run)");
for (const src of ["(a+)+b", "(a|aa)*c", "(a|a?)+d", "([a-z]+)*x", "(x+x+)+y", "a{1,20000}"]) {
  check(`rejects /${src}/`, !isSafeRegex(src));
}
check("accepts an ordinary pattern", isSafeRegex("^\\+2557[0-9]{8}$"));
check("accepts a simple alternation", isSafeRegex("simba|yanga"));

// ── 3. Executor parity ───────────────────────────────────────────────────────
// A minimal interpreter for the ONLY shapes queryToWhere emits. If the builder
// ever emits something else, this throws and the test fails — which is correct.
function evalWhere(where: any, row: Record<string, string>): boolean {
  if (where === null) return false;
  const keys = Object.keys(where);
  if (!keys.length) return true;
  if (keys.length === 1) {
    const k = keys[0];
    if (k === "AND") return (where.AND as any[]).every((w) => evalWhere(w, row));
    if (k === "OR") return (where.OR as any[]).some((w) => evalWhere(w, row));
    if (k === "NOT") return !evalWhere(where.NOT, row);
    const op = where[k];
    const v = (row[k] ?? "").toLowerCase();
    if ("contains" in op) return v.includes(String(op.contains).toLowerCase());
    if ("equals" in op) return v === String(op.equals).toLowerCase();
    throw new Error(`unknown operator on ${k}: ${JSON.stringify(op)}`);
  }
  return keys.every((k) => evalWhere({ [k]: where[k] }, row));
}

const MARKETS: Record<string, string>[] = [
  { id: "m1", titleEn: "Will Simba win the league?", titleSw: "Je, Simba itashinda ligi?", titleZh: "辛巴会赢得联赛吗？", category: "sports", resolutionCriterion: "TFF official table", status: "LIVE" },
  { id: "m2", titleEn: "Will the TZS strengthen against the USD?", titleSw: "Je, TZS itaimarika dhidi ya USD?", titleZh: "坦桑尼亚先令会走强吗？", category: "macro", resolutionCriterion: "BoT mid-rate", status: "LIVE" },
  { id: "m3", titleEn: "Will Yanga beat Simba in the derby?", titleSw: "Je, Yanga itaishinda Simba?", titleZh: "", category: "sports", resolutionCriterion: "Full-time result", status: "RESOLVED" },
  { id: "m4", titleEn: "Will Bitcoin close above 100k?", titleSw: "", titleZh: "", category: "crypto", resolutionCriterion: "Coinbase close", status: "LIVE" },
  { id: "m5", titleEn: "Long rains above average this season?", titleSw: "Mvua ndefu?", titleZh: "", category: "weather", resolutionCriterion: "TMA seasonal report", status: "LIVE" },
];

const QUERIES = [
  "", "simba", "SIMBA", "simba win", "win simba", "simba league",
  '"long rains"', '"will simba"', "-simba", "simba -yanga", "-crypto -macro",
  "category:sports", "category:sports simba", "-category:sports",
  "status:LIVE", "status:live", "id:m1", "id:m",
  "title:simba", "title:辛巴", "criterion:TFF",
  "bitcoin 100k", "tzs usd", "nothingmatches", "zz", "derby",
];

log("\nExecutor parity (JS predicate vs Prisma where)");
let mismatches = 0;
for (const raw of QUERIES) {
  const q = parseQuery(raw, { fields: Object.keys(MARKET_SEARCH.fields) });
  const where = queryToWhere(q, MARKET_SEARCH);
  for (const row of MARKETS) {
    const js = matchesQuery(q, row, MARKET_SEARCH);
    const sql = evalWhere(where, row);
    if (js !== sql) {
      mismatches++;
      if (mismatches <= 5) log(`    MISMATCH q=${JSON.stringify(raw)} row=${row.id} js=${js} sql=${sql}`);
    }
  }
}
check(`${QUERIES.length} queries x ${MARKETS.length} rows agree`, mismatches === 0, `${mismatches} mismatch(es)`);

// ── 4. Backward compatibility with the ten `.includes()` call sites ──────────
log("\nBackward compatibility (single token == the old hay.includes(q))");
let compatBreaks = 0;
for (const raw of ["simba", "yanga", "tzs", "bitcoin", "zz", "sports", "m1", "derby", "rains"]) {
  const q = parseQuery(raw, { fields: Object.keys(MARKET_SEARCH.fields) });
  for (const row of MARKETS) {
    const old = MARKET_SEARCH.default.map((c) => (row[c] ?? "")).join(" ").toLowerCase().includes(raw.toLowerCase());
    const now = matchesQuery(q, row, MARKET_SEARCH);
    if (old !== now) { compatBreaks++; log(`    BREAK q=${raw} row=${row.id} old=${old} now=${now}`); }
  }
}
check("single-token results are byte-identical to the old behaviour", compatBreaks === 0, `${compatBreaks} difference(s)`);

// ── 5. The bug from the user report ──────────────────────────────────────────
// Ali's example was "John 0712". Note the honest detail: phones are stored E.164
// (+255712345678), so the literal string "0712" is NOT in the record and no
// grammar can conjure it. The real defect is the one below — a name in one column
// and a number fragment in ANOTHER, which a single contiguous substring can never
// match. (A separate, smaller question — whether an operator should be able to
// type a local-format 0712… against an E.164 column — is a normalisation issue,
// not a grammar one, and is recorded in the audit doc rather than faked here.)
log("\nThe reported bug");
const USERS = [{ id: "u1", phoneE164: "+255712345678", displayName: "John Mwangi", status: "ACTIVE", role: "PLAYER" }];
const oldStyle = (q: string, r: Record<string, string>) =>
  USER_SEARCH.default.map((c) => r[c] ?? "").join(" ").toLowerCase().includes(q.toLowerCase());
check("OLD: 'john 712' finds nothing (the reported defect)", oldStyle("john 712", USERS[0]) === false);
check("NEW: 'john 712' finds the row", matchesQuery(parseQuery("john 712"), USERS[0], USER_SEARCH) === true);
check("NEW: order does not matter", matchesQuery(parseQuery("712 john"), USERS[0], USER_SEARCH) === true);
check("NEW: a word that is absent still excludes", matchesQuery(parseQuery("john 9999"), USERS[0], USER_SEARCH) === false);
check("NEW: full name across the space still works", matchesQuery(parseQuery("john mwangi"), USERS[0], USER_SEARCH) === true);

// ── 6. Fail-closed ───────────────────────────────────────────────────────────
log("\nFail-closed");
const bad = parseQuery("/(unclosed/", { allowRegex: true });
check("invalid query matches NOTHING (never everything)", matchesQuery(bad, MARKETS[0], MARKET_SEARCH) === false);
check("invalid query yields a null where (never {})", queryToWhere(bad, MARKET_SEARCH) === null);
check("empty query matches everything", matchesQuery(parseQuery(""), MARKETS[0], MARKET_SEARCH) === true);

// Phrases must not straddle a field boundary.
const straddle = parseQuery('"sports tff"', { fields: Object.keys(MARKET_SEARCH.fields) });
check("a phrase does not match across two fields", matchesQuery(straddle, MARKETS[0], MARKET_SEARCH) === false);

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILURE(S)`}`);
process.exit(fail ? 1 : 0);
