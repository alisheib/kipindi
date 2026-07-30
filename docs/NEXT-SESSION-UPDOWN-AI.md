# Next session — Up & Down: AI-proposed line, AI resolution, one pattern with polls

Written 2026-07-30 after auditing the live code, revised the same day to Ali's decision.
Copy the block at the bottom into a fresh session. Read this whole file first.

**The goal, in Ali's words:** AI proposes the Up & Down line and resolves it, admin can
override as usual, and **Up & Down and AI polls follow the same pattern**. Poll generation
itself is fine as-is and is not being changed.

---

## What we actually have today (verified in code, not assumed)

**Two AI systems exist. They are not connected.** The only file they share is `ai-usage.ts`
(spend metering). Making them one pattern is the work.

### 1. AI polls — `ai-poll-generation.ts` + `ai-provider-claude.ts`

Claude with live web search proposes prediction-market ideas via a forced structured tool
call, with a cheap Haiku ideation tier. Proposals land in an **officer review queue** at
`/admin/ai-polls`: approve, **edit**, or reject, then publish as a market. States are
tracked, spend is metered through `recordAiUsage`, and the whole thing honours the one AI
pause switch in the toolkit dropdown.

**This is the template.** Propose → review → publish, with an edit path and an audit trail.

### 2. Up & Down — `updown-*.ts`

🔴 **The resolution is ALREADY live AI.** `observePrice()` in `updown-oracle.ts` calls Claude
with web search to read the price at each grid boundary. "Resolve with AI" is built — and
built carefully:

- Stores `sourceQuotedAt` — **the source's own timestamp, never our boundary**.
- A reading staler than `maxStalenessSeconds` is **REFUSED**, not rounded into a verdict.
- A boundary that will not confirm **VOIDs its rounds and refunds every stake in full**.
- One call per asset per boundary, shared by the 5/15/30-minute rounds crossing that instant
  — enforced by `@@unique([assetId, boundaryAt])` in the DAL, not by convention.

**What is NOT AI today is the line.** `computeTargets(openPrice, marginBps, asset)` in
`updown-config.ts`: `base ± (base × marginBps / 10000)`, frozen at open. The margin is
already admin-tunable, global and per-chain.

---

## The design: one pattern, both products

Ali asked for consistency, and consistency is what makes this safe. The polls pipeline
already has the human gate — so putting Up & Down on the same rails gives an AI-proposed
line **and** an operator who can always override, without inventing a new safety model.

| Stage | AI polls (today) | Up & Down (to build) |
|---|---|---|
| Propose | Claude + web search proposes a market | Claude + web search proposes the round: asset, chain, **the line/margin**, and framing — with its reasoning and sources |
| Review | Officer approves / **edits** / rejects at `/admin/ai-polls` | Officer approves / **edits the line** / rejects at `/admin/updown-proposals` |
| Publish | Approved poll becomes a market | Approved round arms the chain — **the line freezes at open** |
| Resolve | Market resolved per resolution policy | `observePrice()` — already Claude + web search — reads the boundary and settles against the frozen line |
| Override | Officer edit before publish | Officer edit before arm; margin stays admin-tunable as today |

### ⛔ The one invariant — and it is the polls rule, not a new one

**The line freezes when the round opens, and never moves while stakes exist.**

This is not a restriction on the AI. It is exactly what already happens to a published poll:
once players are betting on it, you don't quietly rewrite the question underneath them. Same
rule, same reason.

So the AI is free to choose the line — it just has to choose it **before** the round opens,
through the review gate, the way it chooses a poll before publication. After that the round
resolves against the approved number, and an operator can always explain it: *"the model
proposed this line, this officer approved it at this time, and here is the source it read."*
That sentence is what a regulator and a losing player both need, and this design produces it
by construction.

**Do not** add a path that recomputes or re-proposes the line for a round that already has
money on it. That is the only hard line, and it is the same one polls already have.

---

## Concrete API-level findings (checked against the current Claude API reference)

Real and independently worth fixing — and the first two directly help an AI that must pick a
defensible number:

