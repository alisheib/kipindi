/**
 * THE AI SPEND CEILING — enforced on EVERY spender, not just polls.
 *
 * ── THE DEFECT THIS LOCKS ────────────────────────────────────────────────────
 * `assertAiBudget` has blocked over-limit calls since the F8 events-calendar work.
 * It was wired into `ai-poll-generation.ts` and **nowhere else**, so the platform's
 * two biggest AI spenders never consulted it. Measured on live production:
 *
 *   feature    calls   spend     capped?
 *   polls        447   $80.72    YES
 *   sentinel   2,962   $68.36    NO   ← biggest spender, uncapped
 *   updown       656   $59.37    NO   ← and it produced ZERO confirmed readings
 *
 * $127.73 of real money bypassed a $20 cycle limit. The Up & Down oracle spent
 * 256 calls / $21.35 on 2026-07-26 ALONE — one day over the whole-cycle cap — and
 * nothing refused a single call. The sentinel once made 383 calls costing $15.38 in
 * one hour, and 1,427 calls over 13 hours after the provider account had run dry.
 *
 * Same defect class as E-4 (the KYC attestations): a control that exists, looks
 * correct in review, and is absent at the point that needed it.
 *
 * ── HOW THIS IS TESTED, AND WHY THAT SHAPE ───────────────────────────────────
 * It DRIVES THE REAL `observePrice` AND `deepCheckMarket`, rather than asserting on
 * source text. A gate that is missing on the wire is exactly what reads as present
 * in review — E-4's guard learned this the hard way, so this one starts there.
 *
 * The provider key is a DUMMY. Both gates sit after the client is constructed and
 * BEFORE any network call, so a blocked call must make no request at all — which is
 * asserted by proving no AiUsage row was written. If either gate were absent, the
 * dummy key would produce a provider AUTH error instead of a budget refusal, and the
 * assertions below would fail with a visibly different reason.
 *
 * Run: npx tsx scripts/ai-budget-enforcement.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";
// A syntactically valid but non-functional key: enough for `new Anthropic()`, and it
// must never be USED — every assertion here depends on no request being made.
process.env.ANTHROPIC_API_KEY ??= "sk-ant-test-never-dialled-0000000000";

import { readFileSync } from "node:fs";
import { observePrice, describeRefusal, type RefusalReason } from "../src/lib/server/updown-oracle.ts";
import { deepCheckMarket } from "../src/lib/server/market-sentinel.ts";
import {
  assertAiBudget, setCreditLimit, resetCreditCycle, recordAiUsage, featureCostWindows,
  getCreditConfig,
} from "../src/lib/server/ai-usage.ts";
import type { StoredAsset } from "../src/lib/server/updown-dal.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? "  — " + x : ""}`); };

const ASSET: StoredAsset = {
  id: "uda_test", key: "GOLD", symbol: "XAU/USD", nameEn: "Gold", nameSw: "Dhahabu", nameZh: null,
  iconKey: "gold", priceSourceUrl: "https://goldprice.org/live-gold-price.html",
  sourceDomain: "goldprice.org", category: "macro", decimals: 2, minMoveTicks: 15,
  enabled: true, sortOrder: 0, createdBy: "test", createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const BOUNDARY = new Date(Date.now() - 60_000).toISOString();
const MARKET = {
  id: "mkt_test", titleEn: "Will gold close above $3,000?",
  resolutionCriterion: "Spot price at 14:30 UTC", resolutionAt: new Date().toISOString(),
  category: "macro", sourceUrl: "https://goldprice.org/live-gold-price.html",
};

/** Burn well past any cap: Sonnet input is ~$3/MTok, so 20M tokens ≈ $60. */
const burn = (feature: string) => recordAiUsage({
  feature, model: "claude-sonnet-4-6", inputTokens: 20_000_000, outputTokens: 0, webSearches: 0, ok: true,
});

