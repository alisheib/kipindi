/**
 * Two-tier AI poll generation tests (in-memory; no DATABASE_URL, no API key →
 * MockClaudeProvider). Covers the FREE Tier-1.5 idea filter exhaustively (pure,
 * deterministic), the end-to-end two-tier batch + fallback wiring, and the owner's
 * 2026-09-17 decision that a poll has NO maximum resolution date.
 */
// Force the mock provider (no real Anthropic calls) BEFORE anything imports it.
delete process.env.ANTHROPIC_API_KEY;

import { filterIdeas, generateAIPoll, generateAIPollBatch } from "../src/lib/server/ai-poll-generation.ts";
import { setAIProvider, type AIPollGeneration, type PollIdea } from "../src/lib/server/ai-provider.ts";
import { buildIdeationPrompt, buildSystemPrompt } from "../src/lib/server/ai-provider-claude.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const NOW = 1_750_000_000_000;
const DAY = 86_400_000;
const HOUR = 3_600_000;
const OPTS = { minLeadHours: 24, avoidTitles: [] as string[], now: NOW };
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
function idea(p: Partial<PollIdea>): PollIdea {
  return { titleEn: "Will Simba win the league?", category: "sports", resolutionDateGuess: iso(NOW + 30 * DAY), why: "hot", ...p };
}

// ── filterIdeas: keep a clean idea ───────────────────────────────────────────
{
  const r = filterIdeas([idea({})], OPTS);
  ok("clean idea kept", r.kept.length === 1 && r.dropped.length === 0);
  ok("category normalised to lowercase", filterIdeas([idea({ category: "SPORTS" })], OPTS).kept[0]?.category === "sports");
}

// ── filterIdeas: each rejection reason ───────────────────────────────────────
{
  ok("invalid category dropped", filterIdeas([idea({ category: "politics" })], OPTS).dropped[0]?.reason === "invalid_category");
  ok("empty category dropped", filterIdeas([idea({ category: "" })], OPTS).dropped[0]?.reason === "invalid_category");
  ok("empty title dropped", filterIdeas([idea({ titleEn: "   " })], OPTS).dropped[0]?.reason === "empty_title");
  ok("unparseable date dropped", filterIdeas([idea({ resolutionDateGuess: "not-a-date" })], OPTS).dropped[0]?.reason === "invalid_date");
  ok("too-soon date dropped", filterIdeas([idea({ resolutionDateGuess: iso(NOW + 2 * HOUR) })], OPTS).dropped[0]?.reason === "resolution_too_soon");
}

// ── filterIdeas: NO upper date bound (owner decision, 2026-09-17) ─────────────
{
  // The retired 240-day cap dropped a 2026/27 league season and AFCON 2027 right here.
  const r = filterIdeas([idea({ resolutionDateGuess: iso(NOW + 999 * DAY) })], OPTS);
  ok("an idea resolving 999 days out is KEPT", r.kept.length === 1 && r.dropped.length === 0, JSON.stringify(r.dropped));
}

// ── filterIdeas: 24h grace on the lower bound ────────────────────────────────
{
  // minLead 24h, grace 24h → floor is now+0h. A guess 12h out is kept; -48h dropped.
  ok("date within 24h grace is kept", filterIdeas([idea({ resolutionDateGuess: iso(NOW + 12 * HOUR) })], OPTS).kept.length === 1);
  ok("date well before window dropped", filterIdeas([idea({ resolutionDateGuess: iso(NOW - 2 * DAY) })], OPTS).dropped[0]?.reason === "resolution_too_soon");
}

// ── filterIdeas: dedup vs existing board AND intra-batch ──────────────────────
{
  const avoid = filterIdeas([idea({ titleEn: "Will Simba WIN the League???" })], { ...OPTS, avoidTitles: ["will simba win the league"] });
  ok("duplicate of existing board title dropped (normalised)", avoid.dropped[0]?.reason === "duplicate");

  const batch = filterIdeas([idea({ titleEn: "Will it rain in Dar tomorrow?" }), idea({ titleEn: "will it RAIN in dar tomorrow??" })], OPTS);
  ok("intra-batch duplicate dropped (first kept, second dropped)", batch.kept.length === 1 && batch.dropped[0]?.reason === "duplicate");
}

