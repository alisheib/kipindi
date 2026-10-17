# RATINGS — Maswali Millionea R2 · the review loop

Each persona rated the delivery out of 10 after each round. A score below 10 came with the defect that caused it; the defect was fixed before the next round. The loop stopped only when every persona held 10/10 on the same build.

## Round 1 — first full render of every canvas

| Persona | Score | What cost the points |
|---|---|---|
| Visuals & motion engineer | 7 | SM3 stamps lost their styling (two `style` attributes on one tag); the GlyphSwap incoming glyph was invisible under the reduced-motion clamp (inline opacity 0 survived `animation: none`). |
| Player | 8 | The hub's held-ticket rows overflowed at 360 (10 × 18px sockets beside the serial); the list row's purchase time ran off the card. |
| Gamer | 8 | The live ticket showed A3 already "carried" into main 4 before results were final — a reserve counted early. |
| UI / UX engineer | 7 | The journey header clipped the gold "Weka pesa" door at 360; topic chips wrapped to two lines; back-links and the sheet close were under 44px. |
| Professional arts engineer | 9 | The 24px Seal Line on the ticket clipped its last socket (gap --sp-2 inside the 296px card). |
| Graphics engineer | 8 | The delivered glyph SVGs rendered black in `<img>` (currentColor outside the document) on the glyph sheet. |
| Theme consistency engineer | 9 | Money inside button labels ("Kata tiketi · TZS 1,000") was set in Inter, not mono. |
| Palette engineer | 9 | The closing pill wrapped its text onto two lines; "Jackpot · ada 13%…" wrapped the ledger label. |
| Motion engineer | 8 | The carry (N1) measured the offset in the wrong direction for a FLIP (end frame is the layout). |
| Betting visual & mechanic engineer | 9 | The hub's closed state showed "Akiba halali zilizobaki 5 kati ya 5" — information-free at close. |
| Locale / language engineer | 7 | `maswaliSet({loc:'en'})` had no effect: the host prop shadowed the state, so EN/ZH proofs rendered Swahili. |

## Round 2 — after the fixes

| Persona | Score | What cost the points |
|---|---|---|
| Visuals & motion engineer | 9 | Under either clamp the outgoing GlyphSwap glyph stayed visible beneath the incoming one (no animationend fires under `animation: none`). → the harness applies every `data-then` end state directly when clamped. |
| Player | 10 | — |
| Gamer | 10 | — |
| UI / UX engineer | 9 | Three anchors still at min-height 24px. → every link ≥ 44px. |
| Professional arts engineer | 10 | — |
| Graphics engineer | 10 | — |
| Theme consistency engineer | 10 | — |
| Palette engineer | 10 | — |
| Motion engineer | 10 | — |
| Betting visual & mechanic engineer | 10 | — |
| Locale / language engineer | 10 | — |

## Round 2b — verifier pass on the prototypes

| Persona | Score | What cost the points |
|---|---|---|
| Motion engineer | 8 | SM5's Unbroken Line and SM3's BATILI strike carried `.m-draw` on the `<svg>` while the `<path>` held the inline `stroke-dashoffset:100` — an inherited property, so the inline value won and neither line could draw. → the class, its `data-anim` and its delay moved onto the `<path>` (as SM6/SM8 already had). |
| UI / UX engineer | 9 | Frame-id chips on the canvas headers wrapped mid-id. → `white-space:nowrap` on every chip. |
| All others | 10 | — |

## Round 3 — final build (the exported artboards)

