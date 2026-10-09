# R5-G brief — one page, one name; the regulator's one name (round 5's follow-up, consistency)

You are helper R5-G in the follow-up round of 50pick's visual pass for Vodacom. Read first, completely:
S\briefs\r5-common.md (the rules — CONSISTENCY above all; where it says "1699302a" read the tip named below), then
S\visual\triage-r5.md (§ "For the follow-up round") and the R5 reports' notes quoted here.
Worktree: F:\kipindi-r5g (branch vodacom-visual-r5g at vodacom-visual's tip eaed15d0: rebased on main 118fc75c, with
R5-A, R5-B, R5-C, R5-D, R5-E and R5-F merged). Working at the same time in their own worktrees: R5-H (the loading ghosts
out of every refresh, the journey flag — F:\kipindi-r5h, at an older tip) and R5-I (state inks — finished, merging
next); R5-J (counts and figures) and three reviewers may start later. Stay in your area; name others' files for the
integrator. Note R5-A's keepRegulator matches the zh name's break hint as `\p{Cf}` (no invisible character in source —
R5-E's census, test:visual-pass-r5e §6.5, forbids raw or escaped NBSP/ZWSP/WJ in player code).
Suite: scripts/visual-pass-r5g.test.mts → test:visual-pass-r5g.
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

Read the merged round-5 commits first (`git log --format=%B -6` in your worktree): R5-A made the journey's hub, avatar
menu, footer and profile rows name each page as the page names itself (F17, `hub-rows.ts`, `avatar-menu.tsx`'s
`journeyName`, `public-footer.tsx`); R5-B gave the journey's money doors one pair, `journey.depositAction` /
`journey.withdrawAction` (sw "Weka pesa" / "Toa pesa"), via `resolveSimpleJourney`; R5-D moved the deposit page's
loading drawing into `DepositGhost` (also drawn in the browser by `components/journey/route-ghost.tsx`).

YOUR ITEMS
G-1 One page, one name — the money pages. In the journey /wallet/deposit's h1 reads "Amana" (eyebrow "WEKA PESA") and
    /wallet/withdraw's "Toa fedha" (eyebrow "TOA"), under journey doors that say "Weka pesa" / "Toa pesa". The journey's
    pages take the journey's keys (composition — no new words); classic keeps its words. The page's loading ghost and
    the browser-drawn route ghost must land on the same words (the ghost's words land where the page's do, R4-J/R5-D),
    and the page's `<title>` / metadata must agree with its h1 in the journey (check how R5-A treated titles). Then the
    SWEEP (consistency): every journey door → the page it opens, for every page a journey player can reach (hub rows,
    avatar menu, footer, the Wallet's buttons and empty states, the bell's notices that link somewhere, the receipt
    page, the bottom tabs, the Up & Down entry, the profile rows) — list each pair door-word / page-h1 / page-eyebrow /
    ghost / `<title>` per locale, and bring each to one name or state why it legitimately differs (an action door like
    "Weka mipaka" names an action — R5-A ruled those). New words needed → S12, never a dictionary change.
G-5 The regulator's one name (R5-A's F18 siblings). R5-A kept "Gaming Board of Tanzania" whole wherever its line can
    hold it in the journey footer and the hero's trust row (`keepRegulator`, `.kp-gbt`). Siblings it named: the opt-out
    shell's footer (app-shell.tsx ~652; the sw name fits from 330px) and the offline page (offline-document.ts ~220,
    R5-D's person-free document — no client JS there; CSS only). Find every other place the regulator's name renders
    (grep the three locales' strings) and apply the one rule. The classic footer is frozen chrome — never touch it.


PROOF as r5-common.md says (suite, controls/plants, mutation proof under S\r5g\, every suite that reads a touched file).
Predict every "after" and list exactly what a lock turn must re-tile.
