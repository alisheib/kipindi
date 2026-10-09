# R6-A brief — responsible gambling: the break's emails, and no bet offered during a break (round 6 review, HIGH)

You are fixer R6-A for 50pick's Vodacom visual pass. Read first, completely: S\briefs\r5-common.md (the rules — where it
says "1699302a" read the tip below), then reviewer A's report and evidence: S\review6\A\log.txt and the scripts and
outputs it names (t2-rg-email.mts + t2-out.txt, t4-break-bet.cjs + t4-out.txt, t5-tickets-tabs.cjs + t5-out.txt).
Worktree: F:\kipindi-r6a (branch vodacom-visual-r6a at vodacom-visual's tip 89893725, rebased on main 118fc75c, with
every round-5 helper merged). Suite: scripts/visual-pass-r6a.test.mts → test:visual-pass-r6a.
⚠️ OMEGA's memory is shared and tight: suites strictly one at a time; no dev server, build, tsc, browser or battery.
⛔ RESPONSIBLE GAMBLING: never reword or remove an RG sentence, notice, helpline or limit control. Every item below
ADDS protection or corrects a date's formatting; the words are the dictionary's (rg.breakActive, rg.exclusionActive,
breakSentence, formatBreakEnd and the existing month words). If an item needs a NEW sentence, stop at it and list it
under S12 — never write one. If a tool refuses an edit on an RG file, stop and report it; never work around it.
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

A1 (HIGH) · the break and self-exclusion confirmation EMAILS state the end as a UTC calendar day with no time
    (responsible-gambling.ts ~38-39 `fmtDate` → toLocaleDateString("en-GB"), no timeZone; production runs in UTC), the
    Swahili line prints the English-month date (email.ts ~1575-1583 selfExclusionHtml) or `untilIso.slice(0,10)`
    (~1588-1601 coolOffHtml); a permanent exclusion reads "for permanent … until 15 Sept 2126". A break taken 01:30 EAT
    reads a day early. Fix: pass the instant to the builders; format each language's line on the EAT clock with its
    own month words (formatBreakEnd with the dictionary's monthsShort, as agentRevokedHtml does since R5-B); when the
    exclusion is permanent (selfExclusionStandingOf), say permanent with the dictionary's existing word — never a date.
    Sibling: betPlacedHtml's "Resolves" row (`market.resolutionAt.slice(0,10)`, a UTC day) → email.ts's own
    fmtDateTime. ⭐ Make A1 ONE self-contained change (only the server email/RG files + its test) — it will be
    cherry-picked onto main as a hotfix ahead of the pass; say exactly which files and hunks form it.
A2 (HIGH) · during a break the market page still offers the full bet panel (markets/[id]/page.tsx: `bettingOpen` has
    no break term, ~334; SidePicker ~741), and Up & Down offers its one-tap stakes (updown-card.tsx ~676/~1006,
    round-stake-panel.tsx ~57/~109). When a break or exclusion is active (the page's `isLockedOut` read; fail OPEN on a
    failed read, as today), render the break's notice (the deposit page's neutral Callout pattern, lock glyph,
    rg.breakActive / rg.exclusionActive with the end, role=status) in the bet column instead of the SidePicker (keep
    the column's heading), and the same in the Up & Down card and round panel (read the lockout in those pages). Both
    shells (a page body). Find every other place a stake can be started (the dial, quick bet, home featured card's
    YES/NO, board rows) and classify each: gated by the page it opens, or needs the same gate.
A3 (HIGH) · two empty states invite a first bet during a break: Tiketi zangu's Juu/Chini tab (updown/history/page.tsx
    ~303, ~378-389: "Weka dau kwenye ubao…" + a primary "Juu na Chini" button) and /positions/performance (~202-211:
    "Weka utabiri wako wa kwanza…" + "Browse markets"). Do as R4-I did for TicketsView (tickets-view.tsx ~88-109):
    during a break show breakSentence(rg.breakActive | rg.exclusionActive, until, …) and no bet button. Sweep every
    empty state a signed-in player can see for the same pattern.

Owner notes (not to fix): the invite and proposals doors during a break; classic chrome's deposit doors.

PROOF as r5-common.md says (suite with controls/plants, a mutation proof under S\r6a\, every suite reading a touched
file — the RG suites among them: rg-doors, rg-policy, kyc-gate, journey-account, feedback-law, red twins). Name exactly
what a lock turn must check in a browser (a break session on the market page, Up & Down, Tiketi zangu, performance).
REPORT exactly as r5-common.md says.