| Persona | Score | Why 10 |
|---|---|---|
| Visuals & motion engineer | 10 | Every N ends on the layout under both clamps and plays once on the throttle tier; the seal is the shipped seal, amount landing final. |
| Player | 10 | Fifteen clauses readable in full, one lit control per row, the rail always reachable at 360×720, every refusal names the reason and the next step. |
| Gamer | 10 | The reserve rule is taught by the instrument itself: annex stays "Akiba" until the carry, "→4" after; the week-void count never goes negative; no score anywhere but the sunset week. |
| UI / UX engineer | 10 | 44px taps everywhere; zero horizontal overflow at 360 in sw/en/zh; the switch survives 2.25×; the sheet covers the tabs. |
| Professional arts engineer | 10 | The document texture — perforation from the ticket glyph's notches, the stub as a ledger, the double rule — carries the occasion without decoration. |
| Graphics engineer | 10 | sealNil, sealX, sealCheck and clockPending distinguishable at 14px in greyscale; three SVGs on the family's exact grid and stroke. |
| Theme consistency engineer | 10 | 91 tokens, all resolving; 0 colour / ms / curve literals; materials by rung; links brand-300; mono tabular for every datum. |
| Palette engineer | 10 | Gold only on the 4a list; success is hue 166, never --yes-*; a cross is never a void; text ≥ 4.54:1, controls ≥ 3.05:1, the one named exception recorded. |
| Motion engineer | 10 | Three keyframes, one block; only translate/scale/opacity/stroke-dashoffset/clip-path; stagger capped at 4; no loop, no count, no --m-pivot. |
| Betting visual & mechanic engineer | 10 | Every figure traces to the sample data; the floor-before-fee, equal share floored, remainder and top-up lines are printed exactly; no held ticket shows a figure it might win. |
| Locale / language engineer | 10 | 247/247/247 keys with no raw number; dictionary words throughout; Chinese never shrinks a container; EN and ZH proofs for all 12 named frames. |

**Round 3 result: 11 of 11 at 10/10 — on the design's own terms.** Round 4 re-rated it against the live repository instead.

## Round 4 — re-rated against the live source (`kipindi-main`, read file by file)

The owner linked the platform's source. Every persona re-rated the build against the shipped components (`chip.tsx`, `stat.tsx`, `receipt-row.tsx`, `filter-pill.tsx`, `ticket-card.tsx`, `tickets-view.tsx`, `status-tone.ts`, `side-label.ts`, `modal.tsx`, `bet-confirm-modal.tsx`, `globals.css`, `i18n-dict.ts`) rather than against the extracted brief. Scores fell. Each defect names the file that proves it.

| Persona | Score | What cost the points |
|---|---|---|
| Theme consistency engineer | 6 | C1 · Topic and lens pills were outlined in every state; `filterPillClass` draws an unselected pill with a transparent border and `--text-muted` ink, and only the selected one with `border-brand-400`, `--pill-active` and `--glow-selected`. C2 · Status chips were rectangular mono stamps (`--r-xs`, JetBrains Mono, 0.14em); the platform's one `Chip` is a pill in Inter 700 uppercase (10.5px / 9.5px) with a tinted fill, and a ticket's state is painted by `positionStatusChip` — OPEN pending (royal), WIN gold, LOSS betting rose, VOID royal, cancelled slate. C3 · The Millionea ticket list was a bespoke register row; `ticket-card.tsx` is `rounded-xl border bg-elevated p-4` with a chips row, a 44px title link, a two-column `Stat` grid (DAU / MALIPO) and body-sm meta lines with 14px glyphs (the ticket id in mono, "Imewekwa {date}" in a `<time>`), laid out by `tickets-view.tsx` as a 1-column grid, 2 columns from md, under the lens pills. C4 · The question card's category and close label were `--text-subtle`; the journey canvas paints both in `--brand-300`. C5 · The home headline broke mid-sentence ("Jibu swali. NDIO / au HAPANA."); the canvas keeps each sentence whole. C6 · The win ledger's labels were Inter sentence case; `ReceiptRow` sets the label as the mono micro eyebrow and the figure in mono, and colours a fee row whole in `--warning-fg`. |
| Palette engineer | 8 | P1 · IMESHINDA in success hue 166 contradicts `STATUS_TONE.WIN.player = "gilt"` — a won ticket wears the gold chip, and a loss wears the betting rose (`STATUS_TONE_EXCEPTIONS.LOSS`), never a neutral outline. P2 · The fee row was muted grey; the platform's receipts colour the fee row `--warning-fg`. |
| Player | 7 | PL1 · "[legal line — pending]" printed on the win ledger — a player reads a bug. PL2 · "Tiketi 1 za 10/10" (plural concord on one ticket). PL3 · Millionea's Tiketi zangu had no lenses (Zote · Hai · Imekamilika · Umeshinda) while the other two kinds have them. PL4 · The seal said "Wiki 42" twice (eyebrow and label); the shipped seal names what won. PL5 · The two worked ledgers on How to play stood side by side at 360 (≈150px each): the eyebrow and "Kwa washindi" wrapped. |
| Gamer | 9 | PL5; the status words of a Millionea ticket differed from the words a Maswali ticket wears on the same page. |
| UI / UX engineer | 7 | C1, C3, C5, PL5; U1 · the NDIO/HAPANA pair on the question card drawn at 64px with a 16px word where the canvas draws 68px with a 20px word; U2 · the chips strip ended in a hard cut at 360 — the platform fades the trailing 24px so the row reads as scrollable. |
| Visuals & motion engineer | 9 | U2. |
| Professional arts engineer | 9 | C6 — the ledger's typography was its own, not the receipt's. |
| Graphics engineer | 10 | — |
| Motion engineer | 10 | — |
| Betting visual & mechanic engineer | 9 | P1 — a won ticket's status must wear the platform's earned-money chip; the amount stays `.gilt-ink`. |
| Locale / language engineer | 8 | PL2; the lens and status words must be the dictionary's (`common.pending`, `market.resolvedWin` / `resolvedLoss`, `market.udPosRefunded`, `dialog.stakeLabel`, `journey.ticketPayout` / `ticketPayoutAtResult` / `ticketFinalPayout` / `ticketPlacedAt`). |

