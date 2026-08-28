# Maswali Millionea — design commission, August 2026

**STATUS: BRIEF — RECORD, NOT RULE.** The design rulebook is
[`docs/DESIGN_AUTHORITY.md`](../../DESIGN_AUTHORITY.md) and this file does not override a line of
it. Where anything here disagrees with the live repo or `src/app/globals.css`, **the live repo
wins.**

Companion to [`docs/MASWALI-MILLIONEA-IMPLEMENTATION.md`](../../MASWALI-MILLIONEA-IMPLEMENTATION.md)
— read its **§12** before commissioning anything, because §12 is the list of ways this particular
product tries to break this particular design system.

- ⭐ **THE KEY NAME IS `MASWALI-DESIGN-R1`.** That is what the round-1 delivery is called. When it
  arrives, the receiving session's instruction set is
  [`SESSION-PROMPT-MASWALI-DESIGN.md`](../../SESSION-PROMPT-MASWALI-DESIGN.md).
- **The commission folder is this one:** `docs/design-brief/maswali-2026-08/`
- **The handover lands in:** `docs/design-brief/maswali-2026-08/handover/`
  — one folder, everything Maswali-design inside it.
- ⛔ **NEVER EXTRACT THE OUTBOUND PACKAGE INSIDE THE REPO.** It carries a copy of
  `DESIGN_AUTHORITY.md`, and `npm run test:design-one-door` asserts **exactly one on disk** — an
  in-place unzip took the gate 4-red on 2026-08-28. The gate globs the disk, so `.gitignore` does
  not quiet it. Extract outside the repo.
- ⚠️ **The package is assembled from LIVE files at send time and never reused.** If it is older
  than `HEAD`, rebuild it. `.gitignore`'s *"OUTBOUND DESIGN COMMISSIONS"* section records why: a
  kept snapshot once taught an outside designer a rule `DESIGN_AUTHORITY.md` §M4 had overturned.

---

## 1 · Should we commission the design now? — ✅ ANSWERED AND DONE. **Yes, but three artboard sets, not thirty.**

> ⚪ **RECORD, NOT A LIVE QUESTION (2026-08-28).** The round was commissioned, sent and returned;
> the delivery is at [`handover/`](handover/). Four sets were asked for and four arrived. The
> argument below is kept because it is *why the boundary was drawn there* — and the boundary held:
> not one of §0's seven decisions had to be made to accept the work.

**The recommendation is a bounded commission, and the boundary is one rule:**

> ⭐ **Design only what §0 cannot change.**

§0 of the implementation doc holds seven decisions that are Ali's. Three of them change what is on
the screen, and one of those changes the single most important screen:

| Decision | What it changes visually |
|---|---|
| **D-2 — guarantee, or progressive?** | The hero. A *"TZS 20,000,000 GUARANTEED"* badge and a growing-pool ticker are **two different screens**, not two states of one. |
| **D-4 — what a VOID question does** | A line the slip must print *before* purchase. |
| **D-6 — the ticket cap** | A line at the entry CTA. |
| **D-1 — the licence class** | Whether any of it ships at all. |

Commissioning the full product design now means paying for a hero that has a **50% chance of being
the wrong screen**, and D-1 could void the lot.

**But four things are completely invariant to all seven decisions**, and three of them are the
hardest or highest-traffic surfaces in the feature. Those are worth commissioning today, and they
stay useful even if the product is descoped:

| # | Why it is invariant | Why it is worth doing now |
|---|---|---|
| **A · The slip (ballot)** | Ten questions × two controls is the same layout whatever the pool pays | **The hardest layout in the product.** Ten rows of Swahili prose at 360px with 44px targets and zero horizontal overflow. If this does not work, nothing else matters |
| **B · The loss receipt** | 99% of tickets lose regardless of the prize structure | **The highest-traffic screen in the feature.** More players will see 6/10 than will ever see a payout, and design law M7 governs it strictly |
| **C · Gold vs mono on the money figure** | The argument is about the ink, not the amount | ⭐ **This is the artboard that settles the fight.** See §2 |
| **D · The three tier glyphs** | Millionea / Supa / Mini exist in every variant of the product | The clearest pure-design job in the feature, and it merges straight into the existing 178-glyph set |

