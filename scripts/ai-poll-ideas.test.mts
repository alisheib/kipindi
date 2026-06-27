/**
 * Two-tier AI poll generation tests (in-memory; no DATABASE_URL, no API key →
 * MockClaudeProvider). Covers the FREE Tier-1.5 idea filter exhaustively (pure,
 * deterministic) and the end-to-end two-tier batch + fallback wiring.
 */
// Force the mock provider (no real Anthropic calls) BEFORE anything imports it.
delete process.env.ANTHROPIC_API_KEY;

import { filterIdeas, generateAIPollBatch } from "../src/lib/server/ai-poll-generation.ts";
import type { PollIdea } from "../src/lib/server/ai-provider.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const NOW = 1_750_000_000_000;
const DAY = 86_400_000;
const HOUR = 3_600_000;
const OPTS = { minLeadHours: 24, maxLeadDays: 240, avoidTitles: [] as string[], now: NOW };
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
  ok("too-far date dropped", filterIdeas([idea({ resolutionDateGuess: iso(NOW + 300 * DAY) })], OPTS).dropped[0]?.reason === "resolution_too_far");
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

// ── filterIdeas: mixed batch keeps only the valid, distinct, in-window ones ───
{
  const r = filterIdeas([
    idea({ titleEn: "A real one", resolutionDateGuess: iso(NOW + 10 * DAY) }),
    idea({ titleEn: "Banned", category: "war" }),
    idea({ titleEn: "Too far", resolutionDateGuess: iso(NOW + 999 * DAY) }),
    idea({ titleEn: "A real one" }), // dup of #1
    idea({ titleEn: "Another real one", category: "crypto", resolutionDateGuess: iso(NOW + 20 * DAY) }),
  ], OPTS);
  ok("mixed batch keeps exactly the 2 valid distinct ideas", r.kept.length === 2, `kept=${r.kept.length}`);
  ok("mixed batch drops the other 3", r.dropped.length === 3, `dropped=${r.dropped.length}`);
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

console.log(`\nai-poll-ideas: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
