# SESSION PROMPT — the "In Progress" board tab, and full phone numbers in admin

> 🔵 **LIVE — this is the door for the next session.** Ali dictated both items on 2026-09-06.
> Copy the block in §0 into a fresh session. Everything after it is the evidence that block
> refers to, gathered and measured on 2026-09-06 so the next session does not have to re-derive
> it from scratch — but ⛔ **every number in here is a measurement with a date on it, and this
> repo's first law is that recorded numbers rot. Re-derive before you rely on one.**

---

## 0 · THE PROMPT — copy from here to the end of this section

```
Read docs/SESSION-PROMPT-PROGRESS-AND-PHONE.md first, then CLAUDE.md, then
docs/NEXT-PLAN.md. Two jobs, both from Ali on 2026-09-06. Both must be built end to end,
perfectly, with zero flaws, in coherence with the existing UI kit and design authority.

JOB 1 — THE "IN PROGRESS" TAB ON THE MARKETS BOARD.
A poll whose selection has closed but whose result is not out yet currently VANISHES for
any player who did not bet on it. If I bet, I can still find it under /positions. If I
did not, it is simply gone. Ali's words: "as long as selection closed but result not out
he should see it, in a tab called progress or in progress... when results are out he
won't see it anymore."

So this is a tab on the MARKETS BOARD, for everyone, not a tab on /positions.
⛔ The earlier plan said "positions page only, no lens on the board" (its D4). That was
WRONG and Ali corrected it. The board is the deliverable.

JOB 2 — FULL PHONE NUMBERS IN ADMIN, BEHIND AN EYE.
As the platform owner Ali cannot read a player's full phone number anywhere in admin, so
he cannot tell who is who. He wants the same eye-reveal the email field already has, and
he wants it reflected everywhere a phone is shown in admin, consistently.
⚠️ This is a change to a RECORDED compliance decision (READ-TIERS D3, "ADMIN is not
exempt"), so it is an owner ruling that must be written into
docs/COMPLIANCE-DECISIONS.md, not a quiet code edit.

⛔ DO NOT COME BACK TO ME UNTIL BOTH JOBS ARE FINISHED, PUSHED, AND LIVE. Ali, 2026-09-06:
"make sure not to come back until live, end to end tested and done, pushed live."
That means, for each job: built, the full suite green, every new guard proven RED by
mutation on its own assertion, committed, PUSHED TO MAIN, the deploy confirmed landed on
production (watch /api/health's uptime reset), driven and READ on the live site at
360/768/1280/1920 in EN + SW + ZH, and the docs and status board updated in the same pass.

⚠️ Come back BEFORE that only for: a decision that is genuinely Ali's to make (the phone
job contains one — see §2b), something destructive or irreversible, or a blocker you
cannot get past. If you stop for any other reason you have not finished. "The plan is
ready" is not finished. "The tests pass" is not finished. Live and read is finished.

⛔ AND REPORT WHAT IS NOT DONE. If one job lands and the other does not, say so plainly
and say why. Never describe something as done when it is owed — this campaign has a
standing rule that an owed item is recorded as owed, never claimed.

HOW TO WORK, in this repo's own terms:
- Plan first and put the plan to Ali before building. Use adversarial verification, not
  self-review: a workflow that tries to REFUTE your claims. ⚠️ Two such runs died on a
  session usage limit on 2026-09-05/06 — if that happens again, say so plainly and finish
  the scan by hand. Zero refuter votes is UNVERIFIED, never a pass.
- Work in your OWN git worktree off main. Never edit C:\kipindi-main directly; other
  sessions share it. Stage files by name. Never `git add -A`.
- Push to main = a LIVE real-money deploy. Verify after every push by watching
  /api/health's uptime reset, then READ the screens.
- Every UI change gets photographs at 360/768/1280/1920 in EN, SW and ZH, and they must be
  READ, not merely captured. Three defects shipped on 2026-09-05 with every gate green and
  were found only by looking at the picture.
- Every new guard needs a RED harness proving it fails on the real defect, on its OWN
  assertion, with the anchors declared as data in scripts/anchors/.
- Docs and the status board update in the SAME commit as the code.
```

---

## 1 · JOB 1 — the "In Progress" tab, and why the earlier plan was wrong

### 1a · What Ali actually asked for

> *"progress is needed like pending, like current polls, for markets. It's meant to show players
> what they missed but only until results get out… when selection closed, me if I placed a bet on
> it, I can see this poll — but how would someone see it if he didn't place a bet in it? It just
> disappears for him. As long as selection closed but result not out he should see it, in a tab
> called progress or in progress… when results are out he won't see it anymore."*

