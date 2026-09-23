# House Bots — 2026-09-23 · what shipped, what the two audit lenses measured, and where to resume

⛔ **THIS FILE IS THE RESUME POINT.** Another machine picks up here. Branch `bot-flow-seal`, worktree
`C:/kipindi-house-bots` (⚠️ the 2026-09-23 prompt says `F:/` — there is no F: drive on Ali-Blade15; the trees
are `C:/kipindi-house-bots` and `C:/kipindi-main`, and the memory directory is `C:/Users/Ali/.claude/...`).
Everything below is redacted for the public repository (W20): no account ids, holder names, note text or
switch-on reasons.

## 1 · What shipped, and what proves it

| Commit | What | Proof |
|---|---|---|
| `ab238ba4` | **The closing batch's two reds.** `0.232.2` — the seventh marker site moved 4474 → 4484, and the move was PROVED before it was re-pinned (`bb231238` is +11/−1 in ONE hunk at `@@ -4028,7 +4028,17 @@`, below the sixth site and above the seventh, so the other six must stand still). `0.512` — `CONSOLE_ACCOUNT_MISSING` shipped as an export that was neither a `CONSOLE_GATES` entry nor a declared non-reader. | `test:house-bot-reports` 0.232.2 PASS, 0.512 PASS, 0.512.c1 discriminating in all five buckets |
| `3e4db59b` | **Two console mutations that were measuring NOTHING** — `390-sentence` and `390-catch`, both `anchor matches 2× — ambiguous`, because correct product copy gave each anchor a second site. Re-anchored on unique context. | all 298 console anchors resolve EXACTLY ONCE through `resolveAnchor` itself |
| `8fc40f48` | **THE NUMERIC + SCHEDULE RULES EDITOR (register A1, the blocker)** — 29 numeric rows from `RULE_NUMBER_FIELDS`, the amount-kind chooser, `roundToTzs` as a chooser, the schedule (7 days + All-day + 4 HH:MM rows in EAT posted RAW), the live bounds through `fieldBounds`, the derived "used only while X is on" caption, the record card carrying every number and the schedule. **A2** the Enter-now stakes exist, so the dead switch is live. **A3** Start returns and paints its warnings. **A4** the minimal-patch branch is deleted with the promise it could not keep. | `test:house-bot-console` memory 787/0 · Postgres 541/0 (from 763/525), with a new §2h; rules 574/0; disclosure 115/0; **7 mutations, 7 caught, 0 missed** |
| `f4d3ba08` `ededabfb` `437c40be` | **The rule leaves no `test:` suite pinned (register B6)** — §7b's 24 pure cases, each a PAIR, including a UTC discriminator for the schedule. **The owner decision taken:** a COUNTER's schedule is judged at the DUE instant, like FILL and OPENER. Two PRE-EXISTING engine anchors were stale and measuring nothing (`alerts-skew-*`). The opener's own `floorTo` was redundant and is gone. | `test:house-bot-engine` memory **780** · Postgres **759** (+24 each), floors raised to the printed counts; **20 mutations, 20 caught, 0 missed** |

## 2 · The two audit lenses (register F) — RUN, read-only, on a served build

