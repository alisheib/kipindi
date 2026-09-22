# House Bots — what shipped on 2026-09-22, and the plan for the next session

Branch `bot-flow-seal` (merged into `main` at the close of this session). Everything below is redacted for the
public repository (W20): no account ids, no holder names, no note text, no switch-on reasons.

## 1 · What shipped, and what proves it

| Commit | What | Proof |
|---|---|---|
| `04f20f90` | **Rules core.** One scope predicate for the engine and the desk (`rulesCoverTarget` in `rules.ts`; `decide.ts rulesCover` delegates to it). `rulesReach` / `rulesInertReasons` answer "why can this account not bet" from the same predicate. `rulesStartProblems` refuses one cause per product (empty list, mode without product, product without mode, by-hand-only with no screen — `BY_HAND_SCREENS`). Save refuses the same shapes (`R-PRODUCT-LIST`, `R-MODE-PRODUCT`). | `test:house-bot-rules` 574/0 incl. the 4,096-document class guard (Start says yes ⇔ the engine predicate reaches a member); 4 mutations red |
| `bb231238` | **Settlement report.** `settleMarket` read its officer-facing totals through a query OUTSIDE the lock transaction — on Postgres every settlement said "0 positions settled · TZS 0 paid to winners". Money was never wrong; the report was. Found by fleet lane M. | `test:house-bot-money` 5.3d on BOTH stores; mutation: memory PASS / Postgres FAIL, exit 1 |
| `7c9b1c68` `c810dffc` | **Console.** The category / chain pickers (the scope never had one); the lists travel through the save (`rules-save.ts` writes `scope.categories` / `scope.chains`); the roster shows the reach words and a **"Can't bet — …"** line with the Rules link; the account page's **"Why this account is not betting"** panel; the browser gate extended. | console 751/513 → `qa:desk-rules-flow` 69/69; 6 mutations red; tiles at 1280/360 read |
| `952e4dd9` `351366d3` | **Review fixes.** The why-panel refuses what Start refuses (live-bound refusals included); the by-hand axis proven on every surface with DB cases; headlines follow the lifecycle; the roster refusal moved into the Account cell (on screen at 360 without scrolling); `planner.endTargets` asks the shared predicate. | console 763/525, rules 574/0, engine ALL PASS, gate 69/69, 13 declared mutations |
| fleet `3e701a65` … `4cfb10c3` | **Fleet lanes D–M**, one file per lane: D FILL, E OPENER, F orderBots/marketHeld, G rules changed mid-flight (6 sub-cases incl. the §0 blocker as a control), M money (trial balance, per-market POOL residual, settlement literals, P&L). Each mutation-proved at the engine sites and red under `KP_FLEET_SILENT=1`. | see each commit's mutation table; full drive A–M green on the merged tree (this session's gate batch) |

**Production remedy after the deploy (owner-side, no code):** the live account keeps running unchanged (it matched
nothing before and after). The roster now names the reason on its row; open Rules, tick the categories (and chains)
it may touch, Save. COUNTER fires first (player stakes are waiting); OPENER only on polls created after the
switch-on; FILL only inside the last 30 minutes before a poll closes. Verify by reading rows: `HouseBotIntent`
non-zero, house `Position` non-zero, the holder's wallet moving by exactly the decided stake.

## 2 · The register — everything found and not yet fixed (from the 2026-09-22 audit, four of six lenses)

Severity as the auditors ranked it; effort S/M/L. Fix in this order.

