# ▶ RESUME HERE — House Bots

**This file is the one stable address of the house-bots programme.** Whatever else changes, a session told
only *"continue the house bots development where it was"* starts here, and nothing else needs to be known.

---


## ⚠️ READ THIS BEFORE ANYTHING ELSE — the desk is ON, the engine is RUNNING, and one tick is missing

**Re-read from production 2026-09-23 ≈ 07:50 EAT, SELECT-only, ids redacted and every age computed in SQL.**
⚠️ Take a fresh read before quoting any of this: a number written into a file is wrong by however long the
file has sat there. The script that produced it is trivial to rebuild — five `SELECT`s, no write, no
transaction, run through `railway run --service Postgres` so the credential is injected and never stored.
⚠️ `DATABASE_PUBLIC_URL`, not `DATABASE_URL`: `postgres.railway.internal` resolves only INSIDE Railway. And
run it from a tree that HAS `pg` installed — `C:/kipindi-house-bots` does, `C:/kipindi-main` does not.

| Fact | Value |
|---|---|
| Master switch | **enabled = true**, switched on **2026-09-21 18:56 EAT** (the trail that evening was ON, OFF, ON, OFF, **ON**) |
| The engine | ✅ **RUNNING** — a durable planner beat **9 seconds** before the read, five engine rows all `engineEnabled = true`, no `pollerErrorCode` on any of them |
| Accounts | **one ACTIVE**, `rulesVersion` 14 |
| Its scope | Up & Down ticked · **0 chains chosen** · 0 categories · polls off |
| Money it has placed | **0 positions, 0 intents, 0 house transactions** |
| Its event trail | DESIGNATED, VERIFIED, then **13 × RULES_SAVED**, STARTED ×2, PAUSED ×1 — net ACTIVE |

⛔ **NO SESSION EVER TOUCHES THAT SWITCH.** On or off is the owner's own act, and this record exists so nobody
reads the older "the switch is OFF" lines and believes them.

### 🔑 SO: CAN THE DESK BE USED? YES — AND EXACTLY ONE THING IS MISSING, AND IT IS NOT CODE.

Everything mechanical is live and healthy: the switch is on, the engine is beating, the account is ACTIVE and
its limits are filled. **It reaches no market because no CHAIN is ticked.** `rulesCoverTarget` is false for
every market, so the engine considers it and passes, every time — which is why 37 hours of a running engine
produced zero intents and zero positions. Thirteen saved versions say somebody tried and did not find the box.

**The fix is about a minute, on the Rules tab:**

1. Open the desk → the account's row already says, in its own words, why it cannot bet.
2. Open **Rules**.
3. Under **Markets**, tick the **Up & Down chains** it may touch. (If polls are wanted too, tick **Polls** as a
   product AND at least one **poll category** — a ticked product with nothing chosen reaches nothing, which is
   this exact failure repeated.)
4. Press **Save**. Nothing on that tab saves by itself.
5. Press **Start** — and READ the sentence it answers with. If every enabled mode is impossible for this
   account it still starts and SAYS SO in the warning tone.

⚠️ There is nothing else to wait for and nothing else to deploy before that works.

⭐ **AND THE DESK IS DOING NOTHING, FOR A REASON THE WORK BELOW FIXES.** The one ACTIVE account has Up & Down
ticked and **no chain chosen**, so `rulesCoverTarget` is false for every market and it reaches nothing — which
is exactly why it had placed no bet at all between the switch going on (2026-09-21 18:56 EAT) and the read
above. ⚠️ That gap is stated as two INSTANTS, not as "31 hours": an elapsed figure written into a file is
wrong by however long the file has sat there. Re-derive it from the two dates, or take a fresh read.
`rulesVersion` 14 says somebody saved it thirteen times trying. The scope pickers (2026-09-22) are the control that fixes it; the roster now names the
reason on the account's own row, the why-panel says it, and Start refuses it.

**What an officer does about it, in order:** open the desk → the account's row says why it cannot bet → Rules →
tick the chains it may touch (and the categories, if polls is wanted) → Save → Start.

## 0 · Do this first

```bash
git fetch
git checkout bot-flow-seal && git merge --ff-only origin/bot-flow-seal   # never rebase
git merge origin/main                                                     # if main has moved
```

- **Worktree:** `C:/kipindi-house-bots` on Ali-Blade15. ⚠️ Older prompts say `F:/…` — **there is no F: drive**;
  the trees are `C:/kipindi-house-bots` and `C:/kipindi-main`, and memory is `C:/Users/Ali/.claude/…`.
- **Branch:** `bot-flow-seal`. `main` is pushed from `C:/kipindi-main` as a **pure ref update**, never forced.
- 🔴 **The live desk's master switch is ON** (see the block at the top of this file), **and no session ever
  touches it** — on or off is the owner's own act. ⚠️ This line said "is OFF" until 2026-09-23, four screens
  below a table in the same file recording it as ON since 2026-09-21. A wrong authority travels further than
  wrong copy, so it is corrected here rather than only in the newer block.

