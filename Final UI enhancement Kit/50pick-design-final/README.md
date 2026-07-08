# 50pick — Final Design Package (Claude Design · 2026-07-07)

Everything in this zip is generated from a single source of truth
(`tools/gen_glyphs.py`) and machine-verified — see `QA-REPORT.md` for the
actual checks and results. Palette, idiom, and rules follow
`design-master-brief.md` verbatim: 24×24 grid · 1.9 px stroke · round
caps/joins · currentColor · filled accents only · no emojis · no mascots ·
no baked-in text · gold = earned-money only · YES left / NO right, always.

## Contents

| Path | What it is |
|---|---|
| `spec/50pick-refinement-spec.md` | The full §9-format refinement pass (A1–A10 cross-cutting, §4g refine-existing, per-page items, systems answers, verdict). |
| `spec/50pick-micro-interactions-spec.md` | **The micro-detail layer, normative**: motion/z/glow constants, buttons, chips, filtering, sorting, pagination + infinite scroll, loaders + stale-data chip, forms + dial detents, toasts, tooltips, 3-grade confirmation hierarchy, ledger + receipt anatomy, celebration timelines (ms-by-ms), badges, calibration chart. No judgment calls left open. |
| `specimens/50pick-refinement-mockups.html` | Batch-1 high-fidelity mockups: MarketCard v2 ×5 states, podium, AuthShell, wallet spark + MNO tiles, reward burst, countdown rings, RouteError, admin primitives, §4b button state recipe. Open in a browser (needs internet for Sora/Inter/JetBrains Mono). |
| `specimens/50pick-controls-batch2.html` | Batch-2 specimens: full control set (toggle/segment/tabs-royal-rule/checkbox/radio/stepper/select), stale-data chip, bank-grade ledger anatomy with expandable receipt row, shareable settlement receipt card, five tier medallions. |
| `specimens/50pick-admin-batch3.html` + `spec/50pick-admin-reporting-spec.md` | Batch-3: the finalized admin & reporting surface — reporting console with normative GGR/NGR definitions, daily P&L with totals, category breakdown, regulator pack with maker-checker chain; the two-officer Resolution Ceremony; the KYC/AML workstation; payments ops with MNO kill-switches, reconciliation, and retry queue. |
| `specimens/50pick-glyph-kit.html` | Specimen sheet: all 59 glyphs at 24 px + 15 px, tag/chip anatomy in EN·SW·ZH, category chips, 5 empty-state illustrations. |
| `specimens/50pick-micro-board.html` | Batch-2 board: filter/sort bar, pagination, loaders + freshness chips, form controls, toasts, ledger + settlement receipt, badge medallions, Tipping-Point wobble (click to replay), loser end-frame, calibration chart, claret typed-word confirm. |
| `code/glyphs-additions.tsx` | 64 drop-in React components in the exact `G` wrapper idiom. Merge into `components/ui/glyphs.tsx` (spread `...Iplus` into the `I` export). |
| `code/state-tokens.css` | The unified interaction-state recipe, countdown escalation, reward-burst + sparkline keyframes, 0.7 s spinner (fixes gap-audit A-2). Every effect has a `prefers-reduced-motion` fallback. |
| `code/micro-patterns.css` | Production implementation of the micro-interaction spec (§0–§9, §12, §14): tokens, chips, menus, pager, stagger, skeletons, freshness chips, forms, toasts, tooltips, seal/wobble keyframes, panel scrollbars — with the full reduced-motion block. |
| `svg/glyphs/*.svg` | 59 standalone glyphs, `currentColor` (inherit from CSS context). |
| `svg/glyphs-ink/*.svg` | Same 59 pre-tinted `#F5F8FF` for contexts without CSS (emails, external embeds). |
| `svg/empty-states/*.svg` | 5 × 64-grid illustrations (proposals, KYC rail, fairness chain, RG self-care, admin generic). |
| `svg/badges/*.svg` · `svg/badges-gilt/*.svg` | 12 badge medallions (48-grid): tiers I–V (distinct silhouettes — map to the canonical TierBadge enum), streak 3/5/10, proposer, centurion, founder, verified. `currentColor` + pre-gilt variants; locked state = render at 30% muted ink + 12px lock overlay. |
| `svg/manifest.json` | Machine-readable index: name, grid, category, role (glyphs + badges). |
| `public/pay/card.svg` · `bank.svg` | In-house payment glyphs at the spec's exact paths. |
| `og/og-1200x630.svg` · `twitter-1200x600.svg` | OG/social masters (text allowed on these finished cards). |
| `comms/email-receipt.html` · `email-otp.html` | 600 px table-based, inline-styled emails (client-safe). Navy header band; gold only on the payout figure. `{{tokens}}` are server-side. |
| `comms/sms-templates.md` | SMS + WhatsApp template set, EN/SW/ZH, transactional vs marketing class, opt-out rules, RG tone rules. |
| `tools/gen_glyphs.py` · `gen_badges.py` · `build_micro_board.py` | The generators. Re-run to regenerate tsx + specimen sheets + assets; nothing can drift. |

| `reference/50pick-reference-build.html` + `reference-app.js` | **The living standard — open it in a browser.** A fully working reference app implementing the specs with real behavior: draggable ConvictionDial with magnetic detents + full keyboard/`aria-valuetext` support, live filter/sort/search with staggered grid transitions, the medium-grade confirm sheet with the mandatory pool-share and bets-final lines, server-confirmed placement (0.7 s spinner, never optimistic), the ms-choreographed win ceremony with count-up and tap-to-skip, ledger with receipt drawers and copy-reference, live odds ticks with numeral-only flashes and the once-per-market Tipping-Point wobble, a real disconnect toggle driving the stale-data chip (aqua→gold→rose), and live EN/SW/中文 switching. Port this, don't reinterpret it. |

## Integration order
1. Merge `code/glyphs-additions.tsx` into `glyphs.tsx`; the three redraws
   (`percent`, `activity`, `bank`→landmark) replace the flagged originals.
2. Add `code/state-tokens.css` after `globals.css`; apply `.is-interactive`
   to Button/Chip/card CTAs (or fold the four rules into the existing
   `.btn` recipe).
3. Wire glyphs per the spec: tags → §A-chips, deposit tiles → A6,
   sessions → C1, SoF/FAQ → C2, Controlled Poll → admin.
4. Render OG PNGs from the SVG masters **on a machine with Sora, Inter and
   JetBrains Mono installed** (e.g. `rsvg-convert -w 1200 og-1200x630.svg
   -o og-1200x630.png`, or the existing Satori pipeline). The masters use
   font-family fallbacks, but only the real faces are on-brand.

## Deliberately not in this zip (and why)
- **MNO brand marks** (M-Pesa, Airtel Money, HaloPesa, Mixx by Yas):
  trademarked — source official assets from each operator's brand portal
  (typically a contractual requirement anyway). `mobileMoney.svg` is the
  in-house interim tile fallback.
- **Bitmap tier** (hero photo, banners, category art, textures, win-seal
  PNG): photographic/painterly assets that need an image pipeline; exact
  paths, dimensions and art direction are specified in
  `spec/…-spec.md` Part E and `visual-assets-brief.md`.
- **Regulator seal**: never fabricated — the deposit trust strip ships with
  a labeled slot until the licensed asset is supplied.