// ── 1 · Baseline: with headroom, neither gate blocks ────────────────────────
// Proves the gates are not simply always-refusing, which would pass every
// over-budget assertion below for the wrong reason.
{
  await setCreditLimit(1000);
  await resetCreditCycle();
  const b = await assertAiBudget("updown");
  ok("under budget → assertAiBudget allows", b.ok);

  // These DO attempt a real call with a dummy key, so they must fail at the provider
  // — NOT with a budget refusal. That distinction is the point.
  const r = await observePrice(ASSET, BOUNDARY);
  ok("under budget → oracle does NOT refuse for budget",
    r.ok || r.reason !== "budget-exhausted", r.ok ? "ok" : `reason=${r.reason}`);
  const s = await deepCheckMarket(MARKET);
  ok("under budget → sentinel does NOT refuse for budget",
    !/credit limit/i.test(s.error ?? ""), s.error ?? "no error");
}

// ── 2 · THE ORACLE refuses when the budget is exhausted ─────────────────────
{
  await setCreditLimit(1);
  await resetCreditCycle();
  await burn("updown");

  const before = (await featureCostWindows("updown")).calls;
  const r = await observePrice(ASSET, BOUNDARY);

  ok("[oracle] over budget → REFUSED", !r.ok);
  if (!r.ok) {
    ok("[oracle] refusal reason is budget-exhausted", r.reason === "budget-exhausted", `got "${r.reason}"`);
    ok("[oracle] the detail names spend AND limit", /\$\d/.test(r.detail) && /of \$/.test(r.detail), r.detail);
  }

  // NO PROVIDER CALL was made. `observePrice` meters every real attempt through
  // recordAiUsage on BOTH the success and the error path, so an unchanged call count
  // is the evidence that the gate fired before the network — not after paying for it.
  const after = (await featureCostWindows("updown")).calls;
  ok("[oracle] blocked call spent NOTHING (no new AiUsage row)", after === before,
    `calls ${before} → ${after}`);
}

// ── 3 · THE SENTINEL refuses when the budget is exhausted ───────────────────
{
  await setCreditLimit(1);
  await resetCreditCycle();
  await burn("sentinel");

  const before = (await featureCostWindows("sentinel")).calls;
  const s = await deepCheckMarket(MARKET);

  ok("[sentinel] over budget → not determined", s.determined === false);
  ok("[sentinel] reports an ERROR action, not a verdict about the world",
    s.action === "error", `action=${s.action}`);
  ok("[sentinel] the error names the credit limit", /credit limit reached/i.test(s.error ?? ""), s.error ?? "");
  ok("[sentinel] outcome stays UNKNOWN — a spend ceiling is not evidence",
    s.outcome === "UNKNOWN" && s.confidence === 0);

  const after = (await featureCostWindows("sentinel")).calls;
  ok("[sentinel] blocked call spent NOTHING (no new AiUsage row)", after === before,
    `calls ${before} → ${after}`);
}

// ── 4 · FAIL-OPEN: raising the limit must immediately re-allow spending ─────
// A cap is a throttle, not a kill switch. An operator who tops up their provider
// credit and raises the ceiling must get the platform back without a deploy.
{
  await setCreditLimit(1);
  await resetCreditCycle();
  await burn("updown");
  ok("still blocked at the low limit", !(await assertAiBudget("updown")).ok);

  await setCreditLimit(10_000); // the operator raises the ceiling
  ok("raising the limit re-allows immediately", (await assertAiBudget("updown")).ok);
  const r = await observePrice(ASSET, BOUNDARY);
  ok("[oracle] headroom restored → NOT a budget refusal", r.ok || r.reason !== "budget-exhausted");
  const s = await deepCheckMarket(MARKET);
  ok("[sentinel] headroom restored → NOT a budget refusal", !/credit limit/i.test(s.error ?? ""));
}

