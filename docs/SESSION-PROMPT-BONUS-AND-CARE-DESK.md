# THE BONUS GAP AND THE CARE DESK — what is left, and why each one is still open

> **Supersedes `SESSION-PROMPT-FINISH-THE-BOARD.md`.** Its Unit B (**E-177**) is **SHIPPED and
> driven on production** — see §8. Everything still open is carried here with its state
> **re-derived, not copied**. If the two disagree, **this file is newer and this file wins** — but
> check `docs/LIVE-QA-CAMPAIGN.md` §6 first, because **the register outranks both**.
>
> ⛔ **AND READ `docs/READ-TIERS.md` §1a BEFORE UNIT B.** That unit's own §1 was wrong on three of
> five claims, and §1a is the correction. A premise labelled "measured" is a claim about a moment.

---

## §0 · WHAT "DONE" MEANS HERE

A unit is done when **all five** are true. Four is not four-fifths done; it is not done.

1. It is **driven on production** and you **looked at the frames** — 360 / 393 / 768 / 1024 / 1280
   × EN / SW / ZH. **360 is not optional and neither is ZH.**
2. A **guard** holds the rule, and you **proved it RED first** — by mutation, with a **positive
   control in the same run**.
3. **Docs are updated in the SAME commit as the code**, never a follow-up.
4. **One push**, then **one production verification that the thing actually works live** — not that
   the deploy succeeded.
5. Your row in **§1 is ticked in the commit that ships it**, and a register row is filed in
   `docs/LIVE-QA-CAMPAIGN.md` §6.

⛔ **"BLOCKED" IS NOT AN EXIT.** It is an exit only after you have measured *what* blocks it and
written the measurement down. ⭐ **Session 66 turned two "blockers" into work by measuring them:**
E-213's five NOT RUN legs were blocked on a **machine**, not the product; and unit K's D5 —
"AUDITOR and SUPPORT hold no account on production" — was **a state to CREATE**, not a wall.

---

### §0b · THE ZERO-FLAW GATE — mechanical, run it at the end

```
npx tsc --noEmit                 # ⛔ NOT through a pipe — see §7.1
npm run build
npm run test:all                 # DATABASE_URL unset
npm run test:red-anchors         # the ratchet may only SHRINK
npm run test:orphans             # 193, may only shrink
npm run test:read-tiers          # 52/0 · includes the §7 drift ratchet, ceiling 0
npm run red:read-tiers           # 14/14 caught · files restored · green after restore
npm run test:player-page-reads   # 15/0
npm run test:docs · test:integrity · test:design-one-door · test:tracker-hygiene
npm run qa:landmark-seal         # on production
node scripts/live/ops/census.cjs # must print ✅ MATCH
node scripts/live/ops/house-money.cjs   # must print "sums to TZS 0"
npm run ops:backup-status        # state the backup's OWN timestamp, never an age
```

⚠️ **`test:all` reports expected failures with no server** (`test:responsive`, `test:motion` need a
live one). Anything else red is yours. ⛔ **A list of suites you ran is not a gate — the gate is the
runner that enumerates them.**

---

### §0c · READ THIS BEFORE YOUR FIRST COMMAND

1. **`git pull`, then check whether `prisma/schema.prisma` moved** — ⛔ **not** whether
   `package-lock.json` moved. `postinstall` only fires on `npm install`, and a schema change moves
   neither the lock file nor any dependency. Session 66 lost its first hour to a generated client
   two days older than the schema, with `tsc` failing in a file nobody had touched.
   ```
   git diff --stat HEAD@{1}..HEAD -- prisma/schema.prisma   # moved? then:
   npx prisma generate
   ```
2. **Read `docs/LIVE-QA-CAMPAIGN.md` §0, then the TOPMOST `RESUME AT` block in §6b.** Only the
   topmost is current truth; everything below it is evidence, not instruction.
3. **Money position FIRST**, re-derived — never quoted from the handoff.
4. ⚠️ **`.env.qa.local` was re-minted on laptop A (`F:`) on 2026-08-26.** Laptop B's copies are
   **dead**. Copy the file; do not re-mint again or the two machines take turns breaking each other.

---

## §1 · THE COMPLETION LEDGER — tick your row in the commit that ships it