### A · Controllability (the owner's bar: every detail of a bot controllable from the desk)
1. **[blocker/L] The numeric + schedule rules editor.** 33 of the 45 rule leaves have no control on any screen:
   `counter.delayMinSec/MaxSec`, `reactProbabilityPct`, `triggerStakeMin/MaxTzs`, `amount.kind/pct/fixedTzs`;
   `fill.leadUdSec/leadPollsMin/targetThinSharePct/jitterSec`; `opener.delayUd*/delayPolls*/stakeMin/MaxTzs`;
   `updown.closenessPct`; `shaping.roundToTzs/jitterPct`; `guards.*`; `scope.skipPollsClosingWithinMin`,
   `poolTotalMin/MaxTzs`; `schedule.days/allDay/windows`; `enterNow.thinStakeTzs/openerStakeTzs`.
   Build it as the console builds the caps: sections in `FIELD_META` order, label/unit/min/max/default/recommended
   from `FIELD_META` (bounds via `fieldBounds(id, ctx)`, `ROUND_TO_OPTIONS`), "not used while X is off" captions from
   `LEAF_USED_BY`, cross-field refusals from `CROSS_FIELD_RULES` marking every field, "Use starting values" from
   `recommendedRules`. Schedule: seven day boxes in `WEEKDAYS` order, an all-day switch, up to `MAX_SCHEDULE_WINDOWS`
   HH:MM rows in EAT posted raw so `expandWindows` validates and `describeWindow` paints. Save: store the checked
   document's numbers EXPLICITLY (decide it, delete the minimal-patch branch, rewrite the `rules-save.ts` comment
   that promises "follows the default" — today the numbers freeze at first-save defaults anyway). Record: the
   Saved-rules card shows every number, the six modes and the schedule (a removed account's record cannot say what
   it was set to do today). Proof: a console case per section, the browser gate ticks and saves a number and a
   window, mutations on the save patch and on one bound.
2. **[major/S] The Enter-now switch is a dead control.** Every save with it ticked is refused on `enterNow.thinStakeTzs`,
   a box the form does not draw. Until the editor ships the two stake boxes: render it disabled while
   `BY_HAND_SCREENS.enterNow` is false, with the help sentence saying so.
3. **[major/S] Start discards its own warnings.** `designation.ts` `StartResult` ok-branch has no `warnings`; an account
   whose every enabled mode is "impossible" is reported "Started". Return `problems.warnings`; the console paints them.
4. **[major/S] Stored numbers frozen at first-save defaults** while the save's comment promises they follow the
   default — resolve with item 1.
5. **[minor/S]** The Start dialog's "Confirm permission →" link lands on the overview, not a focused re-verify;
   Pause records no reason though the service stores one; a retired chain/category vanishes silently (`parsed.stale`
   is never painted); the Rules-tab guidance still says only "a product and an entry mode".

### B · Engine leaves the suites do not pin (only the fleet drive does)
6. **[major/S each]** Add §7 pure cases in `scripts/lib/house-bot-engine-cases.mts` for: no-react zone (both units);
   pool band (`poolTotalMin/MaxTzs`, band edge control); closing-soon skip; trigger-stake band (inclusive edges);
   `fill.jitterSec` draw + due-time subtraction (recording RNG); U&D FILL lead; opener delays (UD seconds, polls
   minutes) and the stake draw floor; U&D closeness at FILL/OPENER; `minTimeToCutoffUdSec` at decide; the schedule
   gate at decide; `jitterPct`, FIXED amount, delay draw range. **[major/M]** U&D closeness and min-time-to-cutoff at
   FIRE (needs the running-chain fixture). **[minor]** pool band and closing-soon skip are labelled scope-wide but
   gate COUNTER only — move them to the Counter section with hints. **Owner decision:** a COUNTER's schedule is
   judged at the trigger's placed instant, FILL/OPENER at their due instant — align to due (one line, decide.ts)
   or document the difference in HOUSE-BOTS.md §5.
7. **[minor/M]** DAL claim-reclaim branch, fire heartbeat and the fire-time RG pre-check have no assertion.

### C · Time
8. **[major/S]** "On since HH:MM:SS EAT" drops the day (`deskShell`). **[major/M]** A queued (PENDING) stake shows only
   when it was decided — add "fires in N min · HH:MM:SS EAT" and "expires HH:MM" from `dueAt`/`staleAt`.
   **[major/S]** The engine notice can say "not running" beside "last seen: just now" (sub-minute bucket).
   **[major/S]** Nothing says an OPENER only opens markets that begin after the switch-on and the account's Start —
   add it to the opener help and the overview. **[minor]** the notice compares DB-stamped beats with the web
   container's `Date.now()` (read `dbClock()` in the settled read); an unreadable custom from/to is answered
   silently with 24 h under "Custom"; the kit's range picker defaults `to` to 23:59 and bounds days by the browser's
   zone; a `DB_TIMEZONE` boot refusal is invisible beyond "not running".

