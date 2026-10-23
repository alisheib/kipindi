# Every lane's saved state — 2026-10-23 ~12:15–12:30 UTC (after Ali's "save progress now")

Each lane's branch head holds its work; these are the lanes' own save reports. Resume each from its LEFT list.

### S7-SHIP — saved 2026-10-23 12:14Z · head fddc779b4 (claude/maswali-s7-s5; code = b05c3abc0), tree clean
- PASSED at ca750cd32/2a1f6fc72: CI 39933343732 battery 708/708, responsive 7641/0, motion 43/0, revoked 46/0, section-gate 21/0, needle-rest 55/35 = main's 35; parity vs 07a400bc3 67/67 (224 cells, 0 differences); e2e:money 64/0, fault 34/0, card 100/0, maswali-money ✓, maswali-fault 16/0; round trip VERIFIED 113; reds fence 19/19, objections 23/23, dal-parity 285/285, money-path 99/99; door census 48/0 + 45/0; objection console 69/0, door 140/0; qa:live default 391/0, ACTIVE 379/0.
- PASSED at b05c3abc0: tsc 0; migration proof vs fd5368668 (112 + the fence; fence 4/4; round trip 112); backup-schema 16/0; test:backup 140/0; 17 two-store suites ≥ floor (engine 203/211, licence-gate 68/65, adversarial 229/238 …); red:maswali-money-path 99/99. At fddc779b4: r5g 66/0, red-anchors 7995/0, config 78/0, plan 13/0, next build 0, qa:first-load PASS (10 routes), qa:live ACTIVE 379/0.
- RUNNING: slot 8 deltas ($F/s7-ship/lic-deltas-b05c3abc0.txt, main-c-b05c3abc0/summary.txt): qa:live default → qa:maswali-admin-drive → c5 in red2 ($F/s7-ship/reds-b05c3abc0-red2/); slot 7 red1 ($F/s7-ship/reds-b05c3abc0-red1/summary.txt): red:maswali-engine (66 caught so far) → red:maswali-licence-gate → red:house-bot-console.
- LEFT: those runs → READY at fddc779b4 to the lead and S6-SHIP.

### S6-SHIP — saved 2026-10-23 ~12:30Z · head 79db50fdc (claude/maswali-s6-release; S6-SHIP 18), tree clean; scratch $F/s6-ship
- PASSED: DB battery (51 suites, from 28edef6cb) 48 green, its 3 load reds green alone at b243a8455 (evidence 68/70, updown-lock-window 24/0, house-bot-ops 100/107); f432cc025 tsc 0 + 20 readers; cd9d1b953 evidence 70/72 + 2 mutation proofs, build + first-load PASS (10 routes).
- PASSED at 79db50fdc: tsc 0; notify 151/157, objections 49/49, adversarial 233/242, purchase 114/117, void 52/57, message-titles 67/67; 22 light; red NOB 7/7; e2e:money 64/0 (drift 0), fault 34/0, card 100/0, report-reads 13/0, tax-report 20/0, audit-roundtrip 3/0, maswali-money PASS, maswali-fault 16/0; legal ACTIVE 36/0, WITHDRAWN 24/0; qa:live ACTIVE 381/0, default 391/0; legal-compare 10/0; door census 48/0 + 45/0; admin-shots 133/0 (72 tiles).
- Reds A (second tree kipindi-mln-int-b at ad0e8b999): 19/22 caught, 0 missed (money-path 135/135, claims 41/41, rbac 34/34, engine 108/108, dal-parity 285/285, fence, objections, plan, tax-report, harm-watch 66/66, failure-reasons 20/20, admin reds); left kyc-gate, withdraw-email-gate, glyph-sync.
- RED, under investigation: qa admin-drive 109/1 at 79db50fdc, 6.4 ("the week void landed, but its audit record could not be fully written"). CI 39944385484 at cd9d1b953: in-memory green; browser gates red on needle/disc glide cases — being compared with main's own needle-rest 35.
- RUNNING: reds A (s6-ship/reds/reds-A-ad0e8b999/summary.txt), then B–D chained at the newest head (s6-ship/chain-reds.log).
- MERGED: S7 2a1f6fc72 (16), NOTICES 71643157b (18). DUE: S7 fddc779b4 (11 conflicts; s6-ship/resolve-s7p.mjs), FLOW a2ef050ee, GUIDE 7c535c15a (+ re-take), NOTICES 11d993ec3 + correctSeal, S7-SHIP READY.
- LEFT: the S7 merge + readers (nav, licence-gate, engine floor) → FLOW → GUIDE → NOTICES → delta reds → READY FOR DOCS → final.sh at the exact head + CI + parity vs 4c75dbbb6.

