# HUB tile reader (en/zh phones) — raw findings, UNVERIFIED (2026-10-22 PM, stopped at the lead's hard stop)

Tiles: HUB's run a on a7b7c894c (`$F/hub/r2/tiles-a`, `sheets-a` on OMEGA). y values are inside the 780 px tile named.
Coverage: 64 of 183 files read in full (after-classic en 320/360, after-journey-zh-320 s1-s4, open-journey-zh-360 s7-s9, all
paused/resolving/settling/voided/voiding classic en+zh at 320/360); 50 seen only in an earlier pass ("earlier pass", not
re-verified); 69 UNREVIEWED (after-journey-zh-320 s5-s8, after-journey-zh-360, break, cancel, cap, closed, closing,
guest-classic, guest-journey-en-360, guest-journey-zh-360 s1-s6). Tooling: give a reader ≤ ~40 files and have it write findings
after every few reads (the Read tool drops images after ~60-70).

## Findings (file · element · defect · severity · confidence)
- voiding-classic-en-360 (s3 y≈255-687, s4 y≈129-423) · void-reason line in every struck question row · "Void · too few reserves: the week is due to be / voided" strands "voided" alone in all six rows (320 breaks "due / to be voided", fine) · med · sure
- voiding-classic-zh-320 (s1 y≈318-378) · dashed notice · "…有效备选题仅 5 / 道。若至周二 23:59 / 无异议…": 5 cut from its measure word 道, line 2 a short stub (zh-360 clean) · med · sure
- voiding-classic-zh-320 (s6 y≈612-638, s7 y≈95) + zh-360 (s6 y≈600-625, s7 y≈82) · LAST WEEK card · "第49周 · 无 10/10 · TZS 88,000 滚存 / 费用 0": "费用 0" stranded, the "·" before it lost (en uses a deliberate two-line layout) · med · sure
- voiding-classic-en-320 (s2 y≈544), en-360 (s2 y≈528), after-classic-en-320 (s2 y≈499), en-360 (s2 y≈465) · pool ledger sub-line · "1 tickets at TZS 1,000" — wrong plural · med · sure
- paused-classic-en-320 (s2 y≈370-510) · pool ledger · header cells wrap ("Carried in from / Week 47 >", "Not yet / settled"), "Total / pool" wraps with "at least / TZS 46,000" left-aligned at x≈437 instead of flush right (x≈617) like every other row; en-360 and zh-320 fit · med · sure
- after-classic-en-320 (s1 y≈98-136) · first notice · "…TZS 88,000 carried forward into / Week 50." leaves "Week 50." alone (360 fine) · low · sure
- paused/resolving/settling/voided/voiding-classic-en-360 (s1 y≈233-253), after-classic-en-360 (s1 y≈389-409) · intro paragraph · "…10 main and 5 reserve. A / ticket is TZS  1,000…": article "A" stranded at line end; a visibly wide gap inside "TZS  1,000" (mono face, same at 320) · low · sure
- intro paragraph, all en and zh · numerals "15", "10", "5" in the body face while "TZS 1,000" in the same paragraph is the mono numeral face · low · uncertain
- open-journey-zh-360 (s8-s9 y≈285, 461, 563) vs classic zh · footer links worded differently per shell: journey "市场提议 / 帮助 / 隐私政策", classic "提议市场赚奖金 / 帮助与支持 / 隐私声明" · low · sure
- zh generally · spacing between Chinese and digits/Latin inconsistent: none in "第49周", "第50周题目", "2026年12月4日", "游戏RTP和规则", "反洗钱/KYC政策"; spaces in "第 1 个事件", "58 张", "WhatsApp 频道"; no space seen between two Chinese characters · low · uncertain
- zh footers · section labels 安全博彩 / 公平性 / 隐私 render ~9 px against 14 px links · low · uncertain
- zh question rows · "事件周六 09:00" has no separator after 事件; "吗?" looks ASCII, not full-width "？" · low · uncertain
- RESERVES card header, all files · the label repeated as the first words of the sentence below it · low · uncertain
- classic page foot (resolving/settling/voided/paused en-360) · ~118 px empty band between the "How to play / Week register" row and the footer rule · low · uncertain
- voiding en/zh 320/360 (s3-s4) · struck-through question titles look different on alternating rows (grey vs blue-tinted); in zh the blue strike shows mainly after the "?" · low · uncertain
- all files, header · wallet balance chip "49,000" / "TZS 49,000" drawn in gold (platform chrome; rule 6: non-won money must not be gold — check) · low · uncertain
- after-journey-zh-320 (s1 y≈90-110) · preview banner "预览 — 您正在查看…" uses a spaced Latin em dash inside Chinese · low · uncertain
- earlier pass: noweek-classic en 320/360 (s1 y≈415) "The next week opens Monday / 00:00." splits the weekday from its time · med
- earlier pass: noweek-classic zh 320/360 (s1 y≈415) "…开放。15 / 道题目" cuts the number from its measure word · med
- earlier pass: noweek / noweek-paused classic (en+zh, 320+360) · ~330 px / ~250 px empty space above the footer · med
- earlier pass: moved-classic-en-320 + open-classic-en-320 (s2 y≈440-540) · the same "Total / pool" wrap with left-aligned "at least / TZS xx,000" · med
- earlier pass: moved-classic zh 320/360 (s1 banner) · "（原为 18:00）" breaks inside the parenthesis · low
- earlier pass: moved, objections, open (classic + journey) en-360 (s1) · the same "A / ticket" break · low
Not found in the 64 verified files: gold jackpot/pool/floor/carry figures, money figures split across lines, a line starting or
ending with "·", English words on zh pages, a space between two Chinese characters, empty boxes, cut-off buttons.