## 0a · ▶ READ THIS FIRST — 2026-09-23 AFTERNOON, ON THE F: MACHINE (asheib), AND IT SUPERSEDES §0b

🔴 **THE DESK COULD NEVER HAVE BET, AND THE SCOPE WAS NOT THE REASON.** §0b's ladder was worked and `main`
is pushed at **`c5f84e77`**. On the way through, a production read found a SECOND blocker underneath the
2026-09-22 scope defect, and it is the one that mattered: **BTC's Up & Down chains carry `marginBps = 0`**,
so `computeTargets` froze each round's winning band at ONE TICK — **0.02 against an open of 86,379.20** —
and `udCloseness` scaled by that band, demanding the live price sit within **half a cent** of the round's
open. It refused OPENER, FILL and COUNTER on every round for 23 hours, **at every setting an officer could
choose** (the field caps at 100; at 100 the tolerance is still 0.02). Fixed with a 5-bps floor under the band
that ONE test uses — `UD_CLOSENESS_FLOOR_BPS`. ⛔ The player game, `computeTargets`, the frozen targets and
settlement are untouched. Full reasoning, numbers and mutation table: **`docs/HOUSE-BOTS.md` §12.2**.

⚠️ **AND A SECOND ONE THE OFFICER MUST CLEAR BY HAND.** The live document also has **`scope.poolTotalMaxTzs
= 0`**, which refuses every COUNTER (a counter answers a stake already IN the pool, so the total is never 0).
It is now refused at SAVE — but a document that already carries it is only corrected when someone saves the
Rules tab again. **Clear that field (leave it EMPTY = no ceiling) or set a real number.**

▶ **WHAT IS LEFT, and none of it blocks betting:**
1. **Record the refusal reason.** A refused decision is written NOWHERE, so `HouseBotIntent = 0` cannot be
   told apart from "never considered" — which is why this took a morning with every screen green. Record the
   last engine code per account and paint it on the roster row and the why-panel. **This is the highest-value
   remaining work on the programme.**
2. The two browser gates (`qa:desk-rules-flow`, `qa:house-bots-visual` at 360/1280, PNGs READ).
3. `red:house-bot-console` — its last run died on an EPERM rename and left a planted defect on disk (restored
   from the HEAD blob, tree proved clean). It has not completed since.
4. ⚠️ `qa:house-bot-fleet` ran **363/364 then 364/364 on the same commit** — lane E's "exactly ONE placed
   alert" is racy across lanes. A gate that can lie in either direction.

## 0b · WHAT IS FINISHED, AND WHAT THE NEXT MACHINE PICKS UP (2026-09-23 · handover)

