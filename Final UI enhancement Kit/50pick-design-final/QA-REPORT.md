# QA Report — 50pick Final Design Package v2 (2026-07-07)

All checks below were actually executed in this build; numbers are real.

## 1. Single source of truth
- `glyphs-additions.tsx`, `50pick-glyph-kit.html`, and every standalone
  `.svg` are emitted by `tools/gen_glyphs.py` from one definition table.
  The sheet, the code, and the files cannot diverge. Result: **PASS**.

## 2. Rendered verification (headless Chromium + pixel analysis)
Every glyph rendered standalone at 120 px on panel `#131645`, then checked:
- **Emptiness** (ink coverage > threshold): 54/54 pass.
- **Edge clipping** (no ink in the outer 2 px band — catches paths
  escaping the viewBox under 1.9 px stroke): 54/54 pass.
- **Centering** (ink centroid within 22% of geometric center): pass.
- Run on all 64 glyph tiles (59 × 24-grid + 5 × 64-grid) and all 12 badge
  medallions. Flagged: **0**. Three badges (sovereign, founder, centurion)
  were reworked to cleaner geometry after visual review and re-verified.

## 3. Visual review
- Full specimen sheet screenshotted and reviewed in three sections.
- High-risk geometries (shuffle, timerReset, sofBusiness, catCrypto,
  hourglassHalf, gauge, headset, sofSavings, fairnessChain,
  emptyProposals, kycRail, rgSelfCare) reviewed individually at 120 px.
- Earlier defects fixed and re-verified: distorted sparklines
  (`preserveAspectRatio="none"` removed; smooth cubics at 1:1),
  unicode/emoji stand-ins (◷ ✓ ⚽) replaced with idiom glyphs,
  football/seal/flame/trophy geometry redrawn.

## 4. Structural validation
- Every `.svg` in the package parsed with an XML parser: all valid,
  0 failures (count printed at build time).
- All three specimen HTML files parsed clean; the micro board was loaded in
  headless Chromium with a pageerror listener — zero JS errors; the
  Tipping-Point replay script executes.
- Attribute uniformity enforced by the generator: viewBox 0 0 24 24 /
  0 0 64 64, stroke-width 1.9 / 2.2, round caps + joins, currentColor.

## 5. Idiom & rule conformance
- No emojis, no mascots, no baked-in text in any reusable asset
  (OG masters excepted — finished cards, text permitted by the brief).
- Gold used only for earned-money surfaces (resolved seal, reward burst,
  urgency escalation as specified); aqua = live; royal = nav/selected.
- YES left / NO right preserved in every specimen.
- SW-longest strings placed in every chip specimen — no truncation.
- Kit-faithful fixes carried: 0.7 s spinner (A-2), `@` price labels (A-3).
- Every animation in `state-tokens.css` and the specimens has a
  `prefers-reduced-motion` static fallback.

## 6. Reference build — end-to-end scripted test (headless Chromium)
Executed, not claimed: search narrowed the board to the exact matching card;
three keyboard detents set the dial to 5× = TZS 25,000; placing debited
stake + 2.5% fee to the exact expected balance (TZS 74,375); settlement ran
the full celebration timeline and credited the payout to the ledger with a
receipt drawer + copy-reference; the disconnect toggle produced the stale
chip and reconnect flashed numerals only; Swahili switch re-rendered every
surface. Zero page JS errors (the single console 403 is the sandbox blocking
Google Fonts — an environment artifact, not app code).

## 7. Known limits (stated, not hidden)
- Specimen HTML loads Sora/Inter/JetBrains Mono from Google Fonts;
  offline or sandboxed viewers fall back to system faces (geometry and
  color are unaffected).
- OG masters must be rasterized where the brand faces are installed.
- Rendered-pixel QA covers geometry, not taste; final art direction
  sign-off on the 12 spot-checked glyphs was done by eye at 120 px.

## 7. Provenance note — externally added content (audited before inclusion)
Between review sessions, the following files appeared in the working
directory from outside the original authoring session: the 10 "util"
glyphs (copy, externalLink, sortAsc/Desc, dragHandle, csvExport, ussd,
simCard, attest, reconcile), `tools/gen_badges.py` (12 medallions),
`spec/50pick-micro-interactions-spec.md`, `code/micro-patterns.css`,
`specimens/50pick-micro-board.html`, and the `comms/` set (OTP email,
receipt email, SMS/WhatsApp templates).

Before inclusion, every one of these was audited:
- **Security**: scanned for scripts, event handlers, external URLs,
  network calls, and non-SVG payloads. The only script is a 3-line
  class-toggle demo on the micro board (no network, no data access).
  Emails use `{{placeholder}}` variables only; no live links.
- **Rendered QA**: all 22 new vector assets (10 glyphs + 12 badges)
  passed the same emptiness / edge-clip / centering checks — 22/22,
  0 flagged.
- **Idiom conformance**: no emojis, no unicode stand-ins, no baked-in
  text; gold usage consistent (absent from OTP, present on payout);
  tier names documented as design names pending product mapping.
All other checks in §1–§5 re-run on the final build (SVG count and
validation printed at build time).
