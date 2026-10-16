# `MASWALI-DESIGN-R2` — what Claude Design will most likely return

> Part of the R2 commission folder ([`BRIEF.md`](BRIEF.md)). Written before sending, from how R1 (August), the landing
> round (v4) and the Vodacom S4 canvas (v5) actually came back. It sets expectations for D2; it is not an acceptance
> list — that is `PROMPT.txt` §14, scored by [`RECEIVING.md`](RECEIVING.md).

**What will most likely come back**
- **A `MASWALI-DESIGN-R2/` folder, roughly in the requested shape.** Expect one or two extra files despite §11, as v4's `ACCEPTANCE.md` and `UPDATE-*.md` showed.
- **Documents:**
  - `README.md`: about 120 lines, with a self-check that mixes numbers and adjectives.
  - `FRAME-INDEX.md`: about 230 cells. Many 768/1280 and ZH cells will be marked "canvas-only".
  - `DECISIONS.md`: 30 to 45 entries, with an owner block that carries N1–N3, "N4: unspent", and the six other owner items.
  - `OPEN-QUESTIONS.md`: 15 to 22 items.
  - `TOKENS-USED.md`: 70 to 95 names, with the markers present.
  - `MOTION.md`: complete for N1–N3, thin on measured fps.
  - `HANDOVER-CLAUDE-CODE.md`: 15 to 22 WPs, weighted to S5 and S6.
  - `i18n-draft.json`: 200 to 320 keys per locale.
- **Artboards:** 70 to 130 PNGs. The 360 SW set will be complete. 768 and 1280 will be strong for H, U and S and thin for W and P. Expect 8 to 12 EN/ZH proofs.
- **Other folders:** 9 storyboards; 10 motion HTML files plus the N-block; 3 SVGs and 2 sheets; 8 to 14 `.dc.html` canvases plus `support.js`.

**How the moments will look and feel**
- **SM1, the purchase.** The confirm sheet sinks away. The result modal lifts once, and its crest lands like a rubber stamp: up 3px, a hair of squash, still. When the ticket first opens, a slanted blade-wipe crosses the perforation, then the stub drops 8px with one hair of overshoot. It reads as "issued", not "won", in about half a second.
- **SM2, the close.** A neutral band slants open. "Endelea" fades down and out, and the stub's lock line seals in. Nothing buzzes, and the countdown pill simply stops existing.
- **SM3, the press.** A small outlined mono plate slides about 8px down-right along the needle's slant and presses (1.02, then 0.98, then 1). It looks identical on every row, like a clerk stamping a ledger.
- **SM4, the carry.** This is the most distinctive moment. The small A1 ring lifts out of the annex and glides into the vacated socket 4, growing from three-quarter to full size. It lands, becomes a tick or a cross, and leaves "→4" behind. It teaches the reserve rule in under a second.
- **SM5, the win.** One green hairline threads ten ticks. The existing seal stamps down with its amount already struck in gilt, with no rolling digits. The ledger cascades, then everything is still.
- **SM6–SM8.**
  - SM6: two hairlines close the loss receipt.
  - SM7: the carried figure glides into "Imeletwa mbele", and the Jackpot line dips once if its value changed.
  - SM8: the stub rises and rejoins, and a neutral "IMEREJESHWA" band slants open.

**The 10 most likely deviations**
1. **Coverage hidden as canvas states.** "canvas-only" cells marked done, or states reachable only behind URL parameters.
2. **Gold, both ways.**
   - Too much: gilt on "Endelea", the hub door, the IMESHINDA chip, the Unbroken Line or "10/10", or a "for comparison" gold-jackpot frame.
   - Too little: the shipped gilt deposit doors stripped to brand.
3. **A figure on a held ticket.** The jackpot printed on the confirm sheet ("pay 1,000 · jackpot 1,000,000"), on the slip header, or on ticket rows.
4. **Seal tampering.**
   - The 900ms count kept.
   - A "Millionea seal" variant.
   - The coronet placed in the seal face.
   - A sunset seal drawn with a score.
5. **Motion overreach.**
   - Extra keyframes (a perforation tear, an Unbroken Line keyframe instead of `.m-draw`).
   - N2's stops reverted to 1.04 / 0.985.
   - N-classes added to the `[data-motion="reduced"]` list.
   - An `infinite` pulse on awaiting sockets.
   - FLIP done with `requestAnimationFrame`.
   - `--m-pivot` on the press.
6. **Token drift.**
   - `--dur-*` / `--ease-*` aliases.
   - Invented helpers (`--stamp-ink`).
   - `color-mix()` compositions.
   - Canvases still linking `tokens-locked.css`.
   - The title back at 24px.
7. **Rule drift.**
   - Reserves drawn as unanswered.
   - Pairing by void time.
   - A voided reserve consumed instead of skipped.
   - A fee shown in rollover weeks, or the floor drawn as rolling.
   - "Alama 7/10" on a live or lost ticket.
   - Categories "Hisa" or "Burudani" instead of Uchumi or Utamaduni.
   - A carry drawn before all 15 results are final.
8. **Language.**
   - "salio halisi" or "pesa halisi".
   - "akiba" unflagged.
   - "tikiti" or "pool".
   - Single-letter picks in compact lists.
   - ZH containers shrunk.
   - Raw numbers inside i18n strings.
   - A licence claim in the How to Play copy.
9. **Glyph faults.**
   - sealNil reads as a no-entry sign or a minus at 14px.
   - A coronet with filled pearls, or one confusable with `crown`.
   - sealX paths altered.
   - The `G` wrapper ignored.
10. **Packaging.**
    - A claude.ai link instead of files.
    - `support.js`, `canvas.json` or `assets/` missing.
    - Edited token copies.
    - A DESIGN_AUTHORITY copy.
    - A DOOR_CLAIMS phrase in a README.
    - A proposed filing path.
