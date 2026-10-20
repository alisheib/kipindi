# PHOSPHOR MIGRATION — every icon and glyph on 50pick moves to Phosphor (`PHOSPHOR-MIGRATION`)

> **Board row ▶ 0j** in [`NEXT-PLAN.md`](NEXT-PLAN.md). Say **"continue phosphor migration"**: open this file at §0
> (RESUME AT), then §1 (the board). Guarded by `npm run test:phosphor-plan` (red twin `npm run red:phosphor-plan`).
> The ruling, in [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md):
> § "2026-10-17 · Icons — every icon and glyph moves to Phosphor, in waves, live as each is proven (owner)".
> The design law it changes lives in [`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) (§K3 points here until the swap
> rewrites it).

---

## §0 · RESUME AT

**State (2026-10-19):** release 1 of the audit is LIVE and complete — W4 at `70c069cb`, its remainder (release 1b) at
**`d6f0b3ec`**, both below; W0–W3 before them (W3 at `ee62451c`). Ali asked for the audit that day (*"validate that all old
icons are replaced across the platform … see where we need filled glyphs and icons and where not"*, then *"nothing
should be plain … the most small details are the most important to me"*); it is §8. **Start here:** the checks Ali
stopped twice to ship (⏳ Owed, below), then release 2 (**Next**). A Codex session may take this over (Ali, 2026-10-19):
everything it needs is this file, AGENTS.md and DESIGN_AUTHORITY §K3.

✅ **Release 2a, part 1 LIVE at `e4b148a05`:** one shared `IconPlate` variant and Duotone identity
plates on the account hub, notification rows, help, the landing trust band, the chat button, the Needle mark and profile
settings. The local build and `qa:live` passed. The full database battery found the known main failures and two stale
notification guard anchors, now repaired and green. Its three serverless browser failures pass on the fresh local server.
Classic trust-band and overlay before/after tiles have been read at phone and desktop sizes in all three languages.
The re-pinned guards' red mutations passed one at a time in a separate clean worktree. The changed player pages passed
1,230 responsive assertions at 320, 360, 768, 1280 and 1920 in all three languages; the overlay sweep passed 21/21.
The only responsive warnings are the existing 44×26 shared Toggle controls on the responsible-gambling page.
At the exact commit, typecheck, `next build` and local `qa:live` (386/386) passed. The push was read back on www, apex and
Railway (`?dpl=e4b148a05`, new sprite 200 on all three); `/api/health` reports the database reachable and migrated;
`qa:chunks-prod` passed 6/6 on both public origins (152 GETs each); production `qa:live` passed 363/363. Signed-out
production home and help pages were inspected at phone and desktop in all three languages, with no overflow. The
signed-in player pages were inspected in the local browser; production's `mobile01` sign-in was not authorized.
**Release 2a, part 2 LIVE at `e30d599cb` (2026-10-19):** the hand-over's remaining plates are in place. Ali chose
ledger-type glyphs for wallet history, the royal staff plate in both shells, and status-specific plates for deposit
notices. Refunds now carry their own notification kind; historic rows are recognised by their exact stored titles
without rewriting production data. Filled local rows exposed a second old WIN mislabel: free exits (returned stake)
and paid early exits. New free exits carry REFUND, paid exits carry CASHOUT, and old WIN rows render by their exact title;
the returned stake no longer wears a gold win plate. The full `test:all` battery at that commit passed 606/614; seven
failures are the named main failures below, and one was a stale test fixture expecting a paid cashout to be a WIN. The
fixture correction's `red:message-titles` caught 12/12 plants; `test:message-titles` passed 67/67 in each store, and
`test:red-anchors` passed. The exact release passed typecheck, `next build`, local `qa:live` (386/386), and the changed
player routes' responsive checks (1,620 passing assertions). The www, apex and Railway hosts served the release SHA,
health reported the database reachable and migrated, both public chunk checks passed (6/6 routes, 152 GETs each),
production `qa:live` passed 362/362, and 36 production tiles across three languages and two widths were captured.
Production player sign-in was not authorized; signed-in states were inspected on a seeded local server.
**Release 2a fixture follow-up LIVE at `a504ad280` (2026-10-19):** the stale paid-cashout expectation is corrected;
its message-title tests and red proof pass in both stores. The exact commit passed typecheck, build and local `qa:live`;
www, apex and Railway served its SHA, health was reachable and migrated, both public chunk checks passed, and production
`qa:live` passed. **Resume:** complete the owed release-1 checks, then releases 2b–2d and 3 (§8d and the hand-over).
W5 is partly landed; its remaining sites belong to release 2c.

✅ **Release 2b (W6) LIVE at `d268ef919` (2026-10-20):** the twelve private empty-state drawings and the bell panel's
private drawing use family Duotone glyphs on a shared plate; error states use the filled danger glyph. The release
descends from U43's restored house-gold commit `dd1386f06`; its classic bell keeps its gold marks while its empty art
comes from the one glyph family. Before the push, `test:visual-pass-r5c` passed 111/111, `test:red-anchors` 7412/7412,
and the focused glyph-source, U43 palette and Phosphor-plan guards passed. The inherited U43 red harnesses gained
audited plants at `135ccb2ac`; their three mutation proofs passed. Railway built the pushed commit and reports SUCCESS.
The www, apex and Railway hosts each served `d268ef919` with HTTP 200; `/api/health` reported the database reachable
and migrated. Ali explicitly asked to push now and do the remaining W6 release checks on the next machine.

**Resume W6 verification from GitHub:** `codex/phosphor-2b-w6` contains the live release. Run the exact-commit local
typecheck, build and `qa:live`; the long `red:campaign-visuals` and classic-parity red proof; a fresh classic browser
comparison; the changed-file readers, database `test:all`, responsive and visual tiles; production `qa:chunks-prod`
on both public origins, production `qa:live`, and changed-page browser inspection. The earlier same-code classic null
comparison passed 68/68, and its W6 comparison found only the empty `/positions` card in 24 signed-in cells; its
generated entries preserve W3's. These earlier measurements do not substitute for the deferred final-commit run.
Release 2c follows with category plates, money doors and stat tiles. The downstream W5, admin and W7/W8 branches are
on GitHub but still descend from W6's old pre-rebase commit; restack each branch's own commits onto live `main` before
its separate release. The next machine can derive the exact old bases from the branch graph in §8d.

⏳ **Owed — checks not run because Ali asked to ship (2026-10-19); run them on live `main` first (AGENTS.md §4):**
- before/after tiles of every changed surface (phones at 390px and 2x, desktop at 1280px), read one by one;
- the classic parity, calibrated: a baseline on a fresh in-memory server of `main`, its null compare (exit 0),
  `--prove-red`, then W4's and 1b's differences named (`npm run glyphs:parity-entries -- <baseline> <current>
  --measured <regions> --wave <label>`; the generated entries file still holds W3's);
- the red twins at the release commit not yet run: of 1b's 43, the 23 left when the runs stopped — the three long
  in-process ones among them (`red:deposit-recheck`, `red:deposit-status-read`, `red:campaign-visuals`, about an hour
  each) — and `red:measure` again (its run held the `tier="fill"` misread that 1b fixes; 8/8 on the code before W4);
- the server-bound ones: `red:bar-geometry` and `red:count-truth` (the server's URL as an argument),
  `red:journey-header-fit` (alone, under the exclusive lock), `qa:landing-ten`, `qa:journey-header-fit`, and
  `test:motion` (it needs a server on :3000).
- Main's own failures, the same lines with or without this programme — do not chase them here:
  `test:visual-pass-r5a` 8.13, `r5h` 3.5, `r5j` 1.1, `r6c` 10.1 and 11.2, `r7c` 2.1 and 3.9, `test:presence-class`,
  `test:rate-copy` (and their reds), `red:house-bot-chatbot`, `red:results-filter`'s stale anchor.

✅ **Release 1b (W4's remainder) — LIVE at `d6f0b3ec`**, pushed 12:43 UTC on Ali's *"proceed until fully done and pushed
live"*, then *"push everything you have now live as it is"* (2026-10-19):
- **What it does** — the adversarial review's 17 other findings, each fixed or decided:
  - #2 the side arrows on `.btn-yes`/`.btn-no` stroke at those buttons' Inter 700 (they drew 600), the home band's
    picks with them;
  - #4 a verdict, a dispute and a bonus notification draw their meaning (`resolved`, `flag`, `gift`); the staff's own
    notices keep the bell, because D19 keeps their kind out of a player's bundle by name (the review's `bot` would have
    broken `test:house-bot-disclosure` 1.1);
  - #5 #6 #13 #17 doors that wore another meaning: the KYC panel's Verify and the agent page's identity step `idCard`,
    its dashboard `agent`; the Up & Down board's rules pill `tippingScales`; the inbox's empty state `bell`; /help's
    voided `void` and fairness `attestation`;
  - #7 the proposal page's back link draws the family's chevron (a typed back arrow, written as an escape); the
    typed-character census (`test:glyph-source` §7, `test:visual-pass-r10` 3.5″) reads escapes, HTML entities and
    stylesheets' `content:`, and its class holds ‹ › ≡ ⋮ ⋯ ⇅ ◆ ■ □ ✦ ⌄ and the flags;
  - #9 `FillGlyphKey`: a door that draws its glyph in Fill takes only a key that ships one (tsc), and
    `test:glyph-map` §9c holds every literal `tier="fill"`; seven more statuses in Fill (the profile's ID and email
    pills, the verified-agent chip, the locked round's chip, Saved) and #12 the vote cast;
  - #15 the Up & Down rules' caution sign has its word for a screen reader ("Warning: ", "Onyo: ", "警告："); the sort
    options' arrows stay hidden — each option's label states its order;
  - #16 the round page's position rows show the outcome chip (glyph + ink + word), as the position card's;
  - #8 #10 #14 #18 recorded: HelpMark and the drawer's NeedleMark go to release 2 (Duotone); §8a says what was built and
    what stays as punctuation; §8b holds the meanings that share or split a glyph; the small cleanups;
  - `test:measure` reads a page's measure tier, not a glyph's `tier="fill"`.
- **The proof before the push:** typecheck 0; the 112 suites that read a changed file, all green but main's own five
  and `test:motion` (a server on :3000); 20 of 43 red twins proved their mutations before Ali's word to ship
  (`red:measure`'s one miss explained above); `test:house-bot-disclosure` 122/122 at the release; `next build` and
  local `qa:live` 386/386 (the build green) at the pushed commit.
- **Production, read back:** www, apex and the Railway host served `d6f0b3ec` about 200 s after the push (12:47 UTC);
  health reachable and migrated; the four sprites answer 200 and immutable on both origins; `qa:chunks-prod` passes on
  both origins (6/6 routes, 152 GETs); production `qa:live` 363/363.
- **For MOBILE-VISUAL U43 release B** (it rebuilds the Up & Down card, the board and the market card on top of 1b, and
  keeps these): the sides are `arrowUp`/`arrowDown`, the product `trade`; a mark among words strokes at its words' own
  face and weight (`text=`), and leads or ends a run with `edge`:
  - `updown-card.tsx` — the price's tone arrow `s={11} edge="start" text="mono-700"`; the UP/DOWN target labels
    `s={10} text="mono-700"`, UP `edge="start"`, DOWN `edge="end"`; the signed-out buttons
    `s={14} edge="start" text="body-700"` (`.btn-yes`/`.btn-no` set 700); the verdict `s={14} edge="start"
    text="mono-700"`; the locked chip's `lock` in Fill (`tier="fill"`); the players' count `users`;
  - `updown-stake-controls.tsx` and `journey/updown/jud-arm.tsx` — the side arrows `edge="start" text="body-700"`;
    `home/updown-band.tsx` — the picks `s={16} edge="start" text="body-700"`;
  - the board (`app/updown/page.tsx`) — the rules pill `tippingScales`;
  - the round page — the outcome `s={16} edge="start" text="mono-700"`; the bet chips' arrows `s={12} text="body-700"`
    with the side's word for a screen reader (`sideWord`, sr-only); each position row's outcome chip
    (`positionStatusGlyph` + `positionStatusChip`); `round-stake-panel.tsx`'s projected return
    `arrowRight s={11} text="mono-600"` at the figure's 13px;
  - `charts/outcome-cubes.tsx` — `arrowUp`/`arrowDown`, a voided round `void`, `s={9}` alone in the cube;
  - `markets/market-card.tsx` — the 24h move `chevronUp`/`chevronDown` `s={11}` in Fill (the direction is the data);
    "Maelezo ›" `chevronRight s={11} edge="end" text="display-600"`; the rules link `chevronRight s={12} edge="end"
    text="body-400"`;
  - an arrow that reads "to" between two figures (open → close, stake → return) stays typed.

✅ **W4 — release 1 — LIVE at `70c069cb`**, pushed 11:51 UTC on Ali's *"push live everything u have and stop running new
tests, we proceed later with whatever left from the phosphor migration plan"*, then *"proceed"* (2026-10-19):
- **What it does.**
  - Status in Fill through the kit's doors (Callout, NoticeBar, StatusFlag, toast, a receipt's status, the KYC panel,
    a proposal's status).
  - Outcomes as glyph + ink + word on positions and tickets: open `clockPending`, won the seal in Fill and gold, lost
    `xCircle`, void `void`, cashed out `cashOut`.
  - Every notification kind its meaning's glyph, and §8b's one meaning, one glyph: identity `idCard`, leaderboard
    `podium`, terms `scrollText`, rules `tippingScales`, privacy `privacyNotice`, friends `users`, agent `agent`, deposit
    and withdraw `arrowDownToLine`/`arrowUpFromLine`, Up & Down `trade`, its sides `arrowUp`/`arrowDown`.
  - Every hand-drawn or typed icon on the player front in §8a's release-1 rows (bar the leftovers below); the More tab's
    own key; `EmptyStateLink`; the typed-character census (`test:glyph-source` §7); `CHROME_FILLS` (the chrome's
    Fills inline, the rest in the app sprite).
- **The proof before the push:**
  - three battery rounds on the branch, every failure read: 19 guards re-pinned with their intent kept; main's own
    failures identical, line for line, on `13299425` (`test:presence-class`, `test:rate-copy` and their reds,
    `test:visual-pass-r5a` 8.13, `r5h` 3.5, `r5j` 1.1, `r6c` 10.1 and 11.2, `r7c` 2.1 and 3.9,
    `red:house-bot-chatbot`, `red:results-filter`'s stale anchor);
  - an adversarial review of the diff (18 findings). Fixed in the release: the HIGH one (Up & Down's chips name their
    side to a screen reader again), `red:updown-pricing`'s stale anchors, and the D19a pin re-pointed to the release's
    own commit (it also records U43 release A's dictionary, which had landed under the old pin);
  - after the rebase onto U43 release A (`9393dcb5`), the suites where the two meet green (card-choices, one-sided,
    updown-hedge-quote, betting-ink, journey-home, journey-updown, house-bot-disclosure, …); all 164 red anchors in the
    changed files match;
  - typecheck 0; `next build` at `70c069cb`; local `qa:live` 386/386.
- **Production, read back (11:55 UTC):** www, apex and the Railway host served `70c069cb` about 200 s after the push;
  health reachable and migrated; the new sprites (`app.7606b117`, `admin.b27adee4`) and both kept ones answer 200 and
  immutable on both origins; `qa:chunks-prod` passes on both origins (6/6 routes, 152 GETs); production `qa:live`
  363/363; five changed pages looked at in a phone browser (the market cards' carets, the bottom bar, Up & Down, the
  privacy notice, the Up & Down rules' caution), no page error. Maswali's platform fix (`c129888f`) landed on top.
- **Its checks Ali stopped, and the review's other 17 findings:** the checks are ⏳ Owed above; the findings were all
  closed by release 1b, above.
- **Parallel sessions (kept for the next release):** on OMEGA-COMPILE01 heavy jobs take the `phos` slots 9–12
  (`F:/kipindi-locks/mln-slot-N`, never the exclusive lock); whoever lands on `main` second re-runs `npm run glyphs:gen`
  on the merged `map.ts` and sets `PREVIOUS_SPRITES` to what production serves; each side messages the other before a
  release window and when it closes (Maswali: asheib-bf; MOBILE-VISUAL U43: asheib-54 — its release B rebuilds the Up &
  Down card, the board and the market card on top of 1b and keeps 1b's glyph and weight choices). From 2026-10-19 the
  Maswali and U43 lanes run in Codex, this programme in Claude (Ali).
- **⛔ Pushing `main` — the shared lock (agreed by the three lanes, 2026-10-19, for sessions that cannot message each
  other):** before any push to `main`, `mkdir F:/kipindi-locks/main-push.lock` (OMEGA-COMPILE01) and write
  `<LANE> <UTC time> <sha>` to its `owner` file; push; run the production read-back; then delete the owner file and
  `rmdir` the lock. Held: keep working and retry — never delete another lane's lock. Before a release, §0 names what is
  about to be pushed and the shared files it touches. **This programme's shared files:** `scripts/glyphs/map.ts`, the
  generated registry and sprites (`npm run glyphs:gen`), `src/components/ui/glyphs.tsx`, the kit's doors (Callout,
  NoticeBar, StatusFlag, toast, chip), `src/lib/i18n-dict.ts` (link labels), the legal pages and
  `scripts/lib/house-bot-absence-cases.mts` (D19a), and the guards that census glyphs (`test:glyph-*`,
  `test:visual-pass-r9a`/`r10`).

W3, the selected states, went live at **`ee62451c`**, pushed at
11:22 UTC on Ali's *"push now please then do any chekcs needed"*:
- **What it does.** Every bar of destinations marks the current one the same way: its glyph in Fill on one opaque
  royal pill with a lit edge (R-INDICATOR 3B). It covers:
  - the classic rail and the journey's tabs, at 24px (R-RAIL 4B);
  - both desktop bars;
  - the admin sidebar and drawer, which gained a glyph per destination (50: 24 reused keys, 26 new console keys).
  The sprites production served before stay one release (`PREVIOUS_SPRITES`, `test:glyph-sync` §1b).
- **The proof before the push:**
  - an adversarial review of the whole diff (ten findings, each fixed or kept with its reason);
  - two readers of the 182 before and after tiles (their findings fixed);
  - the derived battery: 145 of 162 green, the rest main's own or DB/server-bound (§5 W3);
  - the classic parity measured: every one of the 224 cells named (`glyphs:parity-entries --measured`);
  - local `qa:live` 386/386, and `qa:landing-ten`'s V26 clean (the coin's rise and every rail label on one line).
  - ⚠️ The pre-push typecheck and build failed only on this laptop's stale Prisma client (main's MaswaliNoticeSeen
    model). They ran again after `prisma generate`, after the push (§5 W3).
- **Production, read back (11:25 UTC):** www, apex and the Railway host served `ee62451c` 200 s after the push;
  health is reachable and migrated; the new sprite answers 200 and immutable; and both kept sprites answer 200 on
  both origins. Then production `qa:live` passed 363/363 and `qa:chunks-prod` both origins (11:55 UTC).
- **After the push:** `prisma generate`, then typecheck 0 and build 0 on the live code.
- **Ali's review page for the wave:** https://claude.ai/artifact/Ar7ABsBuKmuVzVP6G5LX2f. It has 12 before and after
  pairs and two calls: Live's and Up & Down's Fill keep Phosphor's thinner strokes, and More's Fill is a solid tile.

**Next:**
1. ⏳ Owed (above): the stopped checks on live `main`; fix what they find as its own release. The tiles: phones at 2x,
   the "Follow 50pick" panel suppressed (`localStorage["50pick-channels-done"] = "1"`), an idle wait of a few seconds
   (live pages poll and never go idle); Ali's review page from them.
2. Release 2 = W5 + W6 (§8d): Duotone plates, categories, the one deposit glyph everywhere, stat tiles, admin cards, and
   the empty states' one family; HelpMark and the Needle drawer's NeedleMark into the family's Duotone (§8a).
3. Release 3 = the rest of W7 (the console's typed marks, the PWA shortcuts, the Needle's cursor, the primer and
   self-care art), then W8 and W9.
4. Still open from the selected states (on the laptop): the clean classic-parity compare with `--prove-red`, and
   `qa:journey-shell`'s focus and tabs sections. Ali's two calls (the swap's review page,
   https://claude.ai/artifact/5v3yaDeeZYn7igGoVJVgEo, and the selected states') — §8c answers More's; Live's and
   Up & Down's Fills are kept (R-ONE-SOURCE rules out a composite).

### Where the work happens
- Each wave is built on its own branch cut from `origin/main`: `phosphor-migration` (W0–W1), `phosphor-w2`,
  `phosphor-w3`, `phosphor-w4` (all merged); release 1's remainder starts from **`phosphor-w4-review`**. On
  OMEGA-COMPILE01 the W4 worktree was removed at the close: cut a fresh one with its own `npm ci` (a junctioned
  `node_modules` cannot run Turbopack). On Ali-Blade15 the worktree is `C:\kipindi-phosphor`, with its own real
  `node_modules` (installed 2026-10-17; the earlier junction was unlinked first, never deleted through).
- **Who pushes `main` for this programme.** The board's release owner is the OMEGA-COMPILE01 session (Ali, 2026-10-16).
  Asked whether this session should take the Phosphor migration to production itself, Ali answered *"until live"*
  (2026-10-17, to the Ali-Blade15 session) — so this programme's releases are pushed to `main` by the session working it,
  recorded in the board's header. Every release: rebase on `origin/main` immediately before the push, the release
  checklist of AGENTS.md §4 (typecheck, `next build`, local `qa:live`, then the production read-back), and never a push
  while another lane's release is mid-flight (`git log origin/main` first). Between releases, the branch is pushed at
  every step, so a session on another machine resumes with `git fetch && git worktree add <dir> origin/phosphor-w4-review`
  (the current work's branch).
- Every step, in ONE commit: the work, this §0 rewritten, §1 ticked, the board row's count updated. Then push the
  branch. `npm run test:phosphor-plan` asserts the tracker and the board agree.

### The law for every page, new or old (Ali, 2026-10-17 — R-NEW-PAGES)
Every icon comes from the glyph family `I` in `src/components/ui/glyphs` — never an inline `<svg>` icon, never an
icon-library import, never a text character used as an icon. Until W2 lands, `I` still draws the house family; a page
written with `I` today moves to Phosphor automatically at W2, with no edit. From W1 a guard in `predeploy` enforces it.

---

## §1 · Board

| Wave | Title | Status | Note |
|---|---|---|---|
| W0 | Tracking + specimen + recognition check | ✅ | d7a1b697 — Ali ruled the specimen; answers in §2 and §3; the specimen is stored at `design-brief/phosphor-2026-10/` |
| W1 | Codegen + engine + guards, zero visual change | ✅ | cf3202ab — live at 9b604d8e (2026-10-17): the codegen, the generated glyph files, test:glyph-source in predeploy (R-ONE-SOURCE); production read back |
| W2 | The swap: the whole platform on Phosphor in one commit | ✅ | 732efbc5 — live 2026-10-17 23:10 UTC: every icon drawn by Phosphor (twelve chrome glyphs inline, the rest one immutable sprite), 6.4 KB gzip lighter per route; production read back |
| W3 | Selected states: Fill + one indicator; admin sidebar icons | ✅ | ee62451c — live 2026-10-18 11:22 UTC: every bar of destinations marks the current one with its Fill glyph on one opaque royal pill (both tab bars at 24px, both desktop bars, the admin sidebar with 50 new glyphs); production read back |
| W4 | Outcomes and status: glyph + ink + word | ✅ | 70c069cb — live 2026-10-19 11:51 UTC: release 1 of §8d — status in Fill, outcomes as glyph + ink + word, every notification its glyph, §8b's meanings, the player front's old icons; its remainder, release 1b, live at d6f0b3ec (12:43 UTC): the review's other 17 findings; the stopped checks are §0's Owed |
| W5 | Plates, money, hub, categories, stats, admin cards | 🔨 | Release 2a parts 1 and 2 live at `e4b148a05` and `e30d599cb`; the remainder is release 2c and 2d (§8d) |
| W6 | Empty states: one family | ✅ | Release 2b live at d268ef919: one shared Duotone plate for the twelve empty kinds and the bell panel; Ali deferred final-commit checks to the next machine (§0) |
| W7 | Consolidation: inline svgs, text-character icons, PWA, Maswali | ⬜ | |
| W8 | Motion on the existing primitives | ⬜ | |
| W9 | Close: adversarial audit, test:all, full tiles, the law final | ⬜ | |

Statuses: ⬜ not started · 🔨 in progress · ✅ done (the note cites its commit) · ⛔ withdrawn (the note cites an R- key
from §2). Ordering (guarded): W1 needs W0 ✅ · W2 needs W1 ✅ · W3–W8 need W2 ✅ · W9 needs W0–W8 finished.

---

## §2 · Rulings

Ali, 2026-10-17, after the inspection in Appendix A, choosing among numbered options (the session had recommended
keeping the house family and adding Duotone/Fill tiers; **Ali chose Phosphor**).

| Key | Ruling |
|---|---|
| R-PHOSPHOR | *"Switch to Phosphor"* — the icon family moves to Phosphor Icons (MIT). Vendored: an exact-pinned devDependency read only by a codegen script; the generated outputs are committed; no runtime icon package. This reverses DESIGN_AUTHORITY §K3 for Phosphor only, on the charts precedent (§B12.4: pinned, one home, guarded). The call-site API `I.key` stays; the drawings change underneath |
| R-NOW | *"Now, players see it"* — each wave goes live as it is proven, the classic shell included (every change a named `qa:classic-shell-parity` entry, never a re-baseline) |
| R-ADMIN | *"Yes, sidebar + cards"* — the admin console gets icons: the sidebar, stat cards and status chips |
| R-SPECIMEN | *"Yes, show me first"* — a side-by-side specimen before any code change; Ali's numbered answers set the weights, the tone, the selected indicator, the rail size, the lexicon and the badges |
| R-NEW-PAGES | *"if ay new pages are cretaed we tlel them impelemtn on any new pages rth ephosphor plan and they knwow"* — every icon on every page, new or old, comes from `I`; AGENTS.md states it and a `predeploy` guard holds it from W1 |
| R-RESUME | *"when we sya continue phosphor migration they know … dnto tolose any progress … oush rpogress"* — this file is the resume point on any machine; progress is committed and pushed at every step |
| R-WEIGHT | **1B** — the Line tier is Phosphor **Bold up to 26 px** (20 px paints 1.88 px, 24 px 2.25 px) and Regular from 27 px. §5 W1 carries the table |
| R-TONE | **2B** — the Duo tier is Phosphor's own Duotone: its Regular outline with the tone layer at **20%** (`--glyph-tone: 0.2`) |
| R-INDICATOR | **3B** — a selected destination is its **Fill** glyph on an **opaque royal pill** with a lit edge, everywhere (W3) |
| R-RAIL | **4B** — tab-bar glyphs are **24 px** (Android and iPhone size), in a pill grown to fit (W3) |
| R-LEXICON | **5.1A–5.7A** — the board `squares-four` (both the classic "Masoko" and the journey "Maswali" tab) · Live `broadcast` · deposit / withdraw `arrow-line-down` / `arrow-line-up` · Up & Down `arrows-down-up` · results `seal-check` · proposals `lightbulb` · limits and breaks `hand-palm`. §3 and §4 carry them |
| R-BADGES | **6A** — the profile badge medallions keep their hand-drawn art: identity art like the brand mark, outside the Phosphor family |
| R-ONE-SOURCE | *"we need to have 1 source of glyphs and icons so mark tsi as rule and let na fuutre deins gor pages tkae fomr our new souerce clenaly perfclet loically"* (Ali, 2026-10-17, during W2) — ONE source: the family `I`. An icon it lacks becomes a key in `scripts/glyphs/map.ts` (or a house extra) before any page draws it; a design delivered for a page is built from the keys, never from its own drawings. AGENTS.md §7, DESIGN_AUTHORITY §K3 and the design master brief state it; `test:glyph-source` §3/§5/§6 hold its three doors (inline `<svg>`, SVG data URIs, images under `public/`) |
| R-WALLET-HISTORY | *"Use type-specific glyphs"* (Ali, 2026-10-19) — each wallet-history row names its stored transaction type with the family's glyph; unresolved types stay neutral |
| R-STAFF-PLATE | *"Use royal identity plate"* (Ali, 2026-10-19) — the classic staff-menu row joins the journey row; gold remains the money accent |
| R-DEPOSIT-PLATE | *"Use status-specific plates"* (Ali, 2026-10-19) — a failed, held, processing or under-review deposit notification must not wear the successful deposit's green plate; its plate follows its actual stored notice status |

**W0's answers** — Ali, 2026-10-17, after opening the specimen: *"good i saw them proceed oerfcetly syroe anuthgi enede
int h erpeo and keep going"*, then *"until live"*. The specimen's pre-selected line `1B 2B 3B 4B 5.1A 5.2A 5.3A 5.4A 5.5A
5.6A 5.7A 6A` is therefore his answer, recorded above as R-WEIGHT … R-BADGES. The recognition check (§3) is answered by
his review; a label-less check with players stays open to him at W2's full contact sheet.

**The specimen** (https://claude.ai/artifact/74HNKPSDZLNdaLJvTbXGWW, published 2026-10-17). Every "today" drawing is
read from `glyphs.tsx` at main `380edd31`; every Phosphor drawing from `@phosphor-icons/core` 2.1.1 (registry sha512
`v4ARvrip4q…zM4eZilxQ==`, verified), only its path data, embedded as `<symbol>`s and drawn with `<use>` — the W1
delivery in miniature. Rendered and read in Chromium at 390 and 1280 px before publishing: no horizontal overflow, all
three faces loaded, no console error. Its recommended line, pre-selected: **`1B 2B 3B 4B 5.1A 5.2A 5.3A 5.4A 5.5A 5.6A
5.7A 6A`**.
- ⚠️ **The render changed one recommendation.** The plan's size → weight table (§5 W1: Bold ≤ 18 px, Regular 19–26 px)
  paints tab-bar icons THINNER than today (20 px: 1.25 px against the house's 1.58 px), which works against "more
  life". The specimen therefore recommends **1B — Bold up to 26 px** (20 px → 1.88 px, 24 px → 2.25 px), with Regular
  only for large art (plates, empty states); 1C kept the plan's even table. Ali chose 1B (R-WEIGHT), so §5 W1's table
  is now 1B's.
- 5.1 merges two meanings found by the inspection into one: the classic "Masoko" tab and the journey "Maswali" tab are
  the same board, so one glyph serves both.
- 6A keeps the badge medallions as hand-drawn identity art (like the brand mark), outside the Phosphor family.

---

## §3 · Lexicon — one meaning, one glyph (ruled 2026-10-17, R-LEXICON; applied in W2)

**The picks:** the board → `squares-four` · Live → `broadcast` · deposit / withdraw → `arrow-line-down` /
`arrow-line-up` · Up & Down → `arrows-down-up` · results → `seal-check` · proposals → `lightbulb` · limits and breaks →
`hand-palm`. The rows below without a pick (positions, the Needle, a result recorded, trust) follow the same rule in W2:
positions are `ticket`; a result recorded is `seal-check`; `shield-check` means verified only; the Needle is a house extra.

**Call sites that move in W2** so each meaning has one key: the journey tab "Maswali" from `questionCircle` (which keeps
meaning Help) to the board's key; the classic rail's Live from `bolt` to `live`; the classic rail's Up & Down from
`trendingUp` (which keeps meaning a rising trend) to `trade`; the hub's proposals row from `sparkle` to a new key `idea`;
the hub's limits row from the shield to a new key `limits`; every deposit / withdraw door to `arrowDownToLine` /
`arrowUpFromLine`. **And one W2 found (the lead engineer's call, 2026-10-17):** with results on `seal-check`, the hub's
Uthibitisho wa utatuzi row (`sealCheck`) drew the same seal as its neighbour Matokeo — the pair R5-A had parted — so it
wears a new key `attestation` (`stamp`, the resolution's official attestation); `sealCheck` stays `seal-check`, aliased
with `resolved`, for the resolution panel's attestation lines and Maswali's marks.

The conflicts the inspection found (Appendix A), and the candidates Ali chose from:

| Meaning | Today | The conflict | Phosphor candidates |
|---|---|---|---|
| The questions board (journey tab "Maswali") | `questionCircle` | a "?" in a circle means Help everywhere | `squares-four` · `cards` · `list-checks` |
| Markets (classic rail "Masoko") | `markets` = a balance scale | also reads "court / law"; the PWA shortcut reuses it | `scales` · `chart-bar` · `squares-four` |
| Live | lightning (classic rail) · broadcast (hub) · red dot (cards) · teal dot (/live) | four marks for one meaning | `broadcast` · `lightning` · `record` |
| Positions / tickets | `ticket` and a briefcase | two marks | `ticket` |
| Deposit | ⊕ (wallet sheet) and ↓ (wallet page) | two marks | `arrow-line-down` · `download-simple` · `plus-circle` |
| Withdraw | upload icon (hub) and ↑ (wallet page) | two marks, two weights | `arrow-line-up` · `upload-simple` · `minus-circle` |
| Up & Down | `trendingUp` (classic) · `trade` ⇅ (journey) | two marks | `arrows-down-up` · `trend-up` · `chart-line-up` |
| Results | a dashed starburst with a check | reads as a loading spinner | `seal-check` · `flag-checkered` · `check-square` |
| The Needle (hub row) | a half-filled disc | reads as "theme / contrast" | a house extra drawn in Phosphor's grammar |
| A result recorded (notification) | a double circle | reads as "link" or "glasses" | `seal-check` · `flag` |
| Proposals | sparkle (hub) and trophy (its page) | two marks | `lightbulb` · `sparkle` |
| Trust and limits | the shield, about five meanings | overloaded | `shield-check` (verified) · `hand-palm` or `gauge` (limits) |
| The Up & Down empty state | a compass | a weak match | `arrows-down-up` on a plate |
| The two unlabelled Up & Down buttons | a scroll · a ticket with › | no label | labels added (en/sw/zh), glyphs from this table |

Recognition check: answered by Ali's review of the specimen (2026-10-17). A label-less check with 3–5 players or staff
("what does this do?") stays open to him at W2's full contact sheet; a glyph most of them misread is swapped there.

### Admin destinations (W3)

R-ADMIN gave the console icons; R-INDICATOR 3B makes the current row its Fill glyph on the opaque `--nav-pill`. Every
item of `NAV_GROUPS` (`src/components/admin/admin-nav-groups.ts`) wears ONE key, required by the `NavItem` type. A
destination whose meaning a key already carries wears that key ("reused"); the meanings no key had got a console-only
key ("new", in `ADMIN_KEYS`). Every one ships its Fill (`FILL_KEYS`). `test:admin-nav` §8 holds three things: a live
key, one destination per glyph across the whole sidebar, and the Fill. `map.ts` stays the source of each Phosphor name;
this table records the W3 choice.

| Group · item | Key | Phosphor | |
|---|---|---|---|
| Overview · Overview | `dashboard` | layout | new |
| Overview · Live ops | `live` | broadcast | reused (R-LEXICON 5.2A) |
| Overview · New journey | `journey` | path | new |
| Money · Insights | `insights` | presentation-chart | new |
| Money · Settlement | `settlement` | money | new |
| Money · Finance | `finance` | calculator | new |
| Money · House | `house` | building-office | new (the house as the firm; W3's review moved it off `house`, Phosphor's Home mark) |
| Money · Desk | `desk` | desk | new (the label's own neutral word, ruling 453) |
| Money · Reports | `reports` | clipboard-text | new |
| Money · Tax report | `tax` | invoice | new |
| Money · Payments ops | `mobileMoney` | house extra (a handset carrying money) | reused |
| Money · Transactions | `receipt` | receipt | reused (a player's wallet receipts: one record per money movement; W3's review, `table` read as the Overview at 18px) |
| Players · Roster | `roster` | user-list | new |
| Players · Cohorts | `cohorts` | chart-donut | new |
| Markets · Event calendar | `calendar` | calendar-blank | reused |
| Markets · AI poll generation | `bot` | robot | reused (the page's own mark) |
| Markets · AI candidates | `brain` | brain | reused (the page's own mark) |
| Markets · Player proposals | `idea` | lightbulb | reused (R-LEXICON 5.6A) |
| Markets · Curation queue | `markets` | squares-four | reused (the board, 5.1A) |
| Markets · Resolver queue | `resolved` | seal-check | reused (results, 5.5A) |
| Markets · Sources & categories | `sources` | newspaper | new |
| Markets · Rates & fees | `percent` | percent | reused |
| Up & Down · Overview | `trade` | arrows-down-up | reused (R-LEXICON 5.4A) |
| Up & Down · AI proposals | `sparkle` | sparkle | reused (the AI generation switch's mark) |
| Up & Down · Rounds | `rounds` | timer | new |
| Millionea · Weeks | `weeks` | list-numbers | new (see the note below) |
| Millionea · Pools | `pools` | treasure-chest | new |
| Millionea · Integrity | `integrity` | gavel | new |
| Growth · Affiliate | `users` | users | reused (the friends programme's player rows) |
| Growth · Bonuses | `gift` | gift | reused |
| Growth · Contacts | `contacts` | address-book | new |
| Growth · Invites | `invites` | paper-plane-tilt | new |
| Growth · SMS campaigns | `megaphone` | megaphone | reused (marketing) |
| Growth · Traffic | `traffic` | chart-line | new |
| Compliance · Agents | `agent` | handshake | new |
| Compliance · Compliance | `tippingScales` | scales | reused (the rules) |
| Compliance · KYC queue | `idCard` | identification-card | reused (the player's identity row) |
| Compliance · Objections | `flag` | flag | reused (an objection, on /fairness and the resolution panel) |
| Compliance · Comment moderation | `comment` | chat-text | reused |
| Compliance · AML queue | `shieldAlert` | shield-warning | reused |
| Compliance · Self-exclusions | `circleStop` | stop-circle | reused (the player's Jizuie row) |
| Compliance · Privacy / DSAR | `privacy` | folder-user | new |
| Compliance · Retention | `archive` | archive | reused |
| Compliance · Audit log | `audit` | clock-counter-clockwise | new |
| System · System | `server` | hard-drives | reused |
| System · AI usage & credits | `aiUsage` | speedometer | new (a meter of what was spent; W3's review, `activity` means an activity log) |
| System · Approvals | `approvals` | check-square-offset | new |
| System · 2FA setup | `keyRound` | key | reused (security credentials) |
| Access · Staff & roles | `staff` | user-circle-gear | new (user-gear's Fill reaches 0.25 past its box) |
| Access · Role permissions | `roles` | lock-key | new (what a role may open; W3's review, the shield already carries AML's warning) |

**Left for later waves, seen while choosing:**
- Some player and console rows already wear a different mark for these meanings:
  - an agent: the hub's "Kuwa wakala" row and the profile's agent row draw `shieldcheck` (verified only, §3);
  - the friends programme: the avatar menu's Invite & Earn draws `gift`, where the journey rows draw `users`;
  - a player's detail tabs: KYC `shieldcheck`, self-exclusion `shieldOff`, limits `lock`, audit `alertCircle`;
  - the hub's staff-console row draws `server`, the System glyph.
  W5 (admin cards) or W7 can move each to its key above.
- Millionea's Weeks is the game's home. Once the Maswali lane's `millionea` key lands (MASWALI-PLAN §10c, its S5), the
  row may wear the game's mark, as Up & Down's Overview wears `trade`; `weeks` is then drawn nowhere and retires.

---

## §4 · Mapping — house key → Phosphor

**The one source is [`scripts/glyphs/map.ts`](../scripts/glyphs/map.ts)** (R-ONE-SOURCE): every key with its Phosphor name,
or its retirement and the reason; the aliases (two names, one meaning); the keys new in this migration; the house extras
where Phosphor has nothing ([`extras.ts`](../scripts/glyphs/extras.ts): `needle`, `mobileMoney`, `ussd`, each with its
reason); and the marks that stand among words ([`marks.ts`](../scripts/glyphs/marks.ts)). `test:glyph-map` checks every
name against the pinned `@phosphor-icons/core`; the contact sheet (`npx tsx scripts/glyphs/codegen.mts --sheet <file.html>`)
shows every live key in all its weights. This section held W0's draft of the mapping; it is not copied here, so it cannot
drift from the file (the draft already had: `politics` draws `flag-banner`, `logIn` is retired).

---

## §5 · The waves

Each wave closes with its own commit and push, §1 ticked, §0 rewritten and the board count updated — in that one commit.

### W0 — Tracking + specimen + recognition check
1. Worktree from `origin/main`, branch `phosphor-migration`. Stage files by name only.
2. File the tracking system: this tracker, board row ▶ 0j, the AGENTS.md door and law, `test:phosphor-plan` + its red
   twin, the COMPLIANCE-DECISIONS ruling, the DESIGN_AUTHORITY §K3 pointer, the docs index row. Push the branch.
3. Specimen, published to Ali as a private Artifact: the real house paths and the real tokens beside Phosphor (from the
   exact pinned `@phosphor-icons/core`, fetched to a scratch directory, never into the repo), at 360 and 1280 px — the
   rail (inactive / selected), hub rows on plates, a market card with its category sigil, the wallet doors, ticket
   outcomes, an empty state, the admin sidebar. Numbered choices: the six in §2 "Awaiting Ali".
4. Recognition check (§3). Record every answer in §2/§3; W0 ✅.

### W1 — Codegen + engine + guards, ZERO visual change

**As built (2026-10-17).** W1 landed purely additive, so "no visual change" holds by construction — nothing on the
site imports a new file yet:
- `@phosphor-icons/core` 2.1.1, an exact devDependency (lockfile integrity = the registry's sha512, verified).
- `scripts/glyphs/`: `map.ts` (all 182 house keys: 144 stay — Phosphor names, 3 house extras, 9 alias pairs — and 38
  retire, each with its reason; plus the two new keys `idea` / `limits`, so 146 live), `extras.ts` (the needle, mobileMoney and ussd in Phosphor's grammar),
  `reach.mts` (the house's own bounds reader, x and y), `codegen.mts` (`glyphs:gen`; `--check`; `--sheet <out>` writes
  the contact sheet for W2).
- Generated: `src/components/ui/glyph-registry.generated.ts` (per key: symbol stem + ink box per variant),
  `public/icons/g/glyphs.<hash8>.svg` (548 symbols — every variant of every live key, 281 KB raw / 55 KB gzip; W2 ships
  only the variants each surface draws, split by reach), `THIRD_PARTY_NOTICES.md` (the MIT text, verbatim).
- Guards, each with an in-process red twin: `test:glyph-map` (14/14 plants caught), `test:glyph-sync` (7/7 — it also
  carries the licence checks), `test:glyph-source` (8/8; **in `predeploy`** — the law for every page; its inline-`<svg>`
  ratchet starts at the census: 40 files, 75 drawings, each with its reason).
- `next.config.ts`: the stale `lucide-react` entry left `optimizePackageImports`.

**Moved to W2, on purpose:** the engine rewrite (a "bridge" engine in W1 would have been deleted again by the swap,
and eight guards read the house entries' exact text), parity harness v5 with its baseline (it must be taken against the
`main` the swap lands on), the `qa:first-load` gzip rows, the sprite's split by reach, and the amendments of the guards
that read the house drawings. W2's list below carries them.
- **Source:** `@phosphor-icons/core` (MIT; 2.1.1 at design time — pin the exact version installed) as an exact-pinned
  devDependency only. Never `@phosphor-icons/react` (each of its modules ships all six weights). Strokes on the 256
  grid: thin 8 · light 12 · regular 16 · bold 24 units; all four weights share one centreline.
- **Codegen** `scripts/glyphs/{map.ts, reach.mts, census.mts, codegen.mts}` (W1 adds its `glyphs:gen` script): `map.ts` is §4
  made executable; `reach.mts` lifts the house's own `pathReachX` (x and y) to build the ink table — an exact box per
  (key, variant), centring baked in by the R9-A1 rule — so `edge`, `glyphInkGaps` and plates read numbers and the runtime
  path parser leaves the client bundle. Committed outputs: `glyph-registry.generated.ts`, a server-only
  `glyph-paths.generated.ts`, `src/app/glyph-geometry.generated.css`, the sprites, `THIRD_PARTY_NOTICES.md` (the MIT
  text, also embedded in every sprite). In W1 the house drawings stay live; the Phosphor outputs are dormant.
- **Delivery:** content-hashed external sprites split by reach — `public/icons/g/{shell,app,admin}.<hash8>.svg` —
  rendered as `<svg><use href>` (estimates: shell ≈8 KB brotli, app ≈22 KB, admin ≈10 KB; players never download
  admin). First-load JS falls from ≈9.5 KB gz to ≈3 KB. `/icons/` is already immutable-cached and the service worker
  serves it. Only the offline page (`lib/offline-document.ts`) renders inline paths, from the server-only module.
  Rejected: a shared `I` object (30–50 KB gz on every route), a codemod (edits 313 files), an icon font or CSS masks.
  **Overturned if** the 2G film strip (CDP 250 kbps / 800 ms RTT, CPU ×4, 360 px; `/`, `/markets`, `/markets/[id]`)
  shows rail or header icons blank at the end of hydration — then the shell group is inlined as `<symbol>`s in the
  root layout.
- **API:** one new prop, `tier?: "line" | "fill" | "duo"` (default `line`) — no call-site edits. The Line tier's weight
  is derived from the size (R-WEIGHT, Ali's 1B):

  | Size | Line weight | Painted px (house today) |
  |---|---|---|
  | ≤ 26 px | bold | 12 → 1.13 (0.95) · 14 → 1.31 (1.11) · 16 → 1.50 (1.27) · 18 → 1.69 (1.43) · 20 → 1.88 (1.58) · 24 → 2.25 (1.9) |
  | ≥ 27 px | regular | 28 → 1.75 · 32 → 2.0 · 48 → 3.0 |

  Fill is Phosphor's fill at any size. Duo is Phosphor's own Duotone — its Regular outline plus the tone layer, exactly
  as Ali saw it in the specimen — and the tone's 0.2 becomes `--glyph-tone` (R-TONE).
- **Marks among words** (`text`: 68 sites on 10 keys) are drawn inline as strokes on Phosphor's own centrelines (e.g.
  caret-right `M96 48l80 80-80 80`) with `.kp-gtext` + `--g-stem`, exactly today's CSS, so they keep the font's stem
  (R9-A4 / R10-A6). A guard proves every sampled outline point lies 8 ± 0.3 units from the centreline.
- **Three CSS literals carry house geometry** and move to generated variables (`.kp-jbal__lock`, `.kp-jhdr__pill`, the
  hub chevron's `translateX(-2.25px)`); `.g-ring`'s origin is pinned to the Phosphor bell.
- **Parity, the harness's own way** (`scripts/qa-classic-shell-parity.mjs` — normalisers only for proven noise; changes
  are exact named entries): v5 adds a per-region `glyphs` field (ordered `data-g` + a sha1 per drawing) and a `norm`
  rule for the hashed sprite URL that keeps the fragment (with its own red check); a new baseline and a null compare.
- **New guards** (each with an in-process `--prove-red` twin): `test:glyph-source` (**in `predeploy`** — what enforces
  R-NEW-PAGES: no Phosphor import outside `scripts/glyphs/`, devDependency only and exact, no other icon package, the
  256 viewBox only in generated files, the inline-`<svg>` and text-character icon lists frozen and only shrinking,
  nothing client-reachable importing `glyph-paths.generated.ts`) · `test:glyph-sync` · `test:glyph-map` ·
  `test:glyph-tiers` · `test:glyph-keys` · `test:glyph-licence`.
- **Amended, derived from the diff:** `test:visual-pass-r9a` (§1.3, §1.1–1.5, §2, §4.1, §4.7, §4.8),
  `test:visual-pass-r10` (§6.9, §6.10, §7), `test:visual-pass-r4d` §6, `test:visual-pass-r4e` §2,
  `test:offline-neutral` §5, `test:pager-reach` §2/§3, `test:journey-shell` §1, `test:design-frozen`,
  `test:measure-system` §8, `test:visual-pass-r5a`, `test:glyph-motion`, `qa:first-load` (gzip/brotli totals + marker
  rows). Unchanged: `test:icon-sizes`, `test:privacy-notice` §2a, `test:css-vars-defined`.
- **Proof:** every key × frozen size × edge × stem gives margins byte-equal to a copy of the old engine; every existing
  glyph guard passes unchanged; the parity null compare passes; first-load moves by no more than ±0.5 KB gz.
- Remove the stale `lucide-react` entry from `next.config.ts` `optimizePackageImports` (the package left 2026-07-20).

### W2 — The swap (one commit: land, measure, add the measured layout entries, squash)
0. **Carried from W1:** parity harness v5 and its baseline against the `main` the swap lands on; the `qa:first-load`
   gzip/brotli rows and the `GlyphRegistry` / `GlyphPaths` markers; the sprite trimmed to the variants each surface draws
   and split by reach (shell / app / admin); the three CSS literals that carry house geometry; `test:glyph-tiers` and
   `test:glyph-keys`; the amendments of every guard that reads the house drawings (§5 W1 lists them).
1. Ali reviews the FULL contact sheet (`glyphs:gen --sheet`, every key in its weights); `map.ts` is frozen.
2. `glyphs.tsx`: the entries and `G`/`GL` go; `I` is built from the registry (sprite renderer + inline centrelines);
   `GLYPH_SET`/`KEY_OF` rebuilt. Call sites unchanged.
3. The offline page uses the server renderer; the generated CSS variables take Phosphor's values; `sw.js` prunes
   superseded sprites, keeping the previous hash one release (deploy skew).
4. Dead keys go — `voidX` too: Ali's 2026-10-17 Millionea ruling (§6) ended its reservation. The §3 picks land.
5. Parity: `scripts/glyphs/parity-entries.mts` generates exact old → new pairs; layout entries come from the first
   compare's `.current.json` (measured, never predicted); every entry seen in all its cells or none; listed where the
   parity register is kept.
6. DESIGN_AUTHORITY: §K3, §C6, §S3 (the weight law), §0d, the §M5 count — rewritten to the new truth.
7. Measure: `qa:first-load` against base (target ≥ 5 KB gz lighter per route), sprite sizes, HTML bytes, the 2G film
   strip; the full tile set; the production read-back.
- Risks: a blank icon on a cold 2G visit (inline the shell sprite if the film strip fails) · deploy skew (previous
  sprite kept one release) · service-worker growth (prune rule) · parity blind inside `<use>` (the digest field) ·
  Phosphor's larger live area (Ali rules from the contact sheet; `plateGlyph` numbers do not move in the swap) · a missing
  variant at a dynamic size (an availability mask + a `RESERVED` list).

**As built (live at `732efbc5`, 2026-10-17 23:10 UTC):**
- **The engine is Phosphor's.** `glyphs.tsx` builds `I` from the generated registry: `<svg><use>` into the content-hashed
  app / admin sprites, the chrome's Bold and Fill as symbols the root layout inlines (`GlyphShellSprite`), the ten marks
  among words as strokes on Phosphor's centrelines; tiers line / fill / duo with the Bold-to-26px rule; the offline page
  from `offline-glyphs.generated.ts`. The CSS that carried house geometry is re-derived from Phosphor's ink:
  `.kp-jbal__lock` `calc(-28 * 16px / 256)`, `.kp-jhdr__pill` `calc(11px + 28 * 14px / 512)`, `.kp-udbug__arrow`
  `calc(0.082em - 56 / 256 * 0.8em)`; the hub chevron's `translateX(-2.25px)` is still exact.
- **The lexicon landed** (§3): the board `markets` on both tabs, Up & Down `trade`, Live `live`, the deposit / withdraw
  arrows on every money door, proposals `idea`, limits `limits`. Decided in W2 (the lead engineer — Ali may overrule
  in one line): `resolved` and `sealCheck` share Phosphor's seal-check (5.5A; the seal Maswali's marks build on), so the
  hub's Uthibitisho wa utatuzi row wears a new key, `attestation` (Phosphor `stamp`) — R5-A had parted that row from
  Matokeo once already. `voidX` retired.
- **Two costs of Phosphor's fuller drawings, fixed at the source:** Button's spinner takes the glyph's room
  (`glyphRoom`, as the search box's `slotPull`), so an lg button's label no longer jumps 1.64px when it starts loading;
  the search box's ⓘ is 14px (on a whole pixel), so the field's two insets are 14.00 and 14.09.
- **The first Fill on a page** (decided in W2, the lead engineer — Ali may overrule in one line): the How-to card's play
  on its royal plate is drawn solid, `<I.playBare s={plateGlyph(48)} tier="fill" />` (`playBare` in `FILL_KEYS`), as the
  hand-drawn triangle was — a play button on a plate reads solid, and Phosphor's Bold play is an outline.
  `test:journey-home` 5.plate pins it in source and as drawn (`p-play-fill`, with two new plants); r9a §1.3′ proves the
  Fill triangle, like the Bold one, is centred on its centroid.
- **The checkbox tick keeps Phosphor's Bold check at 13px** (decided in W2, the lead engineer): 1.22px arms over a 10.6px
  tick, where the hand-drawn one painted 1.63px over 9.2px — about the same ink, longer and finer. Its `strokeWidth: 3`
  went: a filled Phosphor outline has no stroke to thicken. Rejected: check-fat (3.1px arms at that size, heavy in a 19px
  box) and the check's Fill (a tick knocked out of a square). To be read at the tiles.
- **The chrome never waits for a file** (found in W2's own review): the balance pill's eye (`CashEye`) and its lock are
  header chrome, yet they were served from the app sprite, so a slow first visit would have shown the header's eye blank
  until that file arrived. `eye`, `eyeOff` and `lock` joined `SHELL_KEYS`: twelve inline symbols, 1.5 KB brotli on
  every page; the app sprite is 138 symbols, 16.9 KB brotli, one immutable file. `test:glyph-map` §9 now holds the
  chrome to it: every key the two tab bars and the two headers draw before a tap is a shell key, a key drawn only in an
  opened menu or panel is named with where, and every shell key is drawn by the chrome (six new plants, 25/25 caught).
  The skew case is Next's: a tab opened before the deploy loads a whole new page on its next navigation (the router
  compares the build id), so it never draws a shell glyph without the inline symbols beside it.
- **W2's adversarial review** (2026-10-17: an independent read of the whole diff, set to refute it) found six defects,
  all fixed here:
  1. The three focus traps (`Modal`, the notifications panel, the filter sheet) counted a bare `[href]`, so every glyph's
     `<use href>` was "focusable". In ConfirmModal (the deposit and withdraw confirms, sign-out, 63 admin confirms) Tab
     died on Cancel, and Shift+Tab left the dialog. They now read `a[href], area[href]`.
     `test:visual-pass-r6b` 1.2 had caught it. It reads the same selector, with a new control showing the in-flight
     panels draw 3 and 2 glyphs it no longer counts.
  2. A followed market's star lost its fill: a class cannot fill a Phosphor drawing. WatchStar now draws the star's
     Fill when on (`star` in `FILL_KEYS`).
  3. R-WEIGHT at 27px and up: RewardBurst's 36px glyphs (trophy, shieldcheck, resolved, star) and the cashback coins
     now ship Regular, where they fell back to Bold.
  4. The category Other, and any category the map does not know, drew the board's key. It read as "All" beside it and
     as the board tab. It has its own key, `assorted` (Phosphor `shapes`).
  5. Proposals: W2 had moved only the hub row to the lexicon's lightbulb, leaving three marks. Now `idea` is on every
     player-facing proposals mark: the page header and its loading states, the promo card, the avatar menu.
  6. `.g-ring` swings from Phosphor's bell crown (7.8125%, not the hand-drawn 15%). `test:glyph-motion` §5 reads the
     pivot from the drawing.
- **W2's screenshot review** (2026-10-17). Four readers went through every before/after tile, 204 pairs from the parity
  runs, each tile's changed regions zoomed 3× by `w2tiles/tilediff.mjs`. They found no blank, clipped or off-centre
  glyph. Fixed here:
  1. The LIVE strip's pause read as "00": two hollow bars at 14px beside the run's mono text. Its pause and play are now
     solid (`tier="fill"`, `pause` in `FILL_KEYS`).
  2. The journey bell's count badge touched Phosphor's bigger dome: 0.16px at rest, and the fill on the outline at the
     pulse's peak. It rose 1px (`top: -4px`), giving 0.94px at rest and 0.33px for "99+" at the peak.
     `test:journey-shell` 7.bell′ reads both from the drawing, with a plant at −3.
  3. The lexicon, completed where W2 had moved only the hub row:
     - limits and breaks draw `limits` on the help card, the profile row and the responsible-gambling page's header (a
       shield and a gear before);
     - the profile's Msaada row draws the hub's `headset` (a heartbeat before);
     - /fairness wears its hub row's `attestation` (a shield-check before);
     - the 404 page's Masoko card draws the board's `markets` (a bar chart before);
     - a resolved journey card's tag is `resolved`, the seal (a check-circle before).
  4. Weather is `cloud-sun`: `cloud-rain` at 11–13px read as a speech balloon.
  5. Two guards W2 had turned red, fixed:
     - `test:chart-one-home` names `glyphs.tsx`: its marks among words draw a static centreline in a `d={}`;
     - `test:orphans` now reaches `scripts/glyphs/`, through imports with their extensions and
       `npm run glyphs:parity-entries`.
- **Seen and left, with reasons:**
  - The journey's Akaunti tab person is 17px wide beside the other tabs' 14px: Phosphor's `user` fills 216/256 of its
    box, the others 184. R-RAIL (4B) redraws the tab bars at 24px in W3, which balances the four there.
  - The receipt at 14–16px reads close to a message box. `file-text` is the documents' glyph, and the other receipt
    drawings read worse. Its words name it everywhere it is drawn; W5's money doors give it a plate.
  - Glyph boxes 1–2px wider move their neighbours by as much: buttons, chips, a search field's placeholder. Nothing
    wraps; the parity entries name every move in the classic shell.
  - The market card's 140px category watermark draws Bold: it is drawn at `s=24` and scaled by CSS, and W5 retires it.
  - The inline shell symbols also travel in the page's RSC payload, as every server-rendered element does; brotli
    compresses the twin.
  - The rail coin's drawn "+" sits beside the header's ↓ deposit; W5 brings the one deposit glyph.
  - A missing sprite cannot be pinned at the edge: production answers a 404 under `/icons/` with `private, no-cache,
    no-store` (Cloudflare `BYPASS`), and only a real file gets the year-long `immutable`.
  - The plan's 2G film strip asked whether the chrome would be blank on a slow first visit. The inline shell (§9)
    answers it by design; content glyphs come in one immutable file, 17 KB brotli.
- **Every guard that read the hand-drawn entries is re-pointed** at the drawings as shipped, through one shared reader
  (`scripts/lib/glyph-drawings.mts`): r4d, r4e, r5a, r5b, r7c, r8a, r9a, r10, journey-home, journey-shell,
  measure-system, offline-neutral, pager-reach, wallet-reach, glyph-motion's header. Old tile numbers stay as history;
  Phosphor's numbers are pinned from the drawings; the hand-drawn controls and plants are kept verbatim. r9a §1.3 names
  the 19 drawings Phosphor centres by eye, the Fill play among them (their offsets pinned). Seen on the way and fixed: `red:journey-shell` was red
  on `main` (a plant's needle predated the classic row's c3e28b47 spelling), and `test:journey-home` counted a glyph's
  `<use href>` as a link.
- **R-ONE-SOURCE** (Ali, during W2 — §2): AGENTS.md §7, DESIGN_AUTHORITY §K3, the decisions log and the design master
  brief state it; `test:glyph-source` gained §5 (SVG data URIs, a census of one: the Needle's drag cursor) and §6 (every
  image under `public/` named for what it is — 33, none an interface icon but the three PWA shortcuts W7 redraws).
- **DESIGN_AUTHORITY rewritten:** §K3, §S3 rule 3 (the weight law), §C6, §C7, the §M5 heading, the §0d row.
- **Parity:** `qa-classic-shell-parity` reads a sprite's content hash as `~` (an asset hash, as a chunk's), the symbol
  after `#` still compared; its proof is P.1b.
  - The baseline was taken at W2's base, `862aa757`: 52/52, 224 cells.
  - The first compare ran at `4fffe9b1`: 64/68, its four failures the glyph differences.
  - `scripts/glyphs/parity-entries.mjs` generated 21 entries from them into `qa-parity-glyph-swap.generated.mjs`:
    - the header, footer and rail of all 224 matrix cells;
    - the Sell confirm;
    - the book's main, similar rail and LIVE strip;
    - the question page's main, panel and holder.
  - The generator learned two rules on the way:
    - An `auto` margin that absorbs the new width of a glyph the element holds is layout, not style: the question
      header's `ml-auto` row around its Source ↗ mark, 56 cells.
    - When one glyph box rounds to another half pixel in some cells, those cells get a further entry, tried after the
      first: the Swahili language menu's ✓ at 1024px, 4 cells.
  - Left unexplained, correctly: the `/watchlist` card's date line in 4 cells. Its text is the row's seeding moment,
    already masked by `eat-dates` (the 090bbf76 pair proved it differs between servers), but its width still varies
    with the digits. This is a harness gap, not W2. The question page's canonical time before geometry would close it,
    and it is filed for the harness's owner.
- **What `test:all` says about `main`** (`b090e420`'s run: 557/610 green; each failure read, and the non-database
  ones re-run on `main` `862aa757` itself):
  - 27 need a scratch Postgres or a server this machine's battery does not start: `db-scratch` suites, and three
    live drives on :3009.
  - 16 fail on `main` the same way:
    - from the Maswali console: `ui-consistency`, `type-scale`, `measure`, `labels`, `integrity`, `grid-paging`,
      `layout-staleness`, `unsaved-changes`, `failure-reasons`, `predictor-shown`, `house-bot-seam`, `bet-sheet`,
      `spacing-scale`, `eyebrow-roles`, `visual-pass-r5e`; all fixed on `maswali-s4`, and W2 takes them on its rebase;
    - `house-bot-disclosure` 5.1 compares a Windows checkout's CRLF bytes, which are identical to the blob once the CRs
      are dropped.
  - 2 were W2's, `chart-one-home` and `orphans`, fixed in the screenshot review's commit.
- **The release** (`732efbc5`, its proof as a v4 `run` job):
  - typecheck 0 and `next build` 0; every route's first load read, and 6.4–6.5 KB lighter gzipped than W1's.
  - Local `qa:live`: 377 passed, then the machine guard stopped the dev server at 26 MB free during its last section,
    [M]. That section is Millionea's darkness, which W2 does not touch; production `qa:live` reads it again.
  - **Lesson:** Turbopack compiles the whole crawl in native memory that no V8 heap cap bounds. Warm routes one by
    one; a browser step waits for 3.0 GB with the server up; the machine guard is the backstop.
  - Pushed as a fast-forward of `main` at 23:10 UTC on Ali's *"push lov enayhtng please"*.
- **After the push, all done:**
  - **Production, read back:** www, apex and the Railway host served `732efbc5` after 220 s. The sprite is served 200
    and immutable; `qa:chunks-prod` passes on both origins; production `qa:live` passed 363/363, [M] included.
  - **Release part two, on a fresh server:** [M] alone 10/10, so local `qa:live` is 387/387; `qa:checkbox-surfaces` 0.
    The review's fixes, in a real browser:
    - Tab and Shift+Tab cycle inside the sign-out confirm, and the old bare `[href]` list is shown to have picked two
      glyph `<use>`s;
    - the lightbulb on /proposals and in the account menu;
    - on the compare's seeded server, the followed star goes Bold → Fill → Bold, and Other's chip draws `assorted`.
      The account menu hides its promotional rows while the seeded player is on a break, as it should.
  - **Parity:** the entries are regenerated from a compare at `f49c3be2` (64/68; the 4 failures were the glyphs this
    round changed). There are 21 exact entries, re-checked by the harness's own rule. The only fields left unexplained
    are the 4 `/watchlist` date-line cells, the harness gap filed in §7. A third compare would fail on those cells
    whatever W2 does, so it was not run.

  **For W3:** the codegen deletes a superseded sprite; from the first wave that changes a live drawing, the previous
  sprite is kept one release (deploy skew).

### W3 — Selected states
Classic rail, journey tabs, the classic and journey desktop bars, the admin sidebar (icons ADDED): inactive Line in
`--text-subtle` → selected **Fill** in `--text` on ONE opaque indicator, via `GlyphSwap`. The four "active" styles
collapse into one. The rail's square, edge-to-edge focus ring follows the pill.

**Researched 2026-10-17, on `main` `f49c3be2`** (a read of every surface, with lines, in the session's notes):
- **Today:**
  - None of the five surfaces uses `GlyphSwap`.
  - The six keys the two tab bars draw (`markets`, `trade`, `live`, `menu`, `ticket`, `user`, all shell keys) ship Bold
    only; none is in `FILL_KEYS`.
  - Both desktop headers and the admin sidebar draw no destination glyph at all.
- **The four "active" styles to collapse:**
  - the rail's pip: translucent `--pill-active` with `--edge-lit`;
  - the classic desktop link: `--pill-active`;
  - the journey desktop link: a `--brand-500` underline;
  - the admin row: an inline `--pill-active`.
  - `--pill-active` (40% L, alpha 0.35; 1.18:1 on the bar) also paints a dozen filter, menu and tab controls, and
    `test:filter-language` 2.5 allows one definition. So the opaque royal indicator gets its OWN tokens; it does not
    repaint the filters.
- **Build:**
  1. The six nav keys into `FILL_KEYS`, inlined like their Bold, about 1 KB brotli more per page.
  2. One indicator: tokens for the opaque royal pill, its even lit ring (`test:m1-light`) and its ink.
  3. The tab bars: glyphs at 24px (R-RAIL 4B) in a pill grown to fit; Line → Fill by `GlyphSwap`; the focus ring on the
     pill. The not-found unlight rules follow the new base values (`test:visual-pass-r4j` 5.12).
  4. The classic and journey desktop links: the same pill. `test:journey-shell` 7.underline and its red twin forbid a
     pill there; R-INDICATOR's "everywhere" (Ali, 2026-10-17) supersedes that, so the check is re-pinned openly, with
     the ruling cited.
  5. The admin sidebar and drawer: a glyph per row (new admin keys, one meaning each) and the same pill.
- **Guards to re-pin, named in advance:**
  - `test:journey-shell`: 8.glyphs pins `s={20}`; 7.underline as above;
  - `qa:journey-shell`'s focus offsets;
  - `test:glyph-map` §9: admin keys stay off the player chrome;
  - `test:glyph-sync` §1: the previous sprite kept one release needs a named exception;
  - `test:visual-pass-r7c` 6.2 and `test:visual-pass-r9c` 8.2: byte-for-byte checks on the classic chrome, green once
    committed;
  - the classic shell parity: W3's rail and header changes are named entries, measured.

**The admin step (written on `phosphor-w3-admin`, 2026-10-18; the codegen, typecheck and guards are the release's):**
- **The lexicon:** 50 destinations, one glyph each (§3 "Admin destinations (W3)"). 24 reuse the key that already
  carries their meaning; 26 are new console keys in `NEW_KEYS` and `ADMIN_KEYS`. Each new name was checked free in
  `map.ts`, apart from the Maswali lane's 13, and present in all four weights of 2.1.1. The sidebar draws each at 18px
  in Bold and Fill, and the W3 block of `FILL_KEYS` ships every Fill. The 29 console keys' Fills go to the admin sprite.
  The 18 reused app keys' Fills go to the app sprite: about 7 KB of raw path data that a player's sprite carries for the
  console alone. A per-variant placement in the codegen (an admin-only Fill in the admin sprite) would take it out; it
  was not built here.
- **The type:** `NavItem.glyph: GlyphKey` is required (R-NEW-PAGES). The drawer now types its rows with the shared
  `NavGroup`, where it had kept a narrower copy of its own.
- **The rows** (`admin-sidebar-nav.tsx`, `admin-mobile-nav.tsx`):
  - `<NavGlyph glyph={it.glyph} on={active} s={18} />` sits before the label, 10px apart, and the pip stays at the
    right. The gap is `gap-[10px]`, the same-pixel literal: `gap-2.5` is an inverted key, and `test:spacing-scale` only
    lets their count fall;
  - the current row wears `--nav-pill` with `--nav-pill-edge`, its ink `--text`;
  - the comments that said `--pill-active` owns this job are rewritten: it stays the selection of filters, menus and
    page tabs. The admin brand link's hover keeps it, and its comment says why.
- **Guards re-pinned:**
  - `test:house-bot-console` 1.333 pins the desk's literal with its glyph, the neutral `desk`, and asks ruling 453's
    lexicon of that glyph;
  - the anchors `red:house-bot-console` 321-nav and `red:maswali-rbac` (6) carry the glyph in their literals;
  - `test:visual-pass-r9a` §1.3 names eight more drawings that Phosphor sets off their box: the Fills of `bot`,
    `comment`, `gift`, `megaphone` and `shieldAlert`, `journey`'s Bold, and `roles`' Bold and Fill. Each offset is read
    by hand from the path data, so the release's run confirms them.
- **Guards added:**
  - `test:admin-nav` §8: a live key, one destination per glyph across the sidebar, the Fill shipped, with a planted
    control;
  - `test:glyph-map` §10: the console's own keys stay in the console, with four plants.
- **Integrated** onto `phosphor-w3` (2026-10-18; cherry-picked as `43162096` and `8a693b12`, the two conflicts resolved
  as the helper named them), then `npm run glyphs:gen`:
  - 258 symbols; `app.715e8904.svg` grows from 81.6 to 90.0 KB raw (20.6 → 22.1 KB brotli, so 1.56 KB, cached once) and
    `admin.94a79047.svg` from 4.6 to 29.8 KB raw;
  - `app.a7babf1a.svg` and `admin.d4427285.svg`, production's now, stay one release (`PREVIOUS_SPRITES`);
  - the guards it touches are green, and r9a confirms the eight hand-read offsets: glyph-sync, glyph-map (red 30/30),
    admin-nav 29/29, r9a 55/55 and glyph-source.
  - Per-variant placement is not built. W4 and W5 draw several of those Fills for players (statuses, plates), so the
    1.56 KB would come back.

**W3's adversarial review (2026-10-18; read-only, the whole diff from `e2eb9cd6`): ten findings, each answered:**
- **Fixed:**
  - `test:visual-pass-r5b` 2.3 still read the removed journey underline. It would have gone red in `test:all`; it is
    re-pinned openly.
  - `test:visual-pass-r9c` 4.3 held the pip at a literal 26 and stayed green. It now reads the pip from
    `.kp-rail__pip`: 7.675 at 320, 8.5 at 390, and Swahili's two-line Tiketi slot 61.3px (the rail 74.3px below
    332.8px, under `--rail-h`'s 88). The stylesheet's note is corrected.
  - GlyphSwap wrote its "changed" flag during render, so a router transition's discarded render could replay a morph.
    Only a committed change counts now; the flag is raised in an effect.
  - The admin rows faded the pill's fill and snapped its edge. The box-shadow now fades over `--t-quick`, as
    `.kp-navlink`'s does.
  - Nothing tied the tab bars' NavGlyph keys to `FILL_KEYS`: a lost Fill would have drawn Line in silence.
    `test:glyph-map` §9b holds them, with two plants.
  - `PREVIOUS_SPRITES` was a hand-kept list nothing tied to production. `test:glyph-sync` §1b reads the sprites
    `origin/main` serves and fails a tree that would delete them, with a plant; it says "not measured" without git.
  - DESIGN_AUTHORITY and the contrast audit said the desktop bars draw a Fill glyph; they draw words. Both are
    corrected, and in forced colours (which strip the pill) the current desktop link now keeps a 1px system-ink outline.
  - `parity-entries.mjs` wrote a pair subset it had not re-checked. The subset is re-applied; failing that, the whole
    pool is written.
  - **Four admin glyphs:**
    - House is no longer Phosphor's Home mark (`building-office`);
    - Transactions reuses `receipt` (a wallet receipt is one record per money movement; `table` read as the Overview's
      `layout` at 18px);
    - Role permissions is `lock-key` (the shield already carries AML's warning);
    - AI usage is a new `aiUsage`, a speedometer (`activity` already means an activity log).
- **Kept, and shown to Ali:** the Fills of `live` (broadcast) and `trade` (arrows-down-up) keep Phosphor's thinner
  strokes, 16 units against Bold's 24, where only their centre and heads go solid. So the current Live and Up & Down
  tabs draw 1.5px waves and shafts beside 2.25px neighbours. A composite would be a house drawing where Phosphor has
  one, which R-ONE-SOURCE rules out. The tiles show both; the call stays open to Ali.

**The tiles, read (2026-10-18):** 91 before (main `e2eb9cd6`) and 91 after (`9c6067af`), from the baseline's and the first
compare's servers (`scratchpad/phos/w3tiles/`).
- **The chrome, 60 pairs, read by a reader in full:**
  - classic and journey rails at 320–768 and both headers at 1280, in sw, en and zh, for a guest and a player;
  - no clipping, no overlap, no new truncation or wrap; every label on one line, the coin's included, and the coin's
    rise unchanged; the gilt and unread dots on their icons' corners; both headers' current links on the pill, nothing
    moved.
- **One change measured, as predicted:** at 320px in Swahili, where "Tiketi zangu" takes two lines, the journey rail is
  about 6px taller (74.3px, r9c 4.3). That is still under `--rail-h`'s 88, so the page's bottom reserve still clears it.
- **The lit, focus and admin pairs, 31, read by a second reader in full:**
  - **Fixed:**
    - On the deposit page two tabs were lit. More's Wallet row (`/wallet`) is a prefix of the coin's route
      (`/wallet/deposit`); the bug was older, but the opaque pill made it plain. More no longer lights while the coin is
      current.
    - A desktop link's focus ring ran into the current link's pill beside it, because the links stand edge to edge. The
      ring is now drawn inside the link (-2px), in `--brand-300` on the current link's own pill (3:1 there; a contrast
      row). `qa:journey-shell`'s focus cell is re-pinned.
    - The rail's ring, 2px out, met the label 4px under the pip. It is now 1px out.
  - **Kept:**
    - More's Fill (Phosphor's `list-fill`, a solid tile with its lines cut out) reads more like a card than a menu. It is
      Phosphor's own Fill, and it is on Ali's review page beside Live's and Up & Down's.
    - Four console glyphs look alike at 18px, with their labels beside them: Finance's calculator and Payments ops'
      handset, and Retention's archive and System's drives. W5, which gives the admin cards their icons, revisits them.
  - **Not in these tiles**, so taken again at the release: Sources & categories, the drawer's lower rows, and a lit
    drawer row other than Overview and House. The capture now scrolls the sidebar to its middle and the drawer to its
    current row and its end.
- **Main's own red, measured on a throwaway checkout of `95c480f1`:** `red:wallet-reach` case 21 catches its plant on
  8c.2, not 8c.3 (26/27). The plant is in the journey's top bar, which W3 does not touch; it is for that bar's lane.

**The derived battery (2026-10-18, at `633e6424` on main `95c480f1`): 162 suites, from the diff (`w3-derive.sh`):
145 green; the other 17 are main's own or need what this machine does not run, and W3 adds none.**
- **Red on main itself, run the same on a throwaway checkout of `95c480f1`:**
  - `red:enter-where-pressed` 118/119, `red:journey-tickets` 114/115, `red:journey-updown` (a wrong reason),
    `red:root-has` (a stale plant in modal.tsx), `red:shell-boundary` 6/7, `test:motion` and `test:presence-class`;
  - `red:wallet-reach` case 21 (above).
- **Red on main, listed by the Maswali session as S5's own and fixed on its branch:** `test:visual-pass-r5a` 8.13,
  r5h 3.5, r5j 1.1, r6c 11.2, r7c 3.9.
- **Need a database or a server:**
  - `test:house-bot-console` and `test:visual-pass-r8d-stores` (Postgres);
  - `red:house-bot-console`, which refuses when a DB-bound baseline is red;
  - `red:journey-header-fit`, which runs only by name against a server.
- ⚠️ **The lock took over the live battery.** It ran 5h50m: `red:house-bot-console` spent about 3 hours, and
  `red:campaign-visuals` about 2. After 3 hours the lock treated it as abandoned, and the next waiter, the clean
  compare, started beside it. Free memory fell to 1.39 GB and the compare's server died at cell 94, so its 46/66 is void
  (`w3-c2-failed-overlap.log`). It runs again alone. Batteries now stay far under 3 hours.

**Live at `ee62451c` (2026-10-18; pushed at 11:22 UTC on Ali's *"push now please then do any chekcs needed"*):**
- **The release proof before the push** (`scratchpad/phos/w3-release/`, at `633e6424`, the same code):
  - local `qa:live`: 386/386;
  - `qa:landing-ten`'s V26 clean: the coin's 14px rise, equal slots, every rail label on one line. The landing page's
    other classes are red on its own content and data (no settled rows on a fresh server, the hero claim's evidence),
    and four signed-in cells need a local credentials file. None of it is W3's;
  - typecheck exit 2 and the build exit 1, both from three errors in `maswali-dal.ts` alone, with none in W3's code:
    the shared node_modules' Prisma client was generated on 10-17, before main's `MaswaliNoticeSeen` model. Railway
    generates its own and built clean. The run regenerates the client and runs both again (below).
- **The push:** a fast-forward of main, `5561168c` → `ee62451c`, rebased onto the Maswali session's docs-only
  `5561168c`; the doc guards are green.
- **Production, read back (11:25 UTC):**
  - www, apex and the Railway host served `ee62451c` 200 s after the push;
  - health is reachable and migrated;
  - pages carry 18 inline shell symbols (twelve Bold and the six tab-bar Fills);
  - `app.9032012a.svg` answers 200, immutable;
  - the kept `app.a7babf1a.svg` and `admin.d4427285.svg` answer 200 on both origins.
Tickets, positions, results, market chips, receipts, notifications: glyph + ink + word, so shape alone tells them apart
(§A4). Inks from `src/lib/status-tone.ts` (§B11). Won = the Fill seal in gold (earned money, §M3a); lost / void / pending
= quiet Line marks (§M7: a loss is bookkeeping); void slate; result crests success/danger (`test:betting-ink` §7a).
"Resolved" stops borrowing the won gold. Callouts, toasts and the result dialog: a Fill status glyph on a role plate.

### W5 — Plates, money, hub, categories, stats, admin cards
`IconPlate` gains `role` tints from tokens (`color-mix` in oklch); one plate everywhere (the ~30 hand-made tiles go).
One deposit glyph, one withdraw glyph. Hub rows: Duotone on plates on the phone too. Categories: a Duotone sigil on a
royal plate on cards, the discovery chips and the journey home chips (the 0.055-opacity watermark retires). Info buttons
and stat tiles: the glyph fills its control per `plateGlyph`. Admin stat cards and status chips get icons.

### W6 — Empty states, one family
`ui/empty-state.tsx`'s private drawings retire; W2 already retired the unused `GL` art. An empty state is a Duotone
glyph on the shared plate. DA §C7 owns its size and single `--metal-gold` accent (§Q5), never money gold (`test:visual-pass-r5c` §2.9,
`test:gold-is-money`). Badge medallions per Ali's W0 answer.

The shared `EmptyState` now maps each kind to one family key and renders that key in Duotone on the
empty plate. The bell panel uses that same plate. `ErrorState` uses the family's filled circled cross on a danger
plate. `test:visual-pass-r3c` renders every kind and plants a Line-tier defect; `test:visual-pass-r5c` plants a money-gold
accent. The screenshot proof pairs the old and new empty positions, empty notifications and open bell panel at phone and
desktop widths in all three languages.

### W7 — Consolidation
The 63 inline `<svg>` → family glyphs, or kept with a recorded reason (charts, brand, spinner). Text-character icons
(`→` in buttons, `▲▼`, `↑↓`, `★`, admin `✓ ✗ ⚠ ⛔ ↗ ●`) → glyphs (× as the multiplier stays). The `test:glyph-source`
ratchets reach 0. PWA shortcut icons regenerated from Fill glyphs via `build:brand` (DA §B1a). Maswali's glyphs move to
Phosphor's grammar.

### W8 — Motion: no new keyframes; every moment uses a primitive that already exists (DA §M5)
| Moment | Primitive (`src/app/motion.css`) |
|---|---|
| A destination becomes selected (line → fill) | `GlyphSwap` → `.g-swap-out` / `.g-swap-in` |
| Watch / star / subscribe turned on | `.g-settle` on the Fill glyph's mount |
| A NEW notification (never on page load) | `.g-ring` on the bell, its origin pinned to the Phosphor bell |
| A deposit confirmed / a withdrawal requested | `.g-nudge-down` / `.g-nudge-up` on its arrow, once, on the event (never press or hover) |
| A bet placed / a deposit confirmed | the check draws itself with the dormant `.m-draw` on Phosphor's check centreline |
| A win | the existing seal only (§M7); nothing loops, no confetti (§C5); haptic `success` only (§H1) |
| Live | the existing calm breathe dot |
Each has its reduced-motion branches (§M6). DA's drift that `.m-draw` runs 820 ms is corrected (it runs `--t-max`).

### W9 — Close
An adversarial audit (refute by mutation), `test:all` with the database suites, full tiles (360 / 768 / 1280 / 1920 + 320
× sw / en / zh, both shells, admin) read one by one, the production read-back. DESIGN_AUTHORITY final; §1 all ✅; the
board row struck; memory updated.

### Verification, every wave
Its own guard and red twin; every suite that reads a changed file (grep `scripts/` for the path); typecheck,
`next build`, local `qa:live` per release (a build is not a render); after a release, the production read-back
(`?dpl=` on both hosts, health, chunks). Tiles of what changed, read one by one; named parity entries; a
`test:contrast` row for every new plate/ink pair. Before/after tiles go to Ali as a private Artifact.

---

## §6 · Coordination
- **Maswali D2 ✅ (2026-10-17, main `380edd31`):** the R2 delivery is filed at
  `design-system/v6-2026-10-17-millionea/`, and its INHERIT-MANIFEST adopted three hand-drawn glyphs — `sealNil`,
  `sealX` (the rename of `voidX`) and `millionea` (a coronet). **Then Ali ruled (2026-10-17, MASWALI-PLAN §10c, main
  `c218979d`) that Millionea uses NO hand-drawn glyph: every Millionea icon is Phosphor, through `I`** — R-ONE-SOURCE
  for the third product. The Maswali lane will add its keys through `map.ts` and `glyphs:gen` when its S5 starts (its
  list, sent to this session the same day: millionea → diamond, markPending → circle-dashed, reserve → lifebuoy, standIn →
  arrow-bend-down-right, floor → vault, register → notebook, fairness → fingerprint, refund → arrow-u-down-left, howTo →
  book-open-text, cap → stack, finalWeek → flag-checkered, and more). Answered the same day: `pause` is an existing key,
  `lock` draws `lock` (not lock-simple), and seven proposed drawings already belong to a key (`checkCircle`, `xCircle`,
  `coins`, `rotateCcw`, `eye`, `hourglassHalf`, `sofSavings`) — reuse the key or pick another drawing (glyph-map §4).
  Nothing is reserved for Maswali any more; `voidX` is retired in W2. **The Maswali lane adopted the review (MASWALI-PLAN
  §10c, main `d12ab9d7`):** it reuses `checkCircle`, `xCircle`, `coins`, `hourglassHalf`, `rotateCcw`, `eye`, `lock` and
  `sealCheck`, and adds 13 keys through `map.ts` and `glyphs:gen` at its S5 — `millionea` diamond, `markPending`
  circle-dashed, `reserve` lifebuoy, `standIn` arrow-bend-down-right, `carry` arrow-bend-double-up-right, `floor` vault,
  `register` notebook, `commitment` fingerprint, `refund` arrow-u-down-left, `salesPaused` pause-circle, `howTo`
  book-open-text, `cap` stack, `finalWeek` flag-checkered — each re-checked free in 2.1.1's four weights. Its draft key
  `fairness` was renamed `commitment` (main `ce752dc4`): it marks Millionea's own ticket proof (each ticket fixed at the
  week's close as a salted commitment and a Merkle root, MR-13), not the platform's resolution proof — /fairness keeps
  `attestation` (its hub row) and `shieldcheck` (its page head).
- **Vodacom** (S14–S16 open): classic-shell changes reach `main` as named parity entries, so its branches inherit them on
  rebase. A wave touching home or cards checks `git log` and the worktrees first and goes after that lane's merge.
- **Parallel sessions:** own worktree; heavy Node only through the machine's lock; stage by name; never `git add -A`.

## §7 · Seen on the way (not icons — for their own lanes)
- The chat button covers content on many phone tiles (the hub's "Kiswahili ›", a toggle, a card's time-left).
- The Needle disc sits half off-screen over content on most phone tiles.
- At 320 px the header drops the ⊕ on "Weka pesa" and "Tiketi zangu" wraps to two lines.
- **For the owner of `qa-classic-shell-parity` (found 2026-10-17 in W2's compare):** a book cell's server-rendered EAT
  moment is masked as text (`eat-dates`), but its geometry is not. The `/watchlist` card's date line (`.mcardp-timeleft`,
  `data-market-part="time"`) is the row's seeding moment, and Inter's digits are not tabular, so its width, and the
  `ml-auto` row around it, differ between any two fresh servers whose moments differ in digits. W2's compare saw 78px
  against 82px, in the 4 player `/watchlist` cells.
  The question page already solves this: `break-end-clock` writes one canonical same-format time before geometry,
  calibrated from the ff8c pair. The same treatment for book cells would close it; the 090bbf76 pair already proves the
  moments differ. W3's compare (2026-10-18, against `e2eb9cd6`) saw the same 4 cells again.
- **The journey's break banner at 320px in Chinese is one digit from wrapping** (W3's tile read, 2026-10-18). Its title
  "您的休息期至 2026年10月18日 06:21" fills the card's width exactly, so a wider time, 07:07, wraps it to two lines and
  moves everything under it down about 18px. Live data, not W3; it is for the journey's own lane.
- The floating chat bubble covers the card's "Maelezo" link at 360 and 390 in classic guest Swahili, as it did before W3.
- **Red harnesses whose anchors other lanes' commits moved** (W3's battery, 2026-10-18; traced by the Maswali session on
  its S5 merge with W3, `817e2a02`). Each fails the same way on a clean main, and none is W3's. They are left to their
  lanes, since editing another lane's harness mid-flight could undo work there:
  - `red:enter-where-pressed`: `<KeyGuard />` now occurs twice in `app-shell.tsx` (the focused-payment shell, `49acd4ed`,
    Vodacom S9);
  - `red:journey-tickets`: `UNRESOLVED_STAT` no longer matches `ticket-card.tsx` (its Stat gained font and value
    classes, `635feb27`, S12);
  - `red:journey-updown`: a wrong reason on `updown-card.tsx` (S8 `95a00a9f`/`696a4a43`, S12 `635feb27`);
  - `red:root-has`: its modal plant looks for a rule that moved into the loaded CSS (`97d0aec1`);
  - `red:shell-boundary`: the hub's SEARCH row is no longer a `/markets` link (Vodacom S7 WP9 `21887be6` made it a
    search field), so its "console in the hub's rows" mutation finds no anchor. Re-anchoring it on another link row
    (`kind: "link"`) would restore that plant;
  - `red:wallet-reach` case 21: the journey bar's hidden-words plant is caught by 8c.2 before 8c.3 (the bar changed in
    W2 `cb1853c6`, S9 `49acd4ed` and S10 `5461c178`/`d562a111`); the harness expects the other check.

