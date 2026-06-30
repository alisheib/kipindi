/**
 * AI poll pipeline · hardening unit test (no server / no network).
 *
 * Injects a fake AIProvider and drives the real generate → validate → filter
 * pipeline to prove the accuracy + safety guarantees:
 *   - future-only dates (past / too-soon / too-far all rejected)
 *   - banned category, XSS, missing sources, low confidence rejected
 *   - duplicate detection (normalised, vs prior polls)
 *   - clean future poll reaches PENDING_REVIEW
 *   - operator config (min confidence) takes effect live
 *   - batch generation clamps to the configured ceiling
 *
 *   npx tsx scripts/ai-poll-hardening-test.mts
 */
import { setAIProvider, type AIPollGeneration, type AIProviderResponse } from "../src/lib/server/ai-provider.ts";
import {
  generateAIPoll,
  generateAIPollBatch,
} from "../src/lib/server/ai-poll-generation.ts";
import { updateAIPollConfig, getAIPollConfig } from "../src/lib/server/ai-poll-config.ts";

let pass = 0, fail = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();

function gen(overrides: Partial<AIPollGeneration> = {}): AIPollGeneration {
  return {
    titleEn: "Will Simba SC win the Tanzanian Premier League 2026?",
    titleSw: "Je, Simba SC itashinda Ligi Kuu ya Tanzania 2026?",
    titleZh: "Simba SC能否赢得2026年坦桑尼亚超级联赛？",
    category: "sports",
    resolutionCriterion: "Official TFF announcement of the 2026 TPL champion naming Simba SC.",
    resolutionAt: days(30),
    options: [
      { label: "YES", descriptionEn: "Simba SC wins" },
      { label: "NO", descriptionEn: "Another team wins" },
    ],
    sources: [{ url: "https://www.tff.or.tz/news", publisher: "TFF Official" }],
    confidence: 88,
    reasoning: "Clear binary outcome, official resolution source.",
    ...overrides,
  };
}

/** Fake provider that returns a fixed generation (or an error). */
function fakeProvider(next: () => AIProviderResponse) {
  setAIProvider({ name: "fake", async generate() { return next(); } });
}
const okResp = (generation: AIPollGeneration): AIProviderResponse => ({
  ok: true, generation, rawResponse: JSON.stringify(generation), tokensUsed: 500, costUsd: 0.001, latencyMs: 10,
});

const ACTOR = "test_officer";

console.log("\n=== AI POLL HARDENING ===\n");

// Reset config to known defaults for deterministic assertions.
updateAIPollConfig({ minConfidence: 60, minLeadTimeHours: 24, maxLeadTimeDays: 180 }, ACTOR);

// 1 · Clean future poll → PENDING_REVIEW
fakeProvider(() => okResp(gen()));
let p = await generateAIPoll({ category: "sports", actorId: ACTOR });
check("clean future poll reaches PENDING_REVIEW", p.state === "PENDING_REVIEW", p.state);
check("trusted source recognised (tff.or.tz)",
  p.qualityIndicators.some((q) => q.label === "Trusted source"), "");

// 2 · Past date → FILTERED (past_date)
fakeProvider(() => okResp(gen({ titleEn: "Will X happen in the past A?", resolutionAt: days(-2) })));
p = await generateAIPoll({ category: "sports", actorId: ACTOR });
check("past resolution date is FILTERED", p.state === "FILTERED" && p.filterReasons.includes("past_date"), p.filterReasons.join(","));

// 3 · Too soon (< 24h) → FILTERED (resolution_too_soon)
fakeProvider(() => okResp(gen({ titleEn: "Will X happen too soon B?", resolutionAt: hours(2) })));
p = await generateAIPoll({ category: "sports", actorId: ACTOR });
check("resolves under lead-time floor is FILTERED", p.state === "FILTERED" && p.filterReasons.includes("resolution_too_soon"), p.filterReasons.join(","));

// 4 · Too far (> 180d) → FILTERED (resolution_too_far)
fakeProvider(() => okResp(gen({ titleEn: "Will X happen too far C?", resolutionAt: days(400) })));
p = await generateAIPoll({ category: "sports", actorId: ACTOR });
check("resolves beyond horizon is FILTERED", p.state === "FILTERED" && p.filterReasons.includes("resolution_too_far"), p.filterReasons.join(","));

