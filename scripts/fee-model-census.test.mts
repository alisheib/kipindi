/**
 * test:fee-model-census — EVERY FEE-MODEL BRANCH IN src/, REVIEWED AND REGISTERED (programme FEE-TAX-2026-10, release R2).
 *
 *   npx tsx scripts/fee-model-census.test.mts     (npm run test:fee-model-census)
 *
 * 🔴 THE DEFECT CLASS. A fourth fee model (`stake-share`) joined three, and most code that asks "which model?" was written
 * when there were two: `x.feeModel === "loser-share" ? <loser-share> : <capped>`. Under such a branch every NEW model falls
 * silently into the capped-commission arm — a correct number under a retired law, or a retired formula printed beside the
 * new one (`/admin/updown`'s A4 defect, `fee-simulator.tsx`'s 2026-09-08 one). The compiler cannot see it: a string
 * comparison compiles whatever the union holds. Release R2 reviewed every such site and gave `stake-share` its own arm, an
 * explicit refusal, or a deliberate hidden state (`// R2c:` where the screen is rebuilt later).
 *
 * ⛔ SO THE POPULATION IS PINNED, FILE BY FILE, EXACTLY. A comparison of anything against a fee-model literal
 * (`=== "loser-share"`, `!== "capped-commission"`, `case "stake-share":` …) in code — comments stripped — counts. A file that
 * gains one, or a file not in the registry that has one, FAILS: review the new branch for every model (does `stake-share`
 * fall into another model's arm?), then register it with the reason. A file that LOSES one fails too — a registry above
 * the tree is slack, not safety (`visual-pass-r8a`'s rule): lock the fall in.
 *
 *   §1 the census against the registry — no unregistered file, no file gained or lost a branch, every entry reasoned
 *   §2 PLANTS — the scanner sees each spelling, and does not count a comment or a type
 *   §3 the canonical arms in `payout.ts` and `market-config.ts` — stake-share is NAMED before any fallback
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const section = (s: string) => console.log(`\n── ${s}`);

const MODEL = String.raw`(?:capped-commission|loser-share|jackpot-payout|stake-share)`;
/** A comparison against a fee-model literal, either way round, or a `case` of one. */
const BRANCH = new RegExp(String.raw`[!=]==\s*"${MODEL}"|"${MODEL}"\s*[!=]==|\bcase\s+"${MODEL}"\s*:`, "g");
const sites = (src: string) => decomment(src.replace(/\r\n/g, "\n")).match(BRANCH)?.length ?? 0;

/**
 * THE REVIEWED POPULATION (2026-10-24, FEE-TAX-2026-10 R2a) — file → [branches, why every model is honest there].
 * ⛔ Change a count only after reading the branches that moved it, for all four models.
 */
