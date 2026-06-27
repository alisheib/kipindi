# AI Poll Generation — Two-Tier (Haiku ideate → Sonnet enrich)

**Date:** 2026-06-27
**Goal:** stop paying full Sonnet + web-search for polls that get filtered. Make
rejects nearly free by discovering bad ideas with a cheap model + free code
checks *before* the expensive call. Same pattern the Market Sentinel already uses
(Haiku triage → Sonnet deep).

---

## 1. Will this be "perfect"? (honest)

It's the **right architecture** and the biggest cost lever available — it makes
the *rejected* polls almost free and raises good-polls-per-dollar a lot. It is
**not literally zero-waste**: a survived idea can still occasionally be filtered
at Tier 2 (e.g. the model can't find a clean source on web search). That residual
is small and unavoidable for a sourced, real-money market. So: *near-optimal and
straightforward*, with a hard fallback so it can never break generation.

---

## 2. Before vs after

**Before:** `generateAIPollBatch(n)` loops `generateAIPoll` n times. Each call =
one **Sonnet + web-search** generation → validate/filter. Cost ≈ `n ×
(Sonnet+search)`, and every filtered poll is fully paid for.

**After (batch path only):**
1. **Tier 1 — IDEATE (Haiku, NO web search):** one cheap call brainstorms a pool
   of ~`2n` candidate *ideas* (`titleEn`, `category`, `resolutionDateGuess`,
   `why`). No criterion, no sources, no Swahili — minimal tokens.
2. **Tier 1.5 — FREE code filter (`filterIdeas`, zero tokens):** drop ideas with
   an invalid/banned category, a date outside the `[minLeadHours, maxLeadDays]`
   window, or that duplicate an existing market/poll (or each other).
3. **Tier 2 — ENRICH (Sonnet + web search):** only the survivors (up to `n`) go
   through the **existing** `generateAIPoll`, seeded with the idea so Sonnet
   refines *that* question (criterion, real sources, accurate `resolutionAt`,
   confidence, Swahili) → validate/filter → store. Unchanged pipeline.

Cost ≈ `1 × (Haiku, cheap) + k × (Sonnet+search)` where `k ≤ n` and the `k` ideas
already passed date/category/dedup → far fewer Tier-2 rejects.

The **single** "Generate poll" (one-off) path is **unchanged** — ideation
overhead isn't worth it for one poll; it still calls `generateAIPoll` directly.

---

## 3. What changes (files)

| File | Change |
|---|---|
| `src/lib/server/ai-provider.ts` | New types `PollIdea` / `IdeateRequest` / `IdeateResponse`; add `ideate()` to the `AIProvider` interface; implement a cheap canned `ideate()` on `MockClaudeProvider` (no-API-key/dev/tests). |
| `src/lib/server/ai-provider-claude.ts` | Implement `ideate()`: one Haiku call (no web search), `submit_ideas` tool, `buildIdeationPrompt` (categories + date window + avoid-list + count). Metered via `recordAiUsage(feature:"polls", model: haiku, detail:"ideate")`. |
| `src/lib/server/ai-poll-generation.ts` | New **pure** `filterIdeas()` (date/category/dedup — unit-tested). `generateAIPollBatch` rewritten to ideate → filter → enrich survivors (seeded), with top-up + full fallback. `generateAIPoll` gains nothing new (already accepts `avoidTitles`); seeding rides the existing `prompt`. |
| `src/lib/server/ai-config.ts` (or constant) | `IDEATION_MODEL` (Haiku, env-overridable) reusing the same Haiku id the sentinel triage uses. |
| `scripts/ai-poll-ideas.test.mts` | Unit tests for `filterIdeas` + an in-memory two-tier batch run via the mock provider. Wired into the predeploy gauntlet. |

**Not changed:** the admin batch UI (`poll-actions.tsx`) — it still calls the
same action and gets `{total, summary}`; the progress modal is unaffected. The
validate/filter logic, the store, and single-poll generation are untouched.

---

## 4. Edge cases & safety

- **Ideation fails / returns nothing** → fall back to the current behaviour
  (free-choice `generateAIPoll` loop for `n`). Batch never breaks.
- **Fewer survivors than `n`** → enrich all survivors, then top up the remainder
  with free-choice generation so the requested volume is still attempted. We
  over-generate ideas (~2n) so top-up is rare.
- **Haiku's `resolutionDateGuess` is rough** → it's only a cheap pre-screen;
  Tier 2 (Sonnet + web search) derives the real `resolutionAt`, and
  `validateAndFilter` still enforces the window as the final gate.
- **Dedup consistency** → `filterIdeas` uses the same `normaliseTitle` + the same
  existing-titles set (`gatherExistingTitles`) as the post-hoc duplicate filter,
  and grows the avoid-list intra-batch so a run can't duplicate its own picks.
- **Cost visibility** → the Haiku ideation call shows in `/admin/ai-usage` as
  `feature: polls, model: haiku, detail: ideate`; Tier-2 calls as before.
- **Models** → Sonnet stays for enrichment (accuracy for real money); Haiku only
  for ideation. No accuracy regression on the sourced output.

---

## 5. Config / knobs
- Reuses existing `minLeadTimeHours`, `maxLeadTimeDays`, `minConfidence`,
  `maxBatchPerRun` from `ai-poll-config.ts`.
- `IDEATION_MODEL` env override (default Haiku). Over-generation factor is a small
  constant (~2×), bounded by `maxBatchPerRun`.