**Out of scope until §0 is answered:** the full hero composition, the admin console, the win-seal
amount, and every piece of acquisition art (that one waits on **D-1** — do not brief a marketing
asset for a product that may not be licensed).

---

## 2 · The one artboard that earns the whole commission

`DESIGN_AUTHORITY.md` §M3 and design law 3 say **gold means earned money — never projections,
never unrealised value.** The jackpot figure is the most *unearned* number 50pick would ever
display: a prize nobody has won, that may roll over for months.

So the ruling in §12.1 is **the jackpot figure is neutral mono ink, not gilt.**

⚠️ **Every jackpot in the world is gold, and management will push back.** Prose will not win that
argument. **A side-by-side artboard will** — the same screen twice, gilt and mono, at 360, with
the existing gold-bearing surfaces (a real payout, a settled win) visible for comparison so the
cost of spending gold here is *visible* rather than argued.

That is artboard set **C**, and it is the highest-value single thing in this commission.

---

## 3 · THE PROMPT

---

⭐ **The prompt lives in [`PROMPT.txt`](PROMPT.txt), and only there.** It is not duplicated
here — a brief that carries its own second copy of the prompt is exactly the two-definition-sites
defect this platform fixes by deletion rather than by synchronisation (`DESIGN_AUTHORITY.md` §0a).

Send `PROMPT.txt` verbatim. It is written to stand alone: Claude Design has no repo access, so
every constraint is stated in full and every figure in it is **measured from the live product**,
not estimated — the Swahili label budget (fit 1.75×, prove 2.25×), the real breakpoint ladder
(1024 dominates; 1024–1279 is the degraded band; 1920 has zero branches), the page-width tiers,
and the fact that the tier glyphs render at **14px**, not 24.

---

## 4 · What to share with Claude Design — the exact attachment list

Grouped by why it is needed. Paths are from the repo root.

### 4a · The rules — send all five

| File | Why |
|---|---|
| `docs/design-system/v3-2026-08-11-landing-discovery/tokens-LOCKED.css` | ⭐ **The single most important attachment.** Every approved token, extracted verbatim from production, with an existing instruction block saying every colour in a deliverable must reference it |
| `docs/DESIGN_AUTHORITY.md` | The rulebook — B1–B10, §M the material law, §L the label law |
| `docs/design-system/v2-2026-07-27/06-patterns-and-rules/RULES.md` | The sixteen laws in the designer's own wording, each with a worked *"broken looks like"* example |
| `docs/design-brief/handover-2026-08/LAWS.md` | The 85 testable invariants + the 4 licence conditions |
| `docs/MASWALI-MILLIONEA-IMPLEMENTATION.md` **§12 only** | The eleven collisions this product creates, already resolved — do not send the whole 1,600-line file, it will bury the design signal |

### 4b · The measurements — send both

| File | Why |
|---|---|
| `docs/design-brief/handover-2026-08/LANGUAGE-AND-CONTENT.md` | ⭐ **Essential for the slip.** The measured trilingual corpus — Swahili and Chinese expansion at median/p90/p95 per control type, plus real market questions to design against |
| `docs/design-brief/handover-2026-08/INVENTORY.md` | The measured system: token/family/scale/primitive/glyph counts, the real breakpoint ladder, and which band is the degraded one |

### 4c · Brand and logo — the mark, and where it comes from

⛔ **The mark is defined ONCE, in `src/lib/brand-mark.ts`, and every asset below is GENERATED
from it by `npm run build:brand`. Never hand-edit an output, and do not ask for a new mark.**

