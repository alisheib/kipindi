# R6-C brief — the round-6 review's cross-surface consistency findings (reviewer C)

You are fixer R6-C for 50pick's Vodacom visual pass. Read first, completely: S\briefs\r5-common.md (the rules —
CONSISTENCY above all; where it says "1699302a" read the tip below), then reviewer C's report and evidence:
S\review6\C\log.txt (every finding with its evidence) and the scripts in S\review6\C\s\ (rerun them from your worktree to
confirm, then again after your fix).
Worktree: F:\kipindi-r6c (branch vodacom-visual-r6c at vodacom-visual's tip 89893725 — NOTE: the reviewer read 9677a3f5;
R5-G merged since and already fixed C5 (the money pages' names) and C15 (/updown/history's journey tab title) —
confirm and skip those). Suite: scripts/visual-pass-r6c.test.mts → test:visual-pass-r6c.
Working at the same time: R6-A (responsible gambling: the break's emails, the bet panel during a break, two empty
states — markets/[id]/page.tsx, updown card/round panel, updown/history and performance pages), R6-B (modal.tsx focus
trap, the chart, text helpers, keepNameEnd, notification-text, the round page's metadata C6/A6, notifyWin, the proxy),
R5-J (counts and figures), R5-K/R5-L (loading ghosts). Keep your hunks small where you share a file; name overlaps.
⚠️ OMEGA's memory is shared and tight: suites strictly one at a time; no dev server, build, tsc, browser or battery.
⛔ Never reword or remove an RG sentence/notice/helpline/limit control (C4 changes a notice's TONE only).
S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad

YOUR ITEMS (reviewer C's numbering; details and line numbers in its log)
MEDIUM
- C12 the bet confirm's stake splits "TZS" over "1,000" (bet-confirm-modal ~301/~315): `.amount` on the stake and the
  row the sell confirm's A8f shape (flex-wrap, gaps).
- C7 Up & Down's range line is clipped exactly when the custom stake is invalid (updown-stake-controls ~264-265): the
  whole sentence is one nowrap `.amount`; put `.amount` on the two figures only (or moneyRuns).
- C13 the journey avatar menu tells verified players "Verify your identity": pass the hub's `kycOffered` to the
  journey menu and drop the row when false (the /profile rule). Sibling: the KYC page's <title>/eyebrow vs h1 — one
  name (follow how R5-A/R5-G settled titles).
- C1 /profile/invite has up to three names for one reader: compute ONE name per reader (approved agent → dashTitle;
  paid player → inviteEarn, or inviteFriends if that is the established rule — check owner item 53 and choose the
  existing convention, say why) and use it in the hub, the journey menu arm, the journey footer arm and the page's
  <title>; an agent's <title> equals its h1.
- C14 journey doors that still call /positions "positions": the dial's "Tazama nafasi" after every bet (give the dial
  the journey prop, as R5-B did for the sell result), /positions/performance's back link and eyebrow, /help's "My
  positions" card — the journey's words (tabTickets / ticketsBack) in the journey.
LOW
- C8 Up & Down grids wider than a 320 phone: `minmax(min(300px, 100%), 1fr)` (and min(320px,100%)) — ghost too.
- C4 the sign-in break notice is amber while the same break is neutral everywhere else: a neutral arm for `sp.cooled`
  (tone only; words unchanged).
- C2 two dialog ✕ invisible to R5-A's census (the Needle drawer, the chat panel): use CloseX at the F20 geometry and
  widen the census to any glyph spelling (the path "M6 6l12 12M18 6L6 18"); classify the bell's hand-drawn ✕.
- C9 dialogs that start with a crest or seal (OperationResultModal, WinCelebration): decide the rule for their ✕ (an
  exception written into the census, or aligned) — one convention, say why.
- C3 the gold census does not count the warning family's other spellings (`--warning-500/-bg/-border` and utilities;
  61 paints, 4 unregistered files): count them and rule each site in R5-C's REGISTRY style.
- C10 the journey bell draws notices plainer than /notifications: in the journey arm, the page's renderers (DotSeq,
  moneyRuns/moneySentence).
- C11 right-aligned tracked eyebrows still carry trailing tracking at 8 sites: `kp-track-end` (R5-A's F19 technique).
- C16 two pill sizes in one row on board cards: the signal pill `size="xs"` (+ metrics) as the status pill.
- C17 the classic position card still clamps the question at two lines while its journey twin shows it whole: drop
  the clamp (R5-E's note says they are set the same way).
- C18 the journey tickets loading skeleton draws 24px pills where the card's are 18px: `h-[18px]`.
- PLAUSIBLE: back links on pages the journey hub opens say "‹ WASIFU"/"‹ POCHI" (the classic parent) and router.back()
  returns to the hub: in the journey, label and fallback the hub ("Akaunti", /account) — say what a browser run must
  show.

PROOF as r5-common.md says (suite with controls/plants, a mutation proof under S\r6c\, every suite reading a touched
file). Keep a running log in S\r6c\log.txt. REPORT exactly as r5-common.md says, with what a lock turn must re-tile.
