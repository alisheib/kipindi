# MASWALI MILLIONEA — round 2 of the 10/10 pass (2026-10-22): the lanes' common brief

Every lane's round-1 work is merged into `claude/maswali-s5-release` @ 7e9a314f0 (or later — fetch first): DOORS, HUB,
SLIP, TICKETS, REGISTER, PLATFORM D1–D15 and FIX-SRV, plus the salesPaused Fill (one glyphs:gen, app.b899eae1.svg).
tsc 0; every Maswali suite green. Round 2 judges the INTEGRATED product: what each lane changed now meets what the
others changed (§T5 numerals in every fact line, zh spacing, the one ledger and its note line, the week chip, the
moments, the kit hand-off, the chat's yield at .50, the preview bar, the route ghosts).

## Setup (your tree is clean; its node_modules stays valid — same lockfile)
`git fetch origin && git switch -c claude/maswali-s5-r2-<lane> origin/claude/maswali-s5-release`, then push the new
branch at once (full refspec + ls-remote). Work ONLY on that branch.

## The loop
1. Your round-2 wiring items (in your lead message).
2. Re-shoot your WHOLE surface on the integrated head — every state your seed and shot scripts cover — at
   320 · 360 · 768 · 1024 · 1280 · 1920 × sw / en / zh, every page to its end, and READ every tile (sw first). Measure
   positional claims. Anything off is fixed in your files; anything in another lane's file → message "main" with the
   exact gap (file, line, tile) — never fork.
3. Re-score your critic table honestly; every cell must be 10 (a cell below 10 says exactly why and what would fix it).
4. Checks: every suite that reads a file you changed (git grep), its red twin when it has one, tsc (slot helper).
5. Commit in small steps, push after every commit; final report as in round 1 (table + proving tiles, per item,
   strings in en/sw/zh, checks with printed counts, reds with proof of origin, final head, `git status --short`).

## Rules (unchanged)
critics/DESIGN-LANE.md and LANE-COMMON (with its overrides). Heavy jobs only through
`bash C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad/mln-slot-s5x.sh <lane> <cmd…>`
(slots 1, 2, 3, 5) — or `mln-slot-s78.sh` (slots 7, 8) when those are free; the RAM gate holds both. Your own ports and
KP_SCRATCH_PORT as before. Never push main; never touch another lane's tree, kipindi-mln-not, kipindi-mln-rb or
kipindi-mln-pbase. Stop only your own servers.

## Rulings since round 1 (MERGE-NOTES has the full list)
- §T5: every digit run in a Millionea fact line is a `.mono` numeral (keepFact/MaswaliFacts, DOORS); a time is the weekday
  in the body face and the clock a `.mono` numeral (L7).
- zh: a space only where a Latin letter or a digit meets Han, never between two Han characters.
- One ledger (`millioneaLedgerRows` / `MaswaliLedger`) for every Millionea money table; a row's note on its own
  full-width line under the label and the value; a figure-less row is its sentence alone.
- One week chip (`WeekStateChip`), one week row (`WeekRow`), one phase (`millioneaWeekPhase` / `weekPhaseWord`).
- The chat bubble yields to .50 (`--state-yield-opacity`) over text and figures (PLATFORM D15) — a figure under it reads.
- A dialog's way back never moves the page (§M8a item 18).
- L16 (kit ghost border 1.79:1): NO change — WCAG's non-text minimum binds a border only when it is what identifies the
  control; a ghost button is identified by its label.
