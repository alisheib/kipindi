# DECISIONS

## The gold-vs-mono verdict (Set C)

**Ship C2 — the figure in neutral mono ink.** Gold's entire value on this platform is that it
means "money you actually have", and the pool is the most unearned number the product will
ever show; spending gold there makes C1 and C3 the same metal, so a real payout can no longer
outrank a wish. The jackpot still reads as consequential through size, mono weight and the
countdown — the document texture, not the ink, carries the occasion.

## Set A — the slip

1. **The slip is a document, not a form.** Numbered rows, a sealed question-set hash, mono
   figures, a countdown. No hero composition — D-2 is open, so the pool is stated once, in
   the law-3 third-person form ("Pool ya Millionea · TZS 2,016,138 · inagawanywa kwa kila
   tikiti ya 10/10"), sized for TZS 1,000,000+ so a digit rollover never reflows.
2. **Question prose is never clamped.** The market card's 2-line clamp is the precedent to
   beat, and the answer is to refuse it here: a player is committing money against the exact
   wording, so the ballot shows every word. The length cost is paid by the sticky rail, not
   by hiding text.
3. **The fold is solved by a sticky rail, built from existing parts.** SteppedProgress
   (10 segments, done = --royal-400) + a mono count + the compact pay control, docked above
   the bottom rail on --panel with --shadow-overlay-up. All three are states of existing
   components (B9) — no new component, no new stylesheet. A2 asserts the rectangle at
   360×720: countdown above the fold, pay always reachable.
4. **Selection state, law-6 safe.** At most one lit control per row; unselected controls are
   neutral outlines on --border-control (the 3:1 control boundary). The lit control adds a
   check glyph, so colour is never the only signal. Ten rows never light more than ten
   controls of twenty.
5. **The pay control is the final money-commit, so it wears gilt only when armed** (M3a D1).
   Partial state: neutral outline with the reason stated under it. It stays tappable; a tap
   at 6/10 produces the refusal (below) rather than a dead disabled button.
6. **The refusal is factual, not gold, not red** (law 12, F3). Neutral surface, info glyph,
   reason ("Maswali 4 hayajajibiwa — namba 3, 5, 7 na 9") and next step (jump link to the
   first unanswered question). Unanswered rows carry a dashed neutral chip — the kit's
   empty-state vocabulary, calm.
7. **The 10/10 helper is app-state feedback, not a betting colour:** it reads the semantic
   --success-fg token, never a --yes-* step directly (law 6). Note: tokens-LOCKED.css
   currently aliases --success-fg to var(--yes-200); the hue-166 family the brief names is
   absent from the extract — flagged in OPEN-QUESTIONS #9 rather than worked around.
8. **Numerals inside question prose are mono + tabular** (law 10) — TZS 3,900, 28:00,
   100,000 render in the money face inside Inter sentences.
9. **The rules strip is a reserved slot, not invented copy.** Two rows (void rule, ticket
   cap) render an em-dash + "nakala bado haijathibitishwa" — the law-4 labelled-pending
   vocabulary — until D-4/D-6 are decided.
10. **Swahili budget.** Longest row is 93 chars (stress case past the measured max 84);
    every question opens "Je, ". Worst control label HAPANA occupies under half of its
    139px half-width control at 360 — the 2.25× proof for the control tier. Prose needs no
    reserve (measured 1.009 median) and gets none.
11. **768 layout:** grid 28px / prose / 292px control pair. Rows grow with text; controls
    never shrink below 44px. Nothing new enters the desktop header from this page.

## Set B — the loss receipt

12. **The mark column is the anti-support-queue device:** a single scan column of ✓/✗ at the
    left of every row, with CHAGUO and MATOKEO as words on every row. ✓ reads the semantic
    --success-fg app-state token (see OPEN-QUESTIONS #9 on its alias); ✗ is neutral ink — a wrong pick is not an error, so no rose, no danger, no row
    tint. The only red on the page is the 18+ crest.
13. **Score stated once, calm** ("Alama: 6 kati ya 10"), with the factual tier floor line.
    No "so close", no re-entry CTA, no streak language.
14. **Money block shows the real settled zero** ("Malipo — TZS 0") — law 4 permits it only
    because it is true, and it must byte-match the summary row (B2 demonstrates the pair).
15. **Closes with the finality line** ("Kila tarakimu hapa ni ya mwisho — hakuna
    kinachodaiwa zaidi.") and the settlement attestation hash — the fairness vocabulary.
16. **Question text on receipt rows clamps to 2 lines** (labels may ellipsise; money and
    timestamps never do) — the full wording remains reachable on the question's own page.

## Set D — the tier glyphs

17. **Heraldic coronets of descending rank: three pearls, two, one.** Rank is carried by
    silhouette height AND pearl count, so the three separate without colour at 14px (law 7).
    Same band path in all three; construction identical to the 178 (24-grid, 1.9 stroke,
    round/round, fill="none", currentColor).
18. **Not a seal** — M7 reserves seal vocabulary for wins, and these glyphs also sit on loss
    receipts. **Not the existing zigzag `crown`** — that key exists and stays generic.
    **Never coloured, no glow, no motion** — identity motion is the trademark's (M8), and a
    tier never wears the money ink (Q5).
19. **Pearls are stroked rings, not filled pips.** The brief's construction spec says no
    fills; at 14px a r1.55 ring closes optically into a dot, so legibility costs nothing.

## Cross-cutting

20. **Page title size:** the 28px page-title step is not in tokens-LOCKED.css, so the title
    sits on --type-h2 (24px) — the nearest existing step, per the brief's own instruction.
    No token added.
21. **Countdown numerals are mono.** The inventory records four numeral surfaces on the
    display face; M4/T5 defaults won here. If the shipped countdown-pill uses the display
    face, keep the shipped face — live repo wins.
22. **Spacing** follows the de-facto numeric scale the product actually uses (10/14/16px
    gaps, as on the market card) — the --sp-* CSS ladder is recorded as dead in INVENTORY
    and was not resurrected. Radii, colours, shadows, type sizes and control heights all
    name tokens.
23. **Top-bar deposit stays gold** as shipped in the reference frames (D1 governs the
    confirm step inside the flow; the chrome CTA follows the live product).
24. **Swahili copy is representative, not final** — written to the measured length budget;
    final strings belong to the 1,706-key dictionary process and the label modules
    (maswali-tier-label.ts, side-label.ts with the Maswali product line).

## Where we think the rulebook is wrong

Nothing rose to "wrong". One tension worth recording: the brief fixes the slip on the
reading tier (1080) while ten stacked prose rows read best near the form measure — at 768+
the row grid keeps prose lines ≤ ~90ch so the tension never bites, but if a 1280 slip is
ever drawn, cap the ballot column inside the reading page rather than letting rows run full
width.
