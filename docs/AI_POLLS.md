# AI Poll Generation & Chatbot — operations guide

How 50pick generates prediction-market polls with Claude, the safety layers
that keep them accurate, the knobs the operator controls, and how the in-app
chatbot is scoped and cost-capped.

Live since June 2026 (Claude API key set in Railway). Both features share the
one `ANTHROPIC_API_KEY`; without it the system falls back to safe stub/mock mode.

---

## 1. Poll generation — the 4-layer pipeline

A human officer always has the final say. AI accelerates; it never publishes.

```
L1  Generate    ai-provider-claude.ts   Claude Haiku 4.5 + (optional) web search
L2  Validate    ai-poll-generation.ts   sanitise + structural / policy checks
L3  Score       ai-poll-generation.ts   confidence, lead-time, dedup, trusted source
L4  Review      /admin/ai-polls         officer approves / edits / rejects
                                        → publish → candidate pipeline → LIVE market
```

State machine:
`GENERATING → VALIDATION_FAILED | FILTERED | PENDING_REVIEW`,
`PENDING_REVIEW → APPROVED | REJECTED | EDITING`, `APPROVED → PUBLISHED`.

### L1 — Generation (accuracy mechanisms)

The model's training cutoff is in the past relative to "now", so two mechanisms
keep output current and real:

1. **Date anchoring** — the real current date is injected into the prompt, plus
   the exact allowed resolution window. The model no longer invents already-
   resolved events or stale dates.
2. **Web search grounding** (toggleable) — when on, the model searches the live
   web first, so questions are about real upcoming events and source URLs are
   real, not hallucinated. This is the single biggest accuracy lever.
3. **Structured output** — the model returns the poll via a forced `submit_poll`
   tool, so we never parse free-text JSON (removes the whole "bad JSON" class).
   A text-JSON fallback covers the rare case it answers in prose.
4. **Per-category steering** — each category gets hot-topic guidance (e.g. tech →
   mobile money, TCRA/5G, Starlink, subsea cables, fintech, data centres) so
   every category yields strong, current, genuinely-uncertain markets.

### L2 / L3 — Validation, filtering, scoring

Every field is **sanitised** (null bytes, zero-width chars, HTML tags, JS
protocol stripped) and **type-coerced** — a hostile or malformed response can
never crash the pipeline; the worst case is a clean `VALIDATION_FAILED`.

A poll is **hard-filtered** (can never reach review) if any of these hold:

| Reason | Meaning |
|---|---|
| `empty_title` / `empty_criterion` | missing core content |
| `invalid_date` / `past_date` | unparseable or already in the past |
| `resolution_too_soon` / `resolution_too_far` | outside the configured lead-time window |
| `no_options` / `too_few_options` | not a clean YES/NO |
| `no_sources` | no valid source URL |
| `duplicate_poll` | normalised title matches a live poll or market |
| `banned_category` | politics / religion / adult / violence |
| `null_bytes` / `xss_detected` | injection attempt |
| `title_too_long` / `criterion_too_long` | over the length limits |
| `low_confidence` | below the operator's confidence floor |

Soft signals (shown to the officer, not blocking): `invalid_category`,
`invalid_source_url`, `duplicate_options` (auto-deduped), and a **trusted-source**
indicator (green if a source domain is on the operator's enabled registry).

### L4 — Officer review → publish

Approved polls publish through the existing market-candidate pipeline and become
a **LIVE market** via `createMarket`. Every step is on the tamper-evident audit
chain (`aipoll.generate_started`, `aipoll.approved`, `aipoll.rejected`,
`aipoll.published`, `market.created`, …).

---

## 2. Operator controls (`/admin/ai-polls` → Generation settings)

All settings are live-editable (no deploy) and env-defaulted. They are stored in
`ai-poll-config.ts` (per-process, env defaults on cold start).

| Setting | Env var | Default | What it does |
|---|---|---|---|
| Live web search | `AI_POLL_WEB_SEARCH` | `true` | Ground polls in real current events + real sources |
| Daily target | `AI_POLL_DAILY_TARGET` | `3` | Polls/day goal (1 … 1,000,000) — drives the "published today" KPI |
| Min confidence | `AI_POLL_MIN_CONFIDENCE` | `60` | Confidence floor to reach review (stricter = fewer, cleaner) |
| Min lead time (h) | `AI_POLL_MIN_LEAD_HOURS` | `24` | Earliest a poll may resolve |
| Max horizon (d) | `AI_POLL_MAX_LEAD_DAYS` | `240` | Latest a poll may resolve (~8 months; lets year-end markets pass) |
| Max per batch | `AI_POLL_MAX_BATCH` | `25` | Ceiling on one batch run (runaway / accidental-burn guard) |

**Generate** (single category) and **Generate batch** (cycles all 8 categories,
clamped to the batch ceiling) both run the full pipeline. To make more than the
batch ceiling in a day, run several batches — the daily target can be any size.

### Cost (Haiku 4.5)

~$0.002/poll without web search; ~$0.06–0.14/poll with web search on (search is
billed per query). A 7-category live run costs roughly $0.65. Tune the web-search
toggle if you want to trade accuracy for cost.

---

## 3. Chatbot (AI Help Companion)

`src/app/_actions/chat.ts` — Claude Haiku 4.5, scope-locked and cost-capped.

- **Scope lock** — answers ONLY 50pick topics (deposits, the dial, payouts, KYC,
  responsible gambling, proposals, referrals, market rules). Anything off-topic
  (general knowledge, coding, math, translation, chit-chat) gets a one-line
  redirect — it never spends tokens answering it.
- **Per-user daily cap** — `CHAT_DAILY_LIMIT` (default **10**) questions/user/day.
  Past the cap it returns the bilingual "session capacity reached — contact
  support" message **without calling the API** (zero further token cost).
- **Burst rate limit** — `chat.send` token bucket (10 burst, 2/min) on top.
- **Auth gate** — unauthenticated callers never reach the API.
- **Safety** — never recommends YES/NO; at-risk language routes to the
  responsible-gambling card; chat history clears on logout/session-revoke.

---

## 4. Tests

Offline (no network — run any time):

```
npx tsx scripts/ai-poll-hardening-test.mts            # 15 — accuracy/filter guarantees
npx tsx scripts/ai-poll-market-day-regression.mts     # 39 — full day: generate→review→publish→bet→audit
npx tsx scripts/ai-poll-break-it.mts                  # 18 — adversarial / malformed / concurrency
```

Live (calls the real Anthropic API — needs a key in env):

```
# PowerShell
$env:ANTHROPIC_API_KEY="sk-ant-..."; npx tsx scripts/live-poll-smoke.mts      # 1 poll per category, print quality
$env:ANTHROPIC_API_KEY="sk-ant-..."; npx tsx scripts/live-full-flow.mts       # generate→approve/reject→publish→bet, 18 checks
```

Never commit a key — the live scripts read it from the environment only.
