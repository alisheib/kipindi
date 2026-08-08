# 11 · The material system — ⭐ §A, §B and §C are MERGED; the law is live

**Claude Design commission, delivered 2026-08-06. Merged into `src/` on 2026-08-06/07
(sessions 34–35).** This folder is the **reference and the provenance**.

> ## ⭐ STATUS, 2026-08-07 — read this before anything else in the folder
>
> | section | where it lives now | state |
> |---|---|---|
> | **§A** tokens | `src/app/globals.css` `:root` | ✅ merged · **deleted from `material.css`** |
> | **§B** 12 keyframes | `src/app/globals.css`, beside each family | ✅ merged · **deleted** |
> | **§C** 29 utilities | `src/app/motion.css` | ✅ merged · **deleted** |
> | **§D** migration map | ✅ struck through 2026-08-08 — kp-rise and odds-flash took their rungs; the two standing rules (nearest-rung-down, the frozen ambient list) moved to `src/app/motion.css`'s header | ✅ **`material.css` is DELETED**, per its own instruction |
> | **`EXTEND.md`** M1–M8 | `docs/DESIGN_AUTHORITY.md` §M | ✅ merged 2026-08-07 (ATOM J) · **file deleted** |
>
> ℹ️ **2026-08-08 — Ali re-uploaded the delivery zip ("Material system design review.zip").
> Verified byte-for-byte identical to the original delivery** (every file matches the repo copy
> or commit `faf386a4`; CSS differences were CRLF-only). It contains **no new design content and
> no React/TSX drop-ins** — open item 1 below stays open. The one thing it restored is the
> pristine `material.css`, now filed at `spec/uploads/material-as-delivered.css` so the spec
> page renders the delivery again (its stylesheet link had gone inert when §A/§B/§C were
> deleted from the mergeable copy — exactly as the provenance note predicted). The one thing
> it did NOT contain — the offered React drop-ins — was built in-house on 2026-08-08 (open
> item 1 below).
>
> ⛔ **THE MERGEABLE `material.css` IS GONE (2026-08-08), AND THAT IS ITS OWN INSTRUCTION
> COMPLETED, NOT TIDYING.** Do not restore it from git to "see what was delivered" — the
> frozen delivery is `spec/uploads/material-as-delivered.css`, and in **four** places what
> shipped is deliberately *not* what it says, each recorded AT THE SHIPPED LINE with the
> measurement behind it: **E-124** (the gold anchor is mis-converted — chroma understated
> 17%; see `--gilt-metal`'s comment, globals.css) · **E-130** (two washes would have broken
> AA; the wash tokens' comment) · **E-129** (`outline: none` would have stripped the money
> CTA's focus ring; `.gilt-metal:focus-visible`, motion.css) · the `shimmer-gilt` two-layer
> paint bug (the keyframe's comment, globals.css).
>
> ⚠️ **THE LAW IS MERGED; THE ADOPTION IS UNDER WAY.** Measured 2026-08-07: **2 of 31 §C
> utility classes are taken by a component.** Three surfaces had picked a rung — the market
> and Up & Down cards (rung 1, via the tokens at `.mcardp`'s own rule), the kit `Modal`
> (rung 3, `.mat-modal`), and the money-in CTA (`.gilt-metal`) — and seven one-sided lamps
> in `.tsx` inline styles became even rings (**E-131**). The toast took rung 4 + the five
> tints (DA-1/DS-1), the result-modal crest composes the tint recipe (DS-3), and
> **2026-08-08 the CELEBRATION VOCABULARY gained its consumer**: the struck seal shipped in
> `win-celebration.tsx` (`.seal-arrive`, `.seal-sheen`, `.seal-mark-flip`, `.needle-sweep`,
> `.g-settle` cascade, `.gilt-ink`, `.gilt-metal` CTA — record in
> `../07-provenance/CHANGELOG.md`). **Still waiting for a consumer:** `.seal-commit`
> (seal-on-bet-commit), `.g-nudge-*`/`.g-ring`/`.g-swap*` (wired into the kit `GlyphSwap`
> but adoption across surfaces is partial), `.mark-flip-i`/`.mark-pending`, `.crest-arrive`/
> `.crest-ring-reveal`, `.mat-inset`, and the flat/raised/float tints outside the toast.
> **That is the honest measure of what is left.**

⛔ **Do not import from this folder at runtime.** Nothing here is a stylesheet the app loads —
the delivery's sections were merged into `src/` and the mergeable copy deleted section by
section as each landed, exactly as planned: a copy that survives beside the merged original is
a second definition of one truth, the most expensive defect class this repo has. What remains
in this folder is provenance only.

---

## What was commissioned, and why

The measured state it corrects (`scripts/ui-material-audit.mjs`, before-picture in
`docs/design-brief/AUDIT.txt`): **79% of components had no light · 60% no elevation · 43 had
neither and no motion.** The diagnosis was not that the motion was wrong — the motion vocabulary
was already disciplined. **It is that nothing had a light source.** The restraint law was right;
answering it with *flatness* rather than with *better material* was the defect.

⚠️ **The diagnosis is right; the per-component scoring is not evidence.** That audit greps each
component's own `.tsx` **source text**, so it cannot see material that lives in a CSS class — and
`markets/market-card.tsx` is scored all-three-absent at the top of the list while `.mcardp` already
carries a cast, a lit edge, a border and a draw-in. **Read `INTAKE.md` §3b check 3 before quoting
any of these numbers as a target** — E-116.

---

## The files

| file | what it is | fate |
|---|---|---|
| `material.css` | ✅ **DELETED 2026-08-08** — §A/§B/§C had merged (2026-08-07) and §D's last line was struck (kp-rise → `--t-move --m-settle`, odds-flash → `--t-stage --m-leave`). The merge record lives in `../07-provenance/CHANGELOG.md`; the four departures are documented at each token's own line in `src/`; §D's two standing rules moved to `src/app/motion.css` | gone, as designed |
| `EXTEND.md` | **M1–M8, the material law**, written to merge into `docs/DESIGN_AUTHORITY.md` | ✅ **merged and deleted** (ATOM J, 2026-08-07) — the law lives at `DESIGN_AUTHORITY.md` §M, written with the THREE reduced-motion gates (E-125) |
| `MANIFEST.md` | the designer's own decisions of record + 8 open items | **keep** — provenance |
| `DESIGNER-QUESTIONS.md`, `-R2.md` | the questions we asked and the answers that settled them | **keep** — this is *why* each decision is what it is |
| `spec/spec.html` | the live spec — open it in a browser. Self-contained | **keep** — provenance |
| `spec/support.js`, `spec/uploads/*.css` | what the spec page needs to render | **keep**, ⚠️ see below |
| `spec/uploads/material-as-delivered.css` | the **pristine delivered `material.css`**, byte-identical to commit `faf386a4` (verified 2026-08-08 against Ali's re-upload of the delivery zip). Exists so the spec keeps RENDERING the delivery after §A/§B/§C were deleted from the mergeable `material.css` — the spec's stylesheet link points here permanently | **keep, frozen** — ⛔ never edit, never merge from it; the mergeable source was `material.css` and its merged sections are already law |

⚠️ **`spec/uploads/tokens.css` and `motion.css` are a SNAPSHOT of *our own* files as they stood
on 2026-08-06**, sent out with the brief so the spec could render against real values.
⛔ **They are not a source of truth and must never be copied back into `src/`.** The live files
are `src/app/globals.css` and `src/app/motion.css`. If they ever disagree, the live files win and
the snapshot is simply old.

---

## The merge map — where each section goes

`material.css` is written so a section moves whole. **Tokens first: everything inherits.**

> 🔴 **CORRECTED 2026-08-06 at acceptance. `src/app/law/` DOES NOT EXIST.** The delivery was
> briefed against `law/tokens.css` · `law/keyframes.css` · `law/motion.css` because that is how
> the outbound package was *split* for the designer — those three files live in `design-brief/law/`
> at the repo root, which is **gitignored** (`.gitignore:127`) and referenced by no build input.
> The real destinations are below. `INTAKE.md` §2 already named them correctly; this table did not.
> ⛔ Never merge into, diff against, or import `design-brief/law/*`: the `keyframes.css` extract is
> **brace-unbalanced** (194 `{` vs 195 `}` — the extractor dropped an opening
> `@media (prefers-reduced-motion: reduce) {`), so its calm branches sit at top level and would
> kill press/vote/streak/seal motion outright if it were ever wired in.

| section | destination | gate after |
|---|---|---|
| **§A** tokens (light, wash, 5 elevation rungs, one gold) | **`src/app/globals.css`**, in the `:root` at **line 21**, beside the `--shadow-*` ladder it repairs — **one definition site** | `test:tokens` · `test:contrast` · `test:design-frozen` |
| **§B** 12 keyframes (glyph ×6, mark-flip, seal-recoil, needle-sweep, needle-settle, mark-pending-tilt, crest-settle) | **`src/app/globals.css`**, beside each one's family — ⛔ check the **67** that already exist first (44 in `globals.css` + 14 in `motion.css` + 8 in `state-tokens.css` + 1 in `needle.css`); **none of the 12 duplicates a name** | `tsc` + `build` + `test:motion` |
| **§C** 29 utilities (`.mat-*`, `.g-*`, `.gilt-*`, `.mark-*`, `.seal-*`, `.crest-*`, `.needle-*`) | **`src/app/motion.css`**, beside the `.m-*` family. ⚠️ `motion.css` is imported **last** (`layout.tsx:12`), so at equal specificity it outranks everything in `globals.css` | `test:motion-ladder` (ratchet is at **0** — keep it there) |
| **§D** migration map | ⛔ **comment only — delete it once the migration it maps is done** | — |
| `EXTEND.md` M1–M8 | `docs/DESIGN_AUTHORITY.md` as section M, in the authority's own voice | `test:integrity` |

⭐ **The proof it worked is that the ratchets SHRINK.** `test:design-frozen` holds **45** files
carrying inline design values today. Several stop needing the exemption once §A lands. **A merge
that leaves it at 45 decorated rather than replaced** — that is `INTAKE.md` §3b, and it is the
part most likely to be skipped.

---

## The eight laws, in one line each (full text: `docs/DESIGN_AUTHORITY.md` §M)

| | |
|---|---|
| **M1** | **One lamp**, high and tilted **−14°** — the mark's own axis. Even 1px inner ring, 4% royal tint, never pure white, never one-sided. **The tilt lives in the light, never in the gravity.** A surface lit from below or the right is a bug |
| **M2** | **A surface picks a rung; it never composes a shadow.** `flat → raised → float → modal → toast`. `flat` is a legitimate rung, not a failure. Every arrival has its exit; there is no third entrance |
| **M3** | **Gold is struck, and struck means earned.** One satin ramp re-derived from the trademark's `#E3BC66`. **No bloom — radial glow dilutes the financial texture. Rays are banned.** A decorative element wearing `--gilt-metal` is a violation |
| **M4** | **Money is mono and never reflows** — `tabular-nums`, never letter-spaced. Tracking is for identifiers; money has weight |
| **M5** | **A glyph moves for a reason, and all 185 move the same way.** Four primitives, triggered by mount/data/state — **never hover.** Icons respond, they do not perform |
| **M6** | **Every animation still works with motion off** — a written `prefers-reduced-motion` branch *and* the `html.kp-reduce-motion` mirror, or it does not land |
| **M7** | **Wins get the seal; losses get the receipt.** The celebration vocabulary is EXCLUSIVE to a win. No red ceremony, no drained counters, no altered mark — a dramatised loss is punitive and a compliance liability. **The asymmetry is the design** |
| **M8** | **The mark performs; nothing else borrows its stage.** Identity motion is reserved for the trademark. Clear space `0.25 × diameter` is law even inside our own seal |

---

## ✅ ACCEPTANCE — run 2026-08-06 against `INTAKE.md` §1. **The delivery is ACCEPTED.**

| check (INTAKE §1) | verdict |
|---|---|
| every animation names its easing + duration token | ⚠️ **pass with exceptions** — the *durations* are all `var(--t-*)` and the *easings* all `var(--m-*)`. Five raw ms survive, and all five are **choreography offsets, not durations**: `seal-recoil 60ms`, `.needle-sweep`'s `600ms` delay, `.needle-settle-loss`'s `400ms`, `.seal-sheen`'s `+500ms`, and `.mark-pending`'s `1240ms` (a **deliberate** ambient loop, §D). The shipped file already carries the same shape — `.m-aura 1240ms`, `.m-skeleton 1400ms`. Not a rejection |
| every animation has a **written** reduced-motion branch | ⚠️ **pass, but against TWO gates where this product has THREE** — see item 7 below. ✅ The branches are written out rather than described (`material.css:261-280`) and cover `prefers-reduced-motion` + `html.kp-reduce-motion`. ⛔ **Neither covers `data-motion="reduced"`, the low-end-Android tier — our target device.** Closed in-house 2026-08-07 (**E-125**), and `npm run test:reduce-motion` now fails on any `infinite` animation that has no entry in that tier's list, so §C's `.mark-pending` cannot land without one |
| nothing animates a layout property | ✅ transform / opacity / filter / box-shadow / `translate` only. `.gilt-metal` also moves `background-position` (paint, not layout) — outside D-1.6's named list, inside its intent |
| colours are `oklch()` | ✅ zero hex, zero `rgb()` in `material.css` |
| no new runtime dependency | ✅ CSS only |
| no public prop changes | ✅ CSS only |
| an elevation ladder as tokens | ✅ and better than asked — see below |
| a "how to extend this" note | ✅ `EXTEND.md`, M1–M8, in the authority's voice |

**⭐ The ladder is not a second ladder — it is ours, repaired.** `--elev-raised`'s cast is
**byte-identical** to the shipped `--shadow-card`; `--elev-modal` and `--elev-float` likewise
contain `--shadow-modal`'s and `--shadow-overlay`'s casts verbatim. The only delta at every rung
is that the banned one-sided `inset 0 1px 0` highlight is replaced by an **even** ring. That is
M1 enforced against our own file, where `inset 0 1px 0` appears **15 times**.

### ⭐ D-6.6 — the acceptance test that matters, applied to `ui/callout.tsx`

Applied the system to a component the designer never saw, **from `EXTEND.md` alone**.

- **M2 answers the surface cleanly.** A callout is content-plane furniture → **rung 0, flat**, and
  M2 blesses flat explicitly (*"form rows, pollers, containers: flat is a rung, not a failure"*).
- **But the tint utilities are welded to rung 4.** `.mat-edge-warn` is
  `inset ring + var(--elev-toast)` — and its own comment names *"toasts / **callouts**"*. Applying
  it to a Callout puts a toast-level cast under an inline box. **There is no rung-independent tint
  recipe, so a tinted-but-flat surface cannot be expressed.** That is a guess, and D-6.6 says a
  guess is the thing to send back.

**Verdict: D-3 covers the six families in the spec's §8 coverage table and does not cover a
tinted surface off it.** One missing recipe, repairable in-house in one rule (a `.mat-tint-*`
ring-only modifier that composes with *any* rung). **This is the one item to send back**;
everything else in the delivery is sound and self-consistent.

### 🔴 SEVEN things in the delivery that are factually wrong — and the seventh is the gold itself

> **7. `#E3BC66` IS NOT `oklch(79% 0.095 84)`. It is `oklch(81.2% 0.1141 85.4)`.**
> §A3 and M3 both anchor the whole "one gold" re-derivation on that conversion —
> *"every shade re-derived from the trademark's #E3BC66 (oklch ≈ 79% · 0.095 · 84)
> … Ladder: highlight 91 · body 79→72 · deep 65"*. Measured 2026-08-06 with the
> Ottosson matrices and **proven by round-trip**: `oklch(81.20% 0.1141 85.38)`
> converts back to `#E3BC66` exactly, while the delivery's own figure converts to
> **`#D7B672`** — a visibly duller, greyer gold.
> ⛔ **The chroma is understated by 17%.** So landing §A3's ladder verbatim would
> make surface gold *less saturated than the trademark it exists to match*, which
> is the precise inverse of M3's stated goal (*"surface gold and brand gold are the
> same metal"*). The principle is right and the number is wrong.
> ⭐ **ATOM 2b must anchor on the MEASURED value**, and the ladder's chroma should
> be scaled to it (≈ ×1.20 on the delivery's figures) rather than pasted. The hue
> is close enough to keep at **84** — the measured 85.4 is within a degree and a
> half, and 84 is what M3, §A3, `--gilt-metal`, `--gilt-ink` and `--gilt-reeding`
> all name; **one hue written once beats a decimal nobody can defend.**
> ⚠️ For reference, what ships today at the same lightness: `--gold-400`
> `oklch(80% 0.14 78)` = `#EFB146` and `--gilt` `oklch(86% 0.13 82)` = `#FBC865` —
> both MORE saturated than the trademark, which is the "two metals" M3 exists to
> end. The re-derivation still lowers chroma; it lowers it to **0.114**, not 0.095.

### ⚠️ The other six things in the delivery that are factually wrong about our files

Recorded so nobody pastes past them. None changes the verdict.

> **7b. ⛔ AND THE REDUCED-MOTION SECTION IS WRITTEN FOR TWO GATES, NOT THREE** — added
> 2026-08-07 (**E-125**), because it is the one item that would have forced every
> animation atom to be re-opened. `theme-provider.tsx:36-46` writes
> `data-motion="reduced"` whenever its own `detectLowEnd()` fires (≤4 cores, ≤4GB RAM,
> or Save-Data) and toggles `html.kp-reduce-motion` **only** on the user's own setting.
> So a **low-end Android player who has changed nothing** gets neither of
> `material.css:261-280`'s two branches. That tier is a THROTTLE, not a clamp — full
> durations, ambient loops off — and its list is hand-written in `globals.css` §6.
> ⭐ **What this means for §C when it lands:** `.mark-pending` (`mark-pending-tilt`,
> 1240ms `infinite`) needs an entry in that list, and `npm run test:reduce-motion`
> rule 2.1 will fail until it has one. `.seal-sheen` and `.gilt-metal:hover` are
> single-shot and do not.
> ⚠️ Also measured while closing it: the clamp the delivery relies on **never zeroed
> `animation-delay`**, so `.needle-sweep`'s 600ms delay and `.crest-ring-reveal`'s
> 340ms would each have held their FIRST frame — `rotate(-26deg)` and `opacity: 0` —
> for the whole delay on a reduce-motion user (**E-126**). Fixed at source; §C's
> delays are now safe to land as written.

1. **`--t-move` is 340ms, not 430ms** (`motion.css:35`). §C's comment costs the mark-flip at 430.
   `--t-stage` is 520, `--t-max` 620. The flip lands snappier than the designer priced it.
2. **`--bg` was 13.5%, not 10%.** §A1 justifies "10%→6.5%"; the snapshot they were *sent*
   (`spec/uploads/tokens.css:137`) reads `oklch(13.5% 0.130 268)`. So the proposed override is
   −7pt lightness **and** chroma halved 0.130→0.05. **Ali's call, taken 2026-08-06: lightness
   only — deepen the field, keep the royal chroma.**
3. **"the 33 that already exist"** — there are **67** live keyframe names, not 33. And §B's own
   header says *"Six new names"* while §B defines **twelve**.
4. **`--m-pivot` is reserved.** `motion.css:28` says *"needle & dials ONLY"*; `.needle-sweep` and
   `.needle-settle-loss` use `--m-settle` on the needle. We obey our own law and use `--m-pivot`.
5. 🔴 **`shimmer-gilt` takes ONE value here and TWO on the spec page — and `.gilt-metal` needs
   two.** The shipped keyframe is `globals.css:1490`:
   `0% { background-position: -200% 0 } 100% { background-position: 200% 0 }` — a **single**
   position, which CSS applies to **every** background layer. `.gilt-metal` declares two layers
   (the sheen *and* the metal ramp) at two sizes. So on hover the gold ramp itself would translate
   ±200% of its own box: **the metal slides off the button and back**, instead of one band of
   light crossing a still surface. ⭐ The designer's own demo shim in `spec/spec.html` writes the
   **two-value** form (`-200% 0, 0 0`), so the spec renders correctly and the product would not —
   the delivery reused a name whose live definition it had not read. Fix with a two-layer
   keyframe or a `::after` sheen; do **not** edit `shimmer-gilt` in place without checking its
   other consumers. ⛔ No gate can see this: it is a paint bug inside a hover animation.
6. **`.seal-arrive` writes a raw `60ms`.** `--t-flick` is 90ms and the motion ladder has no rung
   below it. `test:motion-ladder` cannot catch it — the gate scans `src/components/**.tsx` only
   and is blind to `.css` — so this is discipline, not enforcement. The recoil is a landing kick,
   not travel; take `--t-flick`, or add the exemption deliberately and say why.
   ⚠️ Related: the delivery also declares `--gilt-bloom` while MANIFEST, M3 and §C's own seal
   comment all say **the bloom is REMOVED**. Landing §A verbatim ships a zero-consumer token plus
   two comments describing behaviour that does not exist — and it mixes `--gold-400` (hue 78)
   into a ramp the same file insists is hue 84.

## Open items the designer flagged — carried here so they are not lost

1. ✅ **CLOSED 2026-08-08 — built in-house.** The offered React/TSX drop-ins (win-celebration,
   toast, market-card) never arrived; the toast and market-card had already adopted the system
   directly, and the win celebration was rebuilt in place from `spec/spec.html` §3
   (`markets/win-celebration.tsx` — the struck seal, the cascade, the strike, the flip).
   Nothing is owed on this item any more.
2. **Icon restyle pass** across the glyph set (stroke 2.0, 2px live-area margin, 0.75px join radius). *Needs the set sent over.* ⚠️ The set is **178 unique keys**, not 185 (180 definitions, 2 shadowed by `Iplus`); **107** are referenced and ~71 are dead.
3. ✅ Loss needle-settle — **delivered** (`needle-settle` + `.needle-settle-loss`).
4. ✅ **RESOLVED 2026-08-06 — `--shadow-card-top` DOES already exist**, `globals.css:398`
   (`inset 0 1px 0 oklch(98% 0.01 268 / 0.08)`), bridged at `tailwind.config.ts:218`, with a
   comment naming it the one definition site. **§A2's alias must be deleted when §A lands** — and
   it is not merely redundant: `--shadow-*` is a **guarded** family, so a second definition site is
   a hard `test:tokens` failure. ⭐ The extract sent out was lossy and simply stopped before it.
   ⚠️ Note the existing *value* is precisely the one-sided line **M1 bans**, so the token keeps its
   name and definition site and takes the even ring as its value.
5. ✅ **RESOLVED 2026-08-06 — D-0's celebration font row now reads `--font-mono`.** M4 wins:
   money is mono, tabular, never letter-spaced. Amended at source in `docs/design-brief/README.md`
   §D-0 and restated in `DESIGN_AUTHORITY.md` section M. The table had been contradicting the ⛔
   line printed directly beneath it.
6. ✅ **DONE for the celebration, 2026-08-08** — `npm run qa:seal` proves the struck seal at
   360/768/1280 × EN/SW/ZH + a reduced-motion cell (94 checks), each language witnessed by its
   own headline off `<html lang>`. Toasts, cards and menus were proven trilingually by the
   Session-B sweep (40 shots, MASTER-PLAN "Last updated" record).
7. **`m-axis-sweep` duplication** — the one place `−14°` is written twice, because `skewX()` cannot take a custom property everywhere. **If the axis changes, change both** (`DESIGN_AUTHORITY` B1a).
   ⚠️ **It is worse than "written twice": `--m-tilt` currently has ZERO consumers.** `m-axis-sweep`
   hard-codes `-14deg` four lines below the token, `TippingBar` computes `lean * 14` in TS
   (`brand.tsx:254`) and `ConfidenceDial` uses a different constant entirely, `* 22`
   (`brand.tsx:334`). **Three tilts and a token nothing reads.** Reconciling them belongs to the
   identity atom, not to a token rename.
8. ✅ **DECIDED 2026-08-06 — the crest chief band ships at `0.26`**, the designer's own
   recommendation, demoed on the spec page at 0.16 / 0.26 / 0.38. It keeps the chief legible at
   20px without shouting at 80px. ⛔ E-111's sub-pixel geometry is **not** re-opened — this is the
   opacity only, on the line E-111 deliberately left to this pass.

---

## Related

- `docs/design-brief/INTAKE.md` — the integration playbook: §1 acceptance, §2 placement, §3 order, **§3b what DIES when each piece lands**, §3c drive it on production, §8 what changed under the brief
- `docs/design-brief/CURRENT-STATE.md` — the critique this answers · `AUDIT.txt` — the before-picture
- `docs/DESIGN_AUTHORITY.md` **B1a** — the mark, the measured axis, and why the trademark's gold never moves
- `../08-motion/` — the existing motion system this extends · `../09-needle/` — the needle it borrows
