# Tile reading, round 2 — the strict read (the owner's rule: only perfect visual and logical results)

You read real-browser screenshots ("tiles") of 50pick — a Tanzanian real-money prediction market; trilingual sw / en /
zh; one dark royal theme — and report EVERYTHING that is not perfect. The partner judging it (Vodacom) is extremely
critical: a 2px misalignment, a one-word last line, a word in the wrong language, a clipped ring or an uneven gap counts.
A machine already asserted the structure (the right page, the chrome present, nothing past the viewport edge, the
active tab, focus rings measured, counts); your job is what it cannot see.

## How to read
- Open EVERY tile you are given with the Read tool, in the order of its number. Name each tile by its seq number.
- **Measure, never estimate, any claim about position, size, gap, alignment, overlap or colour.** Use PowerShell:
  `Add-Type -AssemblyName System.Drawing; $b=[System.Drawing.Bitmap]::FromFile('<tile>')` then `$b.GetPixel(x,y)` scans
  along a row or column against the background (compare with a background pixel; a difference > ~40 in R+G+B is ink).
  Report the measured numbers. A reader in round 1 reported a capsule "3px from the edge" that measured exactly where it
  belonged — an unmeasured positional claim is not a finding.
- Compare like with like: the same screen across widths (320/360/390/412/1024/1150/1280) and languages (sw/en/zh). An
  element that is aligned in one language and not in another is a finding.

## What counts (each with the tile, what is wrong, where — coordinates — and how you measured it)
1. **Wraps and breaks:** a one-word last line (widow/orphan) in any heading, label, button, chip, card title or
   sentence; a line break that splits a unit that belongs together (a number from its unit, "TZS" from its figure, an
   icon from its label, a brand name like "Mixx by Yas" or "Airtel Money", a Chinese word); text on two lines where one
   was clearly designed (below 360 only the bottom rail's labels may wrap).
2. **Clipping and overlap:** anything cut by the viewport, a card edge, a rounded corner, a scroller's edge mid-letter
   without a fade, or by another element (the Needle dial at the right edge, the chat bubble, a sticky bar); a focus
   ring not whole.
3. **Alignment and rhythm:** edges that should line up and do not (header vs content, rows in a card, labels in a list,
   icons in a column); unequal gaps between siblings; ragged card heights in a grid row; holes in a layout; elements
   not centred where they are meant to be.
4. **Language:** any English word on a Swahili or Chinese tile that is not a brand, a proper noun or market data
   (market titles may fall back to English — say so, do not fail it); any raw key, "undefined", "NaN", "Invalid Date";
   English month names on sw/zh dates (they must read Okt / 10月).
5. **Type and colour against the rules:** money figures in the mono face (`TZS 1,234`, tabular digits); gold only on a
   live balance, the gold deposit pill, and the places DESIGN_AUTHORITY allows (if unsure, put it under DOUBTS, do not
   fail it); text too small to read (below ~12.5px reading copy); low contrast.
6. **Logic:** a state that contradicts itself (a frozen wallet offering a deposit; an unread dot with nothing unread;
   a count that disagrees with the list; a button that looks live where the action is refused; an empty state shown
   beside content).

## Known and by design (do NOT report)
- The staff preview strip ("Onyesho la awali …" / "Toka kwenye onyesho") under the header on journey tiles.
- The Needle dial resting half off the RIGHT edge (report it only if it covers text or a control).
- The chat bubble bottom-right while a page is at rest (it fades after 3 s of no touch, by an owner ruling) — report
  it only if it covers something on a page that cannot scroll it clear.
- No "+" on the gold pill below 360 (a fit rule).
- Up & Down with no live price ("BITCOIN —"): this PC's price feed is down; report only if the empty state is ugly.
- Chinese dates always carry the year ("2026年10月8日"), by the date rule.

## Report
(1) Tiles opened (must equal the files given). (2) FINDINGS, most visible first: tile · what · where (coordinates) ·
how measured · which rule. (3) DOUBTS. Nothing else. Do not edit any file; do not run npm, servers or browsers.
