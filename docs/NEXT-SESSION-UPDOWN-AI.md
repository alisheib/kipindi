# Next session — Up & Down round generation, and where AI belongs in it

Written 2026-07-30 after auditing the live code. Copy the block at the bottom into a fresh
session. Read this whole file first — the central finding inverts the obvious plan.

---

## What we actually have today (verified in code, not assumed)

**Two AI systems exist. They are not connected.** The only file they share is `ai-usage.ts`
(spend metering).

### 1. AI poll generation — `ai-poll-generation.ts` + `ai-provider-claude.ts`

Generates **prediction-market** poll ideas. Claude with web search, structured output via a
forced tool call, a cheap Haiku ideation tier, then an officer review queue at
`/admin/ai-polls` → approve → publish as a market. This is a **content pipeline with a human
gate**. It never touches money math.

### 2. Up & Down — `updown-*.ts`

Scheduled price chains. **The oracle is ALREADY live AI**: `observePrice()` in
`updown-oracle.ts` calls Claude with web search to read the price at each grid boundary.

🔴 **This is the finding that matters.** The plan "make Up & Down use live AI" is half-built
already — and the half that exists is the hard half, built carefully:

- It stores `sourceQuotedAt` — **the source's own timestamp, never our boundary** — and
  every surface shows it.
- A reading further from the boundary than `maxStalenessSeconds` is **REFUSED**, not rounded
  into a verdict.
- A boundary that will not confirm **VOIDs its rounds and refunds every stake in full**.
- One call per asset per boundary, shared by the 5/15/30-minute rounds crossing that instant
  — enforced by `@@unique([assetId, boundaryAt])` in the DAL, not by convention.
- Its own header states the rule: *"It DECIDES nothing and MOVES no money."*

### Where the winning line comes from today — and it is NOT the AI

`computeTargets(openPrice, marginBps, asset)` in `updown-config.ts`. Plain arithmetic:
`base ± (base × marginBps / 10000)`, **frozen at open**. The AI supplies the *base price* (a
fact). Deterministic code derives the *line* (a rule).

---

## 🔴 The conclusion: do NOT move the line into the AI

The request was "the line for price is taken from AI live polls and it checks alone based on
that line it generated." **Build the round-generation half. Do not build the line half.**
The split above is not an accident — it is the thing that makes this product defensible:

1. **A licensed operator must be able to explain why a player lost.** *"Base 68,000, +0.5%
   margin, frozen at open"* is an explanation a regulator and a player can both check.
   *"The model chose 68,412"* is not.
2. **`computeTargets` is reproducible; a generated number is not.** Anyone can recompute the
   line from the open price and the config. Re-run a prompt and you may get a different
   number for the same round — with real money already staked against the old one.
3. **It would make the AI a decision-maker in the money path.** Today the AI reports a fact
   from a named source and the ledger decides. That boundary is why the oracle can be
   audited at all, and it is what the module's own header promises.
4. The existing margin model is **admin-tunable, global and per-chain** (`docs/UPDOWN-PRICING.md`).
   Operators can already move the line — through a control with an audit trail.

**If the owner still wants an AI-influenced line after reading this**, the safe shape is: AI
proposes a *margin* (a config value, bounded and clamped) which an officer approves **before**
the chain opens — never a raw price, never after stakes exist. The line stays computed.

---

## What IS worth building

The valuable half of the request, and it is genuinely valuable:

- **AI proposes rounds** — which assets to run, which chains, when volatility makes a round
  worth offering. This is editorial judgement, which is exactly what AI polls already do well.
- **AI writes the round's framing/copy**, the way it already writes poll copy.
- **The same officer review gate as AI polls** — propose → review → arm. Never auto-arm a
  money round off a model's say-so.
- **`computeTargets` remains the only source of the line.** Guard it with a test that fails
  if any AI module can reach it.

---

## Concrete API-level findings (checked against the current Claude API reference)

These are real and independently worth fixing:

| Finding | Where | Why it matters |
|---|---|---|
| Default model is `claude-sonnet-4-6` | `ai-config.ts:20` | One generation behind. `claude-sonnet-5` is current — adaptive thinking on by default, better tool use. ⚠️ Migration has breaking changes: non-default sampling params 400, `budget_tokens` removed, new tokenizer (~30% more tokens — re-baseline cost before reacting). |
| Web search is the **basic** variant `web_search_20250305` | `ai-config.ts:30` | `web_search_20260209` adds **dynamic filtering** — Claude filters results *before* they enter context. Directly relevant to an oracle that must extract one precise number from search results, and to token spend. Needs Sonnet 5 / Opus 4.6+. |
| No `thinking` or `output_config.effort` anywhere | both AI modules | Effort is the accuracy/cost lever. An oracle reading a price is exactly the case for adaptive thinking; ideation is exactly the case for `low`. |
| `as unknown as Anthropic.Tool` cast | `updown-oracle.ts:218` | A typing workaround. Re-check on SDK upgrade rather than carrying it forward. |

⚠️ Model/tool-version changes touch the **money path** (the oracle). Gate them behind the
money suites and change one variable at a time.

---

=== BEGIN NEXT PROMPT ===

You are working in the **50pick** repo (`kipindi-main`), a licensed real-money prediction
platform live at `www.50pick.tz`. This session is about **Up & Down round generation**.

Read first: `CLAUDE.md`, `docs/NEXT-SESSION-UPDOWN-AI.md` (this file's analysis above),
`docs/UPDOWN-ARCHITECTURE.md`, `docs/UPDOWN-PRICING.md`, `docs/AI-POLL-SOURCES.md`, and
`src/lib/server/updown-oracle.ts` (read its header in full — it states the design law).

**Verify every claim in the analysis before acting on it.** This repo has repeatedly found
green gates over broken things, and a prior session found a substring bug in its own
brand-new code that a whole suite missed.

### The task

Build **AI-proposed Up & Down rounds**, reusing the AI-poll pattern:

1. An AI module proposes rounds — asset, chain/duration, and player-facing framing —
   with live web search, the same way `ai-poll-generation.ts` proposes markets.
2. Proposals land in an **officer review queue** modelled on `/admin/ai-polls`. Approve →
   the chain arms. **Never auto-arm from a model's output.**
3. Metering goes through `recordAiUsage` (feature tag distinct from `polls`), and it honours
   the existing AI pause switch — **do not add a second AI switch**, the toolkit dropdown is
   the one home for all of them.

### ⛔ The hard line — do not cross it

**The winning boundary stays `computeTargets(openPrice, marginBps, asset)`.** The AI must
never choose, suggest at open, or influence the line for a round that has stakes on it.
Today the AI reports a *fact* (the price, from a named source, with the source's own
timestamp) and deterministic code derives the *rule*. That separation is what makes the
oracle auditable, and it is what `updown-oracle.ts` promises in its own header: *"It DECIDES
nothing and MOVES no money."*

Add a **structural test** that fails if any AI module can reach the target computation —
the same style as `test:payout-rails` §6. If Ali asks for an AI-influenced line anyway, the
only safe shape is: AI proposes a *margin* (bounded, clamped, config-level) that an officer
approves **before the chain opens** — never a price, never once money is staked.

### Optional second track (only with the money suites green)

Modernise the AI layer: `claude-sonnet-5`, `web_search_20260209` (dynamic filtering), and
`output_config.effort`. **This touches the oracle, which is a money path.** Change one
variable at a time, re-baseline token cost after the tokenizer change rather than reacting
to the first number you see, and keep `test:money-invariants`, `test:settlement-gate` and
the Up & Down suites green at each step.

### Rules

- **Money paths are gated.** Anything touching the oracle, resolution, or the ledger needs
  the money suite green plus a stated reason it is safe.
- **Do not reopen design** — it is frozen behind `test:design-frozen`.
- **Every push to `main` is a LIVE deploy.** Work on a branch, run the gates, stop for Ali.
- **Same change updates code AND docs.** Update the doc that already owns the subject.
- `npm run test:all` before claiming done, and drive the real product, not just the suite.

=== END NEXT PROMPT ===