| Finding | Where | Why it matters |
|---|---|---|
| Default model is `claude-sonnet-4-6` | `ai-config.ts:20` | A generation behind. `claude-sonnet-5` has adaptive thinking on by default and better tool use. ⚠️ Breaking changes: non-default sampling params 400, `budget_tokens` removed, new tokenizer (~30% more tokens — re-baseline cost before reacting to it). |
| Web search is the **basic** `web_search_20250305` | `ai-config.ts:30` | `web_search_20260209` adds **dynamic filtering** — Claude filters results *before* they enter context. Exactly what you want when the model must extract one precise number from search results. Needs Sonnet 5 / Opus 4.6+. |
| No `thinking` or `output_config.effort` anywhere | both AI modules | Effort is the accuracy/cost lever. Proposing a line and reading a price both deserve adaptive thinking; ideation deserves `low`. |
| `as unknown as Anthropic.Tool` cast | `updown-oracle.ts:218` | A typing workaround. Re-check on SDK upgrade rather than carrying it forward. |

⚠️ These touch the **money path** (the oracle). One variable at a time, money suites green.

---

=== BEGIN NEXT PROMPT ===

You are working in the **50pick** repo (`kipindi-main`), a licensed real-money prediction
platform live at `www.50pick.tz`. This session puts **Up & Down on the same AI pattern as
the AI polls**: the AI proposes the round *including its price line*, an officer reviews and
can edit it, and resolution runs on the AI oracle that already exists.

Read first: `CLAUDE.md`, `docs/NEXT-SESSION-UPDOWN-AI.md` (the analysis above),
`docs/UPDOWN-ARCHITECTURE.md`, `docs/UPDOWN-PRICING.md`, `docs/AI-POLL-SOURCES.md`, and
`src/lib/server/updown-oracle.ts` + `src/lib/server/ai-poll-generation.ts` — the two halves
you are joining.

**Verify every claim in the analysis before acting on it.** This repo has repeatedly found
green gates over broken things, and a recent session found a substring bug in its own
brand-new code that a full suite missed. A green gate is evidence, not proof.

### The task — mirror the polls pipeline, do not invent a second one

1. **Propose.** An AI module proposes an Up & Down round with live web search: asset, chain
   /duration, **the winning line (or the margin that derives it)**, player-facing framing,
   and the model's reasoning + sources. Reuse the structured-tool-call approach from
   `ai-provider-claude.ts` rather than writing a second client.
2. **Review.** Proposals land in an officer queue modelled directly on `/admin/ai-polls` —
   approve, **edit the line**, or reject, with the same state machine, audit entries and
   spend metering (`recordAiUsage`, a feature tag distinct from `polls`). Honour the existing
   AI pause switch; **do not add a second AI switch** — the toolkit dropdown is the one home.
3. **Arm.** Approving arms the chain and **freezes the line at open**.
4. **Resolve.** `observePrice()` already reads the boundary with Claude + web search. Wire
   settlement to the **approved, frozen** line. Keep every existing oracle guarantee intact:
   the source's own timestamp, refusal on staleness, VOID + full refund when a boundary
   won't confirm.
5. **Keep the admin override.** The margin stays admin-tunable global and per-chain exactly
   as it is today — the AI proposal is a new input to that control, not a replacement for it.

### ⛔ The one hard line

**The line freezes at open and never moves while stakes exist.** This is the same rule a
published poll already follows — you don't rewrite the question under players who are betting
on it. The AI picks the line freely *before* the round opens, through the review gate.

Add a **structural test** that fails if any path can re-propose or recompute a line for a
round that already has positions — the style of `test:payout-rails` §6. Also assert the
proposal cannot skip the officer gate and auto-arm.

**Poll generation itself is not being changed this session.** Reuse its patterns; leave its
behaviour alone.

### Optional second track (only with the money suites green)

Modernise the AI layer: `claude-sonnet-5`, `web_search_20260209` (dynamic filtering), and
`output_config.effort`. **This touches the oracle, a money path.** One variable at a time,
re-baseline token cost after the tokenizer change rather than reacting to the first number,
and keep `test:money-invariants`, `test:settlement-gate` and the Up & Down suites green at
each step.

### Rules

- **Money paths are gated.** Anything touching the oracle, resolution, or the ledger needs
  the money suite green plus a stated reason it is safe.
- **Do not reopen design** — it is frozen behind `test:design-frozen`.
- **Every push to `main` is a LIVE deploy.** Work on a branch, run the gates, stop for Ali.
- **Same change updates code AND docs.** Update the doc that already owns the subject.
- `npm run test:all` before claiming done, and drive the real product, not just the suite.

=== END NEXT PROMPT ===
