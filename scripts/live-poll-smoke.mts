/**
 * AI poll generation · LIVE smoke test (calls the REAL Anthropic API).
 *
 * Generates one poll per category through the real ClaudeProvider + the full
 * validation pipeline, then prints each poll so you can eyeball QUALITY:
 * are these hot, current, well-sourced, genuinely-uncertain markets?
 *
 * It uses live web search (toggled on for the run) so source URLs and dates
 * are grounded in real current events. Cost is ~$0.01–0.03 per category.
 *
 * Run (PowerShell):
 *   $env:ANTHROPIC_API_KEY="sk-ant-..."; npx tsx scripts/live-poll-smoke.mts
 * Run (bash):
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/live-poll-smoke.mts
 *
 * Safe to run with no key — it prints how to provide one and exits cleanly.
 */
import { generateAIPoll } from "../src/lib/server/ai-poll-generation.ts";
import { updateAIPollConfig } from "../src/lib/server/ai-poll-config.ts";
import { seedDefaultSources } from "../src/lib/server/source-registry.ts";

if (!process.env.ANTHROPIC_API_KEY) {
  console.log("\nNo ANTHROPIC_API_KEY set — this test calls the real API.\n");
  console.log("PowerShell:  $env:ANTHROPIC_API_KEY=\"sk-ant-...\"; npx tsx scripts/live-poll-smoke.mts");
  console.log("bash:        ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/live-poll-smoke.mts\n");
  process.exit(0);
}

const CATEGORIES = ["sports", "macro", "weather", "crypto", "culture", "infrastructure", "tech"];
const ACTOR = "live_smoke";

// Web search ON so we see grounded, real-source polls.
updateAIPollConfig({ webSearchEnabled: true, minConfidence: 60, minLeadTimeHours: 24, maxLeadTimeDays: 180 }, ACTOR);
seedDefaultSources();

console.log("\n" + "=".repeat(72));
console.log("LIVE POLL SMOKE TEST  ·  real Anthropic API  ·  web search ON");
console.log("=".repeat(72));

let totalCost = 0;
let reachedReview = 0;
const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleString("en-GB"); } catch { return iso; } };

for (const category of CATEGORIES) {
  console.log(`\n── ${category.toUpperCase()} ${"─".repeat(60 - category.length)}`);
  const t0 = Date.now();
  const poll = await generateAIPoll({ category, actorId: ACTOR });
  totalCost += poll.costUsd;
  if (poll.state === "PENDING_REVIEW") reachedReview++;

  console.log(`state        : ${poll.state}${poll.filterReasons.length ? `  (${poll.filterReasons.join(", ")})` : ""}`);
  console.log(`title (EN)   : ${poll.titleEn || "—"}`);
  console.log(`title (SW)   : ${poll.titleSw || "—"}`);
  console.log(`resolves     : ${poll.resolutionAt ? fmtDate(poll.resolutionAt) : "—"}`);
  console.log(`criterion    : ${poll.resolutionCriterion || "—"}`);
  console.log(`options      : ${poll.options.map((o) => o.label).join("  /  ") || "—"}`);
  console.log(`sources      : ${poll.sources.map((s) => `${s.publisher} <${s.url}>`).join("\n               ") || "—"}`);
  console.log(`confidence   : ${poll.confidence}    quality: ${poll.overallQuality}%`);
  console.log(`cost         : $${poll.costUsd.toFixed(4)}    latency: ${(poll.latencyMs / 1000).toFixed(1)}s    (wall ${(Date.now() - t0) / 1000}s)`);
  if (poll.reasoning) console.log(`reasoning    : ${poll.reasoning}`);
}

console.log("\n" + "=".repeat(72));
console.log(`DONE  ·  ${reachedReview}/${CATEGORIES.length} reached PENDING_REVIEW  ·  total cost $${totalCost.toFixed(4)}`);
console.log("=".repeat(72) + "\n");
