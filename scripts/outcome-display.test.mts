/**
 * Settlement-outcome display guard.
 *
 * The bug this exists to prevent (reported by real users 2026-07-20):
 *
 *   market-card.tsx rendered the settled result as
 *       isResolved ? (yesPct >= 50 ? YES : NO)
 *
 *   `yesPct` is `impliedYesPct()` = yesPool / (yesPool + noPool) — the crowd's MONEY
 *   SPLIT. It has nothing to do with how the market actually settled. On any upset
 *   (crowd 70% on YES, market resolves NO) the board showed the OPPOSITE of the truth,
 *   while the detail page — which reads the real `resolvedOutcome` — showed the correct
 *   one. Users clicked a card marked "RESOLVED YES" and landed on a page saying NO.
 *
 * On a real-money platform the settled side is not something you may ever infer.
 * It comes from `PredictionMarket.resolvedOutcome` or it is not displayed at all.
 *
 * Two rules:
 *   1. No component derives a YES/NO side from a probability/percentage variable.
 *   2. Every MarketCard call site that can render a RESOLVED card passes
 *      `resolvedOutcome`.
 *
 * Run: npm run test:outcome
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}
const rel = (f: string) => relative(ROOT, f).replace(/\\/g, "/");
const decomment = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("settlement-outcome display guard\n");
const files = walk(SRC);

// ---------------------------------------------------------------------------
// 1. No YES/NO side inferred from a probability.
//    Catches: `yesPct >= 50 ? t.common.yes : t.common.no`
//             `pct > 50 ? "YES" : "NO"`, `impliedYesPct(m) >= 50 ? ...`
// ---------------------------------------------------------------------------
const PROB = /\b(yesPct|impliedYesPct\([^)]*\)|yesPercent|probability|pct)\b\s*(>=|>|<=|<)\s*\d+\s*\?/i;
const SIDE = /(t\.common\.(yes|no)|["'`](YES|NO)["'`])/;
const inferred: string[] = [];
for (const f of files) {
  const body = decomment(readFileSync(f, "utf8"));
  body.split("\n").forEach((line, i) => {
    if (!PROB.test(line)) return;
    // Only a violation when the ternary actually yields a YES/NO side.
    const after = line.slice(line.search(PROB));
    if (SIDE.test(after)) inferred.push(`${rel(f)}:${i + 1}  ${line.trim().slice(0, 100)}`);
  });
}
check(
  "no YES/NO outcome inferred from a probability",
  inferred.length === 0,
  inferred.length ? `${inferred.length}\n      ${inferred.join("\n      ")}` : "",
);

// ---------------------------------------------------------------------------
// 2. Every MarketCard usage that can be RESOLVED passes resolvedOutcome.
// ---------------------------------------------------------------------------
const missing: string[] = [];
for (const f of files) {
  if (/market-card\.tsx$/.test(f)) continue;
  const body = decomment(readFileSync(f, "utf8"));
  if (!body.includes("<MarketCard")) continue;
  // Split into individual <MarketCard ... /> elements.
  for (const m of body.matchAll(/<MarketCard\b[\s\S]*?\/>/g)) {
    const el = m[0];
    const canResolve = /status\s*=\s*(\{[^}]*RESOLVED[^}]*\}|["']RESOLVED["'])/.test(el)
      // a pass-through `status={m.status}` can also be RESOLVED at runtime
      || /status\s*=\s*\{\s*[a-z]\w*\.status\s*\}/i.test(el);
    if (canResolve && !/resolvedOutcome\s*=/.test(el)) {
      const line = body.slice(0, m.index).split("\n").length;
      missing.push(`${rel(f)}:${line}`);
    }
  }
}
check(
  "every resolvable <MarketCard> passes resolvedOutcome",
  missing.length === 0,
  missing.length ? missing.join(", ") : "",
);

// ---------------------------------------------------------------------------
// 3. The card must not fabricate a side when the outcome is unknown.
//    (Guards the fallback: no side is better than a wrong side.)
// ---------------------------------------------------------------------------
const card = readFileSync(join(SRC, "components/markets/market-card.tsx"), "utf8");
check(
  "market-card derives its outcome label from resolvedOutcome only",
  /resolvedOutcome\s*===\s*["']YES["']/.test(card) && !PROB.test(card.replace(/\/\*[\s\S]*?\*\//g, "")),
  "",
);

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — scanned ${files.length} ts/tsx files`);
process.exit(fail === 0 ? 0 : 1);
