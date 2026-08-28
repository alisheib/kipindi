# OPEN-QUESTIONS

## Needs an answer from you

1. **D-2 (guarantee vs progressive)** — out of scope as briefed; both C heroes show the
   pool-only form. If the guaranteed variant wins, the hero is a different screen (F7:
   the displayed guarantee is min(advertised, funded) or nothing) and needs its own round.
2. **D-4 (void rule)** — the rules-strip slot 1 is designed and empty. Also undrawn on
   purpose: how a VOID question renders on the receipt's ten rows and whether the score
   line shows "x kati ya 9". One ruling, two surfaces.
3. **D-6 (ticket cap)** — rules-strip slot 2. Also: does the cap change the CTA after the
   first ticket ("Nunua tikiti nyingine · 1 kati ya N")?
4. **Ticket serial pre-purchase** — the slip carries no serial until paid (nothing false is
   printed); confirm the serial is minted at payment, as B1 assumes (MSW-0012-004417).
5. **Rollover line on the loss receipt** — B1 states "Millionea — hakuna · pool imesogezwa
   mbele" as bookkeeping. If rollover messaging is judged an inducement on a loss surface,
   delete the row; the receipt stands without it.
6. **B11 row for Maswali ticket status words** — the status-tone dictionary has no Maswali
   surface yet. B1/B2 avoid status chips entirely (facts only) until a row exists; note
   that player-side RESOLVED = struck gilt would put gold on a losing ticket's list row.
7. **Final Swahili strings** — all copy here is representative, written to the measured
   budget (rows ≤ 93 chars, every question "Je, "); final keys belong to the dictionary
   and the label modules (maswali-tier-label.ts; outcomes reuse side-label.ts).
8. **--success-\* aliases the YES ramp in tokens-LOCKED.css** — law 6 insists SUCCESS IS
   NOT YES (166 vs 152), and the brief describes --success-500 at hue 166 / chroma 0.12,
   but the locked extract defines --success as var(--yes-500) and --success-fg as
   var(--yes-200). We reference the semantic tokens (correct either way); confirm whether
   the hue-166 family lives in globals.css beyond the extract (live repo wins) or the
   alias is intended. Until answered, the ✓ marks and the 10/10 helper will render in the
   YES hue on ship.
9. **Bottom-rail slot** — the artboards show Maswali as the middle slot of five. Which
   existing slot yields (Results moved under "more"?) is a product call, not a design one.

## The 1024–1279 band

- **The slip page itself adds nothing to the header** — no new control, no countdown in
  global chrome (law 1 / Q8 precedent). The band's existing degraded composition is
  untouched by Set A/B/C.
- **The product link is the risk.** A "Maswali" item added to the 6-link desktop nav will
  re-break 1024–1279 exactly the way the inventory documents (the band already survives by
  subtracting two controls). Recommendation: at lg–xl Maswali lives under "more"; it gets a
  top-level link only at ≥1280. If it must be top-level in the band, one existing link has
  to move under "more" in the same change.
- **Sticky rail above 1024:** the bottom rail hides at lg, so the progress rail docks alone
  to the viewport bottom. At ≥1024 the countdown pill and CTA are both above the fold on a
  720-tall viewport, so the rail can drop its compact pay button there (progress + count
  only) — flagging rather than deciding, since it is a desktop nicety, not a floor.
- **880px** — the off-ladder switch is a detail-page concern; the slip's single-column
  document passes through it with no structural change.

## Assumptions safe to correct

- Balance pill and deposit chrome copied from the reference frames (gold deposit kept as
  shipped; D1 governs the in-flow confirm, not the chrome CTA).
- Countdown numerals set in mono (see DECISIONS #21) — if the shipped countdown-pill uses
  the display face, the live repo wins.
- The fold frame uses 720px as the representative 360-wide viewport height.