| # | Unit | Origin | Why it is next | State |
|---|---|---|---|---|
| A | **E-224** · a bonus cleared at zero risk | §6 register | **RULED, not built.** Ali delegated the call; the answer is written and waiting. It is the only OPEN money defect on the board | ⬜ |
| B | **Jay unit K's other half** · the care desk + mailbox | Jay #12 · #13 | READ_TIERS is shipped and proven; the ticket system is the larger half and **D2 binds it** | ⬜ |
| C | **Jay unit L** · new markets | Jay §1 | ⛔ **one asset per commit**, each carrying its own measurement | ⬜ |
| D | **Jay unit M** · per-bet UD notifications | Jay §1 | behind a switch, **default OFF** | ⬜ |
| E | **E-195** ⏰ the certificate | infra | ⚠️ **a DATE, not a task** — see §6 | ⬜ |

---

## §2 · UNIT A · E-224 — A BONUS CLEARED HAVING RISKED NOTHING

### What it is, in one real example

A player holds a **2,000 bonus at 1× turnover**. They stake the whole 2,000 on a real market.
**At the moment of placement** the platform counts the turnover, marks the grant **FULFILLED**, and
credits **BONUS_CREDIT 2,000** as real withdrawable cash. Then the market comes back **VOID** —
nobody took the other side — and the stake is **refunded in full**.

**The player ends 2,000 up, with a cleared bonus, having risked nothing.** Measured on production
2026-08-26 by `qa:bonus-j`, caught in the act.

⚠️ **It is not limited to a VOID.** A round can resolve normally and the POSITION still be voided
by the one-sided rule.
⚠️ **The magnitude is the multiplier:** at 1× the whole bonus is free; at the 5× default only the
final bet is.

### Ali's ruling — delegated, and answered 2026-08-26

> *"protect us, find the best solution that makes sense with the overall terms of our product,
> without allowing players to take advantage of a logic gap."*

⭐ **A RETURNED STAKE DOES NOT DISCHARGE A WAGERING OBLIGATION — AND NOTHING IS EVER CLAWED BACK.
THE BONUS IS RE-LOCKED, NOT TAKEN.**

⛔ **Both obvious fixes are wrong, and knowing why is the design.** *Clawing back* punishes a player
whose market merely went one-sided through no fault of theirs, and it reverses a payment — which is
what `reverseWagering`'s *"its cash is real"* rule rightly forbids. *Doing nothing* leaves the gap.
**Re-locking is neither: the player keeps every shilling, and the obligation simply is not
discharged by a wager that, in the end, did not happen.** The terms say the bonus must be WAGERED
before withdrawal; a refunded bet was not, in the end, a wager — the money came back.

### The mechanics, precisely, so the build has no room for interpretation

1. **Turnover still accrues at BET PLACEMENT** (`market-service.ts:1266`) — unchanged. A progress
   bar that only moves on settlement is a worse product, and this fix does not need it.
2. When a position is **VOIDED or REFUNDED**, its stake is **subtracted from that grant's turnover
   progress** — the accrual is reversed exactly as the money was.
3. If that drops progress **below the requirement**:
   - **(a) bonus NOT yet credited** → the grant returns to `IN_PROGRESS`. **No money moves at all.**
     This is the overwhelmingly common case.
   - **(b) bonus ALREADY credited** → move the credited amount **out of withdrawable balance and
     back into the locked bonus balance**. ⛔ **A RE-LOCK, NOT A DEBIT: the player's total holdings
     are unchanged to the shilling** — only the *withdrawable* portion moves, and the audit row must
     say so in those words.
4. ⚠️ **THE EDGE CASE, NAMED SO IT IS NOT DISCOVERED LATER:** if the credited bonus has **already
   been withdrawn** before the void lands, there is nothing to re-lock. **Clamp to what is
   available**, record the remainder as an **outstanding wagering obligation on the account**, and
   block further grants until it clears. ⛔ **Never drive the balance negative.**

⭐ **Why this beats raising the multiplier, which was the tempting answer:** a 5× floor only
*bounds* the leak to one bet — it does not close it, and it makes every honest bonus harder to clear
in order to punish a hole the abuser still gets to use. **This closes it at every multiplier,
including 1×, while making the honest player's bonus no harder to earn.**