⛔ **The `MGMT-SPEC-2026-09-05` plan got this wrong and it is corrected here.** That plan's **D4**
read *"Positions page only. No new lens on the `/markets` board — the board is for placing bets."*
Ali's requirement is the opposite: the board is exactly where it belongs, because the person who
loses sight of the poll is the person with **no position**, and `/positions` can never help them.

### 1b · The defect, measured on production 2026-09-06

The board's default filter is `open`, and `open` means *bettable*:

```
src/lib/markets/discovery.ts:104   DEFAULTS = { status: "open", … }
src/lib/markets/discovery.ts:277   case "open": return row.status === "LIVE" && !row.selectionClosed;
src/lib/markets/discovery.ts:83    STATUS_IDS = ["open", "today", "new", "watch", "all"]
```

So a market drops out of the default view the second its selection closes. It is still reachable
under **All** — the board reads `LIVE ∪ CLOSED` — but nothing names the state and nothing takes
the player to it.

**The population, counted on production (2026-09-06). ⛔ Re-derive it; do not quote it.**

| The state a player experiences | Long-form markets |
|---|---|
| A · Open, bettable | 43 |
| **B · In progress — LIVE, selection closed** | **2** |
| **C · In progress — CLOSED, awaiting an officer's seal** | **12** |
| D · Verdict recorded, money still held | 8 |
| E · Settled | 119 |

**B + C is the tab.** Fourteen markets were invisible to a non-bettor at the moment of measuring.

### 1c · The definition to build to

**In progress = selection is closed AND no verdict is recorded yet.** In this codebase:

```
status === "CLOSED"                                  // the resolve trigger closed it for an officer
  ||  (status === "LIVE" && isSelectionClosed(m))     // past its cutoff, resolver has not run
```

⛔ **State D is NOT in progress.** Once `resolvedOutcome` is set the result IS out, which is Ali's
own stopping condition — even though the money has not moved yet. D belongs to `/results`.
⚠️ Check where `/results` currently draws its line before assuming D is already handled there.

### 1d · What already exists — reuse it, do not rebuild it

- `discovery.ts` is the **pure, server-free** home for board status/sort/filter. A new status id
  goes in `STATUS_IDS`, a new arm in `matchesStatus`, and the counts, hrefs and empty states
  follow automatically. ⛔ Its own header is the law that a derived state on more than one
  surface is defined **once**.
- `isSelectionClosed` / `isClosedByTime` live in `market-service.ts` and are passed **in** as
  `DiscoveryRow.selectionClosed`. ⛔ Never re-derive them inside the pure module.
- `FilterPill` with `semantics="tab"`, cross-filtered counts, `replace` + `scroll: false`.
- The words already exist, trilingual: `market.waitingForResults`, `market.statusClosed`,
  `market.resultsExpectedBy`, `market.closedAwaitingSettlement`. ⭐ **Strongly prefer reusing
  `waitingForResults`** — it is already the board's own word for this state.
- `MarketCard` already renders a `selectionClosed` variant with a locked dial.

### 1e · Traps, each one paid for already

- ⛔ **Chinese: `进行中` is ALREADY the word for the Open tab** (`positions.tabOpen`, `common.open`,
  and three more surfaces). A tab literally called "In progress" would render identically to
  "Open" for a Chinese reader. Swahili `Inaendelea` is Up & Down's "In play". Reuse
  `waitingForResults` (`等待结果` / `Inasubiri matokeo`) or mint something demonstrably distinct.
- ⛔ **The `/updown` board resets scroll on a filter tap and `/markets` does not** — measured, and
  the cause is that `/updown` intercepts the click while `/markets` lets `<Link replace
  scroll={false}>` navigate. Do not "fix" it without reading the `UD-13` note; plain links made
  the board fall to its skeleton with the countdown restarting.
- ⛔ **The type-scale and spacing ratchets are at zero slack.** Use the closed scale and the
  `.eyebrow` role class; a copied `text-[11px]` or `tracking-[…]` fails the gate.
- ⚠️ **The skeleton must move in the same commit.** `/positions`' loader drew a different rail
  shape from its page and nobody noticed for months.
- ⚠️ **Empty state:** on a quiet day this tab is legitimately empty. An empty tab must read as
  "nothing is waiting for a result", never as a broken page — and the guard must not pass
  *because* it is empty.

### 1f · Definition of done

The tab exists on `/markets`, is reachable **signed out**, names the state in three languages,
shows every market in B + C and nothing else, drops a market the moment a verdict is recorded,
carries a cross-filtered count, has a skeleton that matches, and is photographed and READ at four
widths × three locales. Guards live in `discovery-contract.test.mts` (+ its RED harness) rather
than a new suite.

---

## 2 · JOB 2 — full phone numbers in admin, behind an eye

### 2a · What Ali asked for