---

## §8 · The audit of 2026-10-19 (Ali: "validate that all old icons are replaced across the platform")

**How it was read** (on `origin/main` `13299425`; repeatable):
- `npm run test:glyph-source`, the census of the three doors: 42 files may draw 77 inline `<svg>`, one SVG data URI, and
  33 images under `public/`, each named. The census grew from W1's 40 files and 75 drawings by the family's own inline
  symbols and Millionea's hairline (a rule, not an icon), so no icon came in by those doors.
- `src/` scanned with comments stripped (`scripts/lib/decomment.mts`) for typed symbols and emoji, in code, CSS and
  `i18n-dict.ts`. CSS draws no icon: no `content:` icon, and every mask is a fade.
- Every `<I.key>` call with its size and tier: 932 static calls, 570 on the player front and 362 in the console. Before
  this release, a Fill is drawn in four places only: the How-to card's play, the LIVE strip's play and pause, and the
  followed star. The two tab bars also draw Fill, through `NavGlyph`.
- Every door read against the page it opens: hub rows, the account menu, notifications, page headers.
- All 184 registry keys are generated, so no `I[...]` lookup can draw blank. Millionea's thirteen keys are among them.

### §8a · Still drawn outside Phosphor
**Release 1** (the player front; each a family key after it):

| Where | Today | After |
|---|---|---|
| Every market card's 24h move | typed ▲ ▼ | `chevronUp` / `chevronDown` in Fill: the solid caret (± stays a sign) |
| Up & Down history | typed ↑ ↓ for the side; → between open and close, and between stake and return | `arrowUp` / `arrowDown`, the side's word for a screen reader; the → between two figures reads "to" and stays (Kept, below) |
| Up & Down round page | a hand-drawn players icon and outcome arrow; typed ↑ ↓ | `users`; `arrowUp` / `arrowDown` |
| Up & Down stake panel · card | a hand-drawn → before the projected payout; a typed → before the close price | the projected payout's `arrowRight` among words; the card's → joins the open price to the close and stays (Kept) |
| The search bar's sort | typed ↑ ↓ | `arrowUp` / `arrowDown` among words |
| Share | a hand-drawn link mark | `link` |
| Chat | a hand-drawn send arrow | new `send` (paper-plane-right) |
| The kit's select and date picker | hand-drawn carets and ticks | `chevronDown` / `chevronUp`, `check` (the duration input is the console's alone: release 3) |
| The Needle drawer · settings | a hand-drawn chevron, two ticks and two copies of the Needle's mark | `chevronRight`, `check`; the settings row's copy `needle`. The drawer's `NeedleMark` is the mark in its two tones (the menu row, the drawer's head, Manage): `needle` in Duotone, release 2 |
| The classic rail's deposit coin | a hand-drawn "+" | `arrowDownToLine` (R-LEXICON 5.3A, as the headers' deposit) |
| The leaderboard's tier badge | a typed ★ for Sovereign | `star` in Fill |
| The Up & Down rules page | ⚠️ in en, sw and zh | `warning` in Fill, in the warning ink |
| Link labels | a typed "→" closing 7 strings per language (4 rendered: Browse all markets, All results, Browse markets, Browse live markets; 3 unused); "oldest → newest" | the strings lose it; `EmptyStateLink`'s `arrowRight` among words, and All results the see-all `chevronRight`, as the home's; "oldest → newest" reads "to" and stays (Kept) |

