/**
 * AI poll pipeline · "normal market day" regression (no server / no network).
 *
 * Simulates one full operating day on /admin/ai-polls and proves the whole
 * chain behaves — generation, filtering, officer approve / reject / edit,
 * publish-to-live-market, daily progress, cleanup, and the guard rails:
 *
 *   MORNING  — batch-generate a realistic mix (good + past-date + banned +
 *              low-confidence + duplicate); good ones reach review, bad ones
 *              are filtered out.
 *   REVIEW   — officer approves two, rejects one, edits one (re-validates).
 *   PUBLISH  — approved polls become LIVE markets via the candidate pipeline.
 *   PROGRESS — the daily KPI reflects published-vs-target.
 *   CLEANUP  — terminal-state polls can be deleted; in-play ones cannot.
 *   GUARDS   — illegal state transitions are refused, not silently allowed.
 *   AUDIT    — every officer action is on the tamper-evident audit chain.
 *
 *   npx tsx scripts/ai-poll-market-day-regression.mts
 */
import { setAIProvider, type AIPollGeneration, type AIProviderResponse } from "../src/lib/server/ai-provider.ts";
import {
  generateAIPollBatch,
  approveAIPoll,
  rejectAIPoll,
  editAIPoll,
  markAIPollPublished,
  deleteAIPoll,
  listAIPolls,
  countAIPollsByState,
  aiPollDailyProgress,
  type StoredAIPoll,
} from "../src/lib/server/ai-poll-generation.ts";
import { updateAIPollConfig } from "../src/lib/server/ai-poll-config.ts";
import {
  ingestCandidate, filterCandidate, attachVerification, scoreCandidate, approveCandidate, markPublished,
} from "../src/lib/server/market-candidate.ts";
import { createMarket, listMarkets } from "../src/lib/server/market-service.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}
const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

function g(o: Partial<AIPollGeneration>): AIPollGeneration {
  return {
    titleEn: "Untitled?", titleSw: "Bila kichwa?", category: "sports",
    resolutionCriterion: "Official source announcement naming the outcome for a YES result.",
    resolutionAt: days(30),
    options: [{ label: "YES", descriptionEn: "Yes" }, { label: "NO", descriptionEn: "No" }],
    sources: [{ url: "https://www.tff.or.tz/news", publisher: "TFF Official" }],
    confidence: 86, reasoning: "Clear binary outcome with an official resolution source.",
    ...o,
  };
}
const ok = (gen: AIPollGeneration): AIProviderResponse =>
  ({ ok: true, generation: gen, rawResponse: JSON.stringify(gen), tokensUsed: 620, costUsd: 0.0016, latencyMs: 12 });

/** Replicates publishPollAction's service chain (auth wrapper aside) so we
 *  test the real candidate→market path, not a stand-in. */
async function publishPoll(poll: StoredAIPoll, officerId: string): Promise<{ marketId: string; candidateId: string }> {
  const candidate = ingestCandidate({
    category: (poll.category === "tech" || poll.category === "other" ? "macro" : poll.category) as
      "sports" | "macro" | "weather" | "crypto" | "culture" | "infrastructure",
    proposedTitleEn: poll.titleEn,
    proposedTitleSw: poll.titleSw || undefined,
    resolutionCriterion: poll.resolutionCriterion,
    resolutionAt: poll.resolutionAt,
    sources: poll.sources.map((s) => ({ url: s.url, publisher: s.publisher, retrievedAt: new Date().toISOString() })),
    tokensSpent: poll.tokensUsed, costUsd: poll.costUsd, actorId: officerId,
  });
  filterCandidate(candidate.id, { passes: true });
  attachVerification(candidate.id, { confirmingSources: [], tokensSpent: 0, costUsd: 0 });
  scoreCandidate(candidate.id, { confidence: poll.confidence, tokensSpent: 0, costUsd: 0, rubric: { aiPollQuality: poll.overallQuality } });
  approveCandidate(candidate.id, { officerId, note: `Auto-approved from AI poll ${poll.id}` });
  const marketCategory = poll.category === "infrastructure" ? "macro"
    : poll.category === "tech" ? "tech" : poll.category === "other" ? "other" : poll.category;
  const market = createMarket({
    titleEn: poll.titleEn, titleSw: poll.titleSw || poll.titleEn,
    category: marketCategory as "sports" | "macro" | "weather" | "crypto" | "culture" | "tech" | "other",
    sourceUrl: poll.sources[0]?.url ?? "", resolutionCriterion: poll.resolutionCriterion,
    resolutionAt: poll.resolutionAt, proposedBy: officerId,
  });
  markPublished(candidate.id, market.id, officerId);
  await markAIPollPublished(poll.id, { candidateId: candidate.id, marketId: market.id, officerId });
  return { marketId: market.id, candidateId: candidate.id };
}

