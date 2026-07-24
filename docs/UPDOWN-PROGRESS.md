# Up & Down — progress tracker

> **Living document. Update it in the same commit as the work it describes.**
> Newest status at the top of each section. If this file and the code disagree, the
> code wins and this file is a defect.

| | |
|---|---|
| **Feature** | Up & Down — short-term price rounds (5/15/30 min) on Gold + Silver |
| **Branch** | `main` (every push is a LIVE deploy) |
| **Started** | 2026-07-24 |
| **Current phase** | **Phase 0 — scale prerequisite (code complete, gate green)** |
| **Overall status** | 🟡 In progress |
| **Blocked on** | **Railway access** — apply the `productLine` migration + verify the deploy (Ali) |

**Companion docs:** [`UPDOWN-DESIGN-PROMPTS.md`](UPDOWN-DESIGN-PROMPTS.md) ·
`UPDOWN-SPEC.md` (pending) · `UPDOWN-ARCHITECTURE.md` (pending) ·
[`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md)

---

## 1 · Phase board

| Phase | Content | Status |
|---|---|---|
| **0** | Scale prerequisite — `productLine` + indexed board queries | 🟡 **In progress** |
| **1** | Schema (4 tables), DAL, `updown-config.ts`, admin asset + chain pages | ⬜ Not started |
| **2** | `updown-oracle.ts` + observation ledger + AI-toolkit pause + usage metering | ⬜ Not started |
| **3** | `updown-service.ts` + `updown-scheduler.ts` + rate overrides + display-field fix | ⬜ Not started |
| **4** | Player UI — `/updown`, round detail, `UpDownCard`, nav, SSE, EN/SW/ZH | ⬜ Blocked on design |
| **5** | Reports, analytics, notification digest, admin rounds explorer + settings | ⬜ Not started |
| **6** | Staged enable (Gold 5-min → Silver → 15/30-min) + archive/retention job | ⬜ Not started |

Legend: ⬜ not started · 🟡 in progress · 🟢 done + verified · 🔴 blocked

---

## 2 · Phase 0 — scale prerequisite

**Why it exists.** `listMarkets()` read the WHOLE `PredictionMarket` table
(`findMany()` with no `where`) and filtered in JS, from ~25 surfaces including `/`,
`/live`, `/markets`, `/results`, `/fairness`, `/api/health`, `report-money.ts` and
`analytics.ts`. Up & Down adds ~800 rows/day (~300k/year). This must land, and be
verified, **before the first Up & Down row exists.**

Phase 0 ships alone and is valuable alone — it is pure hardening of the existing
product with no behaviour change.

| # | Item | Status | Notes |
|---|---|---|---|
| 0a | `PredictionMarket.productLine` + composite index | 🟢 Done | `schema.prisma` + `migrations/20260724180000_market_product_line/` |
| 0b | `market-dal.ts` — map/write `productLine`, indexed `listBoard()` | 🟢 Done | `listBoard` is a real `findMany(where/orderBy/take)`; `pending()` takes a product filter |
| 0c | `market-service.ts` — `ProductLine` type, `listMarkets` defaults to `MARKET` | 🟢 Done | Plus `createMarket` accepts `productLine` |
| 0d | Opt money/regulator reads INTO `productLine: "ALL"` | 🟢 Done | 6 call sites, §5 below — each carries an inline reason |
| 0e | `test:product-line` regression guard | 🟢 Done | 30/30; **proven to fail** (see below) |
| 0f | Full gate + real-PG money e2e | 🟢 Done | `tsc` clean · `build` clean · `test:all` 85/86 · `e2e:money` 63/63 drift 0.00 |
| 0g | Prod migration + deploy verification | 🔴 **Blocked — needs Railway** | `prisma migrate deploy` runs on boot; must confirm `railway deployment list` + clean boot log |

**Bonus removed in the same pass:** `listSettlementQueue()` and `getSettlementHealth()`
also read the whole table via `values()`. Both now use the indexed
`marketStore.pending("ALL")` — and `"ALL"` is correct there, because an unsettled
Up & Down round is money that has not moved and must never be invisible to the officer
who has to act on it.

### Exit criteria for Phase 0
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (exit 0)
- [x] `npm run test:all` — 85/86; the only failure is `test:responsive`, which needs a
      live server on `:3000` (the one documented allowed local failure, not a regression)
- [x] `e2e:money` **63/63, drift 0.00** on real Postgres (`:5433`, schema `updown_p0`)
- [x] `test:product-line` green (30/30) **and proven to fail** — reverting
      `analytics.ts` to a bare `listMarkets({status:"RESOLVED"})` produced
      `29 passed, 1 failed`; restoring it returned it to green. A guard that cannot
      fail is not a guard.
- [ ] `/`, `/live`, `/markets`, `/results` visually unchanged — **needs a shot pass**
- [ ] Migration applied and confirmed on prod; boot log clean — **needs Railway**

---

## 3 · Decision log

Owner decisions are also recorded in `COMPLIANCE-DECISIONS.md` where they touch a
control. Newest first.

| Date | Decision | Owner | Rationale |
|---|---|---|---|
| 2026-07-24 | **Fee basis = `capped-commission` @ 13% of pool**, ceiling ⅓ of smaller side, frozen per round | Ali | Matches the proposal's TZS 1,300 on a balanced 10,000 pool exactly, using maths already built and tested. Outcome-neutral (better for the pari-mutuel licence than `loser-share`) and winner-floor safe. Main polls keep `loser-share` — models never mix, frozen per poll. |
| 2026-07-24 | **Resolution stays on the AI sentinel** — no external price-feed contract | Ali | Chosen with the cost/latency/determinism trade-off explicitly on the table. Mitigated by the shared observation ledger (1 call per asset per boundary), immutability, and a staleness gate. |
| 2026-07-24 | **Launch assets = Gold + Silver**, admin-configurable registry, BTC available but off | Ali | Follows the management note (*"we will use gold, silver etc., not BTC — make admin flexible"*) over the PDF, which was built around Gold/BTC. |
| 2026-07-24 | **Settle immediately** on confirmed outcome; disputes handled after payout | Ali | A 5-minute round cannot hold money for a 24h objection window. Standing-objection freeze still applies; full per-round proof stored; `emergencyVoidMarket` is the reversal path. Needs a `COMPLIANCE-DECISIONS.md` entry. |
| 2026-07-24 | **UP = YES, DOWN = NO** at the data layer | Claude, accepted | No new side enum and no new money path, so settlement/ledger/refund/audit stay byte-for-byte the proven code. Display layer translates. |
| 2026-07-24 | **Up & Down rounds are `PredictionMarket` rows**, discriminated by `productLine` | Claude, accepted | Reuses every money invariant. The alternative — a parallel table — would fork the money paths, which is the one thing this platform must never do. |
| 2026-07-24 | **Excluded from the per-market scheduler**; a separate per-CHAIN scheduler drives rounds | Claude, accepted | ~6 chain timers instead of hundreds of market timers, and the two engines never fight over the same row. Separate fire gate so Up & Down bursts can't starve market settlement. |
| 2026-07-24 | **"Aurora Design System" is not used** | Ali | Belongs to another project. The system here is the dark-royal kit + `DESIGN_AUTHORITY.md`. |

---

## 4 · Risk register

| # | Risk | Severity | Status | Mitigation |
|---|---|---|---|---|
| R1 | Board queries scan the whole market table | 🔴 High | 🟡 Being fixed | Phase 0 — `productLine` index + `listBoard` + default-exclude |
| R2 | **Money reports silently drop Up & Down revenue** | 🔴 High | ⬜ Open | Explicit `productLine: "ALL"` at 6 named call sites + `test:product-line` |
| R3 | AI can't price an exact second | 🟠 Medium | ⬜ Open | Stamp the **source's** quoted time, staleness gate, surfaces show that timestamp — never the boundary |
| R4 | AI disagrees with itself on a re-check | 🟠 Medium | ⬜ Open | Observation written once; `@@unique([assetId, boundaryAt])`; round N's close **is** round N+1's open |
| R5 | AI cost runs away | 🟠 Medium | ⬜ Open | 1 call per asset per boundary (576/day, not 1,728); admin caps; existing `ai-usage` metering |
| R6 | Oracle down → chain stalls | 🟠 Medium | ⬜ Open | Round N+1 opens independently of round N's resolution; failed observation → VOID + full refund |
| R7 | Thin pools → constant one-sided wins | 🟠 Medium | ⬜ Watch | Existing one-sided refund path. Launch KPI. Fix by concentrating liquidity (fewer durations/assets) — **not** house seeding (`F6-LIQUIDITY-DESIGN.md` §3) |
| R8 | Instant settle removes the objection window | 🟠 Medium | ⬜ Open | Standing-objection freeze still runs; per-round proof; post-payout dispute + reversal; compliance-log entry |
| R9 | Row growth ~300k/yr | 🟡 Low | ⬜ Open | No `MarketSnapshot` writes for UPDOWN; indexed access only; archive job in Phase 6 |
| R10 | Timer bursts at :00 / :15 / :30 | 🟡 Low | ⬜ Open | Separate Up & Down fire gate |
| R11 | Notification flood (20 rounds/hr → 40 emails) | 🟠 Medium | ⬜ Open | Per-round notifications suppressed for UPDOWN; daily digest; money records untouched |

---

## 5 · The money read-path opt-in list (R2)

These reads **must** pass `productLine: "ALL"`. Asserted by `test:product-line`.

| File | Call site | Opted in |
|---|---|---|
| `src/lib/server/report-money.ts` | category revenue breakdown | 🟢 |
| `src/lib/server/analytics.ts` | per-poll settlement fees by fee model | 🟢 |
| `src/lib/server/platform-stats.ts` | settled count shown beside a platform payout total | 🟢 |
| `src/lib/server/reports/catalogue.ts` | voided markets vs `BET_REFUND` totals | 🟢 |
| `src/app/api/health/route.ts` | ops probe live/resolved counts | 🟢 |
| `src/app/admin/system/page.tsx` | operator live/resolved counts | 🟢 |
| `src/lib/server/market-service.ts` | `listSettlementQueue` + `getSettlementHealth` via `pending("ALL")` | 🟢 |

Deliberately **left on the `MARKET` default** (player boards): `src/app/page.tsx`,
`src/app/markets/page.tsx`, `src/app/results/page.tsx`, `src/app/fairness/page.tsx`,
`src/app/api/fairness/recent/route.ts`.
`src/app/live/page.tsx` opts into `"ALL"` in Phase 4 (Live shows both product lines).

---

## 6 · Design review — D1 + D2 returned 2026-07-24

Source: `F:\kipindi-main\Up Down Design System\` — `handoff/D1-updown-card-spec.md`,
`handoff/D2-updown-board-spec.md`, canvases `UpDown D1/D2 Canvas.dc.html`.

**Verification done (trust nothing, check everything):**
- 🟢 **No kit drift.** Every token the spec cites (`--r-lg`, `--shadow-card`,
  `--ease-conduct`, `--yes-300`, `--no-300`, `--dur-quick`, `--gilt`, `--text-faint`…)
  and every class (`.live-dot`, `.chip-pending`, `.chip-yes/no`, `.btn-lg`,
  `.btn-yes/no`, `.skeleton`, `.gilt-eyebrow`, `.glass-panel`) **exists in
  `src/app/globals.css`**. Checked one by one.
- 🟢 **Not the superseded teal kit.** Their `theme/globals.css` carries
  `--bg: oklch(15% 0.130 268)` and `--brand-500: oklch(63% 0.180 262)` — identical to
  ours. **Zero** light-mode selectors, zero `next-themes`. (This was the real risk:
  `CLAUDE.md` carries a standing warning that the old teal-215 kit is still on disk.)
- 🟢 **Acceptance criteria met** on the hard rules: gold is NOT used on the projected
  return or the resolved band; `× 1.4` carries an explicit "est." marker *and* a
  qualifier line; the confirming state renders `—` + "AWAITING READ" and **never a
  guessed number**; VOID is neutral; the footer source line is never dropped; all four
  of volume/players/amount/timer survive 360px.

**Answered here (no need to trouble Ali):**

| Q | Answer |
|---|---|
| D1-1 · one `estMultiplier` or per-side `estUp`/`estDown`? | **One.** The platform's estimate is a fixed display rate (`estimatedWinningsRate`, frozen per poll), not a per-side computation. Per-side would imply real odds, which is exactly the impression we must not give. |
| D1-2 · urgency threshold 30 s | Accepted as a constant. |
| D1-4 · keep the player's own won/lost/payout OFF the board card | **Confirmed.** The card states the market outcome; the player's money belongs to `/positions` and the win celebration. |
| D2-1 · tape value-flash, 220 ms opacity, no movement | Accepted — reduced-motion safe. |
| D2-2 · paused chain keeps the price tape live | **Yes.** The asset still trades; only our rounds pause. Showing it frozen would be the lie. |
| D2-3 · pips filtered per asset+duration | Correct — a global strip would mix chains. |
| D2-4 · lift max-width to ~1648px for a 4-col grid at 1920 | **Rejected — and my brief was wrong, not the design.** The platform has a 3-tier max-width convention (1280 grid / 1080 content / 640 forms). The board stays at 1232–1280 and remains **3-col at 1920**. `docs/UPDOWN-DESIGN-PROMPTS.md` D2 is to be corrected. |

**Escalated to Ali** — see Q5/Q6 in §7.

**New kit values to add properly (never hard-coded in one file):** `ud-count-pulse`
keyframe + reduced-motion gate · asset icon-chip recipe · mono micro-labels at
8.5–9.5px (kit's smallest is 10px) · 28px countdown size · `.pip-up/.pip-down/.pip-void`
· the quiet duration-tab active treatment.

---

## 7 · Open questions for Ali

| # | Question | Raised | Answer |
|---|---|---|---|
| Q1 | Which price source domain per asset? Must be added to `/admin/sources` as a trusted source before a chain can run. | 2026-07-24 | ⬜ Pending |
| Q2 | Stake bounds for Up & Down — same as polls (100 … 100,000) or tighter for fast rounds? | 2026-07-24 | ⬜ Pending |
| Q3 | Should Up & Down rounds appear in the player's main `/positions`, or only in `/updown/history`? | 2026-07-24 | ⬜ Pending |
| Q4 | Railway access to push Phase 0 + verify the deploy/migration | 2026-07-24 | 🔴 **Blocking** |
| Q5 | **The gold asset-icon tint.** The Gold asset's icon chip uses a gold tint as *asset identity*, which collides with the platform rule that gold means *earned money only*. Options: (a) accept it — real asset artwork will replace the placeholder anyway; (b) use a neutral metallic ring so gold keeps one meaning. | 2026-07-24 | ⬜ Pending |
| Q6 | **Card title at 360px** — ellipsise on one line (as designed), or 2-line clamp? Recommend the **clamp**: "Gold Up or Down" is short in English but Swahili and Chinese expand, and the card is bottom-pinned so the extra ~18px keeps grid alignment. | 2026-07-24 | ⬜ Pending |
| Q7 | Real asset artwork (Gold/Silver marks) — the `Au`/`Ag` glyph chips are placeholders. | 2026-07-24 | ⬜ Pending |

---

## 8 · Parked work (Ali's asks — deliberately NOT ridden along with Up & Down)

| # | Task | Why it is parked |
|---|---|---|
| P1 | **Canonical design-system archive.** Get a single versioned ZIP from Claude Design (`50pick-design-system-v1.0-2026-07-24`) covering foundations, every component + state, glyphs, brand, every page designed to date, the pattern rules, and a provenance / changelog / superseded record. Store it versioned in-repo with an index doc, so a future theme change has a baseline to read instead of guessing. Prompt drafted and handed to Ali. | An archival deliverable, not feature code. Landing it mid-feature would mix two unrelated diffs. |
| P2 | **Design-asset cleanup.** Audit every design asset in the repo, keep only what is in use, retire the rest — starting with the superseded teal kit `50PICK/design_handoff_prediction_market_kit/`, which `CLAUDE.md` already warns must never be built from. | Deleting an asset that is still referenced is a real regression risk: it needs its own pass with its own verification. It must also happen **after P1**, so nothing is deleted before it is archived. |

---

## 9 · Session log

| Date | Session did | Outcome |
|---|---|---|
| 2026-07-24 | Read `Up and Down/` in full; mapped scheduler, market lifecycle, fee models, reports, admin, permissions; resolved the 3 conflicts with Ali; wrote the plan + design brief; started Phase 0 | Plan agreed. Phase 0a done, 0b/0c in progress. |