Also found: the exported artboards on disk were stale against the sources (the list row still carried a clipped purchase time the source had dropped). Every artboard is re-exported after the fixes.


## Round 5 — the platform-aligned build (final)

Every round-4 defect was fixed in the sources, every artboard re-exported, and each persona re-rated against the repository.

| Persona | Score | Why 10 |
|---|---|---|
| Theme consistency engineer | 10 | C1–C6 closed: lens and topic pills are `filterPillClass` (transparent off, `border-brand-400` + `--pill-active` + `--glow-selected` on, 24px fade); status chips are the kit `Chip` in `positionStatusChip`'s variants; the Millionea list is `ticket-card.tsx`'s chassis in `tickets-view.tsx`'s grid; the category and close label are `--brand-300`; the headline keeps each sentence whole; the ledger is `ReceiptRow`. Bespoke equivalents of a shipped primitive: 0. 100 tokens, all resolving; 0 colour / ms / curve literals (re-scanned). |
| Palette engineer | 10 | WIN wears the gold chip and LOSS the betting rose exactly as `status-tone.ts` rules; the fee row is `--warning-fg`; gold is still struck only on earned lines (the chip's gilt is the platform's own earned-money tone); the new pairs measure ≥ 4.65 (text) on the rendered card; the one named exception (the stamp outline, 2.13 non-text) is unchanged and listed. |
| Player | 10 | No placeholder anywhere ("[legal line — pending]" is the two-officer attestation); "Tiketi 1 ya 10/10"; the four lenses sit over the Millionea tickets as over the other two kinds; the seal names the ticket; the worked examples stack at 360; every card reads DAU / MALIPO in the shape the player already knows from a Maswali ticket. |
| Gamer | 10 | A won ticket, a lost ticket and a waiting ticket are told apart at a glance by the same three chips the rest of the product uses; the Seal Line stays the ticket's title; no held ticket shows a figure it might win; the carry (→4) and the reserve annex read identically on card and ticket. |
| UI / UX engineer | 10 | 44px everywhere (pills, the card link, the sheet close); zero horizontal overflow at 360 in sw / en / zh (the strips fade, chips never wrap mid-label, the ticket head wraps under a long chip); the NDIO / HAPANA pair at the canvas's 68px / 20px; one column at 360, two from md. |
| Visuals & motion engineer | 10 | Every N still ends on the layout under both clamps; the strips read as scrollable; no new motion was added by the alignment. |
| Professional arts engineer | 10 | The receipt's typography is the platform's receipt — mono eyebrow labels, mono figures, the amber fee line, the gilt earned lines — so the win ledger, the loss receipt and How's examples are one document family. |
| Graphics engineer | 10 | Glyphs unchanged; the socket family at 18 / 14 on the card keeps the 1.9 stroke distinguishable (re-exported). |
| Motion engineer | 10 | Unchanged: three keyframes, one block, no loop, no count, no `--m-pivot`. |
| Betting visual & mechanic engineer | 10 | The chip law and the payout cell agree with the shipped ticket card: "Matokeo yakitoka" while open, the stake back on a refund or cancel, TZS 0 on a loss, the gilt figure on a win; every figure still traces to the sample data. |
| Locale / language engineer | 10 | 257 / 257 / 257 keys, parity, no raw number (`{closeAt}`, `{salesOpen}`); the status, lens, Stat, placed-at and attestation words are the dictionary's own; singular concord fixed; EN and ZH proofs re-exported for all 12 named frames. |

