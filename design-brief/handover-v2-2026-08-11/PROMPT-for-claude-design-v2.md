# Prompt for Claude Design — round 2

Attach `50pick-design-handover-v2.zip`. Paste everything below.

---

You are art-directing **50pick.tz** — a Tanzania-licensed prediction market where players pick YES or
NO on real events (Arusha rainfall, Simba SC, the shilling, the gold price), stake in Tanzanian
shillings, and winners share the pool minus a capped commission. Every market settles against a named
public source. It is not a casino and not a sportsbook.

**Before anything else, read `FROZEN.md` in the attached package.**

## The most important thing about this brief

Our design system is **finished, approved and in production.** A designer did it, it went through
review, it shipped. The colour palette, the market card, the conviction bar and the YES/NO control
are **not being redesigned.** A previous round changed them and the work had to be thrown away.

What we need from you is **composition and discovery**, not a design system:

- **A. The landing page** — section inventory, order, vertical rhythm, hierarchy, the hero, the header.
  Assembled entirely from components and tokens that already exist.
- **B. Market discovery on `/markets`** — filtering, sorting, active-filter state, result counts,
  empty states. Currently there is a left rail of 13 stacked buttons, no sort control of any kind,
  and closed markets in the default view.

Think of it as art-directing a magazine whose typeface and photography style are already fixed. The
craft is in sequence, rhythm, hierarchy and pacing — not in redrawing the letterforms.

## Read in this order

1. `FROZEN.md` — what you must not change
2. `BRIEF.md` — the full brief, including who we need you to be
3. `06-handover-contract/OUTPUT-SPEC.md` — exactly what to return, and the self-check to run first
4. `02-findings/LANDING-AND-FILTERING-FINDINGS.md` — the measured problems, in-scope only

## The rule that will make or break this deliverable

**Every colour in your CSS must be a `var(--token)` reference to `tokens-LOCKED.css`.**

No hex values. No `rgb()`. No `oklch()`. No named colours. Anywhere. If a colour you want does not
exist as a token, you have left the scope — use an existing one, or put the request in
`OPEN-QUESTIONS.md` and carry on.

There is **no token file and no token diff** in this round.

## Hold the market card as a black box

Your layouts must contain the approved market card exactly as it ships — see
`01-approved-design/screens/APPROVED-market-card-live.jpg`. You decide how many appear, in what grid,
in what order, under what heading. You do not decide what is inside one.

If reproducing it faithfully in flat HTML is impractical, use a grey placeholder box of the correct
dimensions labelled `[APPROVED MARKET CARD — 1 of N]`. **A placeholder is better than a redesign.**
We are looking at your composition, not your version of our card.

## Wear five hats and let all five show

- **Visual engineer** — every value specified, buildable from existing tokens. `24px`, not "a bit more space".
- **Graphic designer** — rhythm, hierarchy, negative space, pacing. The current page has seven sections on one flat surface with an identical 80px gap between every one. That is your core problem.
- **Gamer** — you know what a live scoreboard feels like: where the eye goes, what earns motion, how a lobby says *something is happening right now*.
- **Gambler** — a punter arriving at a market list asks three things in order: *what can I still get into?*, *what's about to close?*, *where is the money?* A filter set that doesn't answer those fast is decoration. There is currently no sort control at all, no odds-range filter, no liquidity sort, and closed markets sit in the default view.
- **Manager of an esports company** — you care about the funnel and about reading like a real venue rather than a skin. Note that the landing page prints `0 MARKETS SETTLED` and `TZS 0 PAID OUT` while `/markets` quietly computes `41 live · TZS 1669k in play` in 11px mono in a corner.

## Hard constraints

1. `FROZEN.md` is binding — palette, market card, conviction bar, YES/NO control, brand.
2. No photography, no stock imagery, no AI-generated imagery. The hero comes from type, the brand mark, tokens and live product data.
3. No new fonts — Sora, Inter, JetBrains Mono.
4. No new colour tokens. None.
5. Every tap target ≥ 44 × 44 px, including text links and the language control.
6. **Mobile at 390px is the primary case** — mid-range Android on Tanzanian mobile networks. A layout that only works at 1440 is not finished.
7. Trilingual EN / SW / 中文. Swahili labels run 15–25% longer than English — every text control must survive that without reflowing.
8. Dark theme only. The light theme was deliberately removed.

## Keep

The headline **"The wisdom of YES & NO."** — a real brand asset in a category where almost nobody has
an ownable line. You may re-set it; keep the words.

## Return

Six things, per the output spec: `layouts/` (six HTML files), `SPEC.md`, `MOTION.md`,
`DISCOVERY-RATIONALE.md`, `RATIONALE.md`, `OPEN-QUESTIONS.md`.

**Run the self-check table at the end of `OUTPUT-SPEC.md` against your own output and state the
results at the top of `SPEC.md`.** The first row is: grep your CSS for `#`, `rgb(`, `oklch(` and
`hsl(` — the answer must be zero matches outside comments.

`OPEN-QUESTIONS.md` must not be empty. If something in `FROZEN.md` bothers you, that is where it
goes, in writing, as a proposal we can read and reject. It costs us nothing there and costs us a
whole round if you act on it instead.
