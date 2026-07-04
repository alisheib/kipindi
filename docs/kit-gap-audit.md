# Kit-vs-Live Gap Audit (2026-07-04)

Six parallel analysts compared the design kit
(`50PICK/design_handoff_prediction_market_kit/kit/`) against the shipped app.
Rule for this sprint: **build only from the kit; never invent; when the kit is
silent, stop and commission Claude Design (sharing our kit).**

## Motion quality bar (Ali, 2026-07-04)
Any motion/animation we touch must be **perfect** — real easing/physics, weight,
zero jank, reduced-motion respected. Weak or basic motion is worse than none and
repels users. If it can't be made perfect, don't ship it. Applies to every item below
that has a motion aspect (dial settle, needle tip, sparkline draw-in, card entrance,
value ticks, celebrations).

## Provenance note
Several shipped components cite Claude Design deliverables that are **NOT in the repo**:
`ds-forms.jsx` (toggle/checkbox/select/tabs), a "market-surfaces handoff"
(`ProbabilityChart`, card `Sparkline`), an "Identity Sprint" (`IdentityAvatar`). These
are prior *sanctioned* design work — not freelance inventions — but we hold no local
spec, so treat them as "spec-less locally" (re-brief if we change them materially).

---

## Bucket A — Kit-faithful fixes (safe to implement; accidental drift / under-build)
- [A-1] Button padding/radius drift — kit = per-size padding (sm12/md16/lg20/xl24),
  radius `--r-md`, xl `--r-lg`; live = uniform 18px, `--r-sm`. *(globals.css:436,452-455 vs tokens.css:188-191)*
- [A-2] Button spinner speed — standalone spinner 0.7s (kit), button inline spinner 1s. *(button.tsx:86)*
- [A-3] MarketCard action labels — kit `YES @ 62%`; live dropped the `@`. *(market-card.tsx:234-239)*
- [A-4] LeaderboardRow fidelity — restore 🔥 streak chip (live shows text "4 wins"),
  `@handle`, and the "{n} markets resolved" subline. *(leaderboard/page.tsx:199-240 vs markets.jsx:246-281)*
- [A-5] VolumeSparkline on market detail — kit specimen pairs it under the chart;
  live only uses it on leaderboard rows. *(microstructure-specimens.jsx:13-14)*
- [A-6] EmptyState chrome — kit box 360px, illustration bare; live 300px w/ a 52px
  ring badge the kit doesn't have. Widen + drop ring (keep illustration set). *(empty-state.tsx:40-46)*

## Bucket B — Dead-code cleanup (hygiene, not design; safe)
- [B-1] Orphaned market-terminal CSS `.mterm` / `.pool` / `.ticket-*` — no TSX uses it. *(globals.css:1860-1923)*
- [B-2] `.pbar-*` split-fill CSS unused (live uses TippingBar). *(globals.css:657-702)*
- [B-3] `.toast` CSS classes bypassed by the React toast component. *(globals.css:876-903 vs toast.tsx)*
- [B-4] `.avatar` CSS dead — superseded by IdentityAvatar. *(globals.css:821-834)*
- [B-5] `spark` / `traders` dead prop plumbing on MarketCard (threaded, never rendered). *(market-card.tsx)*
- [B-6] `MarketStats` component imported nowhere. *(market-stats.tsx)*
- [B-7] `GiltCorner` unused + wrong provenance comment (claims kit/banners.jsx; not there). *(brand.tsx:187-219)*
- [B-8] `--hero-grad` / `--hero-grad-warm` tokens defined, consumed nowhere. *(globals.css:318,324)*

## Bucket C — Intentional divergences (RATIFY; do NOT "fix" toward the kit)
- Royal-indigo re-hue system-wide (kit was teal-seeded). *(buttons/chips/tiers)*
- Gradient buttons + hover-lift house motion.
- ConvictionDial replaces the kit BuyTray; payout hidden until resolution (license rule).
- Dial: YES-left (TZ convention), 200× range, side-lock invariant, collapsed neutral band.
- Full-bleed F1 photo hero replaces the kit's gradient BannerHero (documented keeper).
- Brand Kit v2 "Needle" logo redesign; `variant` API replaces `mono/inverted`.
- Exported OG/favicon asset set (matches v2 manifest exactly).
- Frosted-glass "Dark Glass" toast.
- `ProbabilityChart` replaces kit PriceChart on market detail (market-surfaces handoff).
- Combined "trust strip" vs kit's separate How-it-works / Why-us sections.
- `中文` replaces the kit's placeholder `FR` as 3rd locale.

## Bucket D — Missing kit-specced elements (kit HAS a spec; buildable, but large / need Ali's product OK)
- [D-1] **ResolutionPanel — MISSING (high).** Kit specs resolver identity (2-officer note),
  objection-window bar, pool-payout breakdown table, "flag this resolution" button. Live
  shows only a "Resolved · {outcome}" pill. *(markets.jsx:175-244)* — needs product decision
  on flag-for-review + objection flow before build.
- [D-2] **OrderBook — MISSING (high).** Kit specs pool-as-depth per-price liquidity table. *(microstructure.jsx:114-188)* — product decision: does a pari-mutuel pool warrant a depth view?
- [D-3] **DepthChart — MISSING (high).** Mirrored cumulative YES/NO depth from mid. *(microstructure.jsx:191-224)* — same product question as D-2.
- [D-4] **Hero featured-market preview block — MISSING (high).** Kit puts a live market card
  inside the hero. *(extras.jsx:377-386)* — conflicts with the photo-hero direction; design call.
- [D-5] Homepage leaderboard-top5 + recent-resolutions teasers — MISSING (med). *(extras.jsx:446-474)*

## Bucket E — Kit-silent shipped features (no local spec → Claude Design brief candidates)
- [E-1] Locked-side dial visual mode (padlock pills, dimmed half). *(conviction-dial.tsx:732-769)*
- [E-2] Tachymeter stake detents + labels on the dial track. *(conviction-dial.tsx:876-909)*
- [E-3] Card signal badge (hot/soon/tipping) — thresholds/colors/copy. *(market-card.tsx:39-48)*
- [E-4] Card 24h MoveChip (`+Npt`). *(market-card.tsx:53-68)*
- [E-5] Leaderboard consensus PriceChart + per-row sparkline (real-vs-synthetic data labeling). *(leaderboard/page.tsx:174-190)*
- [E-6] Positions P&L summary strip + performance sub-page (unrealised P&L framing). *(positions/page.tsx:135-168)*
- [E-7] "Propose & get paid" gold board card. *(markets/page.tsx:89-108)*
- [E-8] Form atoms Toggle / Checkbox / Select / Tabs (cite the missing `ds-forms.jsx`). *(ui/)*

## Already shipped this sprint (Push A)
- Restrained ambient card/chip glow; promoted the board "heartbeat" figure (aqua SignalPip).