⚠️ **SUPERSEDED IN PART BY §0a ABOVE** — items 1–6 below were worked on the F: machine and `main` is pushed.
⚠️ **AND THE PATHS HERE ARE THE C: MACHINE'S.** On Ali-Blade15 the trees are `C:/kipindi-house-bots` and
`C:/kipindi-main`; on the **F: machine (asheib)** they are `F:/kipindi-house-bots` and `F:/kipindi-main`, and
memory is `C:/Users/asheib/.claude/…`. Read the drive letter off the machine you are on, never off this file.
⛔ **`main` CANNOT BE PUSHED FROM THE HOUSE-BOTS WORKTREE** — a pre-push hook refuses it ("house-bots worktree
may not push main before REL-4"). Push it from `kipindi-main` as a pure ref update, which is what §0b meant.

**Branch `bot-flow-seal` is PUSHED and is the state to pull.** `git fetch && git checkout bot-flow-seal`.

✅ **FINISHED AND ON THE BRANCH — all ten named minors M1–M10** (the full register, with what each turned out
to be, is §5 of `NEXT-SESSION-2026-09-23.md`). Eight fixed with an assertion and a mutation each, M10 STRUCK
because it does not reproduce, M9 resolved into four-moved / one-already-existed / two-unmutatable. Five
commits, every one of them with its reasoning in the message:

| Commit | What |
|---|---|
| `532a1fe8` | M5 M6 M7 M8 — the empty table's scroller, the subject column printing an event word, the blockers stated twice on one screen, the way out that stopped one click short |
| `480d7077` | Re-anchoring three console mutations that M7's refactor had left measuring NOTHING |
| `5c914dad` | M2 M3 — the unreadable window refused, the picker's day bound moved to EAT |
| `7146f2b2` | M1 — the engine notice ages durable beats against the DATABASE's clock |
| `f3fdf2ad` | M4 M9 M10 — the boot refusal reaches the desk; lane E's claims get real mutations; M10 struck |

▶ **WHAT THE NEXT MACHINE STILL HAS TO DO**, in order. None of it is new development — it is the closing
ladder and the live push:

1. **Finish the two mutation drives** on the merged tree — `red:house-bot-console` and `red:house-bot-engine`.
   They were RUNNING when this session ended and their verdicts were not read. ⛔ Redirect, never pipe (§4).
2. **`qa:house-bot-fleet`** — M9 and M10 edited two lane files; the fleet has not been run since.
3. **The two browser gates on a served desk** (§4 of `NEXT-SESSION-2026-09-23.md` for the recipe):
   `qa:desk-rules-flow` — which gained §9c (M5/M7/M8, 7 cases) and §9d (M3, 3 cases, its control two
   timezones 25 h apart) and whose 7b.2/7b.3 were RE-AIMED — and `qa:house-bots-visual` at 360 and 1280,
   with the PNGs READ rather than merely produced.
4. **`npm run build` + `verify:house-bot-bundle`**, then the whole ladder green on ONE tree.
5. **`docs/HOUSE-BOTS.md` §12** — the verification rows for this batch are NOT yet written.
6. **Merge to `main` from `C:/kipindi-main` as a pure ref update**, verify the deploy (`/api/health` uptime
   resets), and take a production read.

⚠️ **Suite floors already raised to what runs PRINTED**, so a lower count is a real regression, not drift:
console **792** memory / **553** Postgres · engine **789** / **768**.

## 1 · The current state, and what is next

👉 **`plans/house-bots/NEXT-SESSION-2026-09-23.md`** — what shipped with its proof, what the two audit
lenses MEASURED (register F is discharged), **§5: the named minors and what has become of each**, and §4: how
to stand the instruments up. ⚠️ The five findings L1–L5 that sentence used to point at are all FIXED and LIVE;
§5 is the list that is still worth reading.

Older sessions, kept as the record: `NEXT-SESSION-2026-09-22.md` (the 2026-09-22 register),
`00-NEXT-SESSION-PROMPT-2026-09-23.md` (the owner's brief for this session).

## 2 · The authorities — read these before changing behaviour

| What | Where |
|---|---|
| Every rule field, and the engine's own reading of it | `docs/HOUSE-BOTS.md` §5 |
| The console flow an officer walks | `docs/HOUSE-BOTS.md` §7 |
| The verification record — every suite number and its mutations | `docs/HOUSE-BOTS.md` §12 |
| What an officer types to switch the desk on | `plans/house-bots/SWITCH-ON-SHEET.md` |
| The long-running status board | `plans/house-bots/PROGRESS.md` |

## 3 · The rules that do not bend

1. The **production master switch is never touched**, and no production write is ever made.
2. A production READ is **SELECT-only**, ids redacted, ages computed in SQL.
3. The repository is **PUBLIC**: no account id, holder name, note text or switch-on reason in any file.
4. **No house vocabulary on any player surface**, and none on the console either (ruling 453 — the console's
   copy is lexicon-scanned; say "account", never "bot").
5. Never `git checkout --` / `restore` / `stash` / `reset --hard`; never `git add -A`.
6. A `red:*` gate **mutates tracked files in place**. It refuses a dirty tree, and two at once in one tree is
   how a live guard gets left disabled while the harness reports clean.
7. Heavy Node through the shared lock: `bash ~/heavy-node-lock.sh run <who> <cmd>` — this laptop's RAM is
   failing and two builds at once bluescreen it.

## 4 · The gates

```
npm run -s typecheck
npm run -s test:house-bot-rules          npm run -s test:house-bot-disclosure
npm run -s test:house-bot-surfaces       npm run -s red:house-bot-console
KP_SCRATCH_PORT=5453 npm run -s test:house-bot-console   # DB-backed, both stores
KP_SCRATCH_PORT=5453 npm run -s test:house-bot-engine
KP_SCRATCH_PORT=5453 npm run -s test:house-bot-money
KP_SCRATCH_PORT=5453 npm run -s test:dal-parity
KP_SCRATCH_PORT=5453 npm run -s qa:house-bot-fleet       # lanes A–M; KP_FLEET_SILENT=1 is its meta-mutation
npm run build && npm run -s verify:house-bot-bundle
```
Browser gates need a served desk — the recipe is in `NEXT-SESSION-2026-09-23.md` §4.

⛔ **NEVER PIPE A GATE, and read its exit code on its own line.** A pipeline's status is the LAST command's, so
`npm run red:house-bot-console | tail -25` exits **0** while the runner exits 1 — measured here on 2026-09-23,
where it reported `306 caught, 3 missed` as a success AND cut off the lines naming which three. Redirect:

```bash
npm run red:house-bot-console > red.log 2>&1; echo "EXIT=$?"
grep -E "^MISSED|^WRONG-ASSERTION|RED: " red.log
```

⭐ **And after any refactor, check every declared mutation still RESOLVES before trusting a red drive.** A
`from:` whose text no longer exists plants nothing and reports nothing — load an `*.anchors.mjs` module and
assert each `from` appears exactly once in its file. That is how those three misses were found.
