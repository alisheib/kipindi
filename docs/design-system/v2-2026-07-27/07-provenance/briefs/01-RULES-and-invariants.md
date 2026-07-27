# Brand & UX invariants (must follow)

These live in the team's head, not the code. Breaking any of them makes the output
read as off-brand or "AI-generated." Follow them exactly.

## Color
- **Hue 268 = royal indigo** is the brand canvas. NOTE: any token named `teal-*` is a
  backward-compat ALIAS for royal indigo — it is NOT teal. Do not render teal.
- **Gold / gilt (~hue 80)** is a *soloist*: reserved for **earned-money moments only**
  (settlement, winnings, confirm-money CTA). Never as general decoration. One gold
  moment per screen at most.
- **YES = green, NO = red** — ONLY inside actual betting actions (place/confirm a side).
  Never a green/red navigation button; nav CTAs are gold.
- **Aqua (~hue 195)** = finishing pass only: live-ticker glow, sparkline, "new" pip,
  focus-ring tint. Keep ≤ ~8% of surface. Never a chip/button/semantic color.
- **Claret (~hue 15)** = heritage / danger editorial only (never near NO-rose).

## Type
- Headings = **Sora** (`--font-display`). Body = **Inter** (`--font-body`).
  Numbers / labels / mono = **JetBrains Mono** (`--font-mono`, tabular-nums).
- Every font stack must keep the CJK system-font fallback (we ship en/sw/zh; no heavy
  CJK webfont — Tanzanian mobile data).

## Signature
- The gilt **Needle** (the tilting needle crossing the logo rim) is the brand signature —
  the same object as the TippingBar and the conviction dial. Lean into that motif;
  don't invent unrelated decorative shapes.

## Content
- **No emojis** in UI copy or as icons. Use line-art SVG glyphs (see `current-state/`).
- Money + compliance surfaces must be **honest**: never show a fabricated number or a
  control with no real action behind it. Show only what real data backs.

## Motion
- Any animation must be **perfect**: real easing/physics (not linear tweens), correct
  weight, no jank, and it must honor `prefers-reduced-motion`. Weak/basic motion is
  worse than none. If it can't be perfect, don't animate it.

## Layout
- Mobile-first (design at 390px, then 1440px desktop). Content must never cause
  horizontal page scroll. Widths follow content type (dense boards wide; reading/forms
  narrower).