// ── 4b · `limitUsd = 0` is NOT "uncapped" — pinning the truth, not the comment
// `assertAiBudget` reads `if (cfg.limitUsd <= 0) return { ok: true }  // 0 = no cap`,
// but `getCreditConfig` (ai-usage.ts:133) rewrites a stored 0 back to
// DEFAULT_LIMIT_USD ($20) before it is ever seen — so that branch is UNREACHABLE and
// 0 silently means "$20", not "no cap".
//
// Left as-is deliberately: the admin control is `min="0.01"` (credit-controls.tsx:38),
// so nothing on the platform can store 0, and `/admin/ai-usage` guards on
// `limitUsd > 0` in two more places that can never be false. Changing the semantics
// would be an unforced behaviour change on a live money platform for a value that is
// unreachable. Recorded as campaign finding E-14 instead.
//
// ⚠️ `events-calendar.test.mts:146` asserts "limit 0 = uncapped (does not brick
// generation)" and passes VACUOUSLY — its 1M-token burn is ~$3, comfortably under the
// coerced $20, so the assertion has never exercised the claim it makes. This pins what
// actually happens, so the contradiction cannot quietly deepen.
{
  await setCreditLimit(0);
  await resetCreditCycle();
  const cfg = await getCreditConfig();
  ok("[E-14] a stored limit of 0 reads back as the $20 default, NOT as uncapped",
    cfg.limitUsd === 20, `limitUsd=${cfg.limitUsd}`);
  await burn("updown");
  ok("[E-14] and it therefore BLOCKS once spend passes $20 — 0 is not a bypass",
    !(await assertAiBudget("updown")).ok);
}

// ── 5 · The operator-facing string names the cause ──────────────────────────
// An operator watching rounds VOID must be able to tell a spend ceiling they can
// raise from a price source that is broken. Those need different actions.
{
  // `?? ""` so a MISSING switch case fails an assertion instead of throwing and
  // aborting the run — a red proof has to reach the end to be readable.
  const msg = describeRefusal("budget-exhausted" as RefusalReason,
    "AI credit limit reached ($21.35 of $20.00 this cycle)") ?? "";
  ok("describeRefusal names the credit limit", /credit limit/i.test(msg), msg);
  ok("describeRefusal carries the numbers through", msg.includes("21.35") && msg.includes("20.00"), msg);
  ok("describeRefusal does NOT blame the price source",
    !/source|domain|stale/i.test(msg), msg);
}

// ── 6 · STRUCTURAL: every SPEND PATH is gated, and a new one cannot appear ───
// The functional drives above cover the two features that exist today. This is what
// stops a THIRD uncapped spender being added tomorrow — the exact drift that caused
// this finding. Paired with, never substituted for, the live drives.
//
// The unit is the SPEND PATH, not the file: for polls the gate legitimately sits one
// layer ABOVE the module that meters. `ai-provider-claude.ts` calls recordAiUsage but
// holds no gate — correctly, because its only two entry points (`.generate`/`.ideate`)
// are reached from `ai-poll-generation.ts` alone, which gates at both call sites.
{
  /** module that meters → the module that must hold its budget gate. */
  const SPEND_PATHS: Array<[meters: string, gate: string]> = [
    ["src/lib/server/updown-oracle.ts",      "src/lib/server/updown-oracle.ts"],
    ["src/lib/server/market-sentinel.ts",    "src/lib/server/market-sentinel.ts"],
    ["src/lib/server/ai-provider-claude.ts", "src/lib/server/ai-poll-generation.ts"],
  ];
  const read = (f: string) => readFileSync(f, "utf8");

  for (const [meters, gate] of SPEND_PATHS) {
    const name = meters.split("/").pop();
    ok(`${name} meters spend`, /recordAiUsage\s*\(/.test(read(meters)));
    ok(`${name}'s spend path is gated in ${gate.split("/").pop()}`,
      /assertAiBudget\s*\(/.test(read(gate)));
  }

  // DRIFT DETECTOR — the assertion that actually protects the future. If a new module
  // starts metering AI spend, it must be added to SPEND_PATHS above (with its gate
  // named), or this fails. Without it, spender #4 repeats this finding silently.
  const { globSync } = await import("node:fs");
  const all = globSync("src/lib/server/**/*.ts")
    .filter((f) => /recordAiUsage\s*\(/.test(readFileSync(f, "utf8")))
    .map((f) => f.replace(/\\/g, "/"))
    // ai-usage.ts DEFINES recordAiUsage; it is not a spender.
    .filter((f) => !f.endsWith("/ai-usage.ts"));
  const declared = new Set(SPEND_PATHS.map(([m]) => m));
  const undeclared = all.filter((f) => !declared.has(f));
  ok("no UNDECLARED AI spender exists (add it to SPEND_PATHS with its gate)",
    undeclared.length === 0, undeclared.join(", "));
}

// Leave the live-ish default behind rather than a $0/uncapped cycle.
await setCreditLimit(20);
await resetCreditCycle();

console.log(`\nai-budget-enforcement: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
