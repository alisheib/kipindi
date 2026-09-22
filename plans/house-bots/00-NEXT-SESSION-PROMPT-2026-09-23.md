# PROMPT — House Bots: make every detail controllable, and close the 2026-09-22 register in ONE session

You are finishing the 50pick HOUSE BOTS desk. On 2026-09-22 the defect that had kept the live desk silent for two
days was fixed at both layers and pushed live; a read-only audit of the desk and the bots then produced a register
of what is still not right. Your job is to close that register completely — the numeric + schedule rules editor
first — with every fix proved by mutation and every screen rendered and read, and to leave the desk in a state
nobody can come back on. Nothing is done because a suite is green.

Work in F:/kipindi-house-bots on branch `bot-flow-seal` (it is a fast-forward of `main` at the close of
2026-09-22; `git fetch` and confirm `origin/main` is an ancestor of HEAD before you start; merge `origin/main` in
if it moved, never rebase). Read, in this order: `plans/house-bots/NEXT-SESSION-2026-09-22.md` (what shipped, the
register), `docs/HOUSE-BOTS.md` §5 (every field) and §7 (the console flow), `plans/house-bots/PROGRESS.md` RESUME AT
item 0. The other plan documents are history; read one only when a ruling you are building cites it.

## 0a · PERMISSIONS — request every one at the START, once, then never stop again

The owner's instruction, verbatim in intent: *"Do not come back to me until it is pushed live. Every time I let it
run by itself I come back and it is not done — waiting on me, for an approval, or the push got blocked. Ask me for
every atomic permission at the beginning, I approve them manually, and when I come back it is done."*

So the FIRST thing you do, before reading a single source file, is issue one harmless probe for EACH capability
below, in one batch, so every permission dialog the auto-mode classifier will ever raise is raised NOW. If any is
refused, stop THEN — list every refused item in one message and wait. Once they are granted you do not stop again
for approval, for a status question, or to "check in": the only message you send is the final one.

| # | Capability (what the classifier has refused in this programme) | Probe to issue at the start |
|---|---|---|
| 1 | Production READ, SELECT-only, over the public DB URL (`PROD_DATABASE_PUBLIC_URL` in `F:/kipindi-main/.env.qa.local`) | run the probe script from `NEXT-SESSION-2026-09-22.md` §3 with `PROBE_DB_URL` set (it prints the db clock and counts; ids redacted) |
| 2 | Pushing `main` from `F:/kipindi-main` as a pure ref update (`[Modify Shared Resources]`) | `git -C F:/kipindi-main push --dry-run origin HEAD:refs/heads/main` (a dry run; it must be allowed to run) |
| 3 | Pushing `bot-flow-seal` from the worktree | `git push --dry-run origin bot-flow-seal` |
| 4 | Creating and removing git worktrees and directory junctions (`git worktree add/remove`, `cmd /c mklink /J`, `rmdir`) | `git worktree add F:/kipindi-hb-probe --detach HEAD && git worktree remove F:/kipindi-hb-probe` |
| 5 | Killing processes this session started (`Stop-Process`, `taskkill`) | `powershell -NoProfile -Command "Get-Process node | Select-Object -First 1"` then a `Stop-Process` on a `node -e "setTimeout(()=>{},60000)"` you spawn yourself |
| 6 | Creating and dropping scratch databases and booting the scratch cluster (`db:scratch`, `CREATE/DROP DATABASE`) | `KP_SCRATCH_PORT=5453 npm run db:scratch` in a background shell (hold it for the session) |
| 7 | Booting `next dev` / `next start` on a local port and driving it with Playwright (`chromium.launch`) | boot one dev server on 3031 against a scratch database and fetch `/api/health` from it with Playwright |
| 8 | Running `next build` and `verify:house-bot-bundle` | `npm run -s typecheck` now; the build itself runs at the end |
| 9 | Writing to the memory directory (`C:/Users/asheib/.claude/projects/C--Users-asheib/memory/`) with the Write/Edit tools | append one line to the house-bots memory note saying the session started |
| 10 | Deleting the stale directories and branches the last session left (`F:/kipindi-hb-audit`, `F:/kipindi-hb-fleet`, `F:/hb44-audit`, `F:/hb-feed-audit-tmp`, branch `fleet-lanes`) | remove them now, in this probe batch — they are stale |