**Result: 11 of 11 at 10/10 on the platform-aligned build (round 5).** Owner rulings and open questions remain exactly that; O-6 is withdrawn (superseded by platform law, D-40).


## Round 6 — the owner's rulings applied (2026-10-17, final)

Every open question was answered by the owner and applied the same day (DECISIONS "OWNER RULINGS RECEIVED"); two frames were added (U-hub-open-last-hour, S-slip-last-hour) and every frame a ruling touched was re-exported. Each persona re-rated the exported build.

| Persona | Score | Why 10 |
|---|---|---|
| Betting visual & mechanic engineer | 10 | The attested times are the owner's and every surface agrees with them: the register prints them row by row, the live frame (Sun 12:00, 5 of 15) and the cannot-win frame (Sun 21:30, 9 of 15, main 7 the first miss) are both reachable moments on that clock; the week void is certain at A5's Mon 10:24 and refunds print Tue 27 Oct 12:00; a close is never later than Fri 19:00; no held ticket shows a figure it might win. |
| Player | 10 | The close time is always in sight (hub line, slip head, home card); the countdown pill appears only when it matters and counts minutes, exactly as on the Yes/No markets the player already knows; the won ticket's door says "Ona matokeo", the same words as the away line; both held tickets carry real serials and purchase times. |
| Gamer | 10 | A won ticket is a green word and a gold number — the chip never competes with the money; the cannot-win moment is honest (nine results in, one miss, the sentence) with no score and no emphasised row. |
| Palette engineer | 10 | Gold is struck only on earned lines again (the won amount, the shipped header pill and door, the seal's own face); the won chip is the kit's `success` variant at 9.23:1; LOSS keeps the betting rose by the platform's own exception; 0 colour literals (re-scanned); 101 tokens, all resolving. |
| Theme consistency engineer | 10 | Nothing new was invented: the countdown pill is the platform's `.closing-pill` with the dictionary's `closingSoon` + `minsUnit`; the chip is a kit variant; the door is `notif.awayView`; the one platform tension (status-tone.ts `gilt`) is named in DECISIONS and HANDOVER with its one-line fix, not hidden. |
| UI / UX engineer | 10 | Zero horizontal overflow at 360 on every re-exported frame in sw / en / zh (the moved-close line wraps, the pill never does); the hub buy block reads door → pill (last hour only) → printed close → held tickets at 360, 768 and 1280; 44 px taps unchanged. |
| Visuals & motion engineer | 10 | No new motion; the pill inherits the platform's urgent end-state under the reduced clamp; every N still ends on the layout. |
| Motion engineer | 10 | Unchanged: three keyframes, one block, no loop, no count, no `--m-pivot`; O-1…O-3 approved as drawn, O-4 unspent by ruling. |
| Professional arts engineer | 10 | The register is now a true record: every attested row carries its time, the voided week keeps its history and leaves main 5 blank for the reason the clock gives; the seal names both winning serials. |
| Graphics engineer | 10 | Glyphs unchanged and approved (O-5); the hourglass in the pill and the printed line is the same 24-grid 1.9-stroke mark at 14 px. |
| Locale / language engineer | 10 | 269 / 269 / 269 keys with parity; the new strings are dictionary words in all three locales; no raw number ("{n} Dak", "{when} (awali {from})"); no placeholder text remains anywhere in the sources or the data — the only mask left is a previous-week serial the owner was not asked for, listed as such. |

**Result: 11 of 11 at 10/10 on the final build (round 6).** Nothing is provisional; the remaining OPEN-QUESTIONS are build-time confirmations, not design gaps.