### How it gets proven

**RED mutations** (declare them in `scripts/anchors/bonus-void.anchors.mjs`):
`void-still-fulfils` · `clawback-instead-of-relock` · `relock-drives-balance-negative` ·
`progress-not-reversed` · **and a positive control** — `every-void-relocks`, the over-correction
where an ordinary settled loss also re-locks.

**Then the live drive.** Stake into a real market that goes one-sided, and read **every money claim
from `Wallet` / `BonusGrant` / `Transaction` — never from a rendered number.**
⚠️ **`sequentialBonuses` is `true` in production** (measured: `SystemConfig` holds no bonus row, so
`DEFAULT_BONUS_CONFIG` **is** the live value), so a fresh grant lands **QUEUED** behind an existing
one and can never fulfil. Cancel the stale grant and let `activateNextQueued` promote it.

---

## §3 · UNIT B · JAY UNIT K'S OTHER HALF — THE CARE DESK AND THE MAILBOX

⭐ **READ_TIERS IS DONE AND PROVEN — do not rebuild it.** `qa:read-tiers` **18/0** on production:
the axis, the `RoleReadGrant` table, `<Sensitive>`, the audited reveal, the `/admin/players/[id]`
wiring, and the **Reads tab** on `/admin/roles`. Both personas exist (`support` `712000108`,
`auditor` `712000109`).