### FLOW — saved 2026-10-23 ~12:15Z · head a2ef050ee (claude/maswali-flow-fixes), tree clean
- PASSED: FLOW 8 be882d53f admin-plain 48/0, red 30/30 · FLOW 9 7a7e35982 drawn 232/0, plant caught, dark 4/0, reference 31/0, deposit-slip-return 14/0, red 7/7 · FLOW 10 ca7dfc503 maswali-player mem 195/0 + pg 195/0 (plant 194/1, restored), held walk 8/0 · FLOW 11 64dcf520a (release 79db50fdc merged) blob-pin 8/0, red-anchors 8348/0 · FLOW 12 a2ef050ee (slot labels) admin-plain 49/0, red 32/32, admin-guide 11/0, admin-words 2/0, week-controls 8/0, integrity-list 39/0, week-list 19/0, pools-query, form-validation, admin-touch PASS, red-anchors 8352/0, failure-reasons 400/0 · tsc 0 at ca7dfc503.
- RUNNING then: tsc on a2ef050ee ($F/flow/tsc-f12.log); eval run A (player drive + shots 320/360/768/1280 × sw/en/zh + legal walk) on :3744 ($F/flow/eval-a.log).
- Not FLOW's (check at the final gate vs main): qa:cert-c1 2041/13 (13 non-Millionea templates not rendered by the script); house-bot-disclosure 121/2 (legal-nav.tsx = main's new nav; the release's merge of main fixes it).
- LEFT: (2) the Millionea frozen-wallet sentence (buy + slip) + the hub's held-wallet buy block; (3) the evaluation walk (run A, objection door, hub states, tickets, rail/landing, breaks, letters/notices re-check).

