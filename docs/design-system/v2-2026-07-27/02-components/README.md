# 02-components — index

Each folder: `preview.html` (open offline in any browser; loads ../../01-foundations/tokens.css) + `spec.md` (redlines with exact values + token names, prop contract, GIVEN/INVENTED provenance).

| Folder | Component(s) | Provenance |
|---|---|---|
| buttons | all 9 variants × 4 sizes, states | GIVEN (+ est. marker INVENTED) |
| chips | 10 variants | GIVEN |
| inputs | input, mono, TZS group, error, quick-stake | GIVEN |
| progress-bars | ProbabilityBar, ProgressBar, Stepped, Circular, pool split | GIVEN + split INVENTED |
| tipping-bar-and-dials | TippingBar, ConfidenceDial, win-rate NeedleDial | GIVEN + needle-dial INVENTED |
| live-indicators | LiveDot, streaming pip, aqua pip | GIVEN + pips INVENTED |
| skeletons | base + card recipe | GIVEN + recipe INVENTED |
| toasts-tooltips | 4 toast kinds, tooltip | GIVEN |
| avatar-tier | avatar sizes, tier badges | GIVEN |
| tabs | primary / secondary / count | INVENTED |
| stat-tiles | tile + glass ledger cells | INVENTED (on GIVEN glass/gilt classes) |
| countdown | kit ring + D1 band | GIVEN + INVENTED |
| market-card | MarketCard live/tipping/resolved | GIVEN |
| updown-card | D1, all states (links runnable DC) | INVENTED |
| positions-pnl | ledger strip, pages (links runnable DCs) | INVENTED |
| charts | PriceChart (source) + PnlChart | GIVEN + INVENTED |
| empty-states | kit shell + paused-chain | GIVEN + INVENTED |
| tables | settled ledger, LeaderboardRow, admin gap | mixed |
| _specs-as-delivered/ | the raw 2026-06/07 handoff specs + JSX | — |

Up & Down surfaces: D1 card + D2 board + **D3 round detail** are designed and specified in
`_specs-as-delivered/`. D4 (admin console) and D5 (nav glyph) remain outstanding — see
`07-provenance/OPEN-GAPS.md`.

Motion for every component listed here is specified in `08-motion/`; the Needle pause
object has its own section in `09-needle/` and haptics in `10-haptics/`.

Missing by honesty (never designed — do not invent from this archive): modals/confirm dialogs, selects, date/time fields, top bar, bottom nav, avatar menu, notice bars, dense admin tables. See 07-provenance/OPEN-GAPS.md.
