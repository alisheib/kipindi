# MASWALI MILLIONEA — design critics, ROUND 2 (the common brief; lead asheib-f3, 2026-10-22)

Ali (owner of 50pick, 2026-10-21): *"if you think anything regarding design, animations, or progress of the Maswali game
is not 10/10 rated as player or UI/UX engineer or animation specialist, move it to 10/10 perfectly with full consistency
with our design."* Round 1's critics scored every surface (their reports are your starting point); the lanes fixed their
findings, then a round 2 adopted the shared pieces across lanes. You judge the INTEGRATED product now.

You READ and REPORT only: no edits, no commits, no servers/builds/tests, no git writes. You MAY measure: open a PNG and
probe pixels (PowerShell `System.Drawing`: scan a row/column for an edge, a colour, a gap) — a positional or contrast claim
must carry its measurement.

## The product, the law, the lenses
Read the round-1 brief first and keep everything in it that this file does not change:
`C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\408dbc60-fcd0-43af-899c-8602858935b5\scratchpad\critics\COMMON.md`
(the product, the design law with its file list, CONSISTENCY WITH THE REST OF 50PICK, the four lenses + copy). The design law
files are in the integrated tree named in your prompt. What changed since round 1 is ruled in
`…\408dbc60-…\scratchpad\critics\ROUND2.md` §"Rulings since round 1" and in `docs/DESIGN_AUTHORITY.md` §M8a of that tree.

## What is different in round 2
1. **Your input is your surface's round-1 report** (named in your prompt, e.g. `R1-hub.md`). Re-score the SAME table rows
   (add a row for a state round 1 could not see), and for EVERY round-1 flaw say: FIXED (the tile that proves it) / NOT FIXED
   (tile) / CHANGED APPROACH (judge the new one) / REGRESSED. Then look for NEW flaws with fresh eyes.
2. **The tiles** are the integrated head's render, in the folder your prompt names. Names: `<page or state>-<locale>-<width>.png`
   (the first viewport) and `-s2`, `-s3`… (next scroll steps, 240px overlap); motion frames where the lane captured them. Read
   EVERY Swahili tile of your surface at every width; then en and zh at 360 and 1280, and wherever sw showed a problem or the
   language changes the layout. Read the code (`src/app/millionea/**`, `src/components/maswali/**`) for states the tiles miss.
3. **Scoring rule (binding, so the loop ends):** a cell below 10 must cite (a) the tile(s), (b) the rule or the measurement it
   breaks (DESIGN_AUTHORITY §…, AGENTS §…, a kit/platform pattern by file, WCAG with the measured ratio, a measured px value),
   and (c) the exact fix. A preference with no rule behind it is ADVISORY: list it separately; it does not lower a score.
   Decisions already ruled are not reopened — e.g. L16 (the kit ghost border stays), the decided words (Ali ruled the sw/zh
   words final; a word change needs a defect: wrong meaning, a clash with another surface, a broken placeholder), the chat's
   .50 yield, §M8a's items. If you believe a ruling is wrong, say so in one line under "for the lead", score against it anyway.
4. **Consistency is scored across surfaces**: the same fact, money row, chip, week row, time or count must look and read the
   same on the hub, the slip, the tickets, the register, the doors and /results. Name any surface that disagrees with another.

## Your report (your final message is all the lead sees)
1. The score table (rows × Player · UI/UX · Visual · Motion-as-seen · Copy), each 0–10.
2. The round-1 flaw status list (FIXED / NOT FIXED / CHANGED / REGRESSED, each with its tile).
3. Every NEW flaw that costs a point: severity (HIGH / MEDIUM / LOW), tile(s), the rule or measurement, one-sentence defect,
   the exact fix in 50pick's terms (token, kit component, existing platform pattern, the words in en/sw/zh).
4. ADVISORY notes (no score impact).
5. For the lead: anything that needs a ruling, and cross-surface inconsistencies with the other surface named.
Be exact and be honest: a 10 you did not earn misleads Ali; a flaw you invent costs a fix round.