### D · Visual and kit
9. **[major/S]** Activity filter pills are 32px against the 40px `--tap-min` on every Activity route (the section's own
   visual gate is red there). **[major/S]** History paints every AUTO_PAUSED as "Stopped by a limit", including a
   holder's password change. **[minor]** the why-panel repeats a fact stated in the callout (432(n)) on a fresh
   account; "none chosen" / "None chosen" / "no chain is chosen" — one constant; the activity window presets render
   in Swahili on the English desk (`I18nProvider` from the player cookie); an empty Targets table keeps its header
   floors ("LAST CHAN"); a removed account's History subject cell prints the event word; head every When column
   "When (EAT)". Re-measure the roster at 1280 after the Account-cell move (the Products column no longer holds the
   sentence; confirm no ScrollX at the design width).

### E · Lanes (instrument quality, not product)
10. Lane E: seven assertions have no discriminating engine mutation (SILENT red only); uniqueness measures the schema
    index. Lane M: `dayKey` goes null when placements straddle 21:00 UTC (M.16/M.17 red by the clock); largest-remainder
    vs independent rounding not discriminated (needs a house LOSS with ≥ 3 winners). Wire `qa:house-bot-fleet` into
    the house verify ladder so the hand-derived oracle runs on a schedule.

### F · Not measured this session (owed)
- The audit's **activity-paging** and **functional-flow** lenses never finished (stopped on the owner's word to
  bank tokens): paging past one page / the 500 clamp / page-past-end / bell anchor on a served build, and every
  officer control driven in a browser with before/after states. Do both first next session, read-only, then fix.
- Widths 640/768/1024/1920; the memory-DAL dev path; `qa:house-bots-visual` was run by the review fixer on its tree
  (see `351366d3`), not by hand at the close; `verify:house-bot-bundle` and `next build` ran in the closing gate batch
  (see PROGRESS.md's session row for the verdicts).
- **Owner decision to confirm:** a ticked product that reaches nothing is refused at save and at Start even while the
  other product is live (a half-configured account is treated as mis-configured, not partly configured). If "any
  reachable member OR a by-hand mode with a screen" is wanted instead, `rulesInertReasons` and the 2g/10.class cases
  change together.

## 3 · How to start the next session

1. `F:/kipindi-house-bots` on `bot-flow-seal` (merged into `main` at this session's close; `git fetch` and confirm
   `origin/main` = the pushed sha). Remove the two helper worktrees if still present: `git worktree remove
   F:/kipindi-hb-fleet` (junction `node_modules` — remove the junction first: `cmd /c rmdir F:\kipindi-hb-fleet\node_modules`),
   same for `F:/kipindi-hb-audit`; branch `fleet-lanes` is merged and can be deleted.
2. Scratch Postgres: `KP_SCRATCH_PORT=5453 npm run db:scratch` in one terminal and hold it; every DB suite and the
   fleet drive then reuse it (`KP_SCRATCH_PORT=5453 npm run -s qa:house-bot-fleet` = every lane A–M in one process).
3. Read: this file → `docs/HOUSE-BOTS.md` §5 (fields), §7 (console) → `PROGRESS.md` RESUME AT. Then items A1–A4.
4. Every fix: an assertion + a mutation, both stores where a store is involved, screens rendered and READ at 1280 and
   360 before the commit closes. The meta-mutation for the fleet (`KP_FLEET_SILENT=1`) before trusting any engine change.
5. The production read-only probe (SELECT only, ages computed in SQL, ids redacted) is the finish-line instrument:
   intents, house positions, the holder's wallet — never the switch.
