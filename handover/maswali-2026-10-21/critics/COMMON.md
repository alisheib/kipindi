# MASWALI MILLIONEA — design critics, round 1 (the common brief)

Ali (owner of 50pick, 2026-10-21): *"if you think anything regarding design, animations, or progress of the Maswali game
is not 10/10 rated as player or UI/UX engineer or animation specialist, move it to 10/10 perfectly with full consistency
with our design."* You are one critic. Your job: rate, name every flaw precisely, and say exactly how to reach 10/10 —
within 50pick's design system. You READ and REPORT only: no edits, no commits, no servers/builds/tests (unless your own
brief says you capture frames), no git writes.

## The product
50pick is a Tanzania-licensed real-money prediction market (www.50pick.tz). One dark-royal theme, no light mode. Three
languages: English, Swahili (the longest strings), Chinese. Players are mostly on phones (320–412px), many on modest
Android devices and slow networks. **Maswali Millionea** is its third product: a weekly ticket of 15 YES/NO questions
(10 main + 5 reserves), a jackpot shared by every 10/10 ticket, settled after the week's events; tickets are bought on
"the slip", followed on "Tiketi zangu", and every week is published in a public "Week register". It ships dark first,
then to staff preview, then to players.

## The design law (read these before judging — in the worktree C:\50pick-ssd\maswali-coord-20261019)
- `AGENTS.md` §6–§7 (no fabricated figures or windows; never narrate internal operations; every string in en/sw/zh;
  kit components only; ONE glyph family `I`; money via formatTzs; 320 · 360 · 768 · 1280 · 1920; taps ≥ 40px).
- `docs/DESIGN_AUTHORITY.md` — §0 (the filing law) and **§M8a (Millionea's own rulings: gold only on earned money; the
  tab label's still green → gold → red ink; the rest)**; the platform rulings it refers to (§M3/§M3a gold, §B1a, §B11,
  §B12, motion rules). Values live in `src/app/globals.css`, `src/app/motion.css`, `src/app/state-tokens.css`.
- The Millionea design delivery: `docs/design-system/v6-2026-10-17-millionea/` (incl. `motion/maswali-motion.css`) and
  `docs/design-brief/maswali-2026-10/` (BRIEF, PREDICTED-OUTPUT, RECEIVING). Where the delivery and DESIGN_AUTHORITY
  disagree, DESIGN_AUTHORITY wins.
- The decided words: `docs/MASWALI-PLAN.md` §0a ("Rulings taken today") and the hand-over's S5-VIS-FINDINGS §D at
  C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\408dbc60-fcd0-43af-899c-8602858935b5\scratchpad\handover\handover\maswali-2026-10-19\S5-VIS-FINDINGS.md
- CONSISTENCY WITH THE REST OF 50PICK is part of the score: compare Millionea's components, type scale, spacing rhythm,
  cards, buttons, sheets, receipts, empty/loading states and motion with the platform's own (src/components/ui/*, the
  Up & Down board and cards just rebuilt to 10/10 by the U43 lane — src/components/updown/*, src/app/updown/*; the
  markets board; the wallet; the bet sheet src/components/journey/bet-sheet/*). A Millionea surface that invents its
  own version of a platform pattern loses points even if it looks good.

## The lenses (score each 0–10; 10 = nothing left to improve)
1. **PLAYER** — a Tanzanian player on a phone, first visit and fifth week: do I understand what to do, what it costs, what
   I can win, when results come, what happened to my money? Is it trustworthy, exciting but honest, calm under RG rules?
   Any moment of confusion, doubt, dead end or wasted tap costs points.
2. **UI/UX ENGINEER** — hierarchy, layout, alignment to the grid, spacing rhythm, density, responsiveness at every
   width (320 → 1920; 1024 is where the top bar replaces the phone rail), tap targets, states (empty, loading, error,
   paused, closed, resolving, settled, voided, refunded, won, lost), a11y (contrast, focus, names), and the PROGRESS
   signals (the slip's answered counts and meter, the week's phase strip, countdowns, "x of 15 results in").
3. **VISUAL / DESIGN CONSISTENCY** — tokens not raw colours; gold only where §M3/§M8a allow; the glyph family; the type
   scale; surfaces and borders as the kit draws them; nothing clipped, overlapping, orphaned or ragged; zh and sw
   typography (line breaks, eyebrows, numerals).
4. **MOTION** (the motion critic owns the deep dive; others note what they can infer) — purpose, timing tokens,
   easing, choreography, reduced-motion, no layout shift, consistency with the platform's motion system.
Also note COPY problems you see (one wording per truth across surfaces; the three languages saying the same thing).

## Already known — being fixed now (do not re-report; say "known Pn" if you see it, and add anything it misses)
P1 confirm sheet's "free cancel until" frozen at render · P2 empty tickets list invites a player on a break · P3 "To
winners" two figures · P4 rounding remainder shown in a top-up week · P5 "next event" in the past · P6 check window never
shown / "Results coming in" after all results · P7 results-and-payout range ignores the check window · P8 hub mislabels
weeks while a new week sells (cap line, "Last week", "This week's questions") · P9 carry rows name weeks by arithmetic ·
P10 a pre-close-voided question counts as answered + invented pick · P11 register fee unsigned · P12 zh resultDetails
separator · P13 slip refusals reuse purchase sentences · P14 sw mixed verbs (carry / refunded) · P15 hub countdown while
nothing can be bought · P16 "Last week" link < 40px · P17 final-week callout uses `flag`, printed close uses
`hourglassHalf` · P18 slip hand-rolls Callout · P19 /results error isolation.

## The tiles (shot at d1c5910f with FEATURE_MILLIONEA=ACTIVE on a seeded in-memory server)
Folder: C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\408dbc60-fcd0-43af-899c-8602858935b5\scratchpad\lead\render-d1c5910f-player-tiles\
Names: `<page>-<locale>-<width>.png` (the page's first viewport) and `-s2`, `-s3`… (the next scroll steps, 240px overlap).
Read them with the Read tool. Read EVERY Swahili tile of your pages at every width; then en and zh at 360 and 1280 and
wherever sw showed a problem or the language changes the layout (zh line breaks, en vs sw widths). Read the page's code
to understand states the tiles don't show (src/app/millionea/**, src/components/maswali/**).

## Your report (your final message is all the lead sees)
1. A score table: one row per surface (and per major state where it matters, e.g. slip-answering / confirm sheet /
   stamp), one column per lens (Player · UI/UX · Visual · Motion-as-seen · Copy), each 0–10.
2. Every flaw that costs a point: severity (HIGH / MEDIUM / LOW), the tile(s) that show it (file names), what is wrong in
   one sentence, and the exact fix in 50pick's terms (which token, which kit component, which existing platform pattern
   to reuse, which words in en/sw/zh). No vague advice ("improve hierarchy") — say what changes. Prefer reusing a platform
   pattern over inventing one.
3. What already reaches 10 and why (briefly), so it is not touched.
Be exact and be honest: a 10 you did not earn misleads; a flaw you invent costs a fix round.
