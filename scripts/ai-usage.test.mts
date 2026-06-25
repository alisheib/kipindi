/**
 * Unit tests for the AI usage meter + credit-limit logic. In-memory (no DB,
 * no API). Run:  npx tsx scripts/ai-usage.test.mts
 */

// Force the in-memory DAL + seed the usage array BEFORE importing the modules
// (the DAL binds to globalThis.__50PICK_AI_USAGE at module load).
process.env.USE_PRISMA_DAL = "false";
delete process.env.DATABASE_URL;
(globalThis as Record<string, unknown>).__50PICK_AI_USAGE = [];
(globalThis as Record<string, unknown>).__50PICK_AI_CREDIT = undefined;

const usage = await import("../src/lib/server/ai-usage");

const memArr = (globalThis as Record<string, unknown>).__50PICK_AI_USAGE as unknown[];
const clear = () => { memArr.length = 0; };

let pass = 0, fail = 0;
function ok(name: string, cond: boolean) {
  if (cond) { pass++; console.log("  PASS", name); }
  else { fail++; console.log("  FAIL", name); }
}
function eq(name: string, a: unknown, b: unknown) { ok(`${name} → ${JSON.stringify(a)} == ${JSON.stringify(b)}`, a === b); }
function near(name: string, a: number, b: number, eps = 1e-9) { ok(`${name} → ${a} ≈ ${b}`, Math.abs(a - b) <= eps); }

console.log("\n1) Cost computation");
near("Sonnet 1M in + 1M out = $18", usage.costOf("claude-sonnet-4-6", 1_000_000, 1_000_000, 0), 18);
near("Haiku 1M in + 1M out = $6", usage.costOf("claude-haiku-4-5", 1_000_000, 1_000_000, 0), 6);
near("3 web searches = $0.03", usage.costOf("claude-sonnet-4-6", 0, 0, 3), 0.03);
near("unknown model falls back to Sonnet", usage.costOf("mystery", 1_000_000, 0, 0), 3);

console.log("\n2) Recording + summary aggregation");
clear();
await usage.setCreditLimit(1000); await usage.resetCreditCycle(); // high limit → no alerts here
await usage.recordAiUsage({ feature: "sentinel", model: "claude-sonnet-4-6", inputTokens: 1000, outputTokens: 500, webSearches: 1, ok: true, detail: "check · Messi WC" });
await usage.recordAiUsage({ feature: "polls", model: "claude-sonnet-4-6", inputTokens: 2000, outputTokens: 800, webSearches: 2, ok: true, detail: "generate · sports" });
await usage.recordAiUsage({ feature: "chat", model: "claude-haiku-4-5", inputTokens: 300, outputTokens: 120, ok: true });
await usage.recordAiUsage({ feature: "sentinel", model: "claude-sonnet-4-6", ok: false, errorType: "credit balance too low" });
{
  const s = await usage.getAiUsageSummary();
  eq("all calls = 4", s.windows.all.calls, 4);
  eq("today calls = 4", s.windows.today.calls, 4);
  eq("sentinel calls = 2", s.byFeature.sentinel.calls, 2);
  eq("sentinel ok = 1", s.byFeature.sentinel.ok, 1);
  eq("sentinel err = 1", s.byFeature.sentinel.err, 1);
  eq("chat calls = 1", s.byFeature.chat.calls, 1);
  eq("health ok (some ok in 24h)", s.health, "ok");
  ok("total cost > 0", s.windows.all.costUsd > 0);
}

console.log("\n3) Health = failing when every recent call errors");
clear();
await usage.recordAiUsage({ feature: "sentinel", model: "claude-sonnet-4-6", ok: false, errorType: "credit balance too low" });
{
  const s = await usage.getAiUsageSummary();
  eq("health failing", s.health, "failing");
}

console.log("\n4) Filters + pagination");
clear();
for (let i = 0; i < 5; i++) await usage.recordAiUsage({ feature: "sentinel", model: "claude-sonnet-4-6", webSearches: 1, ok: true, detail: `check · match ${i}` });
for (let i = 0; i < 3; i++) await usage.recordAiUsage({ feature: "polls", model: "claude-sonnet-4-6", ok: true, detail: "generate · crypto" });
for (let i = 0; i < 2; i++) await usage.recordAiUsage({ feature: "chat", model: "claude-haiku-4-5", ok: false, errorType: "overloaded" });
{
  eq("filter feature=sentinel → 5", (await usage.listAiUsage({ feature: "sentinel" }, 1, 100)).total, 5);
  eq("filter status=error → 2", (await usage.listAiUsage({ status: "error" }, 1, 100)).total, 2);
  eq("search 'crypto' → 3", (await usage.listAiUsage({ search: "crypto" }, 1, 100)).total, 3);
  eq("search 'overloaded' → 2", (await usage.listAiUsage({ search: "overloaded" }, 1, 100)).total, 2);
  const p1 = await usage.listAiUsage({}, 1, 4);
  const p2 = await usage.listAiUsage({}, 2, 4);
  const p3 = await usage.listAiUsage({}, 3, 4);
  eq("total = 10", p1.total, 10);
  eq("page1 rows = 4", p1.rows.length, 4);
  eq("page2 rows = 4", p2.rows.length, 4);
  eq("page3 rows = 2", p3.rows.length, 2);
  ok("newest first (page1[0] newer than page3 last)", p1.rows[0].createdAt >= p3.rows[p3.rows.length - 1].createdAt);
}

console.log("\n5) Credit limit escalation (warn at 80%, limit at 100%, debounced, re-armed on reset)");
clear();
await usage.setCreditLimit(0.10);
await usage.resetCreditCycle();
eq("starts at none", (await usage.getCreditConfig()).alertedLevel, "none");
await usage.recordAiUsage({ feature: "sentinel", model: "claude-sonnet-4-6", webSearches: 4, ok: true }); // $0.04 (40%)
eq("40% → still none", (await usage.getCreditConfig()).alertedLevel, "none");
await usage.recordAiUsage({ feature: "sentinel", model: "claude-sonnet-4-6", webSearches: 4, ok: true }); // $0.08 (80%)
eq("80% → warn", (await usage.getCreditConfig()).alertedLevel, "warn");
await usage.recordAiUsage({ feature: "sentinel", model: "claude-sonnet-4-6", webSearches: 4, ok: true }); // $0.12 (>100%)
eq("120% → limit", (await usage.getCreditConfig()).alertedLevel, "limit");
await usage.recordAiUsage({ feature: "sentinel", model: "claude-sonnet-4-6", webSearches: 4, ok: true }); // more
eq("stays limit (no regress)", (await usage.getCreditConfig()).alertedLevel, "limit");
{
  const s = await usage.getAiUsageSummary();
  near("spent this cycle ≈ $0.16", s.credit.spentThisCycleUsd, 0.16, 1e-6);
  eq("remaining clamped to 0", s.credit.remainingUsd, 0);
}
// In production a reset always lands well after prior calls; the test runs
// sub-millisecond, so wait so the new cycle start is strictly after them.
await new Promise((r) => setTimeout(r, 5));
await usage.resetCreditCycle();
{
  const s = await usage.getAiUsageSummary();
  eq("after reset → none", s.credit.alertedLevel, "none");
  near("after reset spent ≈ 0", s.credit.spentThisCycleUsd, 0, 1e-6);
}

console.log(`\n=== AI usage tests: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail === 0 ? 0 : 1);