const OFFICER = "officer_marketday";

console.log("\n=== AI POLL · NORMAL MARKET DAY REGRESSION ===\n");

// Production-like config; web search off so the fake provider is deterministic.
updateAIPollConfig({ webSearchEnabled: false, dailyTarget: 3, minConfidence: 60, minLeadTimeHours: 24, maxLeadTimeDays: 180, maxBatchPerRun: 25 }, OFFICER);

// ── MORNING: a day's worth of generations, queued in order ──
console.log("--- MORNING · batch generation ---");
const queue: AIPollGeneration[] = [
  g({ titleEn: "Will Simba SC win the Tanzanian Premier League 2026?", category: "sports" }),                 // good
  g({ titleEn: "Will Bitcoin close above $150,000 by 31 Aug 2026?", category: "crypto",
      sources: [{ url: "https://www.coingecko.com/en/coins/bitcoin", publisher: "CoinGecko" }] }),            // good
  g({ titleEn: "Will Dar es Salaam record over 200mm rainfall in the resolution window?", category: "weather",
      sources: [{ url: "https://www.meteo.go.tz/", publisher: "TMA" }] }),                                    // good
  g({ titleEn: "Will the macro report land before its deadline?", category: "macro", resolutionAt: days(-3) }),// past_date → FILTERED
  g({ titleEn: "Will a named politician be appointed minister?", category: "politics" }),                     // banned → FILTERED
  g({ titleEn: "Will a niche cultural event happen this season?", category: "culture", confidence: 41 }),      // low_conf → FILTERED
  g({ titleEn: "  will   SIMBA sc win the tanzanian premier league 2026 !! ", category: "sports" }),          // duplicate → FILTERED
  g({ titleEn: "Will the SGR Dodoma–Singida section open within the window?", category: "infrastructure",
      sources: [{ url: "https://www.trc.go.tz/", publisher: "TRC" }] }),                                      // good
];
let qi = 0;
setAIProvider({ name: "fake-marketday", async generate() { return ok(queue[qi++] ?? queue[queue.length - 1]); } });

const batch = await generateAIPollBatch({ count: queue.length, actorId: OFFICER });
const pendingAfterBatch = batch.generated.filter((p) => p.state === "PENDING_REVIEW");
const filteredAfterBatch = batch.generated.filter((p) => p.state === "FILTERED");
check("batch generated all queued polls", batch.generated.length === queue.length, `n=${batch.generated.length}`);
check("4 good polls reached review", pendingAfterBatch.length === 4, `pending=${pendingAfterBatch.length}`);
check("4 bad polls were filtered out", filteredAfterBatch.length === 4, `filtered=${filteredAfterBatch.length}`);
check("past-date poll filtered (past_date)",
  filteredAfterBatch.some((p) => p.filterReasons.includes("past_date")));
check("politics poll filtered (banned_category)",
  filteredAfterBatch.some((p) => p.filterReasons.includes("banned_category")));
check("low-confidence poll filtered (low_confidence)",
  filteredAfterBatch.some((p) => p.filterReasons.includes("low_confidence")));
check("duplicate poll filtered (duplicate_poll)",
  filteredAfterBatch.some((p) => p.filterReasons.includes("duplicate_poll")));

// ── REVIEW: officer works the pending queue ──
console.log("\n--- REVIEW · approve / reject / edit ---");
const [poll1, poll2, poll3, poll4] = pendingAfterBatch; // Simba, BTC, Dar rainfall, SGR
const a1 = await approveAIPoll(poll1.id, { officerId: OFFICER, note: "Strong domestic market." });
const a2 = await approveAIPoll(poll2.id, { officerId: OFFICER, note: "Clear crypto threshold." });
check("approve poll #1 → APPROVED", a1?.state === "APPROVED", a1?.state);
check("approve poll #2 → APPROVED", a2?.state === "APPROVED", a2?.state);

const r3 = await rejectAIPoll(poll3.id, { officerId: OFFICER, reasons: ["officer_decision" as never], note: "Holding weather markets today." });
check("reject poll #3 → REJECTED", r3?.state === "REJECTED", r3?.state);

const e4 = await editAIPoll(poll4.id, { officerId: OFFICER, titleEn: "Will the SGR Dodoma–Singida line open commercial service within 120 days?" });
check("edit poll #4 stays in review after re-validate", e4?.state === "PENDING_REVIEW", e4?.state);
check("edited title persisted", e4?.titleEn.includes("commercial service") === true);