> *"In admin, I the owner of the platform cannot see full phone numbers of players. Please put
> next to it an eye like for email, to show full number in roster so I know who is who perfectly.
> Make it end to end, make sure it reflects everywhere else needed. Consistency with our UI theme
> kit and coherence is more important."*

### 2b · The machinery already exists — this is a POLICY change, not a new feature

`READ-TIERS` shipped on 2026-08-26 and is the second RBAC axis: it answers *"may this role read
this FIELD?"* It already provides a `<Sensitive>` component, an **audited reveal**, a
`RoleReadGrant` table (0 rows on production, so the code defaults are the live matrix) and a
**Reads** tab on `/admin/roles`.

⚠️ **The phone is masked for EVERYBODY today, ADMIN included, and that was a deliberate ruling:**
`READ-TIERS` **D3** says *"ADMIN is not exempt"*, and its §4c defines the `read` cell as **masked
at rest, MAY reveal**. Read that section before touching anything — the intended design may
already permit exactly what Ali wants, in which case the work is **wiring the reveal onto the
phone field**, not changing the policy.

⛔ **Establish which of the two it is before writing code**, and say so in the plan:
1. the reveal exists for ADMIN and simply is not wired to the phone → a wiring job; or
2. the policy genuinely forbids it → an owner ruling that **must** be recorded in
   `docs/COMPLIANCE-DECISIONS.md` with Ali's words and the date, because it reverses D3.

### 2c · Everywhere it must reflect

Ali said "everywhere else needed", so find them all rather than doing the one screen he named:
`/admin/players` (the roster he means), `/admin/players/[id]`, the KYC queue and detail, AML,
payments/withdrawals, self-exclusions, staff, audit rows, invites, and any CSV/report export.
⛔ **An export is a reveal without an eye.** Decide deliberately whether exports carry the full
number, and record the decision either way.

### 2d · Traps

- ⛔ **Every reveal is AUDITED.** That is the control that makes masking-with-reveal acceptable to
  a regulator. Do not add a path that shows a number without writing the audit row.
- ⛔ **One component, not per-page markup.** `<Sensitive>` exists; a second hand-rolled reveal is
  how the two drift apart.
- ⚠️ **Masking today is not only visual.** Check whether the phone is masked at the SERVER before
  it reaches the client. If it is, a UI-only eye reveals nothing and the fix is server-side.
- ⚠️ **Roles other than ADMIN must be unaffected** unless Ali rules otherwise. SUPPORT reading
  every player's phone is a different decision from the owner reading it.
- ⚠️ The eye must clear the 44px tap target and carry a real accessible name.

### 2e · Definition of done

The owner can reveal a full phone number from the roster and every other admin surface that shows
one; each reveal writes an audit row; no other role gains a reveal it did not have; the control is
the shared `<Sensitive>` component in the kit's own idiom; the ruling is recorded in
`COMPLIANCE-DECISIONS.md`; a guard proves a non-permitted role is refused **and** carries a
positive control; and it is photographed and READ at four widths.

---

## 3 · The state you are inheriting (2026-09-06)

`MGMT-SPEC-2026-09-05` shipped **Deploys 1 and 2 of 3** and they are LIVE. Deploy 3 — the
player's own in-progress view — was **not started**, and Ali's correction above changes what it
should be. Read `docs/NEXT-PLAN.md` row 0 and the topmost `RESUME AT` in
`docs/LIVE-QA-CAMPAIGN.md` §6b before deciding what survives of it.

- The objection window is **1 hour** on production. Markets sealed before the flip keep 24 h.
- `E-295`…`E-302` are filed in §6. Two of them (`E-301`, `E-302`) were false money statements
  found by scanning the change **by hand** after the agent fleet died on a usage limit.
- ⛔ **Still owed and not claimed:** no long-form market has been sealed since the flip, so the
  1-hour stamp is proven by `test:settlement-gate` §7 and by the live config but **has not been
  observed on a real row**.
- ⚠️ Two suites are RED on `main` and belong to the Up & Down / chart lane, not to this work:
  `test:updown-source-class` (a **false alarm** — its rule forbids `sourceDomain` in
  `updown-board.ts`, and the chart sprint added a legitimate server-side use; no vendor domain
  reaches a player payload) and `test:updown-handover` 8.4d. Re-measure before believing either.
- ⚠️ **The FINANCE QA persona is rejected on production** — a stale credential, not RBAC. Use
  `WINDOW_ROLE=admin` / the `admin` persona for staff drives.
- ⚠️ Reading timestamps straight from the production database: those columns are `timestamp
  without time zone` and the driver applies a **+03:00** offset, so `now()` and a stored stamp sit
  three hours apart in one query. Compare stored column to stored column; only the DIFFERENCE is
  sound. This nearly produced a false "the scheduler has stalled" alarm.