| Asset | Notes |
|---|---|
| `public/brand/mark-color.svg` · `mark-white.svg` · `mark-dark.svg` · `mark-simplified.svg` | The four sanctioned mark forms |
| `public/brand/lockup-horizontal.svg` · `lockup-stacked.svg` | The wordmark lockups |
| `docs/design-system/v2-2026-07-27/04-brand/brand.md` | The mark's construction, stated exactly: circle r50 on a 100 viewBox, divider tilted **−14° from vertical**, YES wedge upper-left `oklch(58% 0.16 152)`, NO wedge lower-right `oklch(60% 0.18 22)`, divider stroke 2.4, outer ring 2.0 in `oklch(20% 0.01 240)`, "50" in JetBrains Mono 700 at 30/100 of the diameter, letter-spacing −0.04em, `oklch(96% 0.005 240)` |
| `docs/design-system/v2-2026-07-27/04-brand/preview.html` | Renders the above |
| `public/icons/*` · `public/favicon.svg` | Icon family, for context only |
| `Ocean Logo/Logo/Logo.ai` | ⚠️ The **operator's** company mark (Ocean Entertainment Ltd), not the product's. Send only if the jackpot needs an operator endorsement lockup — otherwise leave it out, it will confuse the identity |

⛔ **Do not commission a Millionea logo.** Design law B9 forbids design that sits beside the
system, and M8 reserves identity motion and stage for the trademark. Millionea is a **product name
set in the existing type scale**, plus the three glyphs of set D. If it comes back with its own
logo file, its own hue or its own glow, it has left the system.

### 4d · Colour — do not send a palette, send the tokens

The palette is not a mood board here; it is a frozen token file.

- **One theme only:** deep royal indigo, **hue 268** (`--royal-50` … `--royal-900`, OKLCH).
  `--royal-*` is canonical; `--teal-*` is a **deprecated alias that held the royal hue and actively
  misled** — do not use it. `--aqua-*` (hue 195) is the real teal family and is a finishing pass at
  **≤ 8% coverage, never semantic**.
- **The betting pair, untouchable:** YES/UP emerald **hue 152**, NO/DOWN rose **hue 22**.
- **Gold:** the `--gilt-*` ramp, anchored on the measured trademark `#E3BC66` =
  `oklch(81.2% 0.1141 85.4)`, written at hue **84**. No bloom, no rays.
- **The mark's three delivered hexes**, which stay exact in chrome: `#1EA362` · `#B03A3E` ·
  `#E3BC66`.
- Everything else — surfaces, borders, the ink ramp, danger/success, focus ring, radii, the shadow
  ladder — comes from `tokens-LOCKED.css`. **Send the file; do not paraphrase it into a palette.**

### 4e · Reference screenshots — so the new screens look like the product

Send 4–6 real production frames at 360 so Claude Design matches the existing texture rather than
inventing one. Good candidates already on disk:

- `public/screenshots/markets-narrow.png` — the board
- `shots/poll/` and `shots/settle/` — a market and a settlement
- `shots/ud20/` — an Up & Down round (the closest existing product in shape)
- `shots/void/` — a void/refund surface, which is the tone the loss receipt must match
- `shots/bonus/` — a receipt-style surface

⚠️ Check any screenshot for real player data before sending it outside the repo — several
directories contain live QA frames.

### 4f · Do NOT send

- The whole `docs/` tree, or the full implementation doc — it buries the design signal.
- `src/app/globals.css` **in addition to** `tokens-LOCKED.css`. Sending both invites a mismatch;
  the locked file was extracted from it and is the one with the instruction block. If you send
  only one, send the locked file.
- Anything from `docs/design-system/v2-2026-07-27/` other than the two files named above — it is a
  frozen archive and is explicitly **record, not rule**.

---

## 5 · What "perfect" means when it comes back

The handover is accepted when all seven acceptance checks in the prompt pass. In practice, three
of them are where a handover actually fails:

1. **`TOKENS-USED.md` names a token that does not exist.** This is the one to check first, and it
   is mechanical — every name in that file must appear in `tokens-LOCKED.css`. A single invented
   colour means the deliverable cannot be built without amending a frozen system.
2. **The slip was designed in English and never tested in Swahili.** Swahili is the primary market
   and the sizing case. An English-only slip will look fine and break on contact.
3. **Gold appears on the jackpot figure** because it is what jackpots look like. That is set C's
   entire purpose — if the handover argues for it, it must argue in `DECISIONS.md`, with reasons,
   not simply ship it.

Everything else — layout, states, motion, responsive behaviour, contrast, copy structure — is then
implemented in code against the tokens, and held there by `test:contrast`, `test:type-scale`,
`test:ui-consistency`, `test:design-frozen` and the shot suite.
