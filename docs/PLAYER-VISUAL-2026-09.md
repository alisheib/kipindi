# THE PLAYER SURFACE — VISUAL RE-EVALUATION · 2026-09

> **STATUS: RECORD, NOT RULE.** A rated re-evaluation of the player surface across fourteen
> expert lenses, commissioned 2026-09-02 (Part B). Laws live in
> [`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md); the state of the system in
> [`DESIGN-BASELINE.md`](DESIGN-BASELINE.md). This file mints no law and restates no value.
> Machine `OMEGA-COMPILE01`, production `https://50pick.tz`, repo `F:\kipindi-main` @ `c1a6a5e2`.
> Sibling: [`DESIGN-GATE-PLAYER-2026-08-28.md`](DESIGN-GATE-PLAYER-2026-08-28.md) (⚪ SPENT) —
> this pass is DG-P §5's blind spots: **768/1024 widths · SW/ZH · the bet ceremony · the dial ·
> `/live` · `/updown/[roundId]` · cold-start states · filter correctness.**

---

## §0 · How this was measured

- **The matrix sweep** — `scripts` in the session scratchpad, read-only on production, signed in
  **once** as a QA-fleet player (`loginOnce`, storageState reused — per-cell login trips
  attempt-limiting). **255 cells: 17 surfaces × 5 widths (390·768·1024·1280·1920) × 3 locales
  (EN·SW·ZH)**, 0 refused, 0 errored. Locale set via the `kp-locale` cookie on the context
  **before** the first request; `<html lang>` read back and capture refused on any mismatch.
  Per cell: viewport screenshot, `scrollWidth − innerWidth`, `measureClipping` per container
  against its **own** `scrollWidth`, the commit-control rect, and (at 390/1280) a computed
  control census. Evidence: `.qa-shots/pv2026-09/matrix/` (gitignored).
- **The bet ceremony** — driven end to end at **390-EN, 1280-EN, 390-SW**: board → YES →
  detail → **dial dragged** (10 sampled steps of `aria-valuenow` + stake) → release settle →
  confirm modal (arrival/departure timed by rAF probe). ⛔ **Every run cancelled at the confirm.
  Nothing was submitted.** Evidence: `.qa-shots/pv2026-09/ceremony/`.
- **Contrast** — ⛔ **region pixel reads, not `getComputedStyle` composites.** The matrix's
  in-page composite was found unreliable: **canvas 2D silently fails to parse `lab()`/`oklch()`
  colors** (evidence rule #6 in a new costume), so it scored the `@pct%` suffix at a false
  1.37:1 and the locale chip at a false 4.13:1. Every contrast claim below is a screenshot
  region read (5th vs 95th percentile luminance, `pngjs`), which overturned two of the three.
- **Motion** — enumerated `getComputedStyle` transition/animation duration + timing-function
  across every element at 1280-EN (with transitions LIVE — never killed during a timing probe).
- **Filters** — a focused correctness drive on `/markets` and `/results`.
- **Everything below was LOOKED AT.** The key screenshots at every decisive width/locale were
  read by eye, not inferred from the suite. Where a matrix number and a picture disagreed, the
  picture won and the number was re-derived (this overturned five prior hypotheses).

---

## §1 · The fourteen-lens scoreboard

Average of the twelve measured lenses (8 and 12 provisional): **7.4 / 10.** The surface is
**finished, alive, and money-safe in its display**; what remains is a short list of
system-level defects, most of them one-definition-site fixes.

| # | Lens | /10 | What a 10 requires (the gap) | Evidence |
|---|---|---|---|---|
| 1 | Player / gamer | **7** | Time-to-bet is short (card YES → dial → confirm, ~1s nav) and the payoff is visible before commit. Held back by the cold Up & Down 50/50 (PV-06) and a board that can read static (no activity sort on `/markets`). | ceremony 390/1280; matrix |
| 2 | Modern betting designer | **7** | The dial-as-bet-slip is genuinely novel; liquidity is signalled (volume/predictors, pool filters, `/results` volume sort); live presence is strong (LIVE pills, ticker, contested carousel). Gap: `/markets` cannot sort by activity/liquidity, so the board's own aliveness isn't surfaceable (PV-14). | matrix; filter drive |
| 3 | UI/UX engineer | **8** | IA clear, empty states designed (positions, search no-match), zero overflow. Gap: `/wallet/deposit` wastes ~53% of desktop width (PV-03), Up & Down cold-start (PV-06). | 1280 shots |
| 4 | Experienced graphic designer | **8** | Composition, type hierarchy and brand discipline are strong at every width. Gap: control-height drift (42/46px off the rungs, PV-13) and a seven-value chip-height set (PV-13). | census |
| 5 | Visual engineer | **8** | **Zero horizontal overflow on 255/255 cells** (5 widths × 3 locales); safe-area handled; the decorative mark is contained at desktop. Gap: the `.kp-hero__mark` backdrop encroaches on the headline at 390 (PV-01, a design call). | matrix |
| 6 | Colour-palette engineer | **7** | Semantic discipline holds (YES/NO, royal, claret). One real fail: the `@pct%` suffix on the YES/NO money buttons renders **~3.50:1** (region-read), under AA (PV-10). | contrast region reads |
| 7 | Animations expert (coverage/choreography) | **8** | The commit sequence is one story: dial settle → gilt `.m-dialog-in` modal → gold confirm. Hover feedback (DG-P-01) reads as addressed at HEAD. Gap: some list-entry motion is flat. | ceremony |
| 8 | Rendering & motion perf | **7 · provisional** | Ambient loops are in the frozen set (70s ticker, 2.6s/4.6s breathe); flip-clocks re-render per second on the detail page. **Not traced for CLS / long-tasks on low-end Android** — named the drive in §5. | motion census |
| 9 | Physics-of-components | **9** | **Measured sound.** The dial tracks 1:1 (`aria-valuenow` 50→48→46→44→43 across the drag), the RG 50× gate clamps at the half-distance, and the knob **holds where released** (no rubber-band) — settle stable across 50/150/300/600ms. `--m-pivot` reserved. | ceremony drag samples |
| 10 | Templates / structure | **7** | Shared `PageHeader`, one `.mcardp`, one `market-grid`, one pager. Gap: no shared `<DetailLayout>` — the narrow single-column pages (deposit, positions-empty) each waste desktop width differently; two card families gate cold-start differently (PV-06). | 1280 shots |
| 11 | Betting product manager | **7** | Reads finished and worth returning to; the cold Up & Down fabricated split and the un-sortable board are what keep it from "alive on every surface". | holistic |
| 12 | Findability & data-controls | **6 · provisional** | Counts shown on every pill (Open 36 · Close call 3 · Contested 6 · Longshots 13 · 10k+ 15 · 50k+ 6); `/results` has pagination (1/3), a game filter and Newest/**Highest-volume** sorts; search no-match → a designed empty state. **NOT verified**: `/markets` filter count-vs-rendered (the board lazy-loads 15 of 36), whether `/markets` filter state is URL-backed, sort monotonicity, combined-filter intersection. Named the drive in §5. | filter drive |
| 13 | Size & proportion | **7** | The bulk lands on the 40/44 `--h-control` rungs. Off-system: the `h-[42px]` "Hide balances" eye toggle (×51, every top bar, §K1), `mcardp-info` at 46px (×75), and a **seven-value chip height set** (18·20·21·22·23·25·27px). | census |
| 14 | Motion-timing | **6** | The weakest measured lens. `0.15s` (`duration-150`) is used **×373** — 10ms off the `--t-quick` (0.14) rung, imperceptibly close and therefore pure drift; **~19 distinct easing curves** are in use including bare Tailwind defaults (`cubic-bezier(0.4,0,0.2,1)` ×391), not the `--m-*` set; and scattered 0.16/0.18/0.20/0.26/0.32s off-rung. **Timing correctness is ungated** — a duration can be on the ladder and still be the wrong rung for its distance, and nothing measures that. | motion census |

---

## §2 · Findings register — worst first

> Each `PV-NN` gives: severity · lens · surfaces × widths × locales · mechanism at `file:line` ·
> repro · the fix's **definition site** · the guard + its RED control. Prior hypotheses
> (§E of the commission) that did not reproduce are filed **OVERTURNED** in §2b — a result, not a miss.

### PV-04 · HIGH · §L4/§L2 breach — the market-detail commit surfaces render the raw English enum
- **Lens** 3, 6 (honesty of localisation). **Surfaces** `/markets/[id]` (side-picker gate + dial commit), **all widths**, **SW and ZH** (correct in EN by coincidence — the enum *is* the English word).
- **Measured:** at 390-SW the dial commit button reads **"Weka YES"** (Place + raw enum) and at 1024-ZH the pick-gate buttons read **"YES @ 62% / NO @ 38%"** — while the same page's probability bar correctly shows **是/否** and every board card shows **NDIO/HAPANA · 是/否**. A Chinese screen-reader hears "YES".
- **Mechanism:** two sites interpolate `effectiveSide`/`side` (raw `"YES"|"NO"`) instead of `sideWord(t, side, productLine)`:
  - [`side-picker.tsx:140`](../src/components/markets/side-picker.tsx#L145) & [`:148`](../src/components/markets/side-picker.tsx#L153) — the pick-gate buttons (its own `@pct%` and noPrice gate are correct; only the word is raw).
  - [`conviction-dial.tsx:1643`](../src/components/markets/conviction-dial.tsx#L1663) (aria-label) & [`:1660`](../src/components/markets/conviction-dial.tsx#L1680) (visible) — the dial commit button.
- **Repro:** `VIEW=390x844 LOCALE=sw node ceremony-drive.mjs` → commit name `"Weka YES …"`.
- **Definition site:** `src/lib/side-label.ts` `sideWord()` (already imported in both files). Replace the two literals; **one word, one home** (§L2).
- **Guard:** `test:labels` §10 (data-derived side with hard-written product) — extend its render-surface population to the dial + side-picker; **RED control**: revert to `effectiveSide`, assert a ZH/SW render contains no `YES`/`NO` token.

#### ✅ RE-DERIVED AND FIXED — 2026-09-03, session 2. **It was EIGHT sites, not four.**

Re-derived on production before touching anything (`npm run qa:side-words`, a signed-in QA-fleet
player, SW and ZH, 1280 and 390): **20 checks RED**. The record above named four render sites; the
drive found **eight**, and the four it missed were the ones a reader meets first:

| # | site | what a Chinese player actually read |
|---|---|---|
| 1–2 | `side-picker.tsx:140,148` | `YES @ 51%` · `NO @ 49%` — *filed* |
| 3 | `conviction-dial.tsx:1099` | `您正押注 YES — 已锁定` (`aria-label`) — **new** |
| 4 | `conviction-dial.tsx:1124` | `YES 是` — the enum as headline, the translation as a 10px footnote — **new** |
| 5 | `conviction-dial.tsx:1398` | `YES` on the dial knob (SVG) — **new** |
| 6 | `conviction-dial.tsx:1419` | `您选择的是 YES` at 22px display — **new** |
| 7–8 | `conviction-dial.tsx:1643,1660` | `下注 YES TZS 1,000`, visible **and** `aria-label` — *filed* |

⭐ **The page showed four vocabularies for one idea at once** — the `.mcardp` cards in its own
"similar markets" rail read `是 @ 56%` correctly while the money control above them read
`YES @ 51%`. That contrast, on one screen, is the finding.

**Fixed** by routing all eight through the existing lexicon home — `sideWord(t, …, "MARKET")`, and
in the dial through its own `sideLabel` (`:548`), which four of the sites were bypassing. `"MARKET"`
is provably right here and not a guess: `/markets/[id]` redirects an `UPDOWN` row to `/updown` at
`page.tsx:123`, ~330 lines before any of this renders.

**Guard — `test:labels` §3b + §3c, with `red:labels` at 12/12.** Not §10, and not a new file: the
rule already had a home. ⛔ **§3 was ALL PASS over all eight defects**, and understanding why is
worth more than the fix — its scanner matches a *vocabulary of identifier names*
(`side|outcome|status`) inside template literals, and the variables here are called `effectiveSide`
(no `\b` before `Side`), `s`, and `lock`. **A guard that reads the source's vocabulary cannot see a
defect that renames its variable.** §3b judges a *position* instead — a token typed where a person
reads it — reusing §11b's scanner with a different token set (§0a) rather than cloning it. §3c keys
on the **dictionary's own `{side}` placeholder**, which is what finally catches the `lock` shape.

⚠️ **The RED proof earned its keep twice.** §3b's first two drafts were GREEN against the real
defect: (1) a JSX text run may close on `{`, not only `<` — `>YES {hasPool && …}` is the pick gate
verbatim and no pass matched it; (2) a blanked-out comment leaves ~200 columns of spaces behind,
pushing the run past the 160-char cap, so *the guard was defeated by the length of the comment
explaining the fix*. Both are now fixed in the shared scanner, and `stripComments` erases a JSX
comment's braces with it.

**Population + arithmetic** (DESIGN-BASELINE §3): §3b covers **348** player-surface JSX files
(`src/app` + `src/components`, minus admin, minus dev-test); **3 hits at HEAD, all inside 2 named
allowlist entries with per-file count ratchets; 0 outside.** §3c: **0**. §11b's own count is
**unchanged at 3** — the shared widening cost it nothing.

**Filed, not fixed — one for Ali.** `src/app/legal/terms/page.tsx:301` renders the ASCII enum inside
Chinese legal prose: *«所有注金——YES 与 NO——汇入同一资金池»*. It is allowlisted **with its reason**,
because rewording a licensed operator's terms is Ali's call (§b3 rules legal/compliance out of this
programme's scope). The allowance may only fall.

⚠️ **One thing to LOOK at after the merge, not to take on trust.** Site 5 is the dial-knob
sub-label, an SVG `<text>` at **7.5px** in `JetBrains Mono` with `0.16em` tracking. `NDIO` sits
there comfortably; **是** is a nine-stroke glyph at 7.5px in a stack with no CJK face, so it falls
back and may read as a smudge. Correct is still better than English-and-wrong, and the same word
carries at 22px in the readout directly beneath it, so nothing is lost if the knob label is faint —
but if `dial-zh-390.png` shows mush, the fix is a **size** decision (a rung, not a literal), and it
is a design call rather than a session's. Flagged, not silently changed.

**Evidence** `.qa-shots/pv04/` — `{gate,dial}-{sw,zh}-{390,1280}.png`, captured pre-fix on
production: they are the *defect's* record. The post-merge run overwrites them with the proof.

### PV-06 · HIGH · the Up & Down card fabricates a 50/50 crowd split on an empty round
- **Lens** 1, 3, 11 (honesty, §C2/§B10-rule-5). **Surfaces** `/updown`, `/updown/[roundId]`, `/live` Up & Down cards, **all widths/locales**.
- **Measured:** an empty round renders **"Up 50% · 50% Down"** with a filled green/red bar beside **"VOL TZS 0"** (seen at 1280-EN and 390). The market card (`.mcardp`) correctly shows the em-dash + dashed empty bar at true zero-volume, and the side-picker correctly gates on noPrice — **the Up & Down card is the one family that does not**.
- **Mechanism:** [`updown-card.tsx:857-862`](../src/components/updown/updown-card.tsx#L861) renders `Up {upPct}% / {downPct}%` and the split bar **unconditionally** — no `volumeTzs === 0` gate. §B10 rule 5 lists five cold-start consumers; the Up & Down card was never wired as the sixth.
- **Repro:** `/updown` at 1280 → any card reading `VOL TZS 0` shows a filled 50/50 bar.
- **Definition site:** the shared cold-start rule (`lib/markets/discovery.ts` `pricedYesPct` → null at pool 0). Gate the card's split block on it — show the dashed empty bar + "No bets yet", mirroring `.mcardp`.
- **Guard:** `test:hero-contract`/`test:discovery-contract` already own the five consumers — add the Up & Down card as the sixth; **RED control**: a 0-volume round must not emit a `width` other than 0 on the split bar.

#### ✅ RE-DERIVED AND FIXED — 2026-09-03, session 2. **The defect was a SECOND BAR, not a missing gate.**

Re-derived on production first: `/updown` served a **LIVE** round at `VOL TZS 0` with **0
predictors** rendering a filled `Up 50% · 50% Down`, and — worse, and unfiled — a round that had
already **RESOLVED** doing the same. `qa:cold-start` (new) goes **12 RED** on production.

⭐ **The mechanism was one layer deeper than filed.** `updown-board.ts:428` read
`impliedYesPct(m)`, which returns a **hardcoded 50** on an empty pool
([market-service.ts:315](../src/lib/server/market-service.ts#L313-L317)) — while
[`pricedYesPct`](../src/lib/markets/discovery.ts#L75-L79) returns **null** for the same input.
**Two functions, one fact, disagreeing about the only case that matters** (§0a). Five surfaces
already consumed the honest rule; the Up & Down board was the sixth that was never wired to it.

⛔ **But the deeper finding is why the gate was missing at all.** `market-card.tsx` renders the
kit's `<TippingBar>`, whose own documentation had already ruled on this — *"A STATE OF THIS BAR,
not a second component — DESIGN_AUTHORITY B9"*. **Three files drew this bar**: the kit's, plus a
hand-rolled two-span strip in `updown-card.tsx` (5px, 2px gap) and another in
`updown/[roundId]/page.tsx` (6px, 0.5 gap). One idea, three drawings. The hand-rolled pair could
not *inherit* the cold-start rail, so **the defect was not the missing gate — it was that there
was somewhere for the gate to be missing from.**

**Fixed** at the definition site (`upPct: pricedYesPct(...)`, typed `number | null` all the way to
the paint, no `?? 50` anywhere) and by **deleting both hand-rolled bars** for the kit primitive at
`.mcardp`'s own `height={7}`. Both card families now render one bar — which also gives the Up &
Down bar a `role="progressbar"` and a localised accessible name it never had.

**Guard — `test:ui-consistency`'s new `hand-rolled-split-bar` rule, `red:split-bar` 2/2.** Not a
new file: "drift from the kit where a primitive exists" already had a home. It detects the SHAPE
(an inline `--yes-500` fill, a `width:`, an inline `--no-500` fill), **0 at HEAD**, with one
documented exemption — `/positions`, whose rail shows the **viewer's own stake**, is gated on real
money per segment so it cannot fabricate anything, and would be actively misdescribed by a
"where the crowd is tipping" needle. ⭐ **The rule immediately found that fourth bar, which I did
not know about.** The second RED mutation exists because every other allow-list in that file keys
on `basename(f)` — and `"page.tsx"` would have exempted **every page in the App Router**.

⚠️ **A gap stated plainly.** The static rule stops the *structural* cause returning; it cannot see
a re-wire of `updown-board.ts` back to `impliedYesPct`, which would paint the same fabricated 50/50
*through* the kit. `qa:cold-start` is what covers that, by asserting the invariant
**`a split with percentages ⟺ volumeTzs > 0`** against each card's own printed volume — and
refusing to claim green unless it saw both an empty and a funded round.

**Validated:** `tsc` ✓ · `build` ✓ · `test:ui-consistency` ✓ · `red:split-bar` 2/2 ✓ ·
`test:motion` **43/0** ✓ · `qa:cold-start` **32/32 GREEN on a local server carrying the fix, 12 RED
on production without it** — both arms of the invariant exercised locally (2 empty + 1 funded).
**Looked at**, not merely counted: the empty card shows the dashed rail with no percentages, the
funded card shows a real 83/17 split with the gilt needle and `Down × 3.90` on the thin side.

⭐ **One change came from LOOKING and could not have come from the DOM counts**: the first fix put
a `mcardp-nobets` caption under the rail, mirroring `.mcardp` — which printed *"No bets yet"*
**twice** inside 200px, because this card already says it better ten lines lower ("No bets yet — if
only one side is backed when betting closes, every stake comes back"). The caption was removed;
the rail keeps the phrase as its accessible name, so a screen reader is told once too.

✅ **VERIFIED ON PRODUCTION 2026-09-03** (merged `79c3b65b`): `npm run qa:cold-start` → **30/0**,
having been **12 RED** against the same URL an hour earlier. Both live cards now show the dashed
empty rail at `VOL TZS 0` — including the **RESOLVED** round, which used to paint a 50/50 over a
result it had already decided.

⚠️ **One arm was NOT exercised on production, and the drive is what said so.** No funded Up & Down
round existed at verification time, so it reported `NO FUNDED ROUND ON THE BOARD — the positive
control was not exercised here` on every view rather than claiming a whole invariant it had only
half-tested. The funded arm is proven **locally** (a real 83/17 split with the gilt needle and
`Down × 3.90` on the thin side). ▶ **Re-run `qa:cold-start` once a funded round exists on
production**; it is one command and it closes the other half.

#### 🔴 SECOND PASS, SAME DAY — the sweep found FOUR more surfaces

Asked to prove rows 1–2 were finished, the honest answer was **no**. The record names `/live` as a
PV-06 surface and the first pass never looked there. It carried the defect in a *different shape*,
which is why the first guard was blind to it:

| surface | the shape | why the first guard could not see it |
|---|---|---|
| `live/pulse-grid.tsx` | used the kit bar **correctly** but passed **no `empty` prop** — so the honest rail was unreachable there under any data | `hand-rolled-split-bar` only catches a surface drawing its OWN bar |
| `live/page.tsx` `topContested` | an unpriced market scored **exactly 50**, sorted **FIRST** as "most contested", and was promoted into the hero carousel under a 32px bar at a perfect half-and-half | not a bar at all — a **SORT** |
| `results/page.tsx` | the gilt "notable result" bar, ungated | chosen by highest volume, so empty is *near*-unreachable — and *near* is not a gate |
| `app/page.tsx:196` | a comment reading *"it is 0 rather than 50 deliberately"* sat directly above `?? impliedYesPct(…)`, **which returns exactly 50** | a stale note describing code that had drifted out from under it |

⭐ **The `topContested` one is the worst of the four, and it is not a rendering bug.** The wall's
most prominent slot was reserved, by construction, for whichever market had the *least* information
behind it. A `.filter()` now narrows it away — which also makes `featured-contest` safe by **type**
rather than by a runtime branch.

**Second guard — `tipping-bar-without-cold-start`**, beside the first in `test:ui-consistency`,
**0 at HEAD**, `red:split-bar` now **3/3**. ⚠️ Its sibling heuristic has a limit, stated rather than
hidden: rewriting a branch to `{false ? (` leaves the empty arm's text in place and the mutation
passed, so the RED harness **deletes** the arm instead — the shape that actually shipped.

⚠️ **And `test:spacing-scale` caught me.** The new copy line used `mt-2.5` in *both* arms, adding a
562nd "inverted" usage against a ceiling of 561 — the scale is overridden here, so `2.5` paints
10px while `2` paints 12px. Hoisted onto one wrapper; back to 561.

**Evidence** `.qa-shots/pv06/` — `updown-{en,sw}-{390,1280}.png`, `round-{en,sw}-{390,1280}.png`,
`live-en-1280.png`.

### PV-03 · MEDIUM · two surfaces render a narrow centred column on a desktop viewport
- **Lens** 3, 5, 10. **Surfaces** `/wallet/deposit` (confirmed) and `/positions` **empty-state cards** (confirmed) at **1280·1920**. ⚠️ **Narrowed by re-derivation** — see §2b: market-detail, wallet, notifications and updown all render **real desktop layouts** and are OVERTURNED.
- **Measured:** `/wallet/deposit` at 1280 is a single ~600px column with ~340px empty gutters each side (~53% of width unused); `/positions` section headers span full width while the empty-state cards sit centred-narrow.
- **Definition site:** a shared `<DetailLayout>` (a new **template**, §K5 — a system-level primitive so every narrow detail page inherits it), or give these pages a two-track shell. ⛔ Not a per-page patch.
- **Guard:** extend `responsive-audit.mjs`'s per-page measure — a content root narrower than ~65% of its tier at ≥1280 with no sibling track is a finding.

### PV-13 · MEDIUM · control-height and chip-height drift off the system
- **Lens** 13. **Surfaces** shell (top bar) + every board, **390·1280**.
- **Measured (computed boxes, not class names):** the **"Hide balances" eye toggle** renders **42px** via a hand-typed `inline-flex h-[42px]` — off the 40/44 `--h-control` rungs, on **every top bar** (×51 in the census); **`mcardp-info`** ("How it works") renders **46px** (×75). Chip/pill heights span **seven values — 18·20·21·22·23·25·27px** (DG-P-10's 23-vs-21 split persists and widened).
- **Mechanism:** hand-typed `h-[42px]` (top-app-bar balance toggle) violates §K1 (never hard-code a control height); `mcardp-info` sits at 46 in `globals.css`; the chip family has no single per-size height.
- **Definition site:** the eye toggle → a `--h-control-*` rung (or `.btn-sm`); `mcardp-info` → 44 in `globals.css`; chips → one height per size in `chip.tsx`/`globals.css`.
- **Guard:** `test:tap-target` reads a *declared* height and passed 42px (above the 40 floor) — add a rung-membership assertion (an interactive height must equal a `--h-control` value); `test:chip-contract` → one height per chip size.

#### ✅ PV-13a/PV-13b RE-DERIVED AND FIXED — 2026-09-03, session 6. **Both defects existed for different, complementary reasons no single guard would have caught.**

Re-derived on production first (a headless drive against `50pick.tz`, signed in as `fleet:01`,
1280 and 390): `.mcardp-info` measured **46px** and the eye toggle **42px inside a 44px
capsule**, exactly as filed. **PV-13c (the seven-value chip family) is untouched — it needs
Design's ruling on which sizes survive, per §g row 5, and is not this session's to take.**

⭐ **Neither defect was invisible by accident — each defeated §3 a different way.**
`test:tap-target` §3 reads a height *declared on the interactive tag's own JSX attributes*:

| control | why §3 never saw it |
|---|---|
| the eye toggle | `<CashEye className="h-[42px]">` — `CashEye` is a kit component, not one of `TAGS` (button/a/Link/input/select/textarea/summary), and carries no `role=` — §3's scan never opens this tag |
| `.mcardp-info` | its box is declared in a **CSS rule** (`globals.css`), not on the JSX tag — §3 only ever reads JSX attributes, by construction |

**Fixed** at the two definition sites. The eye's `h-[42px]` → `h-full`, inheriting the capsule's
own height rather than re-typing a number (§0a); the capsule's own `height: 44` literal became
`var(--h-control-md)` in the same commit, so the two agree by construction, not coincidence.
⚠️ **The first attempt at `h-full` still measured 42px** — the capsule's `border: 1px solid …`
sits *inside* the border-box, so a real border was eating 2px off the CONTENT height children's
`h-full` resolves against. Moved to an `inset` box-shadow (same hairline, paints without
consuming layout space) so `h-full` reaches the actual 44px rung; verified by re-measuring, not
by re-reading the CSS. `.mcardp-info` moved from `content-box; width/height: 28px; padding: 8px`
(28+16+2=46) to `border-box; width/height: var(--h-control-md); padding: 8px` (44 outer,
matching the token the codebase already calls this rung).

⛔ **Found by re-checking, not left as a guess: `.mcardp-info` participates in card geometry.**
It is the tallest child of the card's meta row on a LIVE card, so shrinking it moved
`MARKET_CARD_H` (`card-geometry.ts`) from **349 → 347** — measured before/after on the same
board (cold-start cards 349→347, priced cards with a sparkline 356→354). The neighbour
`.mcardp-details::after` overlay's clearance (10px above / 14px below) is **unchanged** — the
row above absorbed the 2px, not the gap — confirmed with `elementFromPoint`-based hit-testing
(`tap-hit-test.mjs`) rather than assumed: every Details target still ≥40px, no info button
swallowed, at 360/768/1280/1920.

**Guard — `test:tap-target` new §6, RED-proven by `red:tap-rung` (new, 2/2 caught).** Not a
general "every `h-[Npx]` is a control" sweep, which is refused with the arithmetic: 377
hand-typed `h-[Npx]` literals exist in `src/` at HEAD (104×44, 95×40, 24×36, 17×32 … down to
2px), the overwhelming majority decorative (an icon plate, a divider, a skeleton bar, a chart's
plot height — `propose-promo.tsx`'s OTHER `h-[42px]` is a 42×42 trophy medallion, not a
control). §6's population is instead the two NAMED controls this row's own re-derivation found,
stated by grep in the guard's own header — `wallet-balance-pill.tsx`'s `<CashEye>` call site and
`.mcardp-info`'s rule — asserting neither hand-types a pixel height at its call site any more.

**Validated:** `tsc` ✓ · `build` ✓ · `test:tap-target` **29/0** (was passing at 27/0 *without
seeing either defect* — the population grew, not merely the pass count) · `red:tap-rung` **2/2
caught** · `test:card-share` **26/0** (card-geometry change did not disturb the share/details hit
area) · `tap-hit-test.mjs` against a local server: every Details target ≥40px, no info button
swallowed, at 4 widths · screenshots at 390/1280 EN/SW/ZH — the eye fills the capsule flush
top-to-bottom (`eyeTop`/`eyeBottom` both 0px, measured), `.mcardp-info` renders 44×44 on every
card. ⚠️ **Not yet proven on production** — pushed to a branch; `qa:*` re-verification is owed
on merge (§h step 6).

### PV-10 · MEDIUM · the `@pct%` odds suffix is sub-AA on the YES/NO money buttons
- **Lens** 6. **Surfaces** every priced market card + the side-picker gate, **all widths**.
- **Measured (region pixel read, not composite):** the `@ {pct}%` suffix at `opacity-85` renders **~3.50:1** on the green `btn-yes` / red `btn-no` fill — under the AA 4.5 floor for text. The card uses `text-[11.5px] opacity-85` ([market-card.tsx:429-432](../src/components/markets/market-card.tsx#L429-L432)); the side-picker uses `text-[12.5px] opacity-85` ([side-picker.tsx:140,148](../src/components/markets/side-picker.tsx#L145)).
- **Repro:** `node contrast-probe.mjs` → "REAL PIXEL RATIO 3.50:1".
- ⚠️ **The matrix composite reported 1.37:1 and was WRONG** (canvas can't parse `lab()`); the region read is the truth. So the severity is *sub-AA*, not *invisible*.
- **Definition site:** drop the `opacity-85` on the suffix (use the label's full ink), or move the readout off the fill. ⛔ Never re-hue the green (§B2). A darker fill is the §A "darken the fill" lever but touches the brand → Ali.
- **Guard:** `test:contrast` now composites `opacity` (DG-P-12) — confirm its population **includes** this suffix span; if it doesn't, that gap is the finding. **RED control:** the suffix at `opacity-85` on `btn-yes` must score < 4.5.

#### ✅ RE-DERIVED AND FIXED — 2026-09-03, session 6. **The gap named in the finding WAS the finding, and it was FOUR sites, not four — it was NINE.**

Re-derived on production first: a live priced `.mcardp` card's `YES @ 100%` suffix region-read at
**3.87:1** — the LOOK matched the number, the "@ 100%" visibly duller than "YES" beside it.
Confirmed the guard's own population gap named in the record: `test:contrast` had **no
mechanism at all** that looks inside a `<button>`'s own children for a call-site `opacity-NN` —
its existing `§P-u` only ever matched the Tailwind slash-alpha idiom (`text-text-subtle/NN`),
never the `opacity-85` utility class.

⭐ **Filed as 4 sites, found as 9 — PV-04's shape one row later.** The same
`font-mono opacity-85` suffix on `.btn-yes`/`.btn-no` repeats on the Up & Down commit buttons
(`updown-card.tsx`, `updown-stake-controls.tsx`) — real money-placing buttons, not board
decoration — and the new guard's OWN sweep then found a **ninth**, previously unfiled: the bet
panel's own commit button (`conviction-dial.tsx:1681`) dimmed its stake amount at `opacity-90`,
scoring **4.14:1**, also under AA, on the single button that places the bet.

| # | site | shape | measured |
|---|---|---|---|
| 1–2 | `market-card.tsx:429,432` | `@pct%` on the board card | *filed* — 3.50→3.87:1 (region read) |
| 3–4 | `side-picker.tsx:145,153` | `@pct%` on the pick-gate | *filed* |
| 5–6 | `updown-card.tsx:1010,1015` | `×N` multiplier, signed-out card | **new** |
| 7–8 | `updown-stake-controls.tsx:256,265` | `×N` multiplier, the real bet control | **new** |
| 9 | `conviction-dial.tsx:1681` | the commit button's OWN stake amount | **new — found by the guard, not by hand** |

**Checked, not swept in — two look-alikes that are clean.** The resolved-state ghost pill also
carries `opacity-85` (`market-card.tsx:447`, `updown-card.tsx:1130`), but it paints `--text` on
the card's own surface, not the pearl/fill pair: computed at 0.85 alpha, ~12:1, nowhere near the
floor. Left alone, named here so the next reader does not re-measure it.

**Fixed** by dropping `opacity-85`/`opacity-90` at all nine sites — the label's full ink, exactly
as the finding's own definition site specified. ⛔ **Never re-hued the green/red** (§B2) — the
suffix now simply reads at the same ink as the word beside it.

**Guard — `test:contrast` new `§P-u2`, RED-proven by `red:contrast-callsite` (new, 5/5 caught).**
Scoped deliberately, not to "every `opacity-NN` in the tree" (~120 call sites, a real vocabulary
for fades/disabled-states/hover-dims that this file has no way to resolve against an inherited
ink): only the four SOLID flat-fill families this file already resolves to one literal
(ink, fill) pair — `btn-yes`/`btn-no`/`btn-danger`/`btn-gold`. `btn-primary`/`btn-claret` are
gradients (worst-stop, not one fill) and every `opacity-NN` inside either at HEAD is a
`disabled:opacity-NN` variant — WCAG 1.4.3-exempt by a rendered fact (six call sites), not
by omission. The reader needed its own small lexer (`endOfButtonOpenTag`, cited from
`tap-target.test.mts`'s §0, which proved the same trap: an inline handler like
`onClick={() => bet.place("UP")}` contains a literal `>` before the button's own `className`,
so a naive regex never reaches two of this row's own nine sites) plus a `decomment` pass — the
first version of the scanner misread this row's OWN explanatory prose (a comment saying
`` `opacity-85` `` in English) as a live class, and separately ran off the end of 18 files whose
open tags carried a comment using backticks for inline code.

⚠️ **A pre-existing, unrelated guard broke on the fix, honestly, and was corrected.**
`test:updown-pricing` §7.2 ("no size escalation") asserted the literal string `opacity-85`
beside `text-[12.5px]` as its fingerprint for "still muted" — a vocabulary match, not a
measurement of size. Dropping `opacity-85` for a real, measured AA reason broke that check's
IMPLEMENTATION without breaking the RULE it exists to enforce (size unchanged, still `text-
[12.5px]`, still no bold, still no gold — 7.1/7.4 independently confirm the gold half). Rewritten
to assert the span's own full class list rather than one incidental value inside it;
`red:updown-pricing`'s own "multiplier escapes into gold" mutation had ALSO been silently
"ANCHOR NOT FOUND" (proving nothing) since before this row touched the file — a stale " est."
suffix that had not existed in the source for some time — and is re-anchored to the literal that
ships (now **11/11** required mutations caught, was 10/11).

**Population + arithmetic:** `§P-u2` scans every `<button>` in `src/` naming a solid family —
**22 at HEAD**, 0 unreadable open tags (proven at 18 before `decomment` was added), 0 call-site
opacities remaining after the fix (was 9). A coverage floor (`buttons < 20` fails loudly) so a
future lexer regression cannot present as "0 defects" instead of "0 reach".

**Validated:** `tsc` ✓ · `build` ✓ · `test:contrast` **69 checks, 0 gate failures** (was 67
checks before `§P-u2` existed) · `red:contrast-callsite` **5/5 caught** · `test:updown-pricing`
**61/0** (was failing 1/61 against the fix until §7.2 was corrected) · `red:updown-pricing`
**11/11** (was 10/11, one stale anchor since before this row) · region-pixel-read locally:
`YES @ 75%` on a real 75/25 board now measures **4.71–4.75:1** at every width/locale tested,
matching `test:contrast`'s own modelled `btn-yes label (pearl on yes-bg)` figure of **4.74**.
**Looked at**, not merely counted: the suffix on every fixed surface (board card, pick-gate,
Up & Down card and stake control, the dial's own commit button) reads at the same ink as the
word beside it, in EN/SW/ZH at 390 and 1280. ⚠️ **Not yet proven on production** — pushed to a
branch; the region-pixel-read drive is owed on merge.

### PV-14 · MEDIUM · timing correctness is off-system and ungated
- **Lens** 14. **Surfaces** platform-wide, measured at 1280-EN.
- **Measured (browser, transitions live):** `0.15s` (`duration-150`) appears **×373** — one rung (10ms) off `--t-quick` (0.14), a difference no human perceives, which makes it pure drift not a design choice; **~19 distinct easing curves** are in use, including bare Tailwind defaults (`cubic-bezier(0.4,0,0.2,1)` ×391) that name no `--m-*` token; and 0.16/0.18/0.20/0.26/0.32s appear scattered off the `--t-*` ladder.
- **Mechanism:** call sites write `transition-all duration-150` / `transition-colors` (the Input atom and many others) instead of `--t-*`/`--m-*`. §B5 rule 3 requires a duration before a *named* easing; the Tailwind default satisfies neither.
- **Definition site:** the atoms that carry `duration-150` (Input, and the census's `inline-flex min-h-[44px]` control) → `--t-quick` + a named `--m-*` curve; systemic, at the kit.
- **Guard:** `test:motion-ladder` pins the tokens but **nothing scores a duration against its travel distance** — that gap is itself the finding, and the new guard is Part C's (§f): a `--t-*` must match its distance/role, and any bare `ms`/bare cubic-bezier outside `motion.css` fails.

### PV-01 · LOW / DESIGN-JUDGMENT · the brand-mark backdrop encroaches on the headline at 390
- **Lens** 4, 5 (§M8). **Surfaces** `/markets/[id]`, `/wallet`, `/positions`, `/notifications`, mainly **390**.
- **Measured:** `.kp-hero__mark` is a large right-edge decorative watermark. At **1280+ it sits at/off the right edge** and collides with nothing (verified at 1280/1024 — the two-column layouts clear it). At **390** it sits behind the headline area as a faint backdrop. It reads as the round-2 kit's intended "question-board" backdrop (CLAUDE.md: "the brand mark as a backdrop"), not a legibility-harming collision.
- **Verdict:** whether this breaches §M8 clear-space, or is the sanctioned backdrop, is **a design call, not a defect** → §6. If it is to be contained, the fix is one `<DecorMark>` primitive with a clear-space rule (system-level).

### PV-05 · LOW / DESIGN-JUDGMENT · the bet panel dial reads thin, and carries three words for one idea
- **Lens** 5, 9, 13. **Surface** `/markets/[id]` dial.
- **Measured:** the dial is physically sound (PV-12 sound) but visually a thin 5px-ish slider with a small knob; the panel says "YOUR PICK" + the knob "21.08×" + the modal "conviction" — three registers for one concept. The **panel commit is side-green (`btn-yes`), the modal confirm is gold** — which is **correct** per §M3a/D1 (bet keeps gold; the green states *which side*, the gold states *money committed*), so that half of the old hypothesis is OVERTURNED.
- **Verdict:** the dial's visual *weight* and the term unification are a **Design commission**, not a sweep (lens 5/9/13) → Part C §d.

---

## §2b · Prior hypotheses OVERTURNED by re-derivation (results, not misses)

| Hyp. | Claim | Re-derivation |
|---|---|---|
| PV-02 | The bottom rail occludes the primary commit control (withdraw chips, last cards). | **OVERTURNED.** The scroll-bottom occlusion probe found **zero** overlaps across 390 cells; the pages scroll and content clears the rail. Withdraw's destination grid, notifications and positions all sit above the rail at rest. |
| PV-03 (part) | ~8 routes render a phone-width column on desktop. | **NARROWED to 2.** market-detail (real 2-col), wallet (real 2-col), notifications (full-width rows), updown (wide grid) all render proper desktop layouts at 1280. Only deposit + positions-empty confirmed. |
| PV-08 | Wallet activity titles ellipsise with no disclosure. | **OVERTURNED.** [`wallet-client.tsx:369-388`](../src/app/wallet/wallet-client.tsx#L369-L388) is a deliberate expand-to-read pattern; `title` was intentionally avoided with the reason written in place. |
| PV-10 (part) | Eyebrow/micro-copy under 4.5:1; locale chip and notice bar off-palette/faint. | **OVERTURNED for the chip + bar** (region reads: locale chip **11.63:1**, notice-bar text **9.27:1**). The matrix's 4.13 was a `lab()` canvas artefact. Only the `@pct%` suffix survives (PV-10 above). |
| PV-12 | The dial's feel is unproven — may not track/snap/settle. | **OVERTURNED — the dial is sound** (§1 lens 9): 1:1 tracking measured, RG clamp works, holds on release. |
| PV-06 (part) | Cold *markets* render "YES @ 0% / NO @ 100%" at full weight. | **OVERTURNED for the market card.** A 0%/100% card is a *legitimate one-sided pool* (verified: 2 predictors, TZS 2K volume); true zero-volume correctly shows the em-dash. The defect is the **Up & Down card only** (PV-06 above). |
| PV-14 (part) | No activity/liquidity sort is offered anywhere. | **OVERTURNED for `/results`** — it offers a **"Highest volume"** sort. `/markets` is closing-time sorted; whether it offers a volume sort is unconfirmed (§5). |
| clipping | Various clipped strings across the board. | **OVERTURNED.** Every `measureClipping` flag (15 cells) is a designed `-webkit-line-clamp` (card questions, full text on detail) or the expand-to-read wallet rows — no undisclosed loss. |

---

## §3 · Per-route index (widths driven · verdict)

| Route(s) | Driven | Verdict / findings |
|---|---|---|
| `/` | 390·768·1024·1280·1920 × EN·SW·ZH | Sound; hero backdrop mark (PV-01) |
| `/markets` (board) | full matrix + filter drive | Sound layout; PV-14 (no `/markets` volume sort); lazy-loads 15 of 36 |
| `/markets/[id]` live | full + ceremony 390/1280/SW | **PV-04** (side-picker + dial enum), PV-01, PV-05, PV-10 |
| `/markets/[id]` resolved | full matrix | Sound (settlement breakdown intact per DG-P §4) |
| `/updown`, `/updown/[roundId]`, `/updown/history` | full matrix | **PV-06** (fabricated 50/50 at VOL 0) |
| `/live` | full matrix | Sound; contested carousel + search give hierarchy (PV-07 overturned) |
| `/results` | full + filter drive | Sound; pager 1/3, game filter, Newest/Highest-volume sorts |
| `/positions`, `/positions/[id]` | full matrix | **PV-03** (empty-state cards centred-narrow) |
| `/watchlist`, `/leaderboard` | full matrix | Sound |
| `/notifications` | full matrix | Sound (full-width rows, FilterPill filters, Newest/Oldest sort) |
| `/wallet` | full matrix | Sound (real 2-col); Invite & Earn gold on zero-bonus card → §6 |
| `/wallet/deposit` | full matrix | **PV-03** (narrow centred column, ~53% empty at 1280) |
| `/wallet/withdraw` | full matrix | Sound (PV-02 occlusion overturned) |
| `/404` | full matrix | Sound |
| shell (top bar / rail / mark) | full matrix | **PV-13** (42px eye toggle), PV-01 |

---

## §4 · Checked and found SOUND — do not "fix" without re-deriving

- **Zero horizontal overflow on 255/255 cells** (5 widths × 3 locales). The batch-1–6 + design-gate work holds on production.
- **The conviction dial is physically sound** — 1:1 drag tracking, RG 50× clamp, holds on release, `--m-pivot` reserved (PV-12 overturned).
- **The confirm ceremony is well-built** — gilt `.m-dialog-in` arrival (~10–18ms to visible), quote-hold countdown, gold Confirm (correct per D1), ghost Cancel; departs in ~220ms.
- **The market card cold-start gate works** — em-dash + dashed bar at true zero-volume; a 0%/100% card is a real one-sided pool, correctly shown.
- **SW/ZH localisation is complete** everywhere **except PV-04** — board cards, probability bars, modals, filters and the whole shell localise correctly.
- **Two-column desktop layouts** on market-detail, wallet, notifications, updown; full-width lists on notifications/results.
- **Wallet activity rows** — expand-to-read, deliberate.
- **Contrast** — locale chip 11.63:1, email notice bar 9.27:1 (region-read); the ramp holds.
- **`/results` findability** — pagination, game filter, Newest/Highest-volume sorts, search empty-state.

---

## §5 · What this pass did NOT cover (name the drive that would settle it)

- **`/markets` filter correctness** (lens 12, provisional). The board lazy-loads 15 of 36 cards, so `count == rendered` cannot be checked without paginating; my filter-click probe was inconclusive on whether `/markets` filter/sort state is **URL-backed** (the URL did not change on a pool-pill click). **Drive:** a filter sweep that scrolls to full render, clicks each pill, counts rendered cards against the pill count, asserts sort monotonicity on the sorted key, drives ≥4 combined filters against a first-principles filter of the same data, and checks Back/refresh/shared-link state. `test:board-discovery` + `qa:filter-scan` are the starting instruments.
- **`/markets` sort options** — I confirmed the active sort is "Closing soonest" but could not enumerate the full dropdown (the open failed headless). Whether a volume/activity sort exists on `/markets` is **unconfirmed** (it does on `/results`).
- **Rendering/motion perf** (lens 8, provisional) — no CLS / long-task / per-second-re-render trace on a throttled low-end-Android profile; the two flip-clocks and the 70s ticker are candidates. **Drive:** a Playwright trace with CPU throttling + `PerformanceObserver` on the market-detail and `/live`.
- **The sell flow and cash-out** — no position was sold (no money moved by design).
- **PWA install surfaces, push opt-in** — require a **headed** run (headless keeps `Notification.permission` denied).
- **The needle drawer, chat panel interiors, live overlay geometry** (notifications panel / avatar menu / language menu opened states).
- **`/proposals`, `/proposals/[id]`, `/wallet/receipt/[id]`** — not in the matrix list this pass.

---

## §6 · Needs Ali — visual/product only

1. **PV-01 — the `.kp-hero__mark` backdrop.** Is the mark-behind-the-headline the intended "question-board" hero (keep), or should it be contained to a clear-space rule (§M8)? It harms no legibility at desktop; at 390 it is a faint backdrop.
2. **PV-05 / the bet panel dial.** The dial is functionally perfect but visually thin, and one idea wears three words (YOUR PICK / MULTIPLIER-× / conviction). This is a **Claude Design** commission (Part C §d), not a sweep — Ali's call on scope.
3. **PV-10 — the `@pct%` odds contrast.** The clean fix (drop `opacity-85`) is a session's; a darker green fill (the §A lever) touches the brand and is Ali's.
4. **The "Invite & Earn" gold button on the zero-bonus card** ([wallet-client.tsx:314](../src/app/wallet/wallet-client.tsx#L314) `btn-gold`) — a possible §M3a/D5 case (gold on an inducement over a TZS 0 balance). Verify against `test:gold-is-money`; if it passes today, this is a ruling to record, not a defect to fix.

---

*Provenance: every artifact is regenerable from the session scratchpad scripts named in §0
(`player-matrix-sweep.mjs`, `ceremony-drive.mjs`, `contrast-probe.mjs`, `filter-drive.mjs`,
`analyze-matrix.mjs`). Evidence: `.qa-shots/pv2026-09/` (gitignored). Re-run against
`https://50pick.tz` signed in as a QA-fleet player, one login per account.*
