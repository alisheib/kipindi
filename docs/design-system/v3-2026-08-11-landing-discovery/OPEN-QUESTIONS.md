# OPEN-QUESTIONS.md

Guesses I had to make, and the things in `FROZEN.md` I think are wrong. All of it is a proposal,
none of it was acted on.

---

## 1. Frozen components put two tap targets under the floor, and the two rules collide

You asked for every interactive element ≥ 44 × 44, and you froze a card that contains two elements
that are not. Both constraints cannot hold. I kept the card.

| Element | Size | Where |
|---|---|---|
| `.btn-side` — the YES/NO pair | 112 × **38** | `side-picker.tsx`, FROZEN §4 |
| `.mcardp-info` — the info button | **34 × 34** | `market-card.tsx`, FROZEN §2 |
| `.mcardp-details` — the `Details ›` link | ~62 × **17** | `market-card.tsx`, FROZEN §2 |

On `04-markets-discovery-desktop.html` that is **27 sub-44 targets in one viewport**, every one
inside a frozen card, on the two controls that take real money. Everything I designed measures 44
or more, verified by DOM sweep (see `SPEC.md` §0).

Your own token file already anticipates this: `--h-control-md: 38px /* .btn-md · Phase 3 → 44 */`
and `--h-control-sm: 30px → 40`. **Proposal: let Phase 3 land, and treat the YES/NO height as part
of it rather than as a card redesign.** The change is one token value; the card's layout, colour,
radius and label format do not move. `Details ›` needs padding around the same text, not a new
design. I have not applied any of it.

## 2. `--type-nano` (8.5px) and `--type-label` (9.5px) are below every floor I know

I used them, because the card and the chips use them and consistency beat my objection. The nano
note says letter-spaced caps escape the 11px reading floor. On a mid-range Android at arm's length
in daylight, I do not think 8.5px caps clear it — and `COMING SOON` at nano in the footer is a
compliance-adjacent label, not decoration. **Proposal: raise nano to 10 and label to 10.5 and
re-run the gate.** Not acted on.

## 3. Sort is the only gilt control in the discovery layer — is that a step too far?

Gold means earned money everywhere else in this system. I put the sort control on
`--gold-subtle` / `--border-gold` as a deliberate claim that *ordering the board* is the money
decision, and because it is the one control that must not read as a peer of the filter chips.

It is defensible and it might be wrong. The prototype ships a `giltSort` switch so you can see it
both ways in one click. **If it reads as a promotion rather than as a category, turn it off** —
the neutral version keeps the label, the size and the position, which is where 90% of the
first-class-ness actually lives.

## 4. Numbers I invented, and where they must come from

Everything below is a plausible placeholder. None of it should ship.

| Figure | I used | Real source |
|---|---|---|
| Live market count | 41 | live |
| Pool in play | TZS 1,669,000 | sum of open pools |
| Closing today | 6 | `hours ≤ 24` |
| Topics with a live market | 7 | derived |
| Per-topic counts | 14/6/7/4/5/3/2 = 41, pools summing to 1,669k | derived — they must reconcile to the header or the page contradicts itself |
| Status counts (`Open 41 / Today 6 / New 4 / All 58`) | invented | `All` includes closed and resolved; confirm that is what a user expects `All` to mean |
| Every market question and pool | drawn from your screenshots plus plausible local additions | live |

**`New 4` needs a definition.** I used "added in the last four days". If `isNew` in
`market-card.tsx` means "no pool yet", those are different sets and the filter should follow the
card, not me.

## 5. Swahili and Chinese strings are mine, and should not survive review

`Zenye ushindani · 25–75%`, `Inayofunga hivi karibuni`, `Nafasi ndogo · chini ya 15%`, `Dimbwi`,
`Panga`, and the Chinese set, are all my constructions. They are in `06-states.html` to prove the
**layout** survives a 25% longer string, not to propose the wording. Your localisation team should
replace every one. If any real Swahili label is more than ~40% longer than its English counterpart,
send it to me — that is past what I tested.