Then proceed to the end. If something genuinely blocks late (a gate that cannot go green, a money-behaviour
risk), finish EVERYTHING else first, push what is green, and put the blocker in the one final message.

## 0 · Environment, ports, instruments

- Node 24. Start every Bash command that runs node/npm with `export PATH="/c/Program Files/nodejs:/c/Users/asheib/AppData/Roaming/npm:$PATH"`.
- Boot ONE scratch Postgres and hold it: `KP_SCRATCH_PORT=5453 npm run db:scratch` in a background shell. Every
  DB-backed script then takes `KP_SCRATCH_PORT=5453` and reuses it (the `--run` wrappers never stop a cluster they
  did not start). Never port 5433 (a sibling checkout answers there and serves you its schema); never `--reset`.
- Pure gates: `npm run -s typecheck` (incremental, seconds when warm), `npm run -s test:house-bot-rules`,
  `npm run -s test:house-bot-disclosure`, `npm run -s test:house-bot-surfaces`, `npm run -s red:house-bot-console`.
  DB gates: `test:house-bot-console`, `test:house-bot-engine`, `test:house-bot-money`, `test:dal-parity`. Browser
  gates: `qa:desk-rules-flow` (needs `next dev -p 3031` on a migrated scratch DB with `USE_PRISMA_DAL=true
  MARKET_SCHEDULER=false HOUSE_BOT_ENGINE=false SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true`, driven at
  http://localhost:3031 — never 127.0.0.1) and `qa:house-bots-visual` (KP_WIDTHS=360,1280 at minimum).
  The fleet: `KP_SCRATCH_PORT=5453 npm run -s qa:house-bot-fleet` runs every lane A–M in one process on a database it
  creates and drops; `KP_FLEET_SILENT=1` is its meta-mutation (every lane assertion must go red, exit 1) — run it
  before trusting any engine change. Final: `npm run build && npm run -s verify:house-bot-bundle`.
- ⚠️ On 2026-09-22 `test:house-bot-disclosure` hung on §1 for 14 minutes: its `isDirective` regex backtracked
  exponentially on `house-console-read.ts`'s comment header. It was replaced by a linear scan with control case
  `1.re` (450 leading comments must decide in under 100 ms; the old regex put back = red by timeout). If the suite
  ever sits silent on §1 again, that case is where to look; `verify:house-bot-bundle` over a real build stays the
  stronger D19 check.
- Rules that do not bend: the PRODUCTION master switch is never touched; no production writes; a production READ
  is SELECT-only, ids redacted, ages computed in SQL (the probe recipe is in `NEXT-SESSION-2026-09-22.md` §3). The
  repository is PUBLIC (W20): no account id, holder name, note text or switch-on reason in any file. D19: no house
  vocabulary on any player surface; the console's copy is lexicon-scanned (say "account", never "bot"). Never
  `git checkout --`/`restore`/`stash`/`reset --hard`; restore a mutation by reversing your own exact edit and prove
  it with `git diff --stat`. Never `git add -A`. Commit each piece as it goes green, with the suite numbers and the
  mutation table in the message; push `bot-flow-seal` as you go. `main` is pushed only at a GREEN, COMPLETE
  checkpoint, from `F:/kipindi-main` as a pure ref update (`git push origin <sha>:main` after
  `git merge-base --is-ancestor origin/main <sha>`) — the owner has authorised that push ("when done push live");
  then verify the deploy (`/api/health` `uptimeSec` reset) and read production.

## 1 · THE EDITOR — every number, the schedule, the Enter-now stakes (register A1; blocker)

Today the Rules tab has ten switches, fourteen limits and the two market pickers. 33 of the 45 rule leaves have
no control on any screen and run at their defaults for ever. Build the editor the way the console already builds
the caps (read `rulesForm` in `src/lib/server/house-console-read.ts`, `rules-form.tsx`, `rules-save.ts`):

1. **Model.** One row per numeric leaf of `FIELD_META` with group `"rules"`, in `FIELD_ORDER`, grouped by
   `FIELD_META[id].section` ("Counter", "Fill", "Opener", "Up & Down", "Shaping", "Guards", "Scope", "Enter now").
   Each row: neutral form key (extend `CONSOLE_RULES_FIELD_KEY`), label, unit word (`unitSuffix`), min/max from
   `fieldBounds(id, ctx)` (needs the live `RulesContext` — the page may load it; say so where it does), default,
   recommended (`recommendedRules`), `options` for `shaping.roundToTzs` (`ROUND_TO_OPTIONS` → a select), the
   `counter.amount.kind` choice (PCT / FIXED) showing the matching stake box, and a "not used while X is off"
   caption from `LEAF_USED_BY` so an officer sees which switch a number belongs to. Every row carries a one-sentence
   help (server-owned, `Record<FieldId, string>` so a new leaf cannot ship without one).
2. **Schedule.** Seven day boxes in `WEEKDAYS` order, an All-day switch, up to `MAX_SCHEDULE_WINDOWS` start/end rows
   in HH:MM **EAT**, posted raw so `expandWindows` validates them and `describeWindow` paints the saved state
   (`SCHEDULE_COPY` has the sentences). Store exactly what `HouseBotRulesV1.schedule` holds today.
3. **Enter now.** Draw `enterNow.thinStakeTzs` / `openerStakeTzs` beside the switch (N1-a already requires them
   when it is on) — that alone turns the dead switch (register A2) into a live one; keep `BY_HAND_SCREENS` honest:
   Start still refuses a by-hand-only account until a press screen exists.
4. **Save.** `rules-save.ts` stores the officer's numbers EXPLICITLY (decide it: delete the minimal-patch branch,
   rewrite the comment that promises untouched leaves "follow the default" — measured false on 2026-09-22, they
   freeze at first-save defaults). Post the whole form; a missing control is a refusal, never a value (the form's
   own rule). `validateHouseBotRules` already refuses bounds and every `CROSS_FIELD_RULES` row — surface EVERY
   refusal on its field (the console maps FieldId → form key; `focusFirstInvalid` lands on the first).
