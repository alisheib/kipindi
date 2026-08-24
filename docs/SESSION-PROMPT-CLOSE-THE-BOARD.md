STATUS: 🟡 **SUPERSEDED 2026-08-25 by `SESSION-PROMPT-FINISH-THE-BOARD.md`** — go there.
Unit A (E-200) shipped and Unit E was ruled closed; every other unit is carried forward
there with its state RE-DERIVED rather than copied, plus two dated watches (E-195, E-201)
and Unit B's precondition measured and unblocked.

⛔ **This file is NOT dead and must not be deleted: it remains the ONE HOME of the §1b
standards**, which the newer commission deliberately points at rather than restates — a
second copy of the standards is the duplication those standards forbid, and the copy
would rot first. Read §1b here; take the work list from there.

STATUS (historical): 🔵 the commission that closed every item left open on 2026-08-24 (session 60).
Written by the session that opened them, for the session that finishes them.

# CLOSE THE BOARD — the six that are left, and nothing skipped

**Commissioned:** Ali, 2026-08-24 — *"give me a prompt for next session to fix all of them
completely, prod level."*

> ⛔ **"BLOCKED" IS NOT AN EXIT, AND NEITHER IS "FILED".** Every unit below is real work.
>
> ⭐ **AND NOTHING HERE IS WAITING ON ALI.** Two items were open questions when this file was
> started; he then said: *"for questions that require my decision I want you, based on the whole
> platform and what is suitable and more perfect end to end, to take these instead of me."* **Both
> are ruled in §5, each argued from a measurement.** One of them (`E-194`) closes as NO CHANGE and
> is off the board entirely. ⛔ **Re-open a ruling with NEW DATA, never with a fresh opinion.**

---

## §0 · WHAT "DONE" MEANS HERE

A unit is **DONE** only when all six are true. Not five.

1. **It works on the real product**, driven on production — not asserted. A green suite is not
   proof; this campaign has 60+ findings that were green somewhere before they were found.
2. **A guard exists and has been proven RED** against the defect it protects, with a **positive
   control in the same run**.
3. **It was LOOKED AT** — frames at `360 / 393 / 768 / 1024 / 1280` × `EN / SW / ZH` for anything
   a player or operator sees. ⚠️ **360 is not optional**: `E-196` was broken at 320–390 and
   invisible because 393 is the one phone width where it measured clean.
4. **`npm run test:all` is green with `DATABASE_URL` UNSET**, run **before that unit's commit**.
   `test:responsive` and `test:motion` need a live server — run them against one, never write
   them off.
5. **Docs moved in the same commit** — the file that *owns* the subject.
6. **The register row is filed** in [`LIVE-QA-CAMPAIGN.md`](LIVE-QA-CAMPAIGN.md) §6 with the
   measurement, and the ledger in §1 below is ticked **in the commit that ships it**.

💰 **And the handoff states the money position first and plainly**, whether or not a shilling moved.

### §0b · THE ZERO-FLAW GATE — mechanical, run at the end

| # | Check | How |
|---|---|---|
| 1 | No suite red | `npm run test:all` with `DATABASE_URL` unset, then `test:responsive` + `test:motion` against a live server |
| 2 | Every RED harness catches every mutation | `npm run red:all` — and READ its report; it is a *reporting* runner |
| 3 | No orphan scripts | `npm run test:orphans` |
| 4 | No stale anchors | `npm run test:red-anchors` |
| 5 | Typecheck clean **and the suites actually RAN** | `npx tsc --noEmit` — ⛔ `tsc` does not cover `.mts` |
| 6 | No doc claims something false | `npm run test:docs`, `test:design-one-door`, `test:tracker-hygiene` |
| 7 | Working tree clean **of your own work** | `git status --short` — ⚠️ see §0c, some files are not yours |
| 8 | Production verified by re-running the instrument | `npm run qa:landmark-seal` · `node scripts/live/ops/census.cjs` |