⛔ **WHAT IS LEFT IS THE TICKET SYSTEM (#12) AND `msaada@50pick.tz` (#13), AND NEITHER EXISTS.**

**D2 BINDS THEM, AND WHOEVER BUILDS #13 DOES NOT GET TO RE-DECIDE IT.** `docs/READ-TIERS.md` §7
carries it as an **acceptance condition**: **#13 is not DONE until its ticket view resolves
`identity.contact` through `canRead`.** A ticket UI that renders a raw `from:` address defeats the
console masking entirely, and the two would then disagree about the same field.

⚠️ **`<Sensitive>` is a SERVER component.** A client-rendered list cannot use it — mask at source
with the registry's own mask function, the way `/admin/kyc/[id]`'s checklist does, and the drift
ratchet (`test:read-tiers` §7) will recognise it as wired.

⚠️ **B × K applies:** a support agent must see a coherent record for an account with **no KYC
submission at all**, which is now the majority case.

📌 **Two cells to revisit, both recorded and neither urgent:** `region` sits in `identity.personal`
so it costs ADMIN a click (§3.5) — moving it would need a **fifth class**, and §3.1 caps it at four:
*"a fifth must DISPLACE one of these."* And GROWTH's `identity.contact` has **no precedent behind
it** (§4b).

---

## §4 · UNIT C · JAY UNIT L — NEW MARKETS

⛔ **ONE ASSET PER COMMIT**, each carrying its own measurement.
⚠️ **Watch the refund rate.** SOL/USD is already in the catalogue as exactly that lesson — see
`updown-source-pinning-and-proposals`. A market nobody takes the other side of is not a market; it
is the E-224 gap's supply line.

---

## §5 · UNIT D · JAY UNIT M — PER-BET UP & DOWN NOTIFICATIONS

Behind a switch, **default OFF**. ⚠️ The comms rules apply in full: `docs/` comms certification —
⛔ an unescaped `heading()` once put a player's name into the inbox **as markup**.

---

## §6 · THE DATED WATCH — ⏰ not a task you can finish today

**E-195 · the certificate.** `www` sits behind Cloudflare at `Full (strict)`; the origin cert
renews through a path that **has never carried a renewal** and expires **2026-10-15**.
⛔ **Check from ~2026-09-15.** The failure mode is *the whole site, on a date, with no deploy to
blame*.

---

## §7 · THE TRAPS SESSION 66 PAID FOR — do not pay for them again

**7.1 ⛔ NEVER PIPE A GATE THROUGH `| tail`.** `npx tsc --noEmit | tail` returns **tail's** exit
code. Session 66 read `exit 0` off a run that was failing, and built on it. Redirect to a file and
check `$?`, or `set -o pipefail`.

**7.2 ⛔ A HYPHENATED JSX ATTRIBUTE IS INVISIBLE TO `tsc` AND SILENTLY DROPPED.** `<Select
aria-label="…">` compiles clean; the kit's prop is `ariaLabel`. The control shipped announcing
itself as **"Select…"**, and the guard that policed it located the control by that same attribute —
so it matched **nothing**, forever. Guarded now by `test:ui-consistency` → `dropped-aria-label-prop`.

**7.3 ⛔ ON THIS PLATFORM A MONEY-COMMIT CONTROL IS ALWAYS TWO STEPS.** Three separate runs died on
it in one session: staff promotion opens a **ConfirmModal** (`role="alertdialog"`, **not**
`"dialog"`); the withdraw button *"Confirm withdrawal"* is a **TRIGGER** whose dialog commits under
**"Send funds"**; AML *Reject* is a **TOGGLE** that expands an **inline** reason field with a
separate `Submit` — **no dialog ever appears**.

**7.4 ⛔ A RESTORE MUST BE IDEMPOTENT.** Session 66's E-177 restore replayed a **fixed amount** and
over-credited a wallet by 794,906, because an earlier `finally` had **half-succeeded** — its
debit was correctly refused (the money was in `hold`) while its credit went through.
⭐ **Read the CURRENT state, compute the DELTA**, and refuse to touch one account while the other
is still wrong.

**7.5 ⛔ A GUARD THAT ONLY CHECKS THE WIRED SURFACE IS NOT COVERAGE.** 46 checks, 13 RED mutations
and an 18/0 live drive were **all green** while the read axis governed **one page out of four**.
Every one asked *"is the wired surface correct?"* — none asked *"which surfaces should be wired and
are not?"* ⭐ **A cross-cutting rule needs a ratchet whose POPULATION IS THE WHOLE APP** — now
`test:read-tiers` §7, over 153 admin `.tsx` files, ceiling 0, every field **wired or reviewed with
a reason**.

**7.6 ⛔ A GUARD AGAINST AN APPEND-ONLY LOG NEEDS A RUN BOUNDARY.** *"Does a `pii.revealed` row
exist for this player?"* passed for ever on the row the **first** run wrote — the audit log is
HMAC-chained and rows never age out. **Snapshot before, assert on the delta.**

**7.7 ⚠️ EXPECT YOUR OWN DETECTOR TO CRY WOLF, AND FIX THAT BEFORE SHIPPING IT.** The drift ratchet's
first version reported **13 hits of which NINE were false positives** — already-masked `slice` tails,
the platform's own support address, an aggregation that renders no player. A detector that condemns
correct code gets deleted.

**7.8 ⚠️ VERIFY THE PREMISE, EVEN WHEN THE DOC SAYS "MEASURED".** READ-TIERS §1 was titled *measured*
and was wrong on **three of five** claims — the code had moved under it. `test:player-page-reads`
now pins it so it cannot rot again.

---

## §8 · WHAT SHIPPED IMMEDIATELY BEFORE YOU — do not re-derive these

- **E-225** — the dropped `aria-label`, fixed and guarded platform-wide (§7.2).
- **Jay unit H** — driven end to end on production for the first time, `qa:recategorise` **13/0**.
  Five of its legs had never run; they were blocked on a **machine**, not the product.
- **Jay unit K's READ_TIERS half** — six increments, `qa:read-tiers` **18/0**, sealed against a
  modified client: ADMIN's real reveal request replayed from SUPPORT's session is refused **naming
  the class**, with the address nowhere in the response.
- **D5** — `SUPPORT` and `AUDITOR` minted on production through the **real** flow (registered on the
  sign-up form, promoted by a real ADMIN session with a reason). **0 → 1 each.**
- **E-177** — ⭐ **the unverified-payer seal, watched firing for the first time.** Both audit rows on
  the **same transaction**, `kycStatus: NOT_STARTED`, and **nothing left the platform**. Fully
  restored: donor 1,000,000 · fleet:02 205,094 · hold 0 · ledger **TZS 0** · `SYSTEM:ADJUSTMENT`
  **unchanged in total** while its entry count grew — which is what proves the moves cancelled
  rather than minted.
- **Housekeeping** — the case-colliding duplicate PDF deleted, `house-money-census.cjs` committed
  after 15 days in limbo, and laptop A's six persona passwords re-minted and **proven by signing
  in**. ⛔ **Laptop B's copies are dead.**
