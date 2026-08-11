/**
 * PER-MARKET OVERRIDES — a control the operator can see must be a control that works.
 *
 * THE DEFECT (F3, `per-market-rate-overrides-are-inert`, docs/POLL-OPEN-FINDINGS.md):
 * `/admin/config` → per-market override offered SIX fields and FOUR of them could
 * never affect anything. The form is keyed on an EXISTING `mkt_` id; `createMarket`
 * mints `mkt_${randomId(10)}` and then asks `getEffectiveConfig(id)` for the rates of
 * that id, one microsecond old. An override stored under an existing poll's id is
 * never the one it reads, and a poll created "after" has a DIFFERENT id.
 *
 * ⭐ THE PART WORTH GUARDING IS THE COUNT, NOT THE DELETION. The other two —
 * `minStake` / `maxStake` — DO work: read live via `getEffectiveConfig(m.id)` on the
 * market page and enforced server-side in `buyPosition`. This was always "4 of 6
 * controls are inert", never "the form is broken", and a fix that removed the form
 * would have removed two working controls. §2 is what stops that.
 *
 * ⛔ AND §4 RECORDS THE *REASON* RATHER THAN THE SYMPTOM. If someone later re-keys
 * overrides onto something a future poll can carry (a category, a named profile),
 * rate inputs may legitimately come back — and §4 is the assertion that should be
 * revisited deliberately at that point, instead of §1 being quietly deleted.
 *
 * Run: npm run test:override-scope
 */
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const decomment = (s: string) =>
  s.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const DEAD = ["commissionRate", "feeCeilingRate", "cashOutFeeRate", "thinProfitRatio"];
const LIVE = ["minStake", "maxStake"];

// ── 1 · The form offers no control that cannot work ──────────────────────────
// ⛔ The block is located by its component boundary, not by a comment — a comment
// is exactly what `decomment()` removes, and anchoring on one has already cost this
// campaign a guard that read 0 characters and then "failed" everything inside it.
const formFile = decomment(read("src/app/admin/config/config-form.tsx"));
const start = formFile.indexOf("export function MarketOverrideForm");
const end = formFile.indexOf("export function", start + 10);
const form = start >= 0 && end > start ? formFile.slice(start, end) : "";
ok("1: MarketOverrideForm was located", form.length > 300, `${form.length} chars`);
// ⭐ Assert what was found is what was meant: the block must carry the id field the
// whole finding turns on, and must not have run past its own component.
ok("1: …and it is the RIGHT block — the market-id field, one component",
   form.includes('name="marketId"') && !form.includes("export function ClearOverrideButton"));

for (const k of DEAD) {
  ok(`1: the form offers NO input for ${k}`, !new RegExp(`name="${k}"`).test(form));
}

// ── 2 · ⚠️ AND IT STILL OFFERS THE TWO THAT WORK ─────────────────────────────
// The documented risk of this fix, stated as an assertion. Before quoting this
// finding, ask which population it is a count of: 4 of 6, not 6 of 6.
for (const k of LIVE) {
  ok(`2: the form STILL offers ${k} — it works and must not be collateral`, new RegExp(`name="${k}"`).test(form));
}

// ── 3 · ⭐ THE AGREEMENT — every control has a consumer, and vice versa ───────
// The defect's real shape was an OFFER with no CONSUMER. Asserting the two sets are
// equal catches it in both directions: a re-added input with no writer, and a writer
// with no input (which is how cashOutFeeRate/thinProfitRatio were once unreachable
// from the UI while the storage layer accepted them).
{
  const action = decomment(read("src/app/admin/config/actions.ts"));
  const aStart = action.indexOf("export async function setMarketOverrideAction");
  const aEnd = action.indexOf("export async function", aStart + 10);
  const body = aStart >= 0 && aEnd > aStart ? action.slice(aStart, aEnd) : "";
  ok("3: setMarketOverrideAction was located", body.length > 200, `${body.length} chars`);

  const offered = [...form.matchAll(/name="([a-zA-Z]+)"/g)].map((m) => m[1]).filter((n) => n !== "marketId");
  // Count WRITES into the update payload, not mentions: `updates.x = …` in statement
  // position. A key merely named in an error string must not count as a consumer —
  // and after this fix all four dead keys ARE named in one.
  const consumed = [...body.matchAll(/updates\.([a-zA-Z]+)\s*=/g)].map((m) => m[1]);
  const setEq = (a: string[], b: string[]) =>
    a.length === b.length && [...new Set(a)].sort().join(",") === [...new Set(b)].sort().join(",");
  ok("3: every field the form offers is consumed, and nothing else is",
     setEq(offered, consumed), `offered=[${offered}] consumed=[${consumed}]`);
  ok("3: and that set is exactly the two stake bounds", setEq(consumed, LIVE), `[${consumed}]`);

  // ⛔ REFUSED, NOT IGNORED. Silently dropping a rate an officer typed is how the
  // four dead inputs survived: every signal said the write had worked.
  ok("4: the action REFUSES a rate override rather than ignoring it",
     /DEAD_RATE_KEYS/.test(body) && /ok:\s*false/.test(body) &&
     DEAD.every((k) => body.includes(k)));
}