5. **Controls.** "Use starting values" fills EMPTY numbers from `recommendedRules` and never saves; the pending bar,
   Discard and the draft offer behave exactly as they do for the caps (`useFormDirty`, `useFormDraft`).
6. **Record.** The Saved-rules card (`capRows` in the reader) shows every number with its unit, the six modes under
   "Up & Down entry" / "Polls entry", the schedule sentence and the Enter-now stakes — a REMOVED account's record
   must say what it was set to do.
7. **Start.** Return `warnings` from `startHouseBot`'s ok branch (register A3) and paint them: an account whose
   every enabled mode is impossible is told so, not "Started".
8. **Proof.** Console cases (both stores) per section; the browser gate types a delay, a window and an Enter-now
   stake, saves, reloads, reads them back; mutations: the save drops one section's numbers → the round-trip case
   and the gate go red; a bound is widened → the refusal case goes red; the schedule posted in UTC instead of EAT →
   the window case goes red. Render the Rules tab at 1280 and 360 in three states (defaults, refused, saved) and
   READ the PNGs before the commit closes.

## 2 · Engine leaves no `test:` suite pins (register B6–B7; major)

Add §7 pure cases in `scripts/lib/house-bot-engine-cases.mts` (template: the existing probes) for: no-react zone
(both units); pool band incl. the band-edge control; closing-soon skip; trigger-stake band (inclusive edges);
`fill.jitterSec` draw + due subtraction (recording RNG); U&D FILL lead; opener delays (UD seconds, polls minutes)
and the stake-draw floor; U&D closeness at FILL/OPENER; `minTimeToCutoffUdSec` at decide; the schedule gate at
decide; `jitterPct`, FIXED amount, delay draw range. Then the two FIRE cases on the running-chain fixture (U&D
closeness, min-time-to-cutoff). Raise the suite floors to the measured counts. Owner decision to take and record in
HOUSE-BOTS.md §5: a COUNTER's schedule is judged at the trigger's placed instant, FILL/OPENER at their due instant —
align to due (one line at decide.ts) unless the owner says otherwise. Move `scope.skipPollsClosingWithinMin` and
`scope.poolTotalMin/MaxTzs` to the Counter section with hints (they gate COUNTER only).