## 6. Things I could not resolve from the package

1. **Does `41 live` include markets whose selection window has closed but which are still LIVE?**
   `market-card.tsx` has `selectionClosed` as a distinct state from `CLOSED`. If it counts, the
   `Open` filter is lying; if it does not, the header number and `All` will not reconcile.
2. **Does the topic taxonomy have exactly 8 members?** I found Sports, Macro, Weather, Crypto,
   Culture, Tech, Other plus All. `categoryGlyph()` may know more. Politics has a claret chip
   reserved for it in the token file and no tile — is it coming?
3. **Is search server-side?** The empty state offers `Search all 58 including closed`, which
   assumes it is.
4. **What is the real breakpoint set?** I used 390 / 768 / 1024 / 1440 / 1920. `tailwind.config.ts`
   is in the package but the top bar switches at `lg`, `xl` and `2xl` with locale-dependent
   comments, so the effective set may be six.
5. **Is the first-visit modal being removed or kept?** `RATIONALE.md` argues its copy should become
   the how-it-works band. If the modal stays, that copy is now in two places.
6. **Does the topic tile's pool figure exist as an aggregate today**, or is it a new query? If it is
   expensive, the tile works with the live count alone — drop the second figure, keep the tile.

## 7. Two things I want to flag but am not proposing

**The category watermark glyph** is at `--border-royal` / 0.20 behind the meta row on every card.
At 394px it is fine. At the 285px the current three-column rail-plus-grid produces, it sits directly
under `TZS 172,505`. Removing the rail fixes it by accident. Noting it in case the rail returns.

**`--bg-overlay` and `--bg-inset` are both 11% and the canvas is 6.5%,** so a "sunken" token is
lighter than the page it sits in. Your token file documents this as deliberate and explains the
model. I used `--wash-inset` + `--edge-shade` for anything that should read as a well, which is
what the file says to do. Recording it only so you know the layouts are not fighting it by accident.

---

## 8. And the one I am obliged not to raise

FROZEN §4 rules the red/green accessibility argument considered and declined for this round, and
asks that it not be raised or worked around. It is not raised, and nothing in this delivery works
around it. Recording that the instruction was followed, so a future reader does not assume it was
missed.


---

## 9. Added in round 2.1, and each one needs a decision

**The responsible-gambling line above the footer.** Every string in it is lifted verbatim from
`public-footer.tsx` — `18+`, *"If gambling stops being fun, stop."*, `Set limits`,
`Take a break / Self-exclude`, `Helpline · 0800 11 0011`. I wrote no new RG copy on purpose. But
**placement is a regulatory question, not a design one**: LCCP §SR 5.1.5 governs where RG messaging
must appear, and moving it above the fold of the footer may change how it is assessed. It needs
compliance sign-off, and if the answer is "footer only", delete the block — the page still works.

**`Settled in the last seven days` names the source in public.** `Tanzania Meteorological
Authority`, `Transfermarkt`, `TwelveData`. Two questions I cannot answer: are those attributions
contractually permitted at that prominence, and is the payout figure per-market gross, or the sum of
winning positions? I showed the pool. If it should be the largest single payout, the number changes
and so does the label.

**The countdown keeps ticking under `prefers-reduced-motion`.** Deliberate — it is data on a money
surface, and freezing a clock that governs whether a bet can still be placed is a correctness bug,
not an accessibility win. If your accessibility review disagrees, the fallback is a 60-second
refresh instead of 1-second, which keeps it honest and stops the per-second repaint.

**The filter bar condenses past 300px of scroll.** It returns 52px of viewport, and it hides
controls the user may be mid-way through using. The `2 filters` pill scrolls back up to reopen.
The alternative — never condensing — costs 160px of fixed chrome on a 768px laptop. I chose the
viewport. Worth watching in testing.

**`Biggest move` needs `move24h` on every market.** The card already takes it as an optional prop
and hides the line when absent. As a *sort*, absent values have to go somewhere — I put them last.
Confirm that is right rather than treating absent as zero.
