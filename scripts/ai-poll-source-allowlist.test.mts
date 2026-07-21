/**
 * Source-allowlist tests — the "AI never generates outside our sources /
 * categories" guarantee (docs/AI-POLL-SOURCES.md).
 *
 * Covers:
 *   1. getGeneratableCategories reflects the enabled registry (excludes a
 *      category with no enabled source, and a disabled category).
 *   2. resolvePublishCategory folds generation-only / legacy categories to a
 *      real MarketCategory (the SAME mapping the publish gate + market create use).
 *   3. generateAIPoll HARD-filters a poll whose primary source is not on the
 *      trusted registry for its category (source_not_trusted), and lets a
 *      properly-sourced one reach PENDING_REVIEW.
 *   4. A trusted source is reordered to primary so the publish gate (sources[0])
 *      is always satisfied for a poll that reaches review.
 *   5. Requesting a category with no enabled source is refused BEFORE any spend
 *      (the provider is never called).
 *   6. filterIdeas drops ideas in a non-generatable category (Tier-1.5, free).
 *   7. generateAIPollBatch only produces polls in generatable categories.
 *
 * Run: npm run test:ai-source-allowlist
 */
delete process.env.ANTHROPIC_API_KEY;

import {
  generateAIPoll, generateAIPollBatch, filterIdeas, getAIPoll,
} from "../src/lib/server/ai-poll-generation.ts";
import { setAIProvider, type AIProvider, type AIPollGeneration, type GenerateRequest } from "../src/lib/server/ai-provider.ts";
import {
  seedDefaultSources, getGeneratableCategories, setCategoryEnabled, addSource,
} from "../src/lib/server/source-registry.ts";
import { resolvePublishCategory } from "../src/lib/server/market-service.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`✓ ${label}`); }
  else { fail++; console.log(`✗ ${label}${extra ? ` — ${extra}` : ""}`); }
}
const DAY = 86_400_000;
const future = (days: number) => new Date(Date.now() + days * DAY).toISOString();

// Seeded, enabled default domain per category (from seedDefaultSources).
const SEEDED: Record<string, string> = {
  sports: "tff.or.tz", macro: "bot.go.tz", weather: "meteo.go.tz",
  crypto: "coingecko.com", culture: "itv.co.tz", tech: "tcra.go.tz",
};

let uniq = 0;
/** A provider whose source is configurable. When `sources` is omitted it cites
 *  the seeded domain for the REQUESTED category, so it is always compliant. */
class TestProvider implements AIProvider {
  name = "allowlist-test";
  calls = 0;
  private sources?: Array<{ url: string; publisher: string }>;
  constructor(sources?: Array<{ url: string; publisher: string }>) { this.sources = sources; }
  async ideate() { return { ok: true as const, ideas: [], tokensUsed: 0, costUsd: 0, latencyMs: 0 }; }
  async generate(req: GenerateRequest): Promise<{ ok: true } & Record<string, unknown>> {
    this.calls++;
    const domain = SEEDED[req.category] ?? "tff.or.tz";
    const gen: AIPollGeneration = {
      titleEn: `Allowlist test ${req.category} question number ${++uniq}?`,
      titleSw: `Swahili ${uniq}`,
      titleZh: `中文 ${uniq}`,
      category: req.category,
      resolutionCriterion: "Resolves per the named official source on the resolution date.",
      resolutionAt: future(30),
      options: [{ label: "YES" }, { label: "NO" }] as never,
      sources: this.sources ?? [{ url: `https://www.${domain}/report`, publisher: "Official Source" }],
      confidence: 82,
      reasoning: "test",
    };
    return { ok: true, generation: gen, tokensUsed: 1, costUsd: 0, latencyMs: 1, rawResponse: "{}" } as never;
  }
}

const actorId = "officer_allowlist";

await seedDefaultSources();

// ── 1 · getGeneratableCategories reflects the registry ──
{
  const gen = await getGeneratableCategories();
  const cats = gen.map((g) => g.category);
  ok("1a seeded categories are generatable", ["macro", "sports", "weather", "crypto", "culture", "tech"].every((c) => cats.includes(c as never)), cats.join(","));
  ok("1b 'other' (no seeded source) is NOT generatable", !cats.includes("other" as never), cats.join(","));
  ok("1c every generatable category carries ≥1 domain", gen.every((g) => g.domains.length > 0), JSON.stringify(gen.map((g) => [g.category, g.domains.length])));
  const macro = gen.find((g) => g.category === "macro");
  ok("1d macro lists its enabled domains", !!macro && macro.domains.includes("bot.go.tz"), JSON.stringify(macro?.domains));
}

// ── 2 · resolvePublishCategory is the one mapping ──
{
  ok("2a sports → sports", resolvePublishCategory("sports") === "sports");
  ok("2b tech → tech (no longer folded to macro)", resolvePublishCategory("tech") === "tech");
  ok("2c infrastructure → macro (generation-only flavour)", resolvePublishCategory("infrastructure") === "macro");
  ok("2d mixed/unknown → other", resolvePublishCategory("mixed") === "other" && resolvePublishCategory("banana") === "other");
  ok("2e case-insensitive + trims", resolvePublishCategory("  MACRO ") === "macro");
}