## 3 · Time (register C8; major)

"On since" carries the day (`D MMM, HH:MM:SS EAT`); a PENDING/CLAIMED feed row shows "fires in N min · HH:MM:SS
EAT" and "expires HH:MM" from `dueAt`/`staleAt`; the engine notice never says "not running" beside "just now"
(sub-minute bucket, and a console case that a STALE verdict never carries "just now"); the opener help and the
overview say an OPENER only opens markets that begin after the switch-on and this account's Start. Minor: the notice
reads `dbClock()` in the settled read; an unreadable custom from/to is REFUSED (the existing Callout); the kit's range
picker defaults `to` to end-of-day and bounds days by EAT; a `DB_TIMEZONE` boot refusal is visible on the desk.

## 4 · Visual and kit (register D9; major)

Activity filter pills reach `--tap-min` (40px) on every Activity route — run `qa:house-bots-visual` on them; History
paints AUTO_PAUSED by its cause (holder's sign-in change vs a limit); one constant for "none chosen"; the window
presets on the admin shell render in English; an empty Targets table does not clip its header; a removed account's
History subject cell holds a subject; every When column headed "When (EAT)"; the why-panel does not repeat the
callout's fact (432(n)). Re-measure the roster at 1280 after the Account-cell move (no ScrollX at the design width).

## 5 · The two audit lenses that never ran (register F)

Before fixing anything in §3/§4, run them read-only yourself, on a dev server: (a) ACTIVITY PAGING — seed more
intents than one page (and, if feasible, past the 500-row clamp) and read page 1, 2, last, last+1, a filtered
view, a filter change from page 3, the bell anchor `&intent=`: newest first with seconds, the outcome chip and
reason sentence, the total from the COUNTING reader, tap targets at 360; (b) FUNCTIONAL FLOW — every control in
the officer's order (limits, designate, rules, start/pause/re-verify/remove, master switch ceremony,
cancel-intent) with what the screen said before, what happened, what it said after, and whether History recorded
it. Every discrepancy joins the register and is fixed in this session.

## 6 · Console minors (register A5) and lane hygiene (register E)

The Start dialog's "Confirm permission →" opens the re-verify dialog; Pause records a reason; `parsed.stale`
(a retired chain/category) is painted as a warning above the form and in the why-panel; the Rules-tab guidance
names the reach requirement. Lanes: give lane E's seven SILENT-only assertions a discriminating mutation or say
in the file why none exists; make lane M's `dayKey` survive 21:00 UTC; add `qa:house-bot-fleet` to the house
verify ladder.

## 7 · Finish

`typecheck`, every suite above, the fleet A–M, `next build` + `verify:house-bot-bundle`, both browser gates, the
visual gate at 360/1280 — all green on ONE tree, every screen read. Update `docs/HOUSE-BOTS.md` §5/§7 and §12's
verification record, `plans/house-bots/PROGRESS.md` (RESUME AT and a session row), and
`plans/house-bots/SWITCH-ON-SHEET.md` Step 3 (the editor changes what an officer types). Commit, push
`bot-flow-seal`, merge to `main` and push it live, verify the deploy, read production, and report ONCE, at the end:
what is proven, what is assumed, what is left. Management hears one message: it works, and here is the proof.
