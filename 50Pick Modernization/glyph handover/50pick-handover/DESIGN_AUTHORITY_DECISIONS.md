# 50pick — Design-Authority Decisions (Part B + C)

> Companion to **`Glyph Pack & Decisions.html`** (rendered on the royal canvas) and
> **`glyphs-additions.tsx`** (Part A paste targets). This file is the plain-text record
> for engineering to action the unify refactors. Every value is grounded in `kit50.css`
> and the kit invariants — nothing new is invented.

---

## PART B — canonical calls

### B1 · Canonical elevated-surface primitive  ✓ decided
Collapse `.mcardp`, `.glass-panel`, `<Card>`, `.tpanel` into **one** `.surface` primitive.
The other three become fill-only modifiers: `.surface--market`, `.surface--panel`, `.surface--inset`.

| Property         | Rest                                            | Hover                          |
|------------------|-------------------------------------------------|--------------------------------|
| Background       | `var(--bg-elevated)`                            | unchanged                      |
| Border           | `1px var(--border)`                             | `1px var(--brand-500)`         |
| Inner light-edge | `inset 0 1px 0 oklch(98% .012 268 / .08)`       | `…/ .10`                       |
| Shadow           | `0 2px 8px oklch(8% .08 268 / .35)`             | `0 14px 34px oklch(8% .1 268 / .5)` |
| Lift             | none                                            | `translateY(-3px)`             |
| Glow             | none                                            | `0 0 22px var(--brand-soft)`   |
| Radius           | `var(--r-lg)` = 16px                            | —                              |
| Transition       | `200ms var(--ease-stage)`                       | —                              |

- **Flat fill is canonical.** The only modifier allowed a gradient is `.surface--market`,
  which keeps its subtle **gilt-bloom** on hover (gold shadow ≤ 18% alpha) — that's the one
  place gold-on-hover is sanctioned. All other surfaces are flat (cleaner; cheaper to composite).
- Hover frame is **brand-blue** (`--brand-500`), per the locked card-hover rule. Gold is never a hover frame except the market gilt-bloom.

### B2 · Single authoritative spacing + radius scale  ✓ decided
Strict **4px base**, token index = step. Align **both** CSS tokens and Tailwind to this
(Tailwind is the one currently wrong → it changes to match CSS).

**Spacing** (`--sp-1 … --sp-16`): `4 · 8 · 12 · 16 · 20 · 24 · 28 · 32 · 36 · 40 · 44 · 48 · 52 · 56 · 60 · 64`
**Radius**: `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · pill 999`

- **Rule:** token index × 4 = px (spacing). No more bare Tailwind integers that don't map.
- **Buttons** use `r-sm = 8px` (matches the existing button family).
- `--r-phone: 30px` stays as a one-off device token, outside the scale.

### B3 · Light mode  ✓ decided — **KILL IT**
Single dark-royal theme by invariant. The gold budget, YES/NO emerald/rose semantics and every
glow value are tuned for a dark canvas; a light theme would need all of it re-derived for no
product reason.

- Delete the dormant theme engine, the `data-theme` switch, and all unused light tokens.
- Drop any `@media (prefers-color-scheme)` branches — do not auto-flip.
- Keep `color-scheme: dark` on `:root` so native controls/scrollbars render dark.

### B4 · Motion tiers for mid-tier Android  ✓ decided
Refinement of the default: **reduced** stops everything decorative but keeps the **one** loop
that carries live meaning (status-dot pulse) in a cheap opacity-only form. **minimal** stops all.

| Ambient loop                       | `reduced`                              | `minimal`        |
|------------------------------------|----------------------------------------|------------------|
| Ticker marquee                     | stop → static / tap-advance            | stop             |
| Probability-bar resolved shimmer   | stop → flat gold fill                  | stop             |
| Gold-shimmer / pulse               | stop                                   | stop             |
| Hero dial breathe                  | stop                                   | stop             |
| Progress light-sweep               | stop                                   | stop             |
| **Status-dot pulse (live)**        | **keep** — opacity only, no box-shadow | stop → solid dot |

Functional transitions (route-in, sheet open, bar reveal, hover/press) stay at all tiers except
`minimal`. This matches the existing `[data-motion]` CSS — only the status-dot needs a `reduced`
carve-out added.

### B5 · Gold budget — proposal upvote  ✓ decided — **MOVE OFF GOLD**
Gold is sacred (invariant #2: earned / resolved / payout / needle only). Upvote is a community
endorsement, not a payout moment.

- **Active / upvoted →** aqua chrome `--accent-400` (hue 195) — already the community/navigational
  value accent (VIEW ALL, links, live label), so it reads as "value" without spending gold.
- **Rest →** `--text-subtle` outline; count in mono.
- Brand-blue is the only fallback if aqua ever clashes in-context, but **aqua is the call**.

### B6 · Chips  ✓ decided — **static on mount, pulse on in-place change**
- **No** entrance animation on list render (avoids dozens of chips bouncing in long lists).
- **Yes** to a single state-change `pop` when a chip mutates in place (`live → resolved`,
  `soon → live`) at `--ease-micro`, gated to `data-motion: full` only.
- Honors reduced/minimal automatically.

---

## PART C — polish

- **Empty-state line-arts → confirmed + delivered.** Set of three (markets / positions /
  leaderboard), drawn in the kit line family at a 64-unit viewBox. See `emptyMarkets`,
  `emptyPositions`, `emptyLeaderboard` in `glyphs-additions.tsx`. Center, single-color
  `--text-subtle`.
- **Win-celebration → final, no change.** Calm gilt-ray + rolling mono counter is correct and
  on-invariant (#7 — no confetti/chips/dice). Don't reintroduce confetti.
- **Surfaces still reading "classic" — flagged:**
  - The 4-way surface fragmentation (B1) is the biggest tell — collapse fixes hover/elevation platform-wide.
  - Upvote-gold (B5) reads classic against the gold budget — the aqua move fixes it.
  - Any remaining lucide 2.0-stroke icons next to the 1.9 kit glyphs read subtly heavier — Part A closes the gap (swap player surfaces first, then admin).
  - Watch for bare Tailwind radius/spacing integers that don't map to the B2 scale — they produce the off-by-a-few-px corners that read "generic".

---

## How to apply

1. **Part A** — paste the entries from `glyphs-additions.tsx` into the `I` object in
   `src/components/ui/glyphs.tsx`. Add the `GL` (64-viewBox) wrapper for the three empty-states.
   Then swap `lucide` → `I.<key>` everywhere — player surfaces first, then admin.
2. **Part B** — run the unify refactors per the calls above (one `.surface` primitive, the 4px
   scale on both CSS + Tailwind, delete the light engine, add the status-dot `reduced` carve-out,
   move upvote to aqua, wire the chip in-place pulse).
3. Validate against `VALIDATION_CHECKLIST.md` (sections A–O).