// ── filterIdeas: mixed batch keeps only the valid, distinct ones ──────────────
{
  const r = filterIdeas([
    idea({ titleEn: "A real one", resolutionDateGuess: iso(NOW + 10 * DAY) }),
    idea({ titleEn: "Banned", category: "war" }),
    idea({ titleEn: "Next season's champion", resolutionDateGuess: iso(NOW + 999 * DAY) }),
    idea({ titleEn: "A real one" }), // dup of #1
    idea({ titleEn: "Another real one", category: "crypto", resolutionDateGuess: iso(NOW + 20 * DAY) }),
  ], OPTS);
  ok("mixed batch keeps exactly the 3 valid distinct ideas, far-dated one included", r.kept.length === 3, `kept=${r.kept.length}`);
  ok("mixed batch drops the banned category and the duplicate", r.dropped.length === 2, `dropped=${r.dropped.length}`);
}

// ── END-TO-END two-tier batch via the mock provider ──────────────────────────
{
  const { generated, summary } = await generateAIPollBatch({ count: 5, actorId: "tester" });
  ok("batch produced exactly 5 poll records", generated.length === 5, `len=${generated.length}`);
  ok("every record has an id + state", generated.every((p) => !!p.id && !!p.state));
  const sum = Object.values(summary).reduce((a, b) => a + b, 0);
  ok("summary counts sum to 5", sum === 5, `sum=${sum}`);
}

// ── FALLBACK: ideation yields nothing usable → top-up still hits the count ────
{
  // All ideas come back with an invalid category → filterIdeas drops them all →
  // the top-up free-choice path must still produce the requested count.
  const { generated } = await generateAIPollBatch({ count: 3, categories: ["nonsensecat"], actorId: "tester" });
  ok("fallback top-up still produced 3 polls when no idea survived", generated.length === 3, `len=${generated.length}`);
}

// ── NO MAXIMUM RESOLUTION DATE, end to end (owner decision, 2026-09-17) ──────
{
  // The real generate → validate path, answered with a poll resolving 400 days out.
  // Under the retired cap this landed in FILTERED with `resolution_too_far`.
  const generation: AIPollGeneration = {
    titleEn: "Will Simba SC win the 2027/28 NBC Premier League title?",
    titleSw: "Je, Simba SC itashinda ubingwa wa Ligi Kuu ya NBC 2027/28?",
    titleZh: "Simba SC 会赢得 2027/28 赛季 NBC 超级联赛冠军吗？",
    category: "sports",
    resolutionCriterion: "Resolves YES if the TFF official final standings list Simba SC as 2027/28 champions.",
    resolutionAt: new Date(Date.now() + 400 * DAY).toISOString(),
    options: [
      { label: "YES", descriptionEn: "Simba SC are champions" },
      { label: "NO", descriptionEn: "Another club is champion" },
    ],
    sources: [{ url: "https://www.tff.or.tz/news", publisher: "TFF Official" }],
    confidence: 88,
    reasoning: "A season-long market settled by one official source.",
  };
  setAIProvider({
    name: "far-dated",
    async generate() { return { ok: true, generation, rawResponse: "{}", tokensUsed: 1, costUsd: 0, latencyMs: 1 }; },
    async ideate() { return { ok: true, ideas: [], tokensUsed: 0, costUsd: 0, latencyMs: 0 }; },
  });
  const p = await generateAIPoll({ category: "sports", actorId: "tester" });
  ok("a poll resolving 400 days out reaches PENDING_REVIEW", p.state === "PENDING_REVIEW" && p.filterReasons.length === 0, `${p.state} [${p.filterReasons.join(",")}]`);
  ok("its resolution date scores good", p.qualityIndicators.some((q) => q.label === "Resolution date" && q.status === "good"), JSON.stringify(p.qualityIndicators));
}

// ── NO MAXIMUM RESOLUTION DATE in what the AI is TOLD (owner decision, 2026-09-17) ──
{
  // Both prompts used to name a latest date, so the model refused far-dated events on its own
  // before any code check ran. No date in either prompt may lie past the earliest allowed one.
  const floor = Date.now() + 24 * HOUR;
  const nowIso = new Date().toISOString();

  const system = buildSystemPrompt({ nowIso, category: "sports", minLeadHours: 24, webSearch: true });
  const stamps = system.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g) ?? [];
  ok("generation prompt names the earliest resolution time", stamps.some((s) => Math.abs(Date.parse(s) - floor) < 60_000), stamps.join(" "));
  ok("generation prompt names NO later time", stamps.every((s) => Date.parse(s) < floor + 60_000), stamps.join(" "));

  const ideation = buildIdeationPrompt({ nowIso, minLeadHours: 24, categories: ["sports"], count: 3 });
  const dates = ideation.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  ok("ideation prompt names the earliest resolution date", dates.includes(iso(floor)), dates.join(" "));
  ok("ideation prompt names NO later date", dates.every((d) => d <= iso(floor)), dates.join(" "));
}

console.log(`\nai-poll-ideas: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
