# S4 design canvas — the durable copy (2026-10-03)

The agency's five journey screens re-drawn in 50pick's design system (the Vodacom plan, S4; `docs/VODACOM-PLAN.md`
§0g). These 102 boards plus `canvas.json` (the board layout) and `Main.dc.html` (the index board) were authored on a
claude.ai Design artifact, which was the only copy until now.

**Why this folder exists.** On 2026-10-03 the artifact (`UGVgjpiQFwep2hzfYLf3M6`) could no longer be read ("artifact
not found" — deleted, or not shared with the signed-in account). The working copy that sessions read the boards from
lived only in one session's temporary scratchpad, so it is committed here, unchanged, as the frames' durable home.

- **Functionality authority** for the journey's screens (the plan's rule: functionality = the deck, LOOK = 50pick):
  the S6 change sets cite these boards by file name (for example `s4-9-tiketi-open.dc.html`).
- **Format:** each `*.dc.html` is one board, self-contained HTML with its own styles; open it in a browser to view it.
- **Not app code:** nothing under `src/` imports these files, and Tailwind's content scan (`src/**`) never reads them.
- **Revising a board:** edit it here, in the same commit as the change it records; the artifact is no longer the source.

**Revised 2026-10-07, by the owner's ruling of that day** (NEXT-PLAN ▶ 0e; VODACOM-PLAN §0, §3.6): the minimum deposit
and stake are TZS 1,000, and a deposit asks no email question. `s4-5-low-min500.dc.html` is redrawn for the TZS 1,000
minimum ("Weka pesa TZS 1,000", and TZS 800 left in the balance; it keeps its file name, which is `canvas.json`'s key).
The six `s4-6-code-*` boards (S9's email code) are kept as drawn and marked ⛔ superseded in their titles and in
`canvas.json`: S9 asks no code and they are not built.

**Noted 2026-10-12, not redrawn — the owner's ruling of that day** (COMPLIANCE-DECISIONS 2026-10-12): the minimum STAKE
is TZS 500 again; the minimum deposit stays TZS 1,000, so the s4-5 boards stand. `s4-4-sheet-below-min.dc.html` draws a
TZS 500 stake refused at the TZS 1,000 minimum — at the 500 minimum that stake is legal, and the refusal is drawn for a
stake under 500 with "Dau la chini kabisa ni TZS 500". The sheet boards' default stake and chips (1,000 / 2,000 / 5,000 /
10,000) are the old minimum's; at 500 the sheet opens at TZS 500 and `quickStakes` gives 500 / 1,000 / 2,500 / 5,000.

**Redrawn 2026-10-14, by the owner's Up & Down ruling of that day** (COMPLIANCE-DECISIONS § "2026-10-14 · Up & Down
cards show Up and Down only") **and S12 WP9, in the commit that builds the journey arm** (`S12-PLAN.md`; branch
`codex/vodacom-s12-j`): `s4-11-updown-panel.dc.html` loses its two multiples ("≈1.63×", "≈1.96×"), the "×" note
under the buttons and the pool line (S12-PLAN Open point 17: the card's own split row stays as it is), and draws the
500 minimum's chips (500 / 1,000 / 2,500 / 5,000) and the prompt with its stake; `s4-11-updown-low.dc.html` loses the
compact row's "≈1.46×" and its two disabled side buttons become the sheet's one gold commit, disabled ("Weka dau ·
TZS 5,000", Open point 6, a call under his delegation). Open points 4, 5, 15 and 17 were accepted by Ali on 2026-10-14
(Points for Ali 7 and 12). `canvas.json` carries the new heights; the other boards are unchanged.
