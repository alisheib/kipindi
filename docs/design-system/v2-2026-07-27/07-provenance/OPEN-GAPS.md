# Open gaps — missing, inconsistent, or never specified

## Never designed (known, briefed, outstanding)
1. **Up & Down D4 — admin console** (KPI row, chains table, oracle health + DEGRADED, round explorer + proof drawer). Dense admin table patterns don't exist at all yet.
2. **Up & Down D5 — bottom-nav glyph** (three options requested in the brief).

*(D3 — round detail — was designed 2026-07-27; see 02-components/_specs-as-delivered/D3-updown-round-spec.md. It carries three open questions of its own: the exact-tie policy, whether leaving a round before close exists, and price-series sampling per duration.)*
4. **Selects and date/time fields** — no design anywhere (admin round explorer will need them).
5. **Modals / confirm dialogs** — motion exists (dialog-rise, scrim-fade) and radius law says 16px, but no complete modal component was ever drawn.
6. **Top bar, bottom nav, avatar menu** — referenced by briefs (floating glass bar, cyan active pill, 22px/1.85px icons, 9.5px labels, avatar menu absorbing Profile) but no rendered artifact exists in what was given to these sessions. The redlines above are from the brief text, not a design.
7. **Notice bars** — status token recipes exist (--warning-bg/-border/-fg etc.); no component.
8. **BuyTray/ResolutionPanel/LeaderboardRow on royal tokens** — specimens exist on the old canvas; never re-rendered.

## Inconsistencies to resolve in v1.1
1. **Two skeleton systems**: .skeleton (skel sweep) and .kp-shimmer-track — pick one.
2. **Two toast worlds**: kit .toast-* plus the animated toast (toast-slide/toast-bar) — unify.
3. **Empty-state art stroke colour**: kit says --teal-400, 2026 surfaces use --brand-400 — bless one (recommend --brand-400).
4. **Micro-type**: 2026 surfaces introduced 8.5–9.5px mono labels below the kit's 10px floor — either add tokens (--type-nano?) or pull back to 10px.
5. **LeaderboardRow** gold-for-rank + 🔥 chip predate the gold law and emoji ban — needs a compliant redesign.
6. **--type-* scale vs practice**: pages use 28px H1 (scale says h1 32) — the scale was never re-tuned after the re-theme.
7. **ud-count-pulse** lives in the D1 component, not tokens.css — promote to the kit stylesheet with its reduced-motion gate.
8. **Estimate multiplier** — one shared "× 1.4" vs per-side estimates: open question to product (D1 spec Q1).

## Unspecified (nobody has ever said)
- Print/PDF/email surfaces (statements, receipts) — no rules.
- Offline/poor-connectivity states beyond skeletons.
- Sound/haptics mapping (tap haptic is mentioned in a CSS comment only).
- Dark-on-dark image treatment (user avatars aside, no photo guidance).
- Error-page (404/500) design.
- Exact brand clear-space (the 0.25× in 04-brand is inferred).

## The Needle — two gaps that are not design work

**1 · No usage evidence.** The object is fully built, specified and instrumented, but
zero players have touched it. Every claim that it is "satisfying" is judgment against
its own spec. `onInteraction` is wired and ready; what is needed is one week of real
data (touches per session, at what session length) and the willingness to delete the
object if the answer is "never." Do not treat the spec's completeness as evidence of
demand.

**2 · No compliance sign-off.** The strongest argument for the Needle is a regulatory
one: it is a documented, deliberately un-gamifiable responsible-play surface whose
prominence grows with session length. That argument is worth much more with the
compliance team's written sign-off attached. Get it, and file it in this folder.

## D3 open questions (raised by the design, need product answers)
1. **Exact ties.** `close === open` is unspecified. UP-wins / DOWN-wins / VOID are all
   defensible; VOID matches the platform's existing refund posture. The receipt states
   its own rule, so this has to be decided before the rule row is truthful in every case.
2. **Leaving a round before close.** D3's stake copy implies a withdraw path
   ("to take the other side, leave this round") that has never been designed. Either
   design it or change the copy.
3. **Price-series sampling per duration.** The hero assumes ~34 samples over 5 minutes.
   A 30-minute round needs a fixed sample COUNT, not a fixed interval, or the line gets
   noisy — and if the feed can drop samples the x-axis must become time-proportional,
   otherwise a gap reads as a price move that never happened.
