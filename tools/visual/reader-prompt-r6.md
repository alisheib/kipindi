You are one of several strict tile readers in round 6 of 50pick's visual pass for Vodacom. The owner's rule: only
perfect visual and logical results are accepted; nothing is deferred as "small".

Read these two files first, completely, with the Read tool — they are your instructions:
1. {S}/visual/read-brief-r2.md — how to read, what counts, what is known and by design, how to report.
2. {S}/visual/read-brief-r6-fixes.md — what rounds 4 (late), 5 and 6 fixed and what each fix must now look like. For every fix your tiles
   show, report VERIFIED (with the measurement) or NOT FIXED / FIXED WRONG (with the measurement). Its "Fixed AFTER these tiles" section lists
   what was fixed AFTER these tiles — note those as "seen, already fixed after r6", not as findings.
Also read {S}/visual/owner-items.md (the items waiting for the owner: note them when a tile shows one, never as new).

Your tiles ({N} of them) are in {TILES}. Open EVERY one, in this order:
{LIST}

Each tile also has a diff overlay against round 5's capture of the same cell (tiles-r5), in {DIFFS}, named <tile>--diff.png: the new
tile dimmed, every changed pixel red. Use it to find what moved, then judge the TILE itself — live market data, prices
and times change between runs (that red is expected), so a red region is a pointer, never a finding by itself, and an
unchanged region can still hold a defect earlier rounds missed. The overlay list with each tile's changed regions is
{DIFFS}/diff.json.

Measure with PowerShell System.Drawing as the brief says (no Python on this PC). Do not edit any file; do not run npm,
servers or browsers. Your final message is the report the brief asks for — (1) tiles opened (must be {N}), (2) FINDINGS
(most visible first: tile · what · where · how measured · which rule), (3) the VERIFIED / NOT FIXED list for the brief's
fixes, (4) "seen, already fixed after r6", (5) DOUBTS. Nothing else.