// ── 4 · The REASON they were dead, so a future fix knows what to revisit ─────
{
  const svc = decomment(read("src/lib/server/market-service.ts"));
  const cStart = svc.indexOf("export async function createMarket");
  const body = cStart >= 0 ? svc.slice(cStart, cStart + 4000) : "";
  ok("4: createMarket was located", body.length > 500);
  // The id is minted here, and the config is asked for THAT id — which is why an
  // override keyed on any pre-existing id can never apply.
  ok("4: createMarket mints its own id", /const id = `mkt_\$\{randomId\(\d+\)\}`/.test(body));
  ok("4: …and freezes rates from getEffectiveConfig(<that same fresh id>)",
     /snapshotFromConfig\(\{[\s\S]{0,200}?getEffectiveConfig\(id\)/.test(body));
}

// ── 5 · The two that survive are genuinely consumed, live ────────────────────
// Positive evidence that §2 is protecting something real rather than two inert
// inputs of a different kind. Asserting absence is a claim that needs evidence too.
{
  const page = decomment(read("src/app/markets/[id]/page.tsx"));
  ok("5: the market page reads stake bounds LIVE for this market",
     /getEffectiveConfig\(m\.id\)/.test(page));
  // 🔴 SCOPED TO `buyPosition`, AND THE FIRST VERSION WAS NOT. It read
  // `/minStake/.test(svc) && /maxStake/.test(svc)` over the WHOLE 3,200-line
  // market-service.ts — i.e. "these two words appear somewhere in the file". It was
  // non-vacuous only by luck: today the only occurrences happen to sit inside
  // buyPosition. Delete the enforcement and mention either word anywhere else — a
  // type, a new function, a comment that survives decomment — and it stays green
  // while the bound it names is gone. An assertion that says "buyPosition enforces"
  // must look inside buyPosition.
  const svc = decomment(read("src/lib/server/market-service.ts"));
  const fnBody = (src: string, name: string) => {
    const at = src.search(new RegExp(`(export\\s+)?async function ${name}\\(`));
    if (at < 0) return "";
    const open = src.indexOf("{", at);
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(at, i + 1); }
    }
    return "";
  };
  // ⚠️ THE ENFORCEMENT IS IN `buyPositionInner`, NOT `buyPosition`. The exported
  // `buyPosition` is a thin wrapper (admission + transient retry) that delegates.
  // Scoping to the exported name found the wrapper and reported "the bounds are not
  // enforced" about code that enforces them one call deeper — a locator naming the
  // wrong function is just as wrong as one matching too much. Both halves are
  // asserted, so the check breaks if the delegation is ever removed.
  const outer = fnBody(svc, "buyPosition");
  const inner = fnBody(svc, "buyPositionInner");
  ok("5: buyPosition and buyPositionInner were both located",
     outer.length > 100 && inner.length > 500, `outer=${outer.length} inner=${inner.length}`);
  ok("5: buyPosition delegates to buyPositionInner", /buyPositionInner\(/.test(outer));
  ok("5: and buyPositionInner enforces both bounds, server-side",
     /minStake/.test(inner) && /maxStake/.test(inner));
  // ⭐ And it REFUSES on them, rather than merely mentioning them.
  ok("5: …by refusing the stake, not just referencing the names",
     /stake\s*<\s*minStake/.test(inner) && /stake\s*>\s*maxStake/.test(inner));
}

console.log(`\nmarket-override-scope: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
