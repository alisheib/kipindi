# Round 5 fixers — the rules every R5 helper follows (read completely before anything else)

Product: 50pick, a Tanzanian real-money prediction market in Swahili, English and Chinese. Next.js 16 App Router,
React 19.2, TypeScript, Tailwind 3 with an OVERRIDDEN spacing scale (px-3 = 16px, 6 = 32px, `--sp-4` = 16px).
The owner's rule: only perfect visual AND logical results are accepted; nothing is deferred as small; every finding is
re-measured first (CONFIRMED / REFUTED with numbers), every "after" is computed and guarded.

- WORK ONLY in your own worktree (named in your brief), whose branch sits at vodacom-visual's tip 1699302a.
  node_modules is a junction to F:\kipindi-main\node_modules — never delete it recursively, never `npm ci` there.
- Do NOT commit, push, stash (`git stash` is forbidden on this machine), take the shared lock
  F:/kipindi-locks/heavy-node.lock, run tsc, or start a dev server or a browser. Lock turns run browsers; if a proof
  needs one, write the check (or the drive addition) and say so.
- Keep CRLF line endings (the repo is autocrlf). Git Bash eats backslashes in `-e` scripts and heredocs: use the Edit
  tool or node script FILES for anything with backslashes or multi-line edits.
- NO dictionary string may change (src/lib/i18n-dict.ts). Compose with EXISTING keys; anything needing new or changed
  words goes in your report under S12. Responsible-gambling sentences are owner-approved copy: never reword, never
  remove an RG notice, helpline or limit control.
- Classic CHROME (header, bar, rail, footer, ticker, bell, capsule, the classic avatar menu) is frozen for S6/S7 —
  `qa:classic-shell-parity` captures it. Journey-only changes go through journey components, a `journeyShown`-style
  prop the shell passes, or `:root:has(#kp-journey-shell)`. Shared page BODIES may be fixed for both shells — say
  exactly what classic viewers see.
- Gold is money (DESIGN_AUTHORITY Q5 "GOLD IS MONEY, AND NOTHING ELSE"; M3 "struck gold appears only where money was
  earned (payout, celebration, resolved seal)"; F3 "--warning-fg IS --gilt … a refusal has earned nothing"). The
  `--warning-fg: var(--gilt)` token itself is an owner ruling — do not change it.
- Other R5 helpers work at the same time in their own worktrees (R5-A home/cards/markets/results/legal/footer/hub/
  channels/capture; R5-B wallet/sheets/notifications/tickets/bell; R5-C the gold audit; R5-D offline/service worker/
  not-found mark/route ghosts/market metadata; R5-E text wrapping and the keep-words helpers). Stay in your area; if a
  fix needs another area's file, make the smallest hunk and name it in your report. The integrator merges with
  `git apply -3`.
- Evidence: round 5's tiles S\visual\tiles-r5 (and their diff overlays S\visual\diff-r5 against round 4), the edge
  tiles S\edges\tiles; the findings with tile numbers and measurements are in S\visual\triage-r5.md (and
  S\visual\triage-r4.md's EDGES section). Measure with PowerShell System.Drawing (no Python on this PC).
  S = C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\0e745525-51fe-4451-ace7-c9987576fc15\scratchpad
- ⭐ CONSISTENCY IS THE RULE (Ali, 2026-10-09: "we need consistency and perfection in each move even if it takes more
  time"). A finding is never fixed on the one tile that showed it: for every item, FIND ITS SIBLINGS — the same
  pattern on every other surface (grep the class, the component, the convention: e.g. every close ×, every dialog
  title, every hairline above a sheet's actions, every place one page is named, every money figure, every centred
  zh line) — and bring them ALL to the same convention, or state in the report why a sibling legitimately differs.
  Where two conventions exist today, pick ONE (say why) and apply it everywhere in your area; name siblings outside
  your area for the integrator. Your report lists, per item, every sibling found and what was done to each.
- PROVE IT: a new `scripts/visual-pass-r5<x>.test.mts` registered as `test:visual-pass-r5<x>` in package.json (put
  your line next to the other visual-pass suites; expect a neighbour's line beside it at merge), reading source
  through scripts/lib/decomment.mts (decomment/decommentCss), rendering with react-dom/server where useful (see
  scripts/visual-pass-r4e.test.mts and r4i for the style); every fix with a control or a planted defect; and a
  mutation proof (a scratch script under S\r5<x>\) that plants each defect on disk, shows the suite catches it on its
  named check, and restores every file byte-identical (sha-256). Update any existing pin your change moves, with the
  reason. Run every static suite that reads a file you touch (grep scripts/ for each path) plus test:red-anchors,
  test:decomment, test:hooks-order, test:ui-consistency, test:i18n, test:journey-shell, test:simple-journey-flag,
  test:eyebrow-roles, test:type-scale, test:spacing-scale, test:design-frozen, test:css-vars-defined, test:stacking —
  each `npm run -s <name>` from your worktree, one at a time. Known reds that are NOT yours: test:dead-css,
  test:orphans, test:campaign-gates, test:house-bot-disclosure (the legal tree's byte pin, red until the branch is
  main). Name the files that need tsc.
- REPORT (final message): per item CONFIRMED/REFUTED with the measurement, the cause (file:line), the change and its
  predicted "after"; owner questions; S12 items; what classic viewers see; guards + plants + the mutation result;
  every suite and exit code; `git diff --stat` (+ untracked). Nothing committed.