// ── 3 · untrusted source is hard-filtered; trusted one passes ──
{
  setAIProvider(new TestProvider([{ url: "https://www.some-unapproved-site.com/x", publisher: "Random Blog" }]));
  const poll = await generateAIPoll({ category: "macro", actorId });
  ok("3a untrusted macro source → FILTERED", poll.state === "FILTERED", poll.state);
  ok("3b source_not_trusted reason recorded", poll.filterReasons.includes("source_not_trusted"), poll.filterReasons.join(","));
  ok("3c never reaches PENDING_REVIEW", poll.state !== "PENDING_REVIEW", poll.state);

  setAIProvider(new TestProvider()); // cites the seeded bot.go.tz for macro
  const good = await generateAIPoll({ category: "macro", actorId });
  ok("3d trusted macro source → PENDING_REVIEW", good.state === "PENDING_REVIEW", `${good.state} ${good.filterReasons.join(",")}`);
  ok("3e no source_not_trusted on the good poll", !good.filterReasons.includes("source_not_trusted"), good.filterReasons.join(","));
}

// ── 4 · a trusted source is reordered to primary ──
{
  setAIProvider(new TestProvider([
    { url: "https://www.some-unapproved-site.com/x", publisher: "Random Blog" }, // untrusted, listed first
    { url: "https://www.bot.go.tz/monetary-policy", publisher: "Bank of Tanzania" }, // trusted
  ]));
  const poll = await generateAIPoll({ category: "macro", actorId });
  ok("4a mixed sources still reach PENDING_REVIEW", poll.state === "PENDING_REVIEW", `${poll.state} ${poll.filterReasons.join(",")}`);
  ok("4b trusted source is primary (publish checks sources[0])", (poll.sources[0]?.url ?? "").includes("bot.go.tz"), poll.sources[0]?.url);
}

// ── 5 · a category with no enabled source is refused BEFORE any spend ──
{
  const provider = new TestProvider();
  setAIProvider(provider);
  const poll = await generateAIPoll({ category: "other", actorId }); // 'other' has no seeded source
  ok("5a non-generatable category → FILTERED", poll.state === "FILTERED", poll.state);
  ok("5b reason is source_not_trusted", poll.filterReasons.includes("source_not_trusted"), poll.filterReasons.join(","));
  ok("5c provider was NEVER called (no wasted spend)", provider.calls === 0, `calls=${provider.calls}`);
  ok("5d poll cost is zero", poll.costUsd === 0 && poll.tokensUsed === 0, `cost=${poll.costUsd} tok=${poll.tokensUsed}`);
}

// ── 6 · a disabled category becomes non-generatable ──
{
  await setCategoryEnabled("crypto", false, actorId);
  const gen = await getGeneratableCategories();
  ok("6a disabled category drops out of generatable", !gen.map((g) => g.category).includes("crypto" as never), gen.map((g) => g.category).join(","));
  const provider = new TestProvider();
  setAIProvider(provider);
  const poll = await generateAIPoll({ category: "crypto", actorId });
  ok("6b generating a disabled category → FILTERED, no spend", poll.state === "FILTERED" && provider.calls === 0, `${poll.state} calls=${provider.calls}`);
  await setCategoryEnabled("crypto", true, actorId); // restore
}

// ── 7 · adding a source makes a previously-empty category generatable ──
{
  await addSource({ domain: "www.african-markets.com", label: "African Markets", category: "macro", rationale: "test", addedBy: actorId });
  const gen = await getGeneratableCategories();
  const macro = gen.find((g) => g.category === "macro");
  ok("7a newly-added domain is normalised (no www.) + generatable", !!macro && macro.domains.includes("african-markets.com"), JSON.stringify(macro?.domains));
  setAIProvider(new TestProvider([{ url: "https://www.african-markets.com/report", publisher: "African Markets" }]));
  const poll = await generateAIPoll({ category: "macro", actorId });
  ok("7b a poll citing the newly-approved macro source now passes", poll.state === "PENDING_REVIEW", `${poll.state} ${poll.filterReasons.join(",")}`);
}

// ── 8 · filterIdeas drops non-generatable categories (Tier-1.5, free) ──
{
  const generatable = new Set((await getGeneratableCategories()).map((g) => g.category as string));
  const res = filterIdeas(
    [
      { titleEn: "Idea in macro that is fine", category: "macro", resolutionDateGuess: future(30), why: "hot" },
      { titleEn: "Idea in other with no source", category: "other", resolutionDateGuess: future(30), why: "hot" },
      { titleEn: "Idea in infra folds to macro", category: "infrastructure", resolutionDateGuess: future(30), why: "hot" },
    ],
    { minLeadHours: 24, maxLeadDays: 240, avoidTitles: [], now: Date.now(), generatableCategories: generatable },
  );
  ok("8a macro idea kept", res.kept.some((i) => i.titleEn.includes("macro that is fine")), JSON.stringify(res.kept.map((i) => i.category)));
  ok("8b 'other' idea dropped as not_generatable", res.dropped.some((d) => d.reason === "not_generatable" && d.idea.category === "other"), JSON.stringify(res.dropped.map((d) => d.reason)));
  ok("8c infrastructure idea re-keyed to macro + kept", res.kept.some((i) => i.category === "macro" && i.titleEn.includes("infra")), JSON.stringify(res.kept.map((i) => [i.category, i.titleEn])));
}

// ── 9 · batch only produces generatable categories ──
{
  setAIProvider(new TestProvider()); // compliant, echoes the requested category
  const generatable = new Set((await getGeneratableCategories()).map((g) => g.category as string));
  const { generated } = await generateAIPollBatch({ count: 4, actorId });
  ok("9a batch produced polls", generated.length > 0, `n=${generated.length}`);
  ok("9b every batch poll is in a generatable category", generated.every((p) => generatable.has(resolvePublishCategory(p.category))), generated.map((p) => p.category).join(","));
  ok("9c batch polls reached review (all compliant)", generated.every((p) => p.state === "PENDING_REVIEW"), generated.map((p) => `${p.category}:${p.state}`).join(","));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