const counts = await countAIPollsByState();
check("state tally: APPROVED=2", counts.APPROVED === 2, String(counts.APPROVED));
check("state tally: PENDING_REVIEW=1 (the edited SGR poll)", counts.PENDING_REVIEW === 1, String(counts.PENDING_REVIEW));
check("state tally: REJECTED=1", counts.REJECTED === 1, String(counts.REJECTED));
check("state tally: FILTERED=4", counts.FILTERED === 4, String(counts.FILTERED));

// ── PUBLISH: approved polls become live markets ──
console.log("\n--- PUBLISH · approved polls → live markets ---");
const marketsBefore = listMarkets().length;
const pub1 = await publishPoll((await listAIPolls({ state: "APPROVED" }))[0], OFFICER);
const pub2 = await publishPoll((await listAIPolls({ state: "APPROVED" }))[0], OFFICER); // next remaining approved
const marketsAfter = listMarkets();
check("two new markets created", marketsAfter.length === marketsBefore + 2, `+${marketsAfter.length - marketsBefore}`);
check("published market #1 is LIVE", marketsAfter.some((m) => m.id === pub1.marketId && m.status === "LIVE"));
check("published market #2 is LIVE", marketsAfter.some((m) => m.id === pub2.marketId && m.status === "LIVE"));
const liveMkt = marketsAfter.find((m) => m.id === pub1.marketId)!;
check("live market resolves in the future", new Date(liveMkt.resolutionAt).getTime() > Date.now());
check("live market carries a source URL", !!liveMkt.sourceUrl);
check("both polls now PUBLISHED", (await countAIPollsByState()).PUBLISHED === 2, String((await countAIPollsByState()).PUBLISHED));
check("no APPROVED polls left in queue", (await countAIPollsByState()).APPROVED === 0, String((await countAIPollsByState()).APPROVED));

// ── PROGRESS: daily KPI ──
console.log("\n--- PROGRESS · daily target KPI ---");
const prog = await aiPollDailyProgress();
check("createdToday counts the whole batch", prog.createdToday === queue.length, String(prog.createdToday));
check("publishedToday === 2", prog.publishedToday === 2, String(prog.publishedToday));
check("target met (2 published ≥ target 3? remaining shown)", prog.remaining === Math.max(0, prog.target - 2), `remaining=${prog.remaining}`);

// ── CLEANUP: delete terminal, refuse in-play ──
console.log("\n--- CLEANUP · deletions ---");
const aFiltered = (await listAIPolls({ state: "FILTERED" }))[0];
check("delete a FILTERED poll succeeds", (await deleteAIPoll(aFiltered.id, OFFICER)) === true);
const aPending = (await listAIPolls({ state: "PENDING_REVIEW" }))[0];
check("delete an in-play PENDING poll is refused", (await deleteAIPoll(aPending.id, OFFICER)) === false);
const aPublished = (await listAIPolls({ state: "PUBLISHED" }))[0];
check("delete a PUBLISHED poll is refused", (await deleteAIPoll(aPublished.id, OFFICER)) === false);

// ── GUARDS: illegal transitions refused ──
console.log("\n--- GUARDS · illegal transitions ---");
check("approve a FILTERED poll returns null", (await approveAIPoll((await listAIPolls({ state: "FILTERED" }))[0].id, { officerId: OFFICER })) === null);
check("reject a PUBLISHED poll returns null", (await rejectAIPoll((await listAIPolls({ state: "PUBLISHED" }))[0].id, { officerId: OFFICER, reasons: [] })) === null);
check("markPublished on a non-approved poll returns null",
  (await markAIPollPublished((await listAIPolls({ state: "PUBLISHED" }))[0].id, { candidateId: "x", marketId: "y", officerId: OFFICER })) === null);

// ── AUDIT: officer actions on the chain ──
console.log("\n--- AUDIT · trail ---");
const auditActions = new Set(getAuditPage({ limit: 1000 }).map((e) => e.action));
check("audit has aipoll.batch_started", auditActions.has("aipoll.batch_started"));
check("audit has aipoll.approved", auditActions.has("aipoll.approved"));
check("audit has aipoll.rejected", auditActions.has("aipoll.rejected"));
check("audit has aipoll.edited", auditActions.has("aipoll.edited"));
check("audit has aipoll.published", auditActions.has("aipoll.published"));
check("audit has market.created", auditActions.has("market.created"));
check("audit has aipoll.deleted", auditActions.has("aipoll.deleted"));

console.log(`\n${"=".repeat(60)}\nMARKET-DAY REGRESSION   PASS: ${pass}   FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
