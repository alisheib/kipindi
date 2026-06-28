/**
 * Guard tests for the controlled-poll workflow hardening shipped this session:
 *   1. validateAndFilter validates the EFFECTIVE (controlled-override) date,
 *      so a bad operator resolution date is caught even when the AI's date is
 *      fine — and a controlled poll isn't filtered for the AI's throwaway date.
 *   2. A controlled TITLE wins (AI no longer overwrites it).
 *   3. editAIPoll respects the re-validation verdict: an edit that introduces a
 *      hard fail (past date) lands in FILTERED, not approvable PENDING_REVIEW.
 *   4. approveAIPoll refuses a poll that still carries filter reasons.
 *
 * Run: npm run test:controlled-guards
 */
delete process.env.ANTHROPIC_API_KEY;

import {
  generateAIPoll, editAIPoll, approveAIPoll, getAIPoll,
} from "../src/lib/server/ai-poll-generation.ts";
import { setAIProvider, type AIProvider, type AIPollGeneration } from "../src/lib/server/ai-provider.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`✓ ${label}`); }
  else { fail++; console.log(`✗ ${label}${extra ? ` — ${extra}` : ""}`); }
}
const DAY = 86_400_000;
const future = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const past = () => new Date(Date.now() - 2 * DAY).toISOString();

/** A provider that returns a perfectly valid poll with its OWN good date+title.
 *  Titles are made globally unique so the duplicate-poll detector (which sees
 *  every poll created earlier in this process) never interferes. */
let uniq = 0;
class GoodProvider implements AIProvider {
  name = "good";
  private title: string;
  constructor(title?: string) { this.title = `${title ?? "AI generated headline about the economy"} #${++uniq}`; }
  async ideate() { return []; }
  async generate(): Promise<{ ok: true } & Record<string, unknown>> {
    const gen: AIPollGeneration = {
      titleEn: this.title,
      titleSw: this.title + " (sw)",
      category: "macro",
      resolutionCriterion: "Resolves per the official Bank of Tanzania report on the resolution date.",
      resolutionAt: future(30),
      options: [{ label: "YES" }, { label: "NO" }] as never,
      sources: [{ url: "https://www.bot.go.tz/report", publisher: "Bank of Tanzania" }],
      confidence: 82,
      reasoning: "test",
    };
    return { ok: true, generation: gen, tokensUsed: 1, costUsd: 0, latencyMs: 1, rawResponse: "{}" } as never;
  }
}

const actorId = "officer_test";

// ── 1 · Controlled BAD date is caught even though the AI date is good ──
{
  setAIProvider(new GoodProvider());
  const poll = await generateAIPoll({
    category: "macro",
    actorId,
    controlledResolutionAt: past(),           // operator picked a past date
  });
  ok("1a controlled past date → FILTERED (not PENDING_REVIEW)", poll.state === "FILTERED", `state=${poll.state}`);
  ok("1b past_date reason recorded", poll.filterReasons.includes("past_date"), poll.filterReasons.join(","));
}

// ── 2 · Controlled TITLE wins over the AI's title ─────────────────────
{
  setAIProvider(new GoodProvider("Some AI title that should NOT win"));
  const controlledTitle = `Operator's exact controlled question #${++uniq}?`;
  const poll = await generateAIPoll({
    category: "macro",
    actorId,
    controlledTitle,
    controlledResolutionAt: future(20),
  });
  ok("2a controlled poll reaches review", poll.state === "PENDING_REVIEW", `state=${poll.state} reasons=${poll.filterReasons}`);
  ok("2b controlled title preserved (AI did not overwrite)",
     poll.titleEn === controlledTitle, poll.titleEn);
}

// ── 3 · editAIPoll into a past date → FILTERED, not approvable ─────────
{
  setAIProvider(new GoodProvider());
  const poll = await generateAIPoll({ category: "macro", actorId, controlledResolutionAt: future(25) });
  ok("3a baseline poll is PENDING_REVIEW", poll.state === "PENDING_REVIEW", poll.state);

  const edited = await editAIPoll(poll.id, { officerId: actorId, resolutionAt: past() });
  ok("3b edit to past date → FILTERED", edited?.state === "FILTERED", `state=${edited?.state}`);
  ok("3c edited poll carries past_date", !!edited?.filterReasons.includes("past_date"), edited?.filterReasons.join(","));

  // 4 · approveAIPoll refuses it (state is FILTERED, and it has filter reasons)
  const approved = await approveAIPoll(poll.id, { officerId: actorId });
  ok("4a approve refused on filtered poll", approved === null, `got ${approved?.state}`);
}

// ── 5 · A good edit still passes back to PENDING_REVIEW ───────────────
{
  setAIProvider(new GoodProvider());
  const poll = await generateAIPoll({ category: "macro", actorId, controlledResolutionAt: future(25) });
  const edited = await editAIPoll(poll.id, { officerId: actorId, titleEn: `A perfectly fine edited title #${++uniq}`, resolutionAt: future(40) });
  ok("5a good edit stays PENDING_REVIEW", edited?.state === "PENDING_REVIEW", edited?.state);
  ok("5b no filter reasons after good edit", (edited?.filterReasons.length ?? -1) === 0, edited?.filterReasons.join(","));
  const approved = await approveAIPoll(poll.id, { officerId: actorId });
  ok("5c clean poll approves", approved?.state === "APPROVED", `${approved?.state}`);
}

// ── 6 · Controlled selectionClosedAt after resolution is corrected ────
{
  setAIProvider(new GoodProvider());
  const res = future(20);
  const poll = await generateAIPoll({
    category: "macro", actorId,
    controlledResolutionAt: res,
    controlledSelectionClosedAt: future(25),   // AFTER resolution — impossible window
  });
  const okOrder = poll.selectionClosedAt && Date.parse(poll.selectionClosedAt) < Date.parse(poll.resolutionAt);
  ok("6a selection-close forced before resolution", !!okOrder,
     `sel=${poll.selectionClosedAt} res=${poll.resolutionAt}`);
}

console.log(`\nai-poll-controlled-guards: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
