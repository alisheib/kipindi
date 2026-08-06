# M — The material law (merge into DESIGN_AUTHORITY.md)

Added 2026-08-06 (Claude Design commission). The measured state it corrects:
79% of components had no light, 60% no elevation, 43 had neither and no motion.
The restraint law was right; answering it with flatness was the defect.

## M1 — One lamp

Light comes from high above the plane, tilted **−14°** — the mark's own axis
(`--m-tilt`). Every lit surface catches a soft, **even** 1px inner ring
(`--edge-lit`) carrying a 4% royal tint, never pure white — and never a
one-sided line; the direction of the light lives in
the wash (`--light-angle`, 166deg), speculars centre at x ≈ 42%, shadows fall
straight down. **The tilt lives in the light, never in the gravity.** There is
no second lamp; a surface lit from below or from the right is a bug.

## M2 — A surface picks a rung; it never composes a shadow

Five rungs: `flat → raised → float → modal → toast`
(`--elev-*` + `--wash-*` in tokens.css, `.mat-*` in motion.css). Component #134
takes a rung and is done. If it genuinely needs a sixth rung, the SYSTEM gains
one (token + spec, deliberately) — the component does not improvise. A `flat`
surface is a legitimate choice (form rows, pollers, containers): flat is a rung,
not a failure.

Each rung pairs with its arrival, and every arrival has its exit:
raised → `.m-in-lift` / `.m-out` · float → `.m-float-in` / `.m-float-out` ·
modal → `.m-dialog-in` or `.m-sheet-in` / `.m-out` (scrim: `.m-scrim`) ·
toast → `toast-anim` / `.m-out`. There is no third entrance.

## M3 — Gold is struck, and struck means earned

Gilt renders as satin metal — one calm `--gilt-metal` ramp **re-derived from
the trademark's #E3BC66** (one gold, five shadings: highlight 91 · body 79→72
· deep 65, all at hue 84 — designer R2), an even `--gilt-metal-edge` ring, one
soft `shimmer-gilt` specular sweep on hover. No bloom — radial glow dilutes
the financial texture. The
usage law is unchanged and now has teeth: **struck gold appears only where money
was earned** (payout, celebration, resolved seal). A decorative element wearing
`--gilt-metal` is a violation, not a style choice. Rays are banned; radiance is
a bloom, never strokes.

## M4 — Money is mono, and it never reflows

Every amount: `--font-mono`, `tabular-nums`, **never letter-spaced** — tracking
is for identifiers; money has weight, so it takes `.gilt-ink` (struck type) at
the earned peak. A motion on a changing number must not shift layout; verify
with tabular figures. (Flag: D-0's table listed `--font-display` for the
celebration amount — that contradicts "money is always mono"; mono wins here.
Say so if display was intended.)

## M5 — A glyph moves for a reason, and all 185 move the same way

Four primitives, applied as classes (`.g-settle`, `.g-nudge-up/down`, `.g-ring`,
`.g-swap`): arrival, directional emphasis, alert, state morph. Triggers are
mount, data change, or state change — **never hover**; icons respond, they do
not perform. Glyph #186 inherits by taking a class. A glyph with bespoke
keyframes is a violation.

## M6 — Every animation still works with motion off

Every `.mat-*`/`.g-*`/`.seal-*`/`.crest-*` state has a written
`prefers-reduced-motion` branch AND the `html.kp-reduce-motion` mirror: end
frames render, nothing invisible, the bloom rests at 0.35. A new animation
lands with its branch in the same change or it does not land.

## M7 — Wins get the seal; losses get the receipt

The celebration vocabulary (seal-impress, needle-sweep, mark-flip, gilt strike)
is EXCLUSIVE to a win. A loss renders as bookkeeping: the factual toast (plain
rung 4, no color), the settled card leading with the outcome, the needle
settling crisply against the position. No red ceremony, no drained counters,
no altered mark — a dramatized loss is punitive, dilutes the win, and is a
compliance liability. The asymmetry is the design (designer R2 Q5, confirmed).

## M8 — The mark performs; nothing else borrows its stage

Identity motion (mark-flip on the needle axis, .mark-pending's ±2° breath) is
reserved for the trademark. The mark's colours stay the delivered hexes
(#1EA362 / #B03A3E / #E3BC66) in chrome; on the seal it renders single-ink
relief. Clear space 0.25 × diameter is law even inside our own seal — 76px on
a 114px face is the ceiling, not a style choice. Surface gold is the trademark
re-derivation (M3); the two never drift because they share one source.