const REGISTRY: Record<string, [number, string]> = {
  "src/lib/payout.ts": [16, "the arithmetic: readRates names stake-share first; poolFee / describeFeeModel / chargedFee / settledPayoutFor / worstCaseWinnerRatio each name it before the capped fallback; the figure functions return null for every other model"],
  "src/lib/server/market-config.ts": [12, "the stamp (stake-share stamped complete or refused), hasOwnSnapshot, snapshotOrLegacy's pass-through (no coercion to capped), validate's gate"],
  "src/lib/server/market-service.ts": [4, "the settlement audit record names stake-share's payout model and rates (R2b replaces the split)"],
  "src/lib/server/updown-config.ts": [9, "the v4 reconcile (exact retired default only), the split caption names every model, stampedFeeTermsOf lays the platform's tax beside a stake-share profile only (never a default), the settings save refuses a default move to or from stake-share (a legacy move passes), the apply act names its three models and gates a stake-share target only (R2 review)"],
  "src/lib/server/maswali-console.ts": [1, "jackpot-payout only — a Millionea week's own model, never a pool model"],
  "src/lib/server/maswali-player.ts": [1, "jackpot-payout only — a week whose snapshot froze any other model shows the player no terms (null), never a pool model's"],
  "src/lib/server/maswali-settlement.ts": [1, "jackpot-payout only — refuses any other model"],
  "src/lib/journey/sheet-seed.ts": [2, "a seed on any model but the two older ones is NOT read — the link navigates instead (R2c)"],
  "src/lib/markets/estimate.ts": [1, "anything but loser-share is `hidden` — never priced through the loser-share card arithmetic (R2c)"],
  "src/app/admin/config/actions.ts": [3, "the select's three known poll models pass to validate, which refuses stake-share while the gate is shut"],
  "src/app/admin/config/config-form.tsx": [7, "stake-share offered only when the gate is open or it is stored; its own description and confirm; never the capped wording (R2c)"],
  "src/app/admin/config/fee-simulator.tsx": [2, "stake-share renders its own statement and prices nothing; the grids speak the two older laws (R2c)"],
  "src/app/admin/config/page.tsx": [12, "every label names stake-share; the capped card says it prices no new market whenever the model is not capped (R2c)"],
  "src/app/admin/finance/page.tsx": [6, "every label and badge names stake-share (R2c)"],
  "src/app/admin/markets/new/page.tsx": [2, "the wizard's summary has a stake-share variant (R2c)"],
  "src/app/admin/markets/new/wizard.tsx": [2, "its own sentence for stake-share, never the capped one (R2c)"],
  "src/app/admin/markets/[id]/page.tsx": [2, "stake-share gets its own fee stats and callout inside the loser-share grid's refund swap (R2c)"],
  "src/app/help/page.tsx": [2, "faq1 is left out under stake-share rather than answered in another law's words (R5 writes it)"],
  "src/app/legal/rules/_shared.tsx": [2, "stake-share quotes the rate of every stake, never 0% or the dormant commission (R5 rewrites the prose)"],
  "src/components/journey/bet-sheet/sheet-parts.tsx": [1, "the legacy-fee note for capped-commission only; a stake-share seed is never read (sheet-seed.ts)"],
  "src/components/markets/bet-confirm-modal.tsx": [1, "the estimate for loser-share only; every other model gets the model-neutral pool-share sentence"],
  "src/components/markets/conviction-dial.tsx": [3, "the disclosure block is not drawn under stake-share (its arms speak the older laws); the lean warning has a `below` arm (R2c)"],
};

// ═══ §1 · THE CENSUS ══════════════════════════════════════════════════════════════════════════════════════════════════
section("§1 · every fee-model branch in src/, against the registry");
const found = new Map<string, number>();
{
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f)) {
        const n = sites(readFileSync(p, "utf8"));
        if (n > 0) found.set(relative(ROOT, p).replace(/\\/g, "/"), n);
      }
    }
  };
  walk(join(ROOT, "src"));
  ok("1.0 · CONTROL · the scan reads the tree and finds the arithmetic's own branches", (found.get("src/lib/payout.ts") ?? 0) >= 10 && found.size >= 10, `${found.size} files`);
  const unregistered = [...found.keys()].filter((f) => !(f in REGISTRY));
  ok("1.1 · ⛔ no file branches on a fee model unreviewed — every one is in the registry with its reason", unregistered.length === 0,
    unregistered.map((f) => `${f}: ${found.get(f)} branch(es) — review them for all four models, then register`).join(" | "));
  const rose: string[] = [], fell: string[] = [];
  for (const [f, [n]] of Object.entries(REGISTRY)) {
    const got = found.get(f) ?? 0;
    if (got > n) rose.push(`${f}: ${got} > ${n}`);
    else if (got < n) fell.push(`${f}: ${got} < ${n}`);
  }
  ok("1.2 · ⛔ no registered file GAINED a branch (a new one must be reviewed for stake-share, then registered)", rose.length === 0, rose.join(" | "));
  ok("1.3 · the registry is exact (a count above the tree is slack — lock the fall in)", fell.length === 0, fell.join(" | "));
  ok("1.4 · every entry carries its reason", Object.values(REGISTRY).every(([n, why]) => n > 0 && why.length > 20));
}