⛔ **AND THE JUDGEMENT CHECK, ASKED OF EVERY GUARD YOU WRITE:** *"would this still pass if the
feature were absent?"* If yes, it is not a guard.

### §0c · READ THIS BEFORE YOUR FIRST COMMAND

- 🔴 **THE CHECKOUT IS SHARED.** A second session works here. `RAILWAY.md`,
  `docs/reports/*`, `Ocean Logo/` and `scripts/live/ops/house-money-census.cjs` are **NOT YOURS**
  — leave them. ⛔ Never `git add -A`; name your paths. Their `npm install` empties
  `node_modules/.bin` under you and 154 suites "fail" with `'tsx' is not recognized` — read the
  first failure's TEXT before believing a mass failure, then `npm install`.
- 🔴 **E- IDS COLLIDE.** Both sessions filed `E-191` on 2026-08-24. The tie-break is written into
  [`SESSION-PROMPT-JAY-COMMENTS.md`](SESSION-PROMPT-JAY-COMMENTS.md) §2 ③: **the register is the
  authority — whichever finding has a ROW there keeps the id.** Highest id at close: **E-200**.
- ⚠️ **THIS LAPTOP'S CLOCK IS ~96 SECONDS SLOW.** Anything timed against a round boundary must
  read the server clock (`/api/health` → `timestamp`), never `Date.now()`.
- ⛔ **NEVER rewrite `LIVE-QA-CAMPAIGN.md` with a Python or node read-modify-write** (E-181 —
  it was truncated to 0 bytes). Use the editor tool. After every edit:
  `git diff --numstat docs/LIVE-QA-CAMPAIGN.md` must be small, and **bare-LF count must be 0**.
- ⚠️ **Git Bash rewrites a leading `/` in an env value** — `ONLY=/markets` arrives as
  `C:/Program Files/Git/markets`. Write `ONLY=markets`.
- ⚠️ **Backticks inside `node -e` are eaten by bash**, and inside a Workflow script they break the
  parse. Write the patch to a `.cjs` file in the scratchpad and run that.

---

## §1 · THE COMPLETION LEDGER — tick your row in the commit that ships it

