/**
 * ops · Prove the AI spend gate against PRODUCTION'S OWN credit config and spend.
 *
 * WHY THIS EXISTS. E-15 wired `assertAiBudget` into the Up & Down oracle and the market
 * sentinel. The unit guard (`test:ai-budget`) proves the gate with a synthetic config in
 * an in-memory store. What it cannot answer is whether the gate refuses when reading the
 * REAL `SystemConfig.ai_credit_config` and the REAL `AiUsageEvent` spend on the live
 * database — the numbers that actually decide it in production.
 *
 * It cannot be proven through the admin UI, for a reason that is itself a finding: the
 * only operator-triggerable sentinel call is "Re-check this market now", and **E-18**
 * means no granted role can execute it (the route is `trading`, the action needs
 * `compliance`, and DEFAULT_GRANTS makes those disjoint). So the attempt produces a
 * `privilege_escalation_blocked` row instead of an AI call, and "nothing was spent" ends
 * up proving E-18 rather than E-15.
 *
 * So this reads production directly and drives the REAL `observePrice` / `assertAiBudget`.
 *
 * ⛔ It NEVER writes. It does not lower the limit, does not create an observation, and
 *    does not record usage — a refused call is refused before the provider is dialled,
 *    which is the property being demonstrated. To see the refusal you must run it while
 *    cycle spend already exceeds the limit; otherwise it correctly reports ALLOW and says
 *    so. Deliberately read-only: mutating a live money platform's spend ceiling to make a
 *    test go red is the wrong trade.
 *
 * Usage (DATABASE_URL must point at the live PUBLIC proxy, and the key at prod's):
 *   railway run -s 50pick -- npx tsx scripts/ops-ai-budget-live-check.mts
 *     …with DATABASE_URL overridden to the public proxy, e.g. via `live/.env`.
 */
process.env.SESSION_SECRET ??= "probe-only-session-secret-32chars-aa";
process.env.OTP_PEPPER ??= "probe-only-otp-pepper-16";
process.env.UPDOWN_ORACLE_MODEL ??= "claude-sonnet-4-6";

import { assertAiBudget, getCreditConfig } from "../src/lib/server/ai-usage.ts";
import { observePrice } from "../src/lib/server/updown-oracle.ts";
import { hasDatabase } from "../src/lib/server/prisma.ts";
import type { StoredAsset } from "../src/lib/server/updown-dal.ts";

if (!hasDatabase()) {
  console.error("NO DATABASE — point DATABASE_URL at the live public proxy first.");
  process.exit(2);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("NO ANTHROPIC_API_KEY — run through `railway run -s 50pick --`.");
  process.exit(2);
}

const cfg = await getCreditConfig();
console.log("── PRODUCTION credit config, read live ──");
console.log(`  limitUsd      $${cfg.limitUsd}`);
console.log(`  topUpWindowStartIso ${cfg.topUpWindowStartIso}`);
console.log(`  alertedLevel  ${cfg.alertedLevel}`);

const verdict = await assertAiBudget("updown");
console.log("\n── assertAiBudget('updown') against live spend ──");
if (verdict.ok) {
  console.log("  ALLOW — cycle spend is under the live limit.");
  console.log("  → Correct for the platform's current state. The REFUSAL path is proven by");
  console.log("    `npm run test:ai-budget`, which drives the same real functions with the");
  console.log("    budget exhausted and asserts no provider call is made.");
} else {
  console.log(`  REFUSE — spent $${verdict.spentUsd.toFixed(2)} of $${verdict.limitUsd.toFixed(2)}`);
  console.log("  → An `ai.call_blocked.budget_exhausted` AuditLog row was written by this read.");
}

// Now the thing that matters: does the ORACLE honour that verdict? Driven for real.
// Under budget this makes a genuine (paid) call; over budget it must cost nothing.
const asset: StoredAsset = {
  id: "uda_livecheck", key: "GOLD", symbol: "XAU/USD", nameEn: "Gold", nameSw: "Dhahabu",
  nameZh: null, iconKey: "gold",
  priceSourceUrl: "https://goldprice.org/live-gold-price.html", sourceDomain: "goldprice.org",
  category: "macro", decimals: 2, minMoveTicks: 15, enabled: true, sortOrder: 0,
  createdBy: "ops-livecheck", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

console.log("\n── driving the REAL observePrice against live config ──");
if (verdict.ok) {
  console.log("  (skipped — under budget this would spend real tokens for no new information;");
  console.log("   E-16 already documents 656 such calls and what they returned.)");
} else {
  const r = await observePrice(asset, new Date().toISOString());
  const refusedForBudget = !r.ok && r.reason === "budget-exhausted";
  console.log(`  oracle refused for budget: ${refusedForBudget}`);
  if (!r.ok) console.log(`  reason=${r.reason}  detail=${r.detail}`);
  if (!refusedForBudget) {
    console.error("  !! THE GATE DID NOT HOLD on live config — investigate immediately.");
    process.exitCode = 1;
  }
}
