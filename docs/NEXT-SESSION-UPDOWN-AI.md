# Next session — Up & Down: AI proposes the round, its line, and its SOURCE LINK

Written 2026-07-30 after auditing the live code; revised twice the same day to Ali's
decisions. Copy the block at the bottom into a fresh session. Read this file first.

**The goal, in Ali's words:** the AI proposes the Up & Down round *with the link it used*,
so that when it resolves it goes back to that same source — "if Claude knows where he got
the info from, he knows where to get it again and resolve." An admin can override as usual,
and **Up & Down and AI polls follow one pattern**. Poll generation itself is fine and is not
being changed.

---

## What we have today (verified in code, not assumed)

**Two AI systems exist, connected only by `ai-usage.ts` (spend metering).** Making them one
pattern is the work.

### 1. AI polls — the template

`ai-poll-generation.ts` + `ai-provider-claude.ts`. Claude with live web search proposes
market ideas via a forced structured tool call (cheap Haiku ideation tier), landing in an
**officer review queue** at `/admin/ai-polls`: approve, **edit**, or reject, then publish.
State machine, audit entries, `recordAiUsage` metering, and one AI pause switch in the
toolkit dropdown.

**Propose → review → publish, with an edit path and an audit trail.** That is the pattern to
copy.

### 2. Up & Down — resolution is ALREADY live AI

`observePrice()` in `updown-oracle.ts` calls Claude with web search to read the price at each
grid boundary. "Resolve with AI" is built, and built carefully:

- Stores `sourceQuotedAt` — **the source's own timestamp, never our boundary**.
- A reading staler than `maxStalenessSeconds` is **REFUSED**, not rounded into a verdict.
- A reading from the wrong place is refused too — the `"wrong-source"` refusal reason and
  `normalizeDomain()` from `source-registry.ts` already exist.
- A boundary that will not confirm **VOIDs its rounds and refunds every stake in full**.
- One call per asset per boundary, shared by the 5/15/30-minute rounds crossing it —
  enforced by `@@unique([assetId, boundaryAt])` in the DAL, not by convention.

The line is `computeTargets(openPrice, marginBps, asset)` — `base ± margin`, frozen at open,
with the margin admin-tunable globally and per-chain.

---

## 🔴 The inconsistency found — and Ali's idea is the fix

`UpDownAsset.priceSourceUrl` carries this comment in `prisma/schema.prisma`:

> *"The source link a round captures at generation and resolves against."*

**The round captures nothing.** `UpDownRound` has no source field at all. Resolution reads
the asset's *current* `priceSourceUrl` live, and `UpDownObservation.sourceUrl` is **nullable**
— it records what the AI actually read, after the fact.

So today: **edit an asset's source URL and every open round silently switches source, with
player money already staked against the old one.** Nothing announces it, and the observation
row records the new source as though it had always been the one. The schema comment describes
the correct design; the schema does not implement it.

Pinning the link to the round — Ali's proposal — closes this. It is not a nice-to-have on top
of the AI work; it is a live correctness gap that the AI work should fix on its way past.

---

## The design: one pattern, both products

| Stage | AI polls (today) | Up & Down (to build) |
|---|---|---|
| Propose | Claude + web search proposes a market | Claude + web search proposes the round: asset, chain, **the line**, **the source link it read**, framing, reasoning |
| Review | Officer approves / **edits** / rejects at `/admin/ai-polls` | Officer approves / **edits line and link** / rejects at `/admin/updown-proposals` |
| Publish | Approved poll becomes a market | Approved round arms the chain — **line and source link freeze at open** |
| Resolve | Per resolution policy | `observePrice()` reads **the round's captured link** and settles against the frozen line |
| Override | Officer edit before publish | Officer edit before arm; margin stays admin-tunable as today |

The proposed source must pass the existing `source-registry` trust check — the AI may choose
**among trusted sources**, not invent one. That registry, `isSourceTrusted()`, and the
`"wrong-source"` refusal are already built; this reuses them rather than adding a parallel
notion of trust.

### ⛔ The one invariant — the polls rule, not a new one

**The line and the source link freeze when the round opens, and neither moves while stakes
exist.**

This is not a restriction on the AI. It is what already happens to a published poll: once
players are betting, you don't rewrite the question underneath them. Same rule, same reason.

The AI chooses the line and the source freely — **before** the round opens, through the
review gate. After that, the round resolves against the approved number, read from the
approved link. That produces the sentence an operator has to be able to say to a regulator or
a losing player: *"the model proposed this line from this source, this officer approved it at
this time, and here is the same source read again at the boundary."*

---

## Concrete API-level findings (checked against the current Claude API reference)

The first two directly help a model that must pick a defensible number and cite where it
came from:

