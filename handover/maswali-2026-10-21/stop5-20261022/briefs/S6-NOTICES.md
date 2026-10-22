# Lane S6-NOTICES — the Millionea notices: delivery (M-2, L-1…L-10), words (MB-44, the decided words, zh letters), the timed run

- Lead: asheib-f3 ("main" to SendMessage). Integrator: lane S6 — it merges your branch into `claude/maswali-s6-release` and
  runs the batteries. You report to "main"; say there when a commit is ready to merge.
- Tree: `C:/50pick-ssd/kipindi-mln-not` (clean, real node_modules; now on `mln-s6-notices`). Start:
  `git -C C:/50pick-ssd/kipindi-mln-not fetch origin && git -C C:/50pick-ssd/kipindi-mln-not checkout -b claude/maswali-s6-notices origin/claude/maswali-s6-release`,
  then `git diff --quiet HEAD@{1} HEAD -- package-lock.json`; if it differs, `bash $S/mln-slot-s7c.sh s6-notices npm ci`
  before anything else. Push the branch at once (full refspec; confirm with `git ls-remote`).
- ⏳ Start M-2's code only once `origin/claude/maswali-s6-release` holds the commit whose subject starts
  `MASWALI-BUILD S6-INT 17` (M-1: it changes the winner SMS tally, the batch and the notify child you will touch). Until then
  read and plan. Afterwards merge `origin/claude/maswali-s6-release` (`git merge --no-ff`) whenever it moves; never rebase.
- Step name for commits: `S6-NOTICES <n>`. Ports 3640–3649 · `KP_SCRATCH_PORT=5495` · scratch `$F/s6-notices/`.
- Heavy jobs: `bash $S/mln-slot-s7c.sh s6-notices <cmd…>` (slots 6 and 4, shared by S6 and its four lanes: one heavy job
  at a time, batched; long ones with `run_in_background`).