**Release 2:** the empty states' 12 private drawings (`ui/empty-state.tsx`, W6) and the notifications panel's empty art; the
category watermark (drawn at 24 and scaled to 140 by CSS, W5); the chat's `HelpMark` (the help button on every page, its
panel's head and its answers: a two-tone bubble, hand-drawn — the family's chat bubble in Duotone; W4's review) and the
Needle drawer's `NeedleMark` (`needle` in Duotone).
**Release 3:** the first-visit primer's art; the self-care art; the PWA's three shortcut PNGs; the Needle's drag cursor (a
data URI); the console's typed marks (✓ ✗ ⚠ ⛔ ▲ ▼ ↑ ↓ ● ↗, and a → closing a link; the census finds a symbol in 65
console files, multiplication signs and arrows inside sentences included).
**Kept, with their reasons (not icons):** × as the multiplier; • in masks and as separators; a → inside a sentence that
names a path ("Wallet → Withdraw", the FAQ, the policies), or between two figures or words it joins, read "to" (Up & Down
history's open → close and stake → return, the card's open → close, the cubes' "oldest → newest"); the brand mark (share images, the last-resort error page, the
offline page); the badge medallions (R-BADGES); the identity crest; charts and instruments; vendor marks; the spinner.

### §8b · One meaning, one glyph — what the doors and the pages disagreed on (player front)
| Meaning | Before | Release 1 |
|---|---|---|
| Deposit (the notification; the activity tile) | a plain ↓ (`arrowDown`) | `arrowDownToLine` (5.3A) |
| Withdraw (the same two) | a plain ↑ | `arrowUpFromLine` |
| Proposals (the notification) | a certificate (`fileCheck`) | `idea` (5.6A) |
| Limits and breaks (the RG notification; the RG policy page) | a heartbeat; the shield | `limits` (5.7A) |
| The friends programme (the notification; the account menu) | a megaphone (marketing); a gift (bonuses) | `users`, as the hub |
| A result recorded (an Up & Down round's result) | a pulse (an activity log) | `resolved` (§3) |
| A loss (the notification) | Up & Down's DOWN | `xCircle`, quiet (W4) |
| Betting closed (the notification) | `calendarClock` (a date) | `hourglassOff`, as the cards |
| Identity verification (the account menu, the KYC page, its notification) | `shieldcheck`, which means verified | `idCard`, as the hub; `shieldcheck` keeps "verified" |
| The agent programme (the hub; the profile) | `shieldcheck` | `agent` (handshake), now a player key |
| The leaderboard (the account menu) | a crown | `podium`, as the hub |
| Terms (the hub) | the rules' scales | `scrollText`, as its page |
| Game rules (the hub) | `info` | `tippingScales`, as its page |
| The privacy notice (the hub; its page) | a document; a lock, which also means a held wallet, a closed market and a locked round | new `privacyNotice` (file-lock) |
| Refunds (the activity tile) | `rotateCcw`, a reversed payment | `refund` (Millionea's key, the same meaning) |
| Net (the activity tile) | a pulse | new `net` (plus-minus) |
| Up & Down, the product (/live's tag, the home band, the rules card and page) | `trendingUp` | `trade` (5.4A) |
| Up & Down's sides | trend zigzags on the buttons and the outcome; plain arrows on the home band and the track; typed and hand-drawn arrows | `arrowUp` / `arrowDown` everywhere: the two halves of the product's ⇅, legible at 10px where the zigzag is not, and drawable among words |
| "Notify me", on | `bellRing` in Line | `bell` in Fill: a toggle on, as the followed star |
| The inbox (/notifications' head) | `bellRing`, where its doors draw the bell | `bell`; `bellRing` keeps the notification settings |
| More (the classic rail) | `list`, also the console drawer's ≡; its Fill a solid tile that reads as a card | new `more` (dots-three-outline): hollow dots, solid on the pill |
| A notification of no known kind | `coins` | `bell` |
| A verdict recorded, a dispute, a bonus (the notifications; W4's review) | the bell, by default | `resolved` (Line, a result recorded), `flag` (as /fairness's objection), `gift` (as the wallet's bonus); the staff's own notices keep the bell — D19 keeps their kind out of a player's bundle by name |
| Wins as a total or a record (the activity page's Won tile; the performance page's best win) | `trophy` | `trophy` stays: a record of wins is an achievement; ONE win's outcome is the seal in Fill (a ticket, a position, the win notification) |
| Ended without success: a lost bet, a cancelled payment, a declined proposal | three glyphs | `xCircle`, the one meaning — Line where it is an outcome (a loss is bookkeeping, §M7), Fill where it is a status |
| People: the friends programme; a round's players | a megaphone; a hand-drawn figure | `users` — the people you invite, the people in a round |
| Identity verification's doors (the KYC panel's Verify; the agent page's identity step) · the agent dashboard's door | `shieldcheck` | `idCard` · `agent`, as the pages they open (W4's review) |
| The rules (the Up & Down board's rules pill) · fairness and a void (/help's topics) · the inbox's empty state | `scrollText` (the Terms') · `shieldcheck`, `alertCircle` · `bellRing` | `tippingScales` · `attestation`, `void` · `bell` (W4's review) |

Seen in W3 and left for the console (release 3): a player's detail tabs (KYC `shieldcheck`, self-exclusion `shieldOff`,
limits `lock`, audit `alertCircle`) and the hub's staff-console row (`server`).

### §8c · Fill, Duotone, Line — where each belongs
To be written into DESIGN_AUTHORITY §K3 with release 1:
- **Fill means a state:**
  - a selected destination (W3);
  - a toggle that is on (the followed star; notify me);
  - a status in a status container (callout, notice bar, toast, status flag, a receipt's status, a status chip or
    pill) — and a caution that heads its own paragraph (the Up & Down rules', `warning` in the warning ink);
  - an earned outcome: a win is the seal's Fill in gold (§M3a);
  - a media control (play and pause);
  - a direction that is itself the data (the 24h move's carets).
- **Duotone means identity on a plate** (release 2): hub rows, notification plates, help and trust cells, category sigils,
  empty states. It gives life without claiming a state.
- **Line (Bold up to 26px) is everything else:**
  - what you act on or read past: actions (search, filter, share, copy, edit, close);
  - chevrons and arrows, and marks among words;
  - meta beside data (time, players, comments);
  - inactive destinations and form adornments;
  - the quiet outcomes: lost, void and pending (§M7: a loss is bookkeeping, never a celebration).
- **Why not Fill everywhere** ("nothing should be plain"). Fill is how a player sees that something is ON or EARNED. A
  filled clock beside every timestamp would spend that signal. The life for those goes to Duotone plates (release 2) and
  to the Fill of real states.
- **Ali's open calls on the selected states:**
  - More's Fill: answered by the new `more` key (§8b);
  - Live's and Up & Down's Fills: kept. They are Phosphor's own, with a solid centre and solid heads; R-ONE-SOURCE rules
    out a house composite; and the pill carries the selection.

### §8d · The releases
- **Release 1 (W4 + the audit's player front):** status in Fill through the kit's doors; outcomes as glyph + ink + word
  (positions and tickets: open `clockPending`, won `resolved` in Fill and gold, lost `xCircle`, void `void`, cashed out
  `cashOut`); the notification kinds; §8a's release-1 rows; §8b; a text-character census in `test:glyph-source`, so
  that what is won stays won.
- **Release 2 (W5 + W6):**
  - Duotone plates and `IconPlate` roles; categories;
  - one deposit and one withdraw glyph on every money door; stat tiles; the console's cards;
  - the empty states' one family.
- **Release 3 (the rest of W7, then W8 and W9):** the console's typed marks; the PWA shortcuts; the Needle's cursor; the
  primer and self-care art; motion; the close.

---

## Appendix A · The inspection (2026-10-17, read from `origin/main` `7bf0e6eb`)

**Why now.** Players like 50pick but say its icons "don't give enough life". It is the fifth time the weakness was
raised: the 2026-08-06 commission brief ("hairline strokes that nearly vanish against the background",
`design-brief/README.md`), the deferred "stroke 2.0" restyle of the Material commission
(`design-system/v2-2026-07-27/11-material/MANIFEST.md`), critic CP-112 ("Icons are reused and mismatched… No lens
reviewed icons", `MOBILE-VISUAL-FINDINGS-2026-09.md`), and unit U39, never started (`MOBILE-VISUAL-PLAN.md`).

**The census.**

| Finding | Number |
|---|---|
| The family | `I` in `src/components/ui/glyphs.tsx`: 182 glyphs (174 on the 24 grid, 8 on the 64 grid), ONE weight (1.9 stroke), line only |
| Use | 313 files; 1,143 references (631 player, 376 admin direct + 136 by name); 185 client components |
| Reachable / unused | 140 reachable; 42 unused (incl. all 8 64-grid arts, every `cat*`, `home`, `live`, `watch`, `flame`) |
| Duplicates | `profile` = `user` and `bank` = `landmark`, byte-identical; `void` / `voidX` / `xCircle` near-copies |
| Sizes | 14 px is the most common; 65% of all icons render at ≤ 14 px (≈1.1 px stroke); 239 sites at ≤ 12 px; `GLYPH` constants used at 0 call sites; 19 sizes frozen by the ratchet |
| Inks | `text-subtle` 115, `brand-300` 61, `text-muted` 37; 444 sites inherit (mostly muted) |
| Fills | none: 23 drawings carry a small filled dot; no tier, no tone |
| Selected state | no filled icon in any shell; four "active" styles; the phone pill `--pill-active` = 1.18:1 on the bar; admin sidebar has no icons |
| A second family | 63 inline `<svg>` in 35 files, strokes 1.5–2.8 |
| A third family | `ui/empty-state.tsx`: 12 drawings, 56 grid, 1.5 stroke, a hand-typed money-gold accent, 48 sites |
| Outcomes | tickets / positions / results by colour + word only; gold means both "won" and "resolved" |
| Categories | a 140 px watermark at 0.055 opacity + a 13 px muted mark; none on the board's discovery bar or the journey home chips |
| Motion | `GlyphSwap` on 6 sites; `.g-settle` 11, `.g-ring` 2 |
| Text characters as icons | `→` (15 / 14 / 13 per locale) in buttons; `▲▼` deltas, `↑↓` sides, `★` in player code; `✓ ✗ ⚠ ⛔ ↗ ●` in admin |

**The screenshots** (round-10 tiles at 1×, the harshest case — a budget Android; on ALI-BLADE15 under
`C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0719ce89-589d-484d-8a37-be05d46c6068/scratchpad/r10v/tiles/` and
`…/r10q/tiles/`): most icons are `#899DD1` (6.4–7.5:1) at 9–16 px with 0.8–1.3 px lines that often straddle two pixels;
the bell is dimmer than its own "25" badge; the classic rail's gold coin is about 10× heavier than the line icons around
it; won / lost / void are tracked capitals only; the profile's badge medallions, the KYC status plates, the payment logos
on white tiles and the ticket detail icons (11:1) are the work to carry over.

**The four lenses.**
- *UI/UX:* one weight from 9 to 64 px is the core flaw; Android (Material 3) and iPhone tab bars mark the selected
  destination with a FILLED icon over an indicator — 50pick has the indicator and not the fill.
- *Motion:* life comes from state change, not decoration; the four existing primitives cover every moment; no win loop.
- *User experience:* filled shapes are recognised faster at small sizes and on bright, low-end screens; one meaning per
  glyph; shape must tell outcomes apart for colour-blind players.
- *Colour:* no new hues — every hue on the board already means something (side, earned money, warning, link, void);
  the Duotone tone is `currentColor`; categories differ by shape; three ink steps for hierarchy.

## Appendix B · Why Phosphor, and how it is delivered
- Phosphor: MIT, ~1,500 icons × six weights (thin, light, regular, bold, fill, duotone), consistent pairs for every icon.
  Its "regular" is thinner than the house family (0.875 px at 14 px), which is why the size → weight table uses bold at
  small sizes.
- Considered and not chosen: Tabler (MIT; strong stroke set, partial filled set), Hugeicons Pro (metered by pageviews,
  a private registry at build time), Solar (licence unclear, an unmaintained repository), Material Symbols and Fluent
  (read as Google / Microsoft), and keeping the house family with tiers (the session's recommendation; Ali chose Phosphor).
- Delivered as vendored, generated sprites — not `@phosphor-icons/react` — so the first download gets lighter, not
  heavier (§5 W1).