Driven at `http://localhost:3031` against a migrated scratch database (520 seeded activity rows, over both
the 20-row page and the DAL's 500-row clamp). ⛔ Production was never touched.

### (a) ACTIVITY PAGING — what is RIGHT, measured
- page 1 `1–20 OF 521`, page 26 `501–520 OF 521` with 20 real rows — **paging works PAST the 500-row clamp**
- the total comes from the COUNTING reader, not the page length (521, not 20)
- page 27 is the last row (`521–521`); **page 99 clamps to the last page** rather than painting an empty one
- a filter chosen while on page 3 **resets to page 1** (`?tab=activity&outcome=queued`)
- the outcome chip and its reason sentence both paint (`EXPIRED · 50pick was busy until the time limit passed`)
- the **bell anchor works**: `&intent=<real id>` jumps to the right page and marks the row (`bg-bg-overlay`);
  a malformed id is REFUSED with the link sentence. ⚠️ An earlier "the anchor does nothing" note was MY
  malformed test id, not the product — recorded so nobody re-opens it.
- no sideways scroll at 360 on either Activity route; no console errors

### (b) FUNCTIONAL FLOW — what is RIGHT, measured
- the wizard designates and lands on `?tab=rules`; Start on a blank account refuses with the Rules remedy
- the editor draws: 11 switches, 4 pickers, the numeric rules under "How it decides", 7 day boxes, 4 window rows
- "Use starting values" fills → Save → **Saved**; History records `Rules saved`, `Started`, `Paused by an officer`
  with the actor id and the status change
- Start paints the master-switch warning; the switch control is correctly ABSENT while 8 global limits are unset
- ⭐ **THE EDITOR'S BROWSER ROUND TRIP, PROVED**: typed `answer-delay-min` 25, `quiet-zone-polls` 7,
  `enter-now-thin-stake` 5,000, turned All day OFF and typed **09:00 → 17:30** through the kit's TimeSelect →
  the hidden posted values carry `09:00`/`17:30` → **Saved** → reload → every value read back, All day off,
  the window in its segments and the saved sentence `Mon 09:00 → 17:30` on all seven days.

### 🔴 WHAT THE LENSES FOUND — the register for the rest of this session
| # | Finding | Where |
|---|---|---|
| **L1** | **21 controls on the ACCOUNT Activity route and 22 on the DESK route are UNDER the 40px `--tap-min`** — the axis pills and the window presets at 32px (`rank="dense"`), plus one **26px** unlabelled button on the desk. | `activity-filters.tsx`, the desk's rails |
| **L2** | **The admin shell renders `lang="sw"` with NO cookie set** — so the window presets read `Leo / Saa 24 / Siku 7 / Muda wote / Maalum` beside English server copy. ⛔ WIDER than the register said: it is not a player-cookie leak, Swahili is `DEFAULT_LOCALE` and the desk inherits it. | `src/app/layout.tsx:175`, `i18n-dict.ts:12` |
| **L3** | Every `When` column heads **`WHEN`**, not `When (EAT)` — on BOTH the activity and History tables. | the desk's tables |
| **L4** | **Pause asks for nothing** — no dialog, no reason field, though the service stores one (register A5 confirmed). | the account's action row |
| **L5** | "Stop it" on a queued row opens **no dialog** — ruling 415 expects a reason. | the desk's activity rows |

## 3 · Where to resume

1. ✅ **L1–L5 are fixed and LIVE** (see §5 for what remains). L3 and L4 were exactly as measured; L2 was wider than the register said; L5 turned out to be a control with no dialog by design — the cancel is the row own control.
2. ✅ DONE — `qa:desk-rules-flow` §9b, 76/76.
3. Lane hygiene (register E): lane E's seven SILENT-only assertions, lane M's `dayKey` across 21:00 UTC,
   `qa:house-bot-fleet` into the house verify ladder.
4. ✅ DONE — every gate green on the merge commit, main pushed live (`b8615d28`), the deploy verified and production read. The closing ladder on ONE tree, the visual gate at 360/1280 with the PNGs READ, docs + PROGRESS, then
   `main` as a pure ref update from `C:/kipindi-main`, the deploy verified and production read.

## 4 · How to stand the instruments up again

```bash
export PATH="/c/Program Files/nodejs:/c/Users/Ali/AppData/Roaming/npm:$PATH"
KP_SCRATCH_PORT=5453 npm run db:scratch          # hold it; NEVER 5433 (a sibling checkout answers there)
# a served desk for the browser drives:
node <scratchpad>/prep-desk-db.mjs               # creates + migrates + seeds `hb_desk` on 5453
DATABASE_URL='postgresql://postgres:scratch@127.0.0.1:5453/hb_desk' USE_PRISMA_DAL=true \
  MARKET_SCHEDULER=false UPDOWN_SCHEDULER=false HOUSE_BOT_ENGINE=false DISABLE_ADMIN_TOTP=true \
  SESSION_SECRET=… OTP_PEPPER=… AUDIT_CHAIN_SECRET=… npx next dev -p 3031
# ⚠️ localhost, NEVER 127.0.0.1 — the dotted form never hydrates (Next 16 blocks cross-origin dev resources)
```
⚠️ **Heavy Node goes through the lock** — `bash ~/heavy-node-lock.sh run <who> <cmd>` — and a second session
(mobile visualisation) is working in parallel on its own worktree, ports 5463/3041.
⛔ **A `red:*` gate MUTATES tracked files in place**: it refuses to run on a dirty tree, and two at once in one
tree is how a live guard is left disabled while the harness reports clean.

## 5 · THE TEN NAMED MINORS — ALL CLOSED, AND TWO OF THEM WERE RECORDED WRONG

Everything the brief called a blocker shipped on 2026-09-23 (`b8615d28`). The ten minors below were the
remainder, and **all ten are now closed** — eight fixed with an assertion and a mutation each, one struck
because it does not reproduce, and one resolved into three different answers.

⛔ **TWO OF THE TEN WERE MIS-RECORDED, which is the reason this table now carries what was MEASURED rather
than what was remembered.** Re-derive a shorthand before fixing anything from it.

| # | What it was | What it is now |
|---|---|---|
| M1 | The engine notice aged DB-stamped beats against the web container's own clock | ✅ The beats and the database's instant arrive as ONE settled member. Proved BEHAVIOURALLY: a planner beat 5 s old by this container's clock is painted "not running · Last seen: 10 min ago" when the database says ten minutes passed. Ruling 348's source pin was **re-aimed onto its own claim** (the DAY KEY), not loosened |
| M2 | An unreadable custom from/to was answered silently with 24 h under the officer's own label | ✅ Parsed before `resolveRange` can guess, refused into the Callout that already exists, and the refused bounds do not travel into the rail's links. `resolveRange` itself untouched — seven other rails use it |
| M3 | The picker defaulted `to` to 23:59 and bounded days by the browser's zone | ✅ `eatDayKey` for the bound; the day-end posts as a DATE, which `resolveRange` already reads as the whole EAT day. ⭐ Its CONTROL is two extreme zones 25 h apart — this laptop sits in EAT, where a page agrees with EAT by accident |
| M4 | A `DB_TIMEZONE` boot refusal was invisible beyond "not running" | ✅ It records `BOOT_REFUSED:DB_TIMEZONE` on the instance's own row — the pattern `recordClaimsBlocked` already uses — and the verdict names it ABOVE `STALE`. A landed boot clears it. ⚠️ `11.16`'s "no boot row" proxy was re-aimed onto its claim: no `bootAt`, no `engineEnabled` |
| M5 | An empty Targets table forced a sideways scroller at 360 | ✅ One CSS rule on the marker row `AdminTableEmpty` now carries — ~15 admin tables, no call site edited. ⚠️ The recorded symptom ("LAST CHAN") was WRONG: the header did not clip. The real cost was a scroller whose entire reachable content was one centred sentence |
| M6 | A removed account's subject cell printed the event word | ✅ `CONSOLE_ACCOUNT_GONE` was `CONSOLE_EVENT_WORD.REMOVED` character for character. The three words are one exported object and a case compares the whole of BOTH total maps |
| M7 | The why-panel repeated what the Callout already stated | ✅ ONE `blockerItems` list, two skins, named once per screen. The two had also DIVERGED: the panel counted a retired chain that the callout and the `rules` badge did not |
| M8 | `Confirm permission →` landed on the overview with nothing to press | ✅ `?reverify=1` opens the dialog it names, once on arrival |
| M9 | "Seven lane-E assertions have no discriminating mutation" | ✅ **The count is SIX, not seven**, and the answer is FOUR / ONE / TWO: four moved to engine §7c where `planOpener` is pure, one already had a mutation nobody had noticed (money `1.4`'s `SEAM:txnMarker`) plus `13.1` which had the case but not the plant, and TWO are structurally unmutatable at assertion granularity — a finding, written into the lane's header with its reasoning |
| M10 | "`dayKey` goes null when placements straddle 21:00 UTC" | ❌ **DOES NOT REPRODUCE — STRUCK.** The shorthand fused two adjacent, unrelated things. `eatDay` is TOTAL: a straddle makes TWO day strings, never a null, which is what the per-desk key exists for. The `: null` is a missing-`placedAt` guard, unreachable while the premises hold. 🔑 One token DID change: `desks.every((d) => d.dayKey)` joins M.17n, whose `rows >= mDesks` limb would otherwise go slack in exactly that state |

⚠️ **And one finding outside this programme, left for its owner:** `scripts/anchors/rg-doors.anchors.mjs` has
**2 anchors that no longer resolve**, so `red:rg-doors` is measuring nothing on them. It is not in the house
ladder, so it was reported rather than fixed here.

## 6 · TWO WAYS THIS SESSION NEARLY REPORTED SOMETHING FALSE

Both are recorded because the next session will meet them, and neither announced itself.

1. 🔴 **A PIPE MASKED A FAILED GATE.** `npm run red:house-bot-console | tail -25` printed
   `306 caught, 3 missed` and the harness reported **exit 0** — a pipeline's status is the LAST command's, and
   the runner's own `process.exit(1)` never reached it. `tail` also cut off the only lines naming WHICH three.
   **Redirect a gate to a file and read `$?` on its own line. Never pipe one.**
2. 🔴 **THREE DECLARED MUTATIONS SILENTLY STOPPED MEASURING ANYTHING.** A refactor deleted the exact text they
   were anchored on, and an anchor that matches nothing does not fail — it plants nothing and reports nothing.
   **After any refactor, load the `*.anchors.mjs` module and assert every `from` appears exactly once in its
   file, before trusting a red drive.**