// 5 · Banned category → FILTERED (banned_category)
fakeProvider(() => okResp(gen({ titleEn: "Will the minister be appointed D?", category: "politics" })));
p = await generateAIPoll({ category: "other", actorId: ACTOR });
check("banned category is FILTERED", p.state === "FILTERED" && p.filterReasons.includes("banned_category"), p.filterReasons.join(","));

// 6 · XSS in title → FILTERED (xss_detected)
fakeProvider(() => okResp(gen({ titleEn: "<script>alert('x')</script> Will it break E?" })));
p = await generateAIPoll({ category: "sports", actorId: ACTOR });
check("XSS payload is FILTERED", p.state === "FILTERED" && p.filterReasons.includes("xss_detected"), p.filterReasons.join(","));

// 7 · No sources → FILTERED (no_sources)
fakeProvider(() => okResp(gen({ titleEn: "Will X happen with no source F?", sources: [] })));
p = await generateAIPoll({ category: "sports", actorId: ACTOR });
check("missing sources is FILTERED", p.state === "FILTERED" && p.filterReasons.includes("no_sources"), p.filterReasons.join(","));

// 8 · Low confidence (40 < 60) → FILTERED (low_confidence)
fakeProvider(() => okResp(gen({ titleEn: "Will X happen low conf G?", confidence: 40 })));
p = await generateAIPoll({ category: "sports", actorId: ACTOR });
check("below confidence floor is FILTERED", p.state === "FILTERED" && p.filterReasons.includes("low_confidence"), p.filterReasons.join(","));

// 9 · Duplicate of an accepted poll → FILTERED (duplicate_poll)
const dupTitle = "Will Yanga win the cup final H?";
fakeProvider(() => okResp(gen({ titleEn: dupTitle })));
const first = await generateAIPoll({ category: "sports", actorId: ACTOR });
fakeProvider(() => okResp(gen({ titleEn: "  will   YANGA win the CUP final h!!! " }))); // normalises equal
const second = await generateAIPoll({ category: "sports", actorId: ACTOR });
check("first of duplicate pair reaches review", first.state === "PENDING_REVIEW", first.state);
check("normalised duplicate is FILTERED", second.state === "FILTERED" && second.filterReasons.includes("duplicate_poll"), second.filterReasons.join(","));

// 10 · Provider error → VALIDATION_FAILED
fakeProvider(() => ({ ok: false, error: "rate limit", tokensUsed: 0, costUsd: 0, latencyMs: 5 }));
p = await generateAIPoll({ category: "sports", actorId: ACTOR });
check("provider error → VALIDATION_FAILED", p.state === "VALIDATION_FAILED" && p.filterReasons.includes("provider_error"), p.state);

// 11 · Config change takes effect live: raise floor to 95, an 88-confidence poll now fails
updateAIPollConfig({ minConfidence: 95 }, ACTOR);
check("config update persisted", getAIPollConfig().minConfidence === 95, String(getAIPollConfig().minConfidence));
fakeProvider(() => okResp(gen({ titleEn: "Will X happen conf gate I?", confidence: 88 })));
p = await generateAIPoll({ category: "sports", actorId: ACTOR });
check("raised confidence floor now filters an 88-confidence poll", p.state === "FILTERED" && p.filterReasons.includes("low_confidence"), p.filterReasons.join(","));
updateAIPollConfig({ minConfidence: 60 }, ACTOR); // restore

// 12 · Batch clamps to maxBatchPerRun
updateAIPollConfig({ maxBatchPerRun: 5 }, ACTOR);
let counter = 0;
fakeProvider(() => okResp(gen({ titleEn: `Batch poll unique ${counter++} J?` })));
const batch = await generateAIPollBatch({ count: 1000, actorId: ACTOR });
check("batch clamps count to maxBatchPerRun", batch.generated.length === 5, `generated=${batch.generated.length}`);

console.log(`\n${"=".repeat(56)}\nAI POLL HARDENING   PASS: ${pass}   FAIL: ${fail}\n${"=".repeat(56)}`);
process.exit(fail > 0 ? 1 : 0);