## Read first
1. `$F/LANE-COMMON.md` — the rules, including the last section ("Every change is a recorded FINAL rule").
2. `AGENTS.md` at your worktree root.
3. The reviews behind your items (they quote file:line on lane N's tip; re-find each line on your branch):
   `$F/s6/phase1-A.md` (lane N's round-17 review: M-1…M-4, L-1…L-10), `$F/s6/words-review.md` and the "Wording and RG"
   part of `$F/s6/phase1-final.md` (the notices' words: H1/MB-44, H2/OD-13, M1–M5, the LOW items, the integrity card), with
   the exact replacement texts in `$F/s6/words/`.
4. `docs/MASWALI-PLAN.md` §7b S6 item 2 and the §8 rows MB-44, MB-68, MB-93; `src/lib/server/maswali-notify.ts`'s header.

## The lead's rulings (decisions, binding)
- **Ruling 2 (M-2):** cap the definite-refusal retries of a letter at 3, then list it on the integrity card; AND skip sends
  while `emailHealth()` is DOWN, except one probe letter per run. Accepted corrections: a send skipped while DOWN writes no
  attempt and uses none of the cap, and the run stays owed; `closeUnresolvedLetters` also closes capped letters.
- **Ruling 5 (MB-44):** no next-jackpot figure in any notice (bell, push, letter, SMS). Use these texts:
  en "No ticket reached 10/10, so the jackpot carries forward to Week {n}, with no fee." · sw "Hakuna tiketi ya 10/10,
  hivyo jackpot imehamishiwa Wiki {n}, bila ada." · zh "无 10/10 彩票，大奖滚存至第{n}周，不收费用。" — with no next week:
  "to the next week" / "wiki inayofuata" / "下周".
- **Ruling 8 (L-1…L-10):** fix every one. L-6 through S5's exported helpers (one fact, one home); L-10's ground read from
  the week's void record. L-7 is the LINT lane's; L-8 the LINT lane's.
- **(e)** a held share is S5's decided UI word everywhere, the notices included. **(f)** readers who cannot sign in get
  royal chrome and no buttons. **(g)** the win notice shows the pool, the fee and "shared by". **(h)** the letters gain zh.
  **(i)** the notices read the `millionea` dictionary namespace (the decided words: never hard-coded strings).
- **OD-13's interim sentence (k):** until the MONEY lane's officer payout act exists, a winner who cannot sign in is told
  only what is true: en "Your account cannot sign in, so this share cannot be withdrawn in the app. Contact 50pick support
  about it." · sw "Akaunti yako haiwezi kuingia, hivyo zawadi hii haiwezi kutolewa kwenye programu. Wasiliana na huduma
  kwa wateja ya 50pick kuhusu zawadi hii." · zh "您的账户无法登录，因此无法在应用中提取此奖金。请就此联系 50pick 客服。"
  (bell, letter and SMS). MONEY replaces it when the act lands.

## Items, in this order (each: the change, its case, its plant, its readers, its records)
1. **M-2** (ruling 2). An unapplied, unverified code draft is in `$F/s6/tools/spec-m2-draft.json` (`apply-multi.mjs`
   format); verify it, finish it, own it. Cases in `scripts/lib/maswali-notify-child.mts`, on both stores: (a) a letter
   refused three times is not attempted a fourth time — no attempt record, counted `capped`, the run complete, the card
   lists it; (b) the officer's recorded check closes a capped letter; (c) the rail DOWN: one probe goes, every other letter
   is deferred with no attempt record and the run stays owed; the rail back, the reconcile sends each deferred letter once;
   (d) a deferred letter has used none of its three. Plants (in `scripts/anchors/maswali-money-path.anchors.mjs`, suite
   "notify", numbered after the integrator's last): the cap removed; the DOWN gate removed; a deferred letter writing an
   attempt. Records: a `docs/FAILURE-INVENTORY.md` §9b entry (M-2, like the integrator's M-1 entry); the MB-93 row's
   treatment in `docs/MASWALI-PLAN.md` §8 (rows are yours; §0/§1 are not); the notify header, `LetterOutcome`'s doc and
   the integrity card's words.
2. **L-1** lease fencing — strictly re-read the lease holder just before `job.send`; a case where a stalled run's successor
   holds the lease and the stalled run sends nothing; plant.
3. **L-2, L-3, L-4** — the integrity card: list runs with `letters.unread > 0`; one sentence per cause (a letter the
   provider may have taken; an "absent" whose one resend is owed; capped; unread records; an address or pepper changed),
   with the holder's tag and attempt dates for Compliance; the clear action says how many letters it closed. Exact texts
   in `$F/s6/words/`. Cases on the page's text and the action's answer; plants.
4. **L-5** (the winner's bell keyed on `won[0]`), **L-6** (S5's `carriedForwardOf`, `nextWeekOf`, `weekNumberOf` — delete the
   copies), **L-9** (batch `unreachedWinners`' reads; say when `reachedByDeskOf` was cut short), **L-10** (the refund letter's
   ground from the week's void record). A case and a plant each.
5. **MB-44** (ruling 5) in every notice; and `millioneaClosureTickets` gets its caller (MB-44's closure ticket) or the lead
   decides it goes — ask. Cases in en/sw/zh: no figure of a later week in any notice; plant.
6. **The words (i, e, f, g, h, and the words review's M1, M2, M5 and LOW items):** the notices read the `millionea`
   namespace (keys added in en/sw/zh with identical placeholders — a D19a re-pin of the dictionary follows, recorded in
   `scripts/lib/house-bot-absence-cases.mts`); "Ticket bought" (Ali's ruling 7 of 2026-10-21); S5's held word; royal and
   no buttons for readers who cannot sign in; pool, fee and "shared by" on the win; zh letters (`test:comms-email-shots`
   regenerated, read by eye at 360px); OD-13's interim sentence. Cases assert rendered strings in en/sw/zh; plants.
   Records: the comms registry's and the notices' headers; the §8 rows MB-44 and MB-68 (rows are yours, §0/§1 are not);
   `docs/DESIGN_AUTHORITY.md` §M8a for a rule of the letters' chrome — new items start at 28 (19–27 are taken): ask main
   for the number first.
7. **M-4** (the acceptance gap): on your head, through the slot, re-run S17 (`scripts/load/s17-maswali-rush.mts`) and S16
   (`scripts/load/s16-*`), and time one result run at 7,000 winners and 10,000 holders on Postgres (lease renewals, the
   letter pace). Report the printed timings; change nothing to make them pass without telling main.

## Readers to run (derive the rest from your diff: `git grep -l <path or symbol> -- scripts/`)
`test:maswali-notify` (both stores) · `red:maswali-money-path --only <your plants>` · `test:house-bot-reports` (both
stores: a new audit read is a census entry) · `test:maswali-integrity-list` · `test:maswali-rbac` · `test:cert-c1`,
`test:cert-c2`, `test:cert-c3` · `test:comms-email-shots` (or the qa script that renders the letters) · `test:maswali-design`
· `test:house-bot-disclosure` and `test:house-bot-blob-pin` (D19a) · `test:type-scale`, `test:glyph-source`,
`test:unsaved-changes`, `test:admin-act-gate` for the card · tsc (slot) once per batch.

## Forbidden (LANE-COMMON)
⛔ Never edit `docs/MASWALI-PLAN.md` §0/§1 or `docs/NEXT-PLAN.md`. ⛔ Never build, test or run a server in
`F:\kipindi-main`; never edit outside your worktree except `$F/s6-notices/`. ⛔ Never `test:all`, `e2e:money`/`e2e:fault`/
`e2e:card`, anything against production, or `/auth/demo` in a warm-up list. ⛔ Never `git stash`, force-push or rewrite
pushed history; stage by name; push only your branch, full refspec, confirmed by `git ls-remote`. ⛔ PUBLIC repo: describe
a control by what it enforces, never its signals or thresholds; never print or commit a secret. ⛔ Never waive a failed
check or quote a count you did not see printed. ⛔ WITHDRAWN stays dark. ⛔ Do not touch kipindi-mln-gate, -rb, -par or
maswali-s7-red-20261021.

## Report (to "main", at each milestone and at the end)
LANE-COMMON's six points; for each item, its commit, its case and plant, the records it changed, and every printed result.