| Finding | Where | Why it matters |
|---|---|---|
| Default model is `claude-sonnet-4-6` | `ai-config.ts:20` | A generation behind. `claude-sonnet-5` has adaptive thinking on by default and better tool use. ⚠️ Breaking: non-default sampling params 400, `budget_tokens` removed, new tokenizer (~30% more tokens — re-baseline cost before reacting). |
| Web search is the **basic** `web_search_20250305` | `ai-config.ts:30` | `web_search_20260209` adds **dynamic filtering** — Claude filters results *before* they enter context. Exactly right when the model must extract one precise number and name its source. Needs Sonnet 5 / Opus 4.6+. |
| No `thinking` or `output_config.effort` anywhere | both AI modules | Effort is the accuracy/cost lever. Proposing a line and reading a price both want adaptive thinking; ideation wants `low`. |
| `as unknown as Anthropic.Tool` cast | `updown-oracle.ts:218` | A typing workaround — re-check on SDK upgrade rather than carrying it forward. |

⚠️ These touch the **money path** (the oracle). One variable at a time, money suites green.

---

=== BEGIN NEXT PROMPT ===

You are working in the **50pick** repo (`kipindi-main`, at `F:\kipindi-main`), a licensed
real-money prediction platform live at `www.50pick.tz`. Production-level work, not a
prototype.

This session puts **Up & Down on the same AI pattern as the AI polls**: Claude proposes the
round *including its price line and the source link it read*, an officer reviews and can edit
it, and resolution goes back to **that same link** — the model knows where it got the number,
so it knows where to read it again.

Read first: `CLAUDE.md`, `docs/NEXT-SESSION-UPDOWN-AI.md` (the analysis above),
`docs/UPDOWN-ARCHITECTURE.md`, `docs/UPDOWN-PRICING.md`, `docs/AI-POLL-SOURCES.md`, and the
two halves you are joining: `src/lib/server/updown-oracle.ts` (read its header in full — it
states the design law) and `src/lib/server/ai-poll-generation.ts`.

**Verify every claim above before acting on it.** This repo has repeatedly found green gates
sitting over broken things, and a recent session found a substring bug in its own brand-new
code that a full suite missed. A green gate is evidence, not proof.

### 🔴 Fix this first — it is a live correctness gap

`UpDownAsset.priceSourceUrl` is documented as *"The source link a round captures at
generation and resolves against"*, but **`UpDownRound` captures no source at all** and
`UpDownObservation.sourceUrl` is nullable. Resolution reads the asset's *current* URL live,
so **editing an asset's source silently switches the source under rounds that already hold
player money.** Confirm this, then close it: the round captures its source link at
generation, and resolution reads the captured one. Existing rows need a backfill that pins
each open round to the asset's current source.

### The task — mirror the polls pipeline, do not invent a second one

1. **Propose.** An AI module proposes an Up & Down round with live web search: asset, chain
   /duration, **the winning line (or the margin that derives it)**, **the source URL it read
   the price from**, player-facing framing, and its reasoning. Reuse the structured-tool-call
   approach in `ai-provider-claude.ts` — do not write a second Anthropic client. The proposed
   source **must pass the existing `isSourceTrusted()` check** in `source-registry.ts`; the
   AI chooses among trusted sources, it does not invent one.
2. **Review.** Proposals land in an officer queue modelled directly on `/admin/ai-polls` —
   approve, **edit the line and the link**, or reject — with the same state machine, audit
   entries and `recordAiUsage` metering (a feature tag distinct from `polls`). Honour the
   existing AI pause switch; **do not add a second AI switch** — the toolkit dropdown is the
   one home for all of them.
3. **Arm.** Approving arms the chain and **freezes the line and the source link at open**.
4. **Resolve.** `observePrice()` already reads the boundary with Claude + web search. Point
   it at the **round's captured link** and settle against the **frozen** line. Keep every
   existing oracle guarantee intact: the source's own timestamp, refusal on staleness,
   refusal on wrong-source, VOID + full refund when a boundary will not confirm.
5. **Keep the admin override.** The margin stays admin-tunable global and per-chain exactly
   as today — the AI proposal is a new input to that control, not a replacement for it.

### ⛔ The one hard line

**The line and the source link freeze at open and never move while stakes exist.** Same rule
a published poll already follows: you don't rewrite the question under players betting on it.
The AI picks both freely *before* the round opens, through the review gate.

Add **structural tests** in the style of `test:payout-rails` §6 that fail if:
- any path re-proposes or recomputes a line, **or changes the source link**, for a round that
  already holds positions;
- a proposal can skip the officer gate and auto-arm;
- resolution reads the asset's live source instead of the round's captured one.

**Poll generation itself is not being changed this session.** Reuse its patterns; leave its
behaviour alone.

### Optional second track (only with the money suites green)

Modernise the AI layer: `claude-sonnet-5`, `web_search_20260209` (dynamic filtering), and
`output_config.effort`. **This touches the oracle, a money path.** One variable at a time,
re-baseline token cost after the tokenizer change rather than reacting to the first number,
money suites green at each step.

### Rules

- **Money paths are gated.** Anything touching the oracle, resolution, or the ledger needs
  the money suite green (`test:money-invariants`, `test:settlement-gate`, `test:concurrency`,
  the Up & Down suites) plus a stated reason it is safe.
- **Do not reopen design** — frozen behind `test:design-frozen`.
- **Every push to `main` is a LIVE deploy.** Work on a branch, run the gates, stop for Ali.
- **Same change updates code AND docs.** Update the doc that already owns the subject; no new
  tracker files.
- `npm run test:all` before claiming done, and drive the real product, not just the suite.

=== END NEXT PROMPT ===