| Order | Unit | What | Why here | Status |
|---|---|---|---|---|
| A | **E-200** · pool residuals | 13 of 19,972 settled pools non-zero | Money path. Do it first, while you are fresh | ✅ **2026-08-24 (s61)** — not a rounding rule: `market-service.ts:2925` fed the allocator a winner set filtered by SIDE ONLY, so a CASHED_OUT position whose stake had left the pool was counted as a winner, `remainder` went negative and the largest-remainder top-up was **skipped in silence**. Now `winnersForAllocation` (pure, exported). `test:payout-alloc` 31/0 · `red:payout-alloc` 3 caught / 0 missed. ⛔ No tolerance widened. The five `+1`s are STRUCTURAL (proven over 9,504 settlements, residuals `{0,1}`); the 7 negatives pre-date the 2026-08-11 fix |
| B | **E-177** · the unverified-payer seal | Nobody has watched an unverified player be PAID | Zero-money variant exists; it is the oldest open item | 🟡 **PRECONDITION MEASURED AND ABSENT — plan ruled, not yet run.** No QA-fleet account can reach the AML hold (richest **205,094**; all 20 = 1,592,593; wallets do not combine). The only four unverified accounts holding ≥1,000,000 are **all `role: ADMIN`**, and an ADMIN bypasses every domain check. ⭐ **Ali ruled: CONSOLIDATE, never mint** — debit 794,906 from the dormant `usr_7fe743ff94c535666a252ce0` (`+255777777776`, 0 positions, no audit activity ever), credit fleet `+255799000002` to exactly 1,000,000; net-zero platform-wide, both below `TWO_PERSON_THRESHOLD_TZS`. Then drive, assert the two rows share a `txnId`, reject the hold, reverse both. ⛔ Not started: it writes to the DB that was out of disk (**E-201**) |
| C | **Jay Unit D (#6)** | The date beside every timer | The commission's own next unit | ⬜ |
| D | **The two guide frames** | `cyc-paused.png` · `cyc-start-dialog.png` | ✅ **Ruled §5: scratch Postgres, never a live pause.** Build `--allow-paused`, localhost-only | ⬜ |
| E | ~~**E-194 naming**~~ | ~~Does a "3 min" chain say its real window?~~ | ✅ **RULED §5: NO CHANGE — CLOSED.** Nothing player-facing is false; both alternatives are worse. **No work owed** | ✅ |
| F | **E-195** ⏰ | The certificate renewal, from ~2026-09-15 | **A DATE, not a session.** Do not close it early | ⬜ |
| Z | **Close-out** | Register rows, handoff, gate §0b | | ⬜ |

**So the board is four units of work (A · B · C · D), one closed ruling (E), and one dated watch
(F).**

---

## §1b · THE STANDARDS EVERY UNIT IS BUILT TO — ⛔ not optional, and not a matter of taste

> **Ali, 2026-08-24:** *"development needs to stick to our design kit and standards of the
> project, with all respect to our structure and architecture."*
>
> ⭐ **Read [`../.claude/skills/50pick-standards/SKILL.md`](../.claude/skills/50pick-standards/SKILL.md)
> at session start — it is the always-on repo skill and it distils all of this.** ⚠️ It is not
> covered by `test:design-one-door`, which does not read `.claude/**` — that is exactly why its
> §3 pointer rotted for five days. **If it disagrees with the files below, the files win and you
> fix the skill in the same commit.**

### One door, and everything else is a record

⛔ **[`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) is the ONLY design rulebook.** Its §0 is the
filing law. Everything under `docs/design-system/**`, `docs/design-brief/**` and
`design-master-brief.md` is **RECORD, never rule** — the Authority says so twice, at §0 and at
*"Related — all RECORD, none of it rule"*.

⚠️ **But a record the CODE CITES BY NAME cannot be diverged from silently.** On 2026-08-24 the
round page's rail moved from `xl` to `lg` and the D3 record now carries a divergence note saying
so, because `page.tsx` cites D3 in its own header. **Diverge if the measurement says so — then
re-record it where the next reader will look.**

⛔ **A value in two places is a bug: delete one, do not sync both.**

### The kit, and the scales that are already closed

- **UI-kit only** — build from `src/components/ui/*` and `src/components/admin/*`. **Extend the
  kit; never hand-roll a one-off that duplicates a primitive.** ⚠️ `E-196` is what the other
  outcome looks like: one control with **two implementations**, so the defect lived in the copy
  nobody was editing and the first two repairs missed it entirely.
- **The type scale is CLOSED** — `text-micro` (10) · `caption` (11) · `label` (12) · `body-sm`
  (13) · `body` (14) · `body-lg` (16) · `title-*` · `display-*`. ⛔ **No `text-[Npx]`.** The
  ratchets are at **1823 arbitrary / 364 semantic** and **may only shrink**. §3's floor: **below
  12.5px is a LABEL, not prose** — lift it onto the ladder or make it a real microlabel
  (UPPERCASE + tracking).
- **The spacing scale is OVERRIDDEN and will surprise you** — `gap-2` is **12px**, `--sp-3` is
  **12px**, and `h-7` renders **40px**, *below* the tap floor. ⛔ Never assume a Tailwind default.
- ⚠️ **Two radius scales disagree on purpose** — `rounded-md` is 8px while `--r-md` is 12px.
  Ali deliberately deferred bridging them; do not "tidy" it.
- **Tap floor `--tap-min` = 40px**, and money controls carry **44**. A density change may never
  drop below it.

### One home per fact — the rules with a single definition

| the fact | its ONE home | ⛔ never |
|---|---|---|
| money formatting | `formatTzs` / `formatTzsCompact` | a local `toLocaleString()` — that is `E-192` ② |
| the side words | `src/lib/side-label.ts` (`outcomeWord`) | a local `side === "YES" ? …` ternary, or omitting `productLine` |
| a rate or a limit | [`RULES.md`](RULES.md) | restating a rate anywhere else |
| filtering | the kit's `FilterPill` | a ninth hand-rolled rail |
| "is this control reachable" | `scripts/live/clip.mjs` | a second overflow rule |
| the round's phase | `roundPhase` / `handoverClock` / `resultClock` | re-deriving from instants at a call site |

### Architecture — where a decision is allowed to live

⭐ **A rule a suite must hold must be a PURE, EXPORTED function.** `roundPhase`, `handoverClock`,
`chainDurationCaution` and `CLIP_PROBE` all exist for that reason. ⛔ **A decision that lives only
inside a server component's render is a decision nothing can drive** — that is why
`chainDurationCaution()` was lifted out of `admin/updown/page.tsx` on 2026-08-24 before it was
guarded.

- **Persistence goes through the DAL** (`src/lib/server/*-dal.ts`). Read
  [`DATA-LAYER.md`](DATA-LAYER.md) before touching any of it.
- **The console and the write path must agree.** `createChain` refuses what the form greys, from
  the same function — *"a console that greys an option the server would still accept is the
  defect, not the fix."*
- **B7 landmarks** — exactly one `<main>`, id `main-content`, width through `PageContainer tier`.
  ⚠️ `/admin` is exempt from the measure tiers; its width is capped once in `admin/layout.tsx`.
- **i18n** — every PLAYER string through the dict (**1918 keys × 3 locales**). ⚠️ **The admin
  console is deliberately NOT dict-driven** — measured, 4 of 149 admin `.tsx` use `useT`, against
  385 uses of the `sw=` bilingual prop. **Do not create a second convention inside one directory.**

### The gates that police all of it

`test:design-frozen` · `test:design-one-door` · `test:type-scale` · `test:ui-consistency` ·
`test:measure` · `test:tap-target` · `test:labels` · `test:i18n` · `test:integrity` ·
`test:rule-honesty` · `test:rate-copy` · `test:admin-act-gate`

⛔ **When one of these goes red, the product is wrong until proven otherwise.** Three times on
2026-08-24 a gate was right and the instinct was wrong. ⚠️ **And when a gate is red because a
defect was FIXED, invert the gate — never delete it** (`test:design-one-door`, `E-192` ①).

⭐ **Finally, the five lenses, before you call anything done:** integration · UI/UX · architect ·
manager · player. A change that satisfies four and fails the fifth is not finished.

---

## §2 · UNIT A · E-200 — THE POOLS THAT DID NOT RETURN TO ZERO

**Measured on production 2026-08-24**, by `node scripts/live/ops/pool-residual.cjs`:

```
13 of 19,972 settled markets carry a residual   (0.065%)
 7 NEGATIVE — the pool paid out MORE than was staked: six at −1, one at −2
 5 at +1, one at +15  (mkt_c97209dbe6e1fa584472, a long-form MARKET)
net residual across every settled pool ever: +12 TZS
```

✅ **THE LEDGER IS NOT BROKEN, and that is checked, not assumed.**
`node scripts/live/ops/house-money.cjs` reports *"every ledger entry ever written sums to TZS 0"*;
`census.cjs` reports 0 negative wallet components, 0 stranded, 0 stuck withdrawals; and
`npm run test:trial-balance` is green. **These are pool-column roundings, not money that went
anywhere** — *"the ledger is the arbiter, not the pool"*.

⚠️ **BUT IT IS EXACTLY THE CLASS THIS PROBE EXISTS FOR.** Its own README records that it found
the commission-rounding defect **four money suites were green over**, because *"the error hid in a
self-cancelling POOL/COMMISSION pair, so the aggregate balanced while the component did not"* —
and an aggregate that balances is precisely what is being reported above.

**Do.**
① **Start at `mkt_c97209dbe6e1fa584472` (+15)** — the outlier, and the only one large enough to
carry a diagnosable cause. Use `node scripts/live/ops/txn-forensics.cjs` and the market's own
`feeSnapshot`. ⛔ **Read the fee model off the market, never assume** — production runs BOTH
(`capped-commission` and `loser-share`), and assuming the wrong one is finding E-48.
② Reproduce the arithmetic in a suite against `src/lib/payout.ts` — pure, no DB.
③ Only then decide whether the residual is a rounding rule that should change. **A change to
`payout.ts` is a money-path change**: it needs a RED proof against settlement arithmetic and a
positive control that a correct settlement still ties to the shilling.

**Guards.** Extend `npm run test:payout-alloc` / `test:fee-model` / `test:loser-share-fee`, and
prove RED. ⛔ **Do not "fix" it by widening a tolerance** — a self-cancelling pair is what hid it
last time.

**Evidence required.** `pool-residual.cjs` before and after, with the count AND the denominator;
`house-money.cjs` still summing to zero; `test:money-invariants` green.

---

## §3 · UNIT B · E-177 — NOBODY HAS WATCHED AN UNVERIFIED PLAYER BE PAID

🔴 **OPEN BY ALI'S DECISION, NOT BY FAILURE.** He waived the real-money seal:
*"proceed without this real test, if anything happens we detect later in live testing."*
So three things are unproven by anything but a DB read: **the payout completes** ·
**`withdraw.initiated` carries `kycStatus`** · **`withdraw.unverified_payer` lands with a matching
`txnId`**.

🔑 **A ZERO-MONEY VARIANT EXISTS AND IS THE WHOLE POINT OF THIS UNIT.** A gross request of
**≥ TZS 1,000,000** returns at the **AML hold** *before any gateway adapter is touched* — so both
audit rows are written while **nothing leaves the platform**. It also proves the `B × I` row.

**Do.** Drive it on production with a QA-fleet account that is **not** identity-verified, through
the real withdraw flow. Assert the two audit rows exist, carry `kycStatus`, and share a `txnId`.
Photograph the refusal the player sees. ⛔ **Do not promote the account or change RBAC to make it
work** — the unverified state IS the test.

⚠️ **Unit B of the Jay commission widened two OPERATOR paths and they are disclosed, not patched:**
`retryWithdrawalAction` / `bulkRetryAction` call `withdraw()` directly, bypassing the route-level
payout pause and session revocation. `withdraw()` still has **no `user.status` and no
self-exclusion check**. See `docs/BOARD-DISCLOSURE-B-E.md` §6.

---

## §4 · UNIT C · JAY UNIT D (#6) — THE DATE BESIDE EVERY TIMER

Pick up [`SESSION-PROMPT-JAY-COMMENTS.md`](SESSION-PROMPT-JAY-COMMENTS.md) §1 at **Unit D**, then
E–M in that order. Its ledger is honest now: **Pre-flight · A · B · C are ✅**, backfilled from
evidence on 2026-08-24.

⚠️ **D touches a shared formatter, which is why it is next** — land it before more surfaces exist.
⛔ **One formatter, one home.** `formatTzs` is the only money formatter; a local
`toLocaleString()` on a money screen is `E-192` ②. The same rule applies to dates.

---

## §5 · THE TWO THAT NEEDED A DECISION — **BOTH ARE NOW RULED. Do not re-open them.**

> Ali, 2026-08-24: *"for questions that require my decision I want you, based on the whole
> platform and what is suitable and more perfect end to end, to take these instead of me."*
> So they are taken, and each ruling is argued from a measurement rather than a preference.
> ⛔ **A ruling you disagree with is re-opened with NEW DATA, never with a fresh opinion.**

### D · The two guide frames — **RULED: scratch Postgres, never a live pause**

⛔ **The real-pause option is refused.** Pausing means stopping AI poll posting and AI resolving
on the live platform — a service interruption for every player, to take a photograph. There is no
version of that trade this platform should make, and `qa:cycles-guide-shots` already refuses it in
code.

✅ **Do it on a scratch Postgres on Railway** — zero player impact, and it leaves behind a
repeatable rig rather than a one-off:

1. Provision a throwaway Postgres in the Railway project; take its **public** URL.
2. `DATABASE_URL=<scratch> npx prisma migrate deploy`
3. Seed a paused ledger — two closed $100 cycles and one spent — so the Start dialog is reachable.
4. `npm run build && npx next start` against the scratch URL. ⛔ **Never point a local production
   build at the LIVE database.**
5. `BASE=http://localhost:3000 npm run qa:cycles-guide-shots -- --allow-paused`
6. `node scripts/generate-pdfs.mjs`, rasterise, **and LOOK at the two new frames**.
7. **Delete the scratch database.**

**Build into the tool:** `--allow-paused` must **refuse a non-localhost `BASE`**. The flag is for
a rig, and a flag that can be pointed at production is a pause waiting to happen.

### E · E-194 naming — **RULED: NO CHANGE. The item is CLOSED.**

**Nothing player-facing is false, and that was checked rather than assumed.**

| what the player meets | is it true? |
|---|---|
| the `3 MIN` chip | ✅ it names the **variant**. The round genuinely is 3 minutes open→lock |
| `BETTING CLOSES IN 01:29` | ✅ a live countdown to a real instant |
| between rounds, `udNextMatchSoonBody` | ✅ *"The next round opens as soon as its opening price is confirmed"* — it names the actual cause of the wait |
| between rounds, `udNextMatchLiveBody` | ✅ *"The next match is already under way"* fires only when a successor EXISTS — and a successor that exists is bettable, because it is created at the moment its price confirms |

⛔ **AND BOTH ALTERNATIVES ARE WORSE, on the platform's own terms:**
- **Renaming to the reachable window** (`~1.5 min`) would be **false in the other direction** — the
  round really is three minutes from open to lock — and it would break the
  **3/5/10/15/30/60 lattice**, which exists because those lengths divide the day so rounds of
  different lengths share one price reading. A naming fix that breaks an engine invariant is not a
  fix.
- **Retiring the 3-minute chain** removes the product's fastest game to solve a problem that was
  never in the product. **The falsehoods were all operator-facing, and all four are already
  corrected** (`updown-operator-guide.html`, `UPDOWN-SPEC.md`, `runbooks/updown-runbook.html`,
  `RULES.md`).

✅ **What the platform owed here, it now has:** the console states the caution per chain
(`chainDurationCaution()`), the operator guide states the real reachable window with its measured
figures, and `RULES.md` no longer promises a cancellation right the short chains cannot deliver.

⚠️ **What remains true and is a WATCH, not a task:** at p95 a 3-minute round is reachable for
**73.2s (40.7%)**. If `handover-gap-census.cjs` ever shows the birth lag drifting past ~120s, the
3-minute chain stops being viable and this ruling should be re-opened **with that measurement**.

---

## §6 · UNIT F · E-195 ⏰ — A DATE, NOT A SESSION

🔴 **CHECK FROM ~2026-09-15. THE CERTIFICATES EXPIRE 2026-10-15.**

On 2026-08-24 `www.50pick.tz` was flipped to **Proxied** with SSL/TLS **`Full (strict)`**. Railway
renews the origin certificate by answering an ACME challenge **at the origin**, and for `www` that
challenge now arrives **through Cloudflare** — a path that has never carried a renewal.

⛔ **The failure is total, silent and dated.** Under `Full (strict)` Cloudflare refuses to serve a
hostname whose origin certificate is invalid: not a warning banner, **the whole site gone, on a
date, with no deploy and no commit to blame** — and every page, suite and health probe stays green
through the entire month in which it is still fixable. ⚠️ `www` is the host in
`NEXT_PUBLIC_APP_URL` **and** `PAYMENT_WEBHOOK_URL`, so deposits are in the blast radius.

✅ **Guarded** by §F of `scripts/pre-deploy-live-check.mjs`, which fails at **21 days** — *"a check
that goes red the day the site dies is a headstone, not a gate"* — and dials the **ORIGIN**, not
the hostname, because once `www` is proxied the certificate that answers is Cloudflare's own and
is never at risk.

▶ **If renewal has not happened:** revert `www` to DNS-only, let Railway renew direct, re-proxy.
See [`LIVE-HOSTING-STATUS.md`](LIVE-HOSTING-STATUS.md).

---

## §7 · THE TRAPS THIS BOARD WAS BUILT ON — every one paid for on 2026-08-24

⛔ **Read these before you write a probe. Each cost a deploy or a wrong conclusion.**

| | |
|---|---|
| **`page.evaluate` does not call a string** | Playwright evaluates a string `pageFunction` as an EXPRESSION and returns **`undefined`** — silently. `E-191`: `ok("nothing clipped", !m \|\| m.clipped.length === 0)` passed **unconditionally** at 15 cells. ⛔ **A defensive `\|\|` on a measurement is how a check stops being one.** Pass a real function. |
| **Padding frees zero on a centred button** | `.btn` is `justify-content: center`, so content that exceeds the box has already overflowed the padding box. Driven on production: 20px → 12px moved the overflow **11 → 11**. |
| **A 0px flex child is a deficit being paid** | The bet button's icon measured **0px at every width including 1920**. It was absorbing half the shortfall, so the defect read as 11px when it was ~21. Fixing it makes things *worse* until the width is fixed — ship both together. |
| **393 is the clean cell of a broken band** | `E-196` was live at 320–390 and the instrument sampled 393, the one phone width that measures 0. **A width set that samples the clean cell reports the band clean.** |
| **One control, two implementations** | The signed-out board card renders its **own** UP/DOWN buttons in `updown-card.tsx`; the first repair went into `updown-stake-controls.tsx`, which a guest never loads. **Confirm the population that sees the defect renders the file you are editing.** |
| **A guard whose POPULATION is blind** | `test:responsive` had exactly the right rule and reached 1024 — but signs in via `/auth/demo`, which 404s in any production build, so it ran as a GUEST, and the two controls that clip only exist when signed in. **Its rule was never blind; its population was.** |
| **Overflow ≠ reachability** | `body { overflow-x: clip }` makes `documentElement.scrollWidth - clientWidth` read **0** over a control severed 30px off the screen. Ask whether the control has a **scrollable ancestor** — [`../scripts/live/clip.mjs`](../scripts/live/clip.mjs). |
| **An instrument pinned to one machine** | `E-199`: three of four money probes hardcoded `C:/kipindi-main` and had **never run** from this checkout. The fix existed in `q.cjs` and was propagated nowhere. ⛔ **After fixing a class, grep for the pattern in the same commit.** |
| **A cross-check that is a constant** | `census.cjs` printed a frozen `users=71 marketsLive=41 marketsResolved=744` as its proof-of-production. It fetches now. |
| **An assertion the fix invalidates** | `test:design-one-door` was red **because a defect had been repaired** — it demanded the file count that was correctly deleted. Invert such a check; do not delete it. |
| **A list of suites is not a gate** | `E-192`: a session closed green having named fourteen suites, none of them `test:all`. **The gate is the runner that enumerates them.** |

---

## §8 · THE MONEY POSITION YOU INHERIT — verified 2026-08-24 at close

| | |
|---|---|
| `census.cjs` | ✅ **MATCH** — db and `/api/health` both `users=100 · markets_live=54 · markets_resolved=19009` |
| Wallets | **0** negative components · **0** stranded · **0** stuck withdrawals |
| Ledger | **every entry ever written sums to TZS 0** |
| Escrow | 427 pool accounts holding **TZS 1,507,396** of player stakes |
| Up & Down | **0** rounds past boundary +10min unsettled · 19 chains, **16 RUNNING** |
| QA fleet | 20 accounts, **TZS 1,592,593** — alive on purpose |
| Residual | **+12 TZS** across every settled pool ever → Unit A |

⚠️ **One market carries `settledAt = NULL` and that is CORRECT** while its 24h objection window is
open. Read it as stranded and you will file a false money defect — `census.cjs` separates the two
for exactly that reason.
