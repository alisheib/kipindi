# 50pick · Design Request — Card System + Identity (next round)

**From:** 50pick / Kipindi product team
**To:** Claude Design
**What you have:** this entire folder *is* our live UI kit — `tokens/globals.css`
(the system), `kit/` (shared primitives), and `features/` (every surface).
**Design INTO this.** No new palettes, fonts, radii, shadow scales, or icon
libraries — extend what's here.

> ⚠️ **Hard rule (unchanged):** stay 100% on our tokens + components. We are not
> rebranding and we are **not copying Polymarket**. We're studying it for
> *information-design ideas* only, then expressing them in our own heraldic
> gilt-on-royal signature. When in doubt, reuse a token or an existing component.

---

## Why this round
Our binary market card is now strong (number-as-hero, TippingBar, YES/NO,
landscape, aligned). But two gaps stop us from being a *complete, crisp* market
board, and one opportunity would deepen our signature:

1. **We only do binary (YES/NO) markets.** Real prediction markets are often
   **multi-outcome** — "who wins the election?", "which team tops the league?".
   Polymarket handles these as a ranked list of outcomes, each with its own
   probability + buy controls (see the reference image: *Presidential Election
   Winner*, *Balance of Power*). We have no card for this. **This is the #1 ask.**
2. **One card density only.** A serious board needs a **card *system*** — the
   same market readable as a hero card, a multi-outcome card, and a compact
   list-row for dense scanning — all visually one family.
3. **Identity is thin.** We just shipped generated avatars (heraldic gradient +
   gilt ring). There's room to make **identity a signature** — generative crests
   / sigils — that no competitor has.

---

## What we want you to art-direct

### Request A — The market-card *system* (priority)
Design one coherent family with three members, all on our tokens + reusing
`TippingBar`, `SignalPip`, chips, and the move-chip:

1. **Binary card** — refine what we have (`features/markets/market-card.tsx`).
   Keep title-left / YES%-right, the thin TippingBar, YES/NO buttons, the fixed
   3-line reserve so bars align. Tighten only if it makes it crisper.
2. **Multi-outcome card** *(new — the big one)* — a market with N outcomes
   (2–6 shown, "+more"). Each row: outcome label (EN · SW), its probability, a
   compact YES/NO (or "back") control, and a slim per-outcome bar. The whole card
   must still read at a glance ("who's leading?") and stay the same height-rhythm
   as the binary card so the grid stays aligned. Show how the **TippingBar
   language** extends to multiple outcomes (stacked? per-row? a single
   proportioned bar?). This is the heart of the request.
3. **Compact list-row** — a one-line-per-market dense view (for "All markets" /
   power users): icon, question, a mini probability indicator, volume, time.
   Toggleable with the card grid.

**Also resolve:** an optional **circular "chance" dial** for binary cards (the
Polymarket "91% chance" gauge) — *propose whether it earns its place in our
language or whether our number+TippingBar is already stronger.* We trust your
judgment; argue the case either way.

### Request B — Identity / avatar system (signature opportunity)
Elevate `kit/ui/avatar.tsx` into a **generative heraldic identity** — deterministic
per user, unmistakably 50pick (think sigils / crests / a "tipping" motif), still
legible at 20px in a comment and 80px on a profile. Include the tier ring
(`TierBadge`) integration and an uploaded-photo fallback. Keep it calm and crisp,
not busy.

---

## Our signature — what makes us *us* (lean into these, don't dilute)
- **The "tipping" metaphor** — the TippingBar, the tipping point at 50, the
  "Tipping" state. This is our visual verb. Push it as the through-line.
- **Heraldic gilt-on-royal** — gilt is a *soloist* (focal value, crest, tier),
  royal is the canvas, claret/aqua are the supporting chord. Sovereign tier.
- **Two-officer / provably-fair seals** — resolution credibility as visual trust.
- **Bilingual EN · SW** as a *design feature*, not an afterthought.
- **Number-as-hero + calm data** — dense but breathing; decoration only as accent.
Polymarket is flat, utilitarian, US-centric. We are a **sovereign, bilingual,
heraldic** market for Tanzania. Same information rigor, different soul.

## Constraints
- OKLCH tokens only; YES=emerald(152) / NO=rose(22) semantic + untouchable.
- 60fps on mid-range Android; SVG/transform/opacity; reduced-motion branch on all.
- Every member of the card system shares one height rhythm so grids stay aligned.
- Hand-rolled SVG over heavy libs.

## Deliverables
- A **card-system spec** (wireframe-level is fine) + TSX sketches for all three
  members + the optional dial, showing which existing components are reused.
- The **identity system** spec + a TSX sketch + any `globals.css` token additions.
- A short rationale for each judgment call (especially the dial, and how the
  TippingBar language extends to multi-outcome).