### S6-NOTICES — saved 2026-10-23 ~12:25Z · head 11d993ec3 (claude/maswali-s6-objnotice), tree clean
- At 73ccf59eb: test:maswali-notify mem 159/0, pg 165/0; red:maswali-money-path --only NOB1–NOB17 17/17 caught, 0 missed, 0 dirty. At 2e111aad3 (same src): tsc 0; objections 49/0 ×2; adversarial mem 233/0, pg 242/0; red-anchors 8322/0, maswali-claims 670/0, cert-c3 2342/0, kyc-copy-truth 542/0. 11d993ec3 = floors raised to 159/165 only.
- Done and proven: EAT in the purchase bell; an upheld change told to every holder.
- LEFT: the correctSeal ruling (setter read from the present record's own audit row; confirmSeal refuses the officer who wrote the record; objections cases + plants; re-point 10b.8f/8h; FAILURE-INVENTORY + RULES §2.12 as-built) → one heavy batch → S6-SHIP gets the head.

### HUB-2B — saved 2026-10-23 ~12:25Z · head fa04cc4b2 (claude/maswali-s5-r2-hub), tree clean
- HUB 14 bebb5409c: keepFact keeps connectives — facts 20/0, hub 110/0, tsc 0, 8 more statics green.
- HUB 15 b224987e9: main 4c75dbbb6 merged; D19a 44ebc7238; tsc 0; 37 statics green (r7a 50, r9a 63, r9b 60, house-bot-disclosure 123, blob-pin 8, …).
- HUB 16 fa04cc4b2: R3's GhostWords (dcb126d17) merged, no conflict; 17 statics green (maswali-ui 161, hub 110, r9c 82, millionea-shell 50, …). WIP only for tsc (queued; slots busy).
- Runner baselines at b224987e9 (runs a, b, c; no tiles): Chromium 2.625 actions/runs/39949368188 · Chromium 3 39949399563 · WebKit 2.625 39949428809 · WebKit 3 39949457033.
- LEFT: (1) tsc on fa04cc4b2; (2) the hub drawing to GhostWords (static texts unseen; data as templates "Wiki 00", the chip word, the carry's week, the strip's weekday/clock — each strip run two nowrap GhostWords so the break after the dash holds); (3) read the baselines, rerun at the final head with tiles; (4) read every tile; (5) CI on the branch; (6) READY.

### R3-2B — saved 2026-10-23 ~12:20Z · head ced2ce7dc (claude/maswali-s5-r3-fix; S5-R3-FIX 8 WIP: not verified, on 7 dcb126d17 + merge 783c2b2c4)
- PASSED at 7 (dcb126d17): tsc 0, maswali-ui 161/0, journey-shell 566/0, maswali-doors 65/0, millionea-shell 50/0, millionea-dark-edge 38/0, visual-pass-r5h 60/0, nav-tabs-alike 17/0 (red 11/0), offline-neutral, journey-home. At the merge (783c2b2c4): visual-pass-r9c 82/0, r5g 66/0.
- At the WIP (ced2ce7dc): maswali-ui 163/0 (1.3e); maswali-register 63/0, red 127/127 (12.3 ledger labels, 12.4 fingerprints). RED to fix next: maswali-design-register 4.7, visual-pass-r5j 1.1/1.2, visual-pass-r9a 4.10 (moved source pins / census entries).
- Runner jobs: none yet.
- LEFT: (1) fix the 3 reds, DESIGN_AUTHORITY §M4a rule 5 + §M8a item 22, tsc; (2) runner measurements (register-shots, ghost-hops + red, WebKit counts per data cell, the zh re-read); (3) hover-touch verify + red twin; (4) R3-FIX 7's full gates (test:all on the runner, drives, rail tiles).

### UDDOT / HEADER-1024 — 2026-10-23 12:15Z · UDDOT 788de909a (live in 4c75dbbb6), tree C:/50pick-ssd/kipindi-mln-dot clean
- The clean parity re-run of 788de909a vs parity-main-07a400bc3.json (the record; UDDOT is live) started 11:38:49Z: $F/uddot/parity-clean-788de909a/compare.log.
- HEADER-1024 not branched yet (starts when the compare frees the tree). Cause measured (WITHDRAWN, after the dot): at sw 1024 a player or an unverified player's row = nav 502.5 + cluster 400 + three fixed 12px gaps = 14.5px past the content edge (the empty flex spacer still costs two gaps); at ACTIVE, Millionea (81.9px) replaces Matokeo (79.9px) → ~16.5px over. Guests, the held wallet, en and zh fit.
- Planned fix (lead-approved): the fixed row gaps around the spacer become shrinkable — today's widths when there is room, giving up to 24px only when the row is full.
- LEFT: parity counts → branch claude/maswali-header-1024 from 4c75dbbb6 → measure ACTIVE + WITHDRAWN (sw/en/zh × 4 readers × 1024–1920) → fix → guard qa:classic-header-fit with --prove-red plants → tsc, build, qa:live ×2, parity vs parity-main-4c75dbbb6.json, tiles → READY.
- UDDOT's final report (12:30Z): READY at 788de909a (= the code on main). Clean parity re-run log $F/uddot/parity-clean-788de909a/compare.log (+ .done) — do not re-run; expect 2.12 to pass and 4.1 to show only the named dot differences. HEADER-1024's probe draft: $F/uddot/hdr/probe-draft.mjs (mint each reader just before measuring; /auth/demo resets the hold, email state and balance). Reds that predate UDDOT (proven with main's bytes): red:u43-system 29/30 (plant edits udReadUnavailable), red:journey-updown 16/18 (stale expected strings).

### GUIDE — head 7c535c15a (claude/maswali-s6-guide), tree clean; the Desktop PDF = this head. LEFT: the Weeks re-take after FLOW's slot labels (a2ef050ee) — GUIDE-RETAKE.md.