// ═══ §2 · PLANTS ══════════════════════════════════════════════════════════════════════════════════════════════════════
section("§2 · the scanner can say yes, and no");
ok("2.1 · PLANT · each spelling is seen: `x.feeModel === …`, `!== …`, the literal on the left, a `case`",
  sites(`if (r.feeModel === "loser-share") {}\nconst a = m !== "capped-commission";\nconst b = "stake-share" === x;\nswitch (m) { case "jackpot-payout": break; }`) === 4);
ok("2.2 · CONTROL · a comment, a type, an object key and a plain string are not branches",
  sites(`// if (r.feeModel === "loser-share")\n/* m !== "stake-share" */\ntype T = Record<FeeModel, number>;\nconst o = { "loser-share": 1 };\nconst s = "capped-commission";`) === 0);

// ═══ §3 · THE CANONICAL ARMS ══════════════════════════════════════════════════════════════════════════════════════════
section("§3 · the canonical functions NAME stake-share before any fallback");
{
  const pay = decomment(readFileSync(join(ROOT, "src/lib/payout.ts"), "utf8").replace(/\r\n/g, "\n"));
  /** The body of `function name(` up to the next top-level `\n}` — the shape this file writes functions in. */
  const body = (src: string, name: string) => {
    const at = src.search(new RegExp(String.raw`(?:export )?function ${name}\(`));
    if (at < 0) return "";
    const end = src.indexOf("\n}", at);
    return end < 0 ? "" : src.slice(at, end + 2);
  };
  const before = (fn: string, first: string, second: string) => {
    const a = fn.indexOf(first), b = fn.indexOf(second);
    return a >= 0 && b >= 0 && a < b;
  };
  const pf = body(pay, "poolFee");
  // The arm is chosen on the model alone, before any rate is read (FEE-TAX R2 review: a one-sided refund needs no rate).
  ok("3.1 · `poolFee` takes stake-share to its own arm — on the model, before any rate is read — ahead of the loser-share and capped arithmetic",
    before(pf, `readFeeModel(rates?.feeModel) === "stake-share"`, "readRates(") && before(pf, `=== "stake-share"`, `r.feeModel === "loser-share"`)
      && before(pf, `=== "stake-share"`, "r.commissionRate * pool"));
  const dm = body(pay, "describeFeeModel");
  ok("3.2 · `describeFeeModel` names stake-share before the capped caption", before(dm, `r.feeModel === "stake-share"`, "`capped "));
  const cf = body(pay, "chargedFee");
  ok("3.3 · `chargedFee` keeps the refund branch FIRST, then its stake-share arm, then the poll fee",
    before(cf, "isOneSided || m.resolvedOutcome === \"VOID\"", `=== "stake-share"`) && before(cf, `=== "stake-share"`, "...poolFee("));
  const sp = body(pay, "settledPayoutFor");
  ok("3.4 · `settledPayoutFor` sends stake-share to its own projection before `assertWinnerFloor`", before(sp, `=== "stake-share"`, "assertWinnerFloor("));
  const rr = body(pay, "readRates");
  ok("3.5 · `readRates` reads stake-share's rates its own way (never clamped, never defaulted) before the older defaults",
    before(rr, `feeModel === "stake-share"`, "DEFAULT_PLATFORM_FEE_RATE") && rr.includes("readStakeShareRates("));
  const rf = body(pay, "readFeeModel");
  ok("3.6 · an unknown model is still REFUSED, never coerced", /throw new Error\(/.test(rf) && rf.includes("FEE_MODELS"));
  const mc = decomment(readFileSync(join(ROOT, "src/lib/server/market-config.ts"), "utf8").replace(/\r\n/g, "\n"));
  ok("3.7 · `snapshotOrLegacy` maps stake-share to itself — the silent fall-back to capped-commission is gone",
    mc.includes(`isStakeShare ? "stake-share" : "capped-commission"`));
}

console.log(`\nfee-model-census: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
