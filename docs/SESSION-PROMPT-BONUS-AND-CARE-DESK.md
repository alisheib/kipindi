# THE BONUS GAP AND THE CARE DESK — what is left, and why each one is still open

> 🔴 **RE-SCOPED 2026-08-27 BY A MEASURED AUDIT. THE LEDGER IN §1 IS THE ONLY LEDGER; §0e IS THE
> REASONING. TWO OF THE FIVE UNITS BELOW ARE DROPPED AND THEIR SECTIONS ARE STAMPED "DO NOT
> BUILD".** Every unit was re-measured on production and adversarially challenged. **Not one
> survived at the size it was written**, and the two items worth most — `E-226` and `E-227` — were
> **not on the ledger at all**; they were found by checking whether the ledger was true. ⛔ **The
> unit sections §2–§6 were written BEFORE that audit and several of their claims are now known to
> be false — the banner under each heading says which.** Read §1 and §0e before any section.

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

### §0d · ⛔ RUNNING THIS ON A DIFFERENT MACHINE — read before anything else

**Everything in the repo travels with `git pull`. Five things do not, and one of them will silently
make every live drive lie to you.**

#### 🔑 1 · `.env.qa.local` — the only thing that CANNOT be pushed

It is gitignored (`.gitignore:9`) and holds **13 keys**. ⚠️ **An older note in
`docs/LIVE-QA-CAMPAIGN.md` §2 said "seven lines" — it has been corrected; count them, do not quote.**

```
ADMIN_LOGIN_PHONE          ADMIN_LOGIN_PASSWORD
QA_ADMIN_PASSWORD          ⛔ Ali's own console login — NEVER re-minted
QA_ALPHA_PASSWORD          QA_ECHO_PASSWORD
QA_GROWTH_PASSWORD         QA_TRADING_PASSWORD
QA_OFFICER_PASSWORD        QA_FINANCE_PASSWORD
QA_SUPPORT_PASSWORD        QA_AUDITOR_PASSWORD      ⭐ NEW 2026-08-26 (ruling D5)
PROD_DATABASE_PUBLIC_URL   ⛔ stored under THIS name, never as DATABASE_URL
RAILWAY_WORKSPACE_TOKEN
```

🔴 **THE SIX PERSONA PASSWORDS WERE RE-MINTED ON 2026-08-26, ON THE `F:` MACHINE, WITH ALI'S
EXPLICIT OK. EVERY OLDER COPY IS DEAD.** If the other machine still holds a file from before that
date, `alpha` / `echo` / `growth` / `trading` / `officer` / `finance` will all refuse.
⛔ **DO NOT RE-MINT TO FIX IT.** `ops-remint-qa-passwords.mts` ignores its arguments and re-mints
**all six**, so a second re-mint just moves the breakage back to the first machine and the two take
turns. ⭐ **Copy the one file.**

⚠️ **`QA_SUPPORT_PASSWORD` and `QA_AUDITOR_PASSWORD` are NOT in the re-mint tool's list**, so a
future re-mint leaves them alone — but it also cannot recreate them. They only exist in that file.

#### 2 · The rest of the setup, in order

```bash
git clone https://github.com/alisheib/kipindi && cd kipindi
npm install                       # postinstall runs `prisma generate`
npx playwright install chromium   # the live drivers drive a real browser
railway login && railway link     # pick: 50pick · production
# then copy .env.qa.local into the repo root — see above
railway run -s 50pick -- node scripts/live/ops/mkenv.cjs   # writes scripts/live/ops/.env
```

⚠️ **Node 24.x** (`engines` pins it; production runs 24.19.0).
⚠️ **`scripts/live/ops/.env` is gitignored and machine-local** — `mkenv.cjs` rewrites the DB host
onto the public TCP proxy and **asserts the rewrite happened**, refusing to write a file that still
points at the internal host. ⛔ The `DATABASE_URL` Railway injects is `postgres.railway.internal`
and resolves nowhere off-platform — **every read through it silently returns DEFAULTS.**
⚠️ **Saved Playwright sessions do not travel.** They regenerate on first sign-in.

#### 3 · ⭐ PROVE THE MACHINE IS READY — do not assume it

Run these four and read the answers. **Each one fails loudly rather than quietly.**

```bash
node -v                                    # 24.x
node scripts/live/ops/census.cjs           # must print ✅ MATCH — three numbers agreeing with /api/health
npm run qa:personas                        # every persona signs in, or names the one that does not
npm run test:read-tiers                    # 52/0
```

⛔ **`census.cjs` printing ✅ MATCH is the check that matters**, because it cross-checks
`users`/`marketsLive`/`marketsResolved` against `/api/health`. **Three matching numbers is what
proves you read production and not a default.** A silent default-read has cost this campaign a whole
session before.

⚠️ **If a persona refuses, the diagnosis costs ONE attempt and no database:** production puts the
reason in the URL — `…/auth/login?identifier=712000101&error=wrong_credentials`. That means the file
is stale — **copy it, do not re-mint.**

#### 4 · ⛔ AND CHECK THE SCHEMA, NOT THE LOCK FILE

Covered in §0c and repeated here because it is the trap a fresh machine hits differently: a clone
runs `npm install` so `prisma generate` fires. **A PULL does not.** After any pull:

```bash
git diff --stat HEAD@{1}..HEAD -- prisma/schema.prisma   # moved? then:
npx prisma generate
```

#### 5 · Which machine you are on changes what you can do

| | `F:\kipindi-main` | `C:\kipindi-main` |
|---|---|---|
| the six persona passwords | ✅ **current** (re-minted 2026-08-26) | ❌ dead until the file is copied |
| `QA_ADMIN_PASSWORD` | ✅ present | ⚠️ was absent — confirm before relying on it |
| worktrees | `kipindi-liveqa` exists here | none; `qa/live-experience` checked out directly |

⭐ **Before believing a gap is a defect, ask whether the credential simply lives on the other
machine.** E-213's five "NOT RUN" legs were honestly marked for a day and were never blocked on the
product — they were blocked on a machine, and closed at **13/0** the moment they ran from the right one.

---

### §0e · ⛔ THE AUDIT THAT RE-SCOPED THIS FILE — 2026-08-27

**Ali asked one question: *"are they all worth it, or should we throw any away?"*** Five units were
each investigated against **production**, then each finding was handed to an independent agent whose
job was to refute it. Every number below is a `SELECT` or a `curl` run in a session that proved its
own identity first — `current_database()=railway`, `inet_server_addr()=10.167.150.169`, and
`users` / `marketsLive` / `marketsResolved` matching `https://50pick.tz/api/health` in the same run.

⭐ **THE HEADLINE: THE TWO ITEMS WORTH MOST WERE NOT ON THE LEDGER — THEY WERE FOUND BY CHECKING
WHETHER THE LEDGER WAS TRUE.** Both are guards-or-readers that do not exist while a document says
they do. That is this project's oldest recurring shape, and it caught us twice more here.

#### What was BINNED, and the measurement that killed it

| Binned | The number that killed it |
|---|---|
| **Unit D entire** — per-bet UD notifications | `COMPLIANCE-DECISIONS.md` § **2026-08-22** already ruled *"bet-placed stays push-only"*; §5 was written **four days later** and never cites it. **E-178** (2026-08-22) already writes a bell row for **every** terminal UD outcome — measured **34/34** on production. And the channel that ruling "preserved" is dead: `PushSubscription` holds **0 rows, ever** |
| **Unit C's four exotic FX symbols + SPX** | Demand premise **false**. Last 7 days the engine emitted **13,166 rounds; 22 carried a bet — 0.17%**. All-time **25,338 rounds, ~289 ever bet (1.1%)**. The two assets added most recently (BNB, LTC, 2026-08-20) still have **zero chains**. ⛔ **No real player has bet Up & Down since 2026-08-22** |
| **Unit C's GBP/USD and USD/JPY** | Not binned — **they need no code at all.** Both are already in `SYMBOL_CATALOGUE` with decimals and ticks set; they are one operator click away in the admin dropdown |
| **Unit B's ticket store + inbound pipeline** | No queue exists. Of **16** failed withdrawals, **13 are one ADMIN account and 3 are fleet** — no genuine player has ever had one. Total platform correspondence fits in a paragraph, on **102** users |
| **Unit A's obligation-field migration** | The branch it serves cannot occur — **12 confirmed withdrawals in the platform's entire history**, none against a bonus |
| **Unit E's dated 2026-09-15 manual check** | Superseded by a cron. Both origin certs are valid **49 more days** (expiry **2026-10-15 14:49:57 GMT**, verified by direct `node:tls` handshake, serial `0593A74B…` on www and `05085C2D…` on apex) |

#### The doc-vs-reality contradictions this turned up — worth more than the recommendations

1. ⛔ **§2 understates its own defect.** It calls the exposure *"a bounded edge whose size an operator
   sets when they choose a multiplier"*. **False.** Turnover accrues on the **full stake** with no
   per-bet cap, funding is real-first, and the free exit is fee-free — live `market.config` gives
   `maxStake: 1000000`, `freeExitGraceMinutes: 5`, `cashOutFeeRate: 0`. **Raising the multiplier
   bounds nothing.**
2. ⛔ **§2 lists four mechanics; THREE already shipped** (B1b, 2026-08-14 — `bonus.wagering_reversed`
   has fired **3 times** on production). Read as a work order it rebuilds live code.
3. ⛔ **The E-224 ruling says the grant returns to `IN_PROGRESS`. That status does not exist**
   (`ACTIVE|QUEUED|FULFILLED|EXPIRED|CANCELLED|FORFEITED`). **A guard written against that word
   stays green for ever.**
4. ⛔ **`scripts/live-bonus-j.mjs:675` asserts the DEFECT** (`g?.status === "FULFILLED"`) — it goes
   **RED when the fix is correct.** Invert it in the same commit. *(the "assertion the fix
   invalidates" shape, again)*
5. ⛔ **§3 says "msaada@50pick.tz does not exist". It has been the saved production support address
   since 2026-08-19 09:50:24.** What does not exist is a **reader** — see **E-226**.
6. ⛔ **Two code comments assert a boot hydration that is not there** (`support-config.ts:22-24`,
   `admin/system/actions.ts:56-58`) — and the second was written **as the fix for this exact bug**.
   `src/lib/server/define-config.ts` already exists as "the ONE factory" with eager hydration and
   four modules use it; support-config never adopted it. **The fix is a port, not a design.**
7. ⛔ **§4 guards the LAST lesson.** It cites SOL as the cautionary tale; SOL is now the healthiest
   board on the platform (30m: 35 voids, all `no-move`, **zero** source failures in 14 days). The
   live failure is **XRP** and it appears nowhere in the file's warnings.
8. ⚠️ **XAU/15m's 33% void rate is not a defect** — it is the only chain on the platform with
   `marginBps` ≠ 0 (it is **5**), and 14-day voids are **235 `no-move` of 237**. A house band.
9. ⛔ **Three tracked docs call `qa:live` §[F] "a gate and not a reminder."** It has never executed —
   see **E-227**.

#### The re-aimed survivor of Unit C — file it as its own row, NOT as "new markets"

**XRP is refunding rounds because its price source fails.** Last 14 days: **XRP/USD 30m voided 50 of
317 with 45 `source-failed`**; **60m voided 35 of 136 with 33 `source-failed`**. XRP/**15m** is
healthy — **1** source failure — so the failure appears only **above** the short chain, which is why
a minimum-duration floor cannot touch it. ⚠️ **A zero-code mitigation an operator can run today:**
two chains share `gridAnchorAt 2026-08-18 09:15`; stop one and re-measure over 24h. ⛔ **Priority is
low while no real player has bet Up & Down since 2026-08-22** — it is a correctness row, not growth.

#### What the audit could NOT settle

| Open question | How to settle it |
|---|---|
| Does `msaada@50pick.tz` actually **deliver**? (587 answers `220 r6.netpoa.com Exim`, but auth is required and port 25 is blocked here) | ⛔ **Send one real mail and reply to it — 15 minutes, BEFORE publishing the address** |
| Does Railway renew via **HTTP-01** (proven to traverse Cloudflare) or **TLS-ALPN-01** (which the proxy would break)? | Ask Railway, **or** simply flip `www` to DNS-only for the mid-September window and re-proxy after — removes the question at zero cost |
| Are the 38 failed deposits money-taken-not-credited, or abandoned pushes? | Read the provider failure reasons against the Selcom console |
| Is E-224 really *"the only OPEN money defect on the board"*? | **Not audited** — this was a five-unit review, not a platform sweep |
| Jay's verbatim comment #9 | `50pick_website_comments-2.pdf` is genuinely **not in the repo** — everything about what he asked is a paraphrase |

---

## §1 · THE COMPLETION LEDGER — tick your row in the commit that ships it

⛔ **THIS LEDGER WAS RE-SCOPED ON 2026-08-27 BY A MEASURED AUDIT. READ §0e BEFORE §2.**
Every unit was re-measured on production and then adversarially challenged. **Not one survived at
the size it was written.** One died outright, one died as written and was replaced by a different
job, one split, and the two that remain are smaller than their sections claim — in two cases **the
surviving half is not the half the section is about.** Roughly **3 sessions**, down from the ~10–14
the five units imply. §0e lists every binned item with the number that killed it, so no future
session re-derives it.

| # | Unit | Origin | Verdict — 2026-08-27 audit | State |
|---|---|---|---|---|
| **A** | **E-224** · a bonus cleared at zero risk | §6 register | ✅ **KEEP · ~1 session.** Zero occurrences ever — **and armed.** Four proposals sit in `REVIEW`, two from real players, and **both logged in on 2026-08-27**; approving either puts a live 5× grant on a real account. ⛔ **INTERIM CONTROL, FREE AND TOTAL: approve no proposal and grant no bonus to a non-fleet account until this ships.** Shrunk — **no migration, no obligation field**; three of §2's four mechanics already shipped. ⭐ **THE DESIGN IS DONE AND MEASURED — START AT §2a, NOT AT §2 PROSE** ✅ **SHIPPED 2026-08-27 (session 69): `test:bonus-relock` 62/0 · `red:bonus-relock` 13/13 · `test:red-anchors` 795/0 · `tsc` 0 · `build` 0 · `test:all` 253/263 with the 10 reds proven byte-identical at HEAD. ⛔ THE LIVE DRIVE IS THE ONE THING OUTSTANDING, so the interim control STANDS until `qa:bonus-j` runs.** ⭐ **Two defects in the fix itself were caught by adversarially re-reading it: a SECOND unfiltered reader (`getBonusSummary`, which §2a denied existed) and a CLAWBACK BY THE BACK DOOR (a re-lock inheriting a dead `expiresAt` would be swept away by `expireActiveGrants`).** | ☑️ |
| **B1** | 🔴 **E-226** · the support address nobody reads | **NEW — found by this audit** | ✅ **KEEP · <1 session — the ONLY item here that is WRONG ON PRODUCTION RIGHT NOW.** `/help` serves `support@50pick.tz` ×6 and `0800 11 0011`, while production has held `msaada@50pick.tz` / `+255 769 777 877` since **2026-08-19 09:50:24**. A writer with **no reader**. ⛔ **Send a real message to the address and reply to it BEFORE publishing it**, or step one makes things worse | ⬜ |
| **B2** | the ticket store + inbound pipeline | Jay #12 · #13 | ⏸️ **DEFERRED behind a named trigger** — the licence-review date, **or** >20 inbound messages in a calendar month. There is no queue to drain: of 16 failed withdrawals, 13 are one ADMIN account and 3 are fleet — **no genuine player has ever had one** | ⬜ |
| **C** | **Jay unit L** · new markets | Jay §1 | ❌ **DROPPED AS WRITTEN — the demand premise is false.** Re-aimed at XRP's feed failures, filed as its own row. GBP/USD and USD/JPY need **no code at all** | ❌ |
| **D** | **Jay unit M** · per-bet UD notifications | Jay §1 | ❌ **DROPPED.** It reverses a dated owner ruling in order to add a receipt **E-178 already delivers**. Closed by one email and two doc corrections, not by code | ❌ |
| **E** | 🔴 **E-227** · the certificate gate that has never run | **NEW — found by this audit** (absorbs **E-195**) | ✅ **SHRUNK to ~45 min of YAML.** The certificate is fine for **49 days**. The defect is that **three tracked documents call `qa:live` §[F] "a gate and not a reminder" — and it has never executed once** | ⬜ |

⚠️ **AND THE LARGEST THING MEASURED IS NOT ON THIS LEDGER AT ALL.** Lifetime deposits are
**52 CONFIRMED (TZS 646,000) against 38 FAILED (TZS 630,500)** — 42% by count, **49% by value**.
Last 7 days: **1 confirmed against 4 failed.** Nine genuine player accounts are affected; one
player alone carries 4 failures totalling **TZS 311,000**. Separately `/api/health` reports
`sms.provider: "console"` — **no real SMS has ever been sent.** ⛔ **This was not audited and is
not ruled on here — it is flagged because it outranks all five units above.**

---

## §2 · UNIT A · E-224 — A BONUS CLEARED HAVING RISKED NOTHING

> ✅ **SHIPPED 2026-08-27 (session 69). THE CODE IS IN; THE LIVE DRIVE IS NOT.** `test:bonus-relock`
> **62/0** · `red:bonus-relock` **13/13** · `test:red-anchors` **795/0**. The design in §2a was
> followed and it was **right about the mechanism and wrong about the reader inventory** — see the
> §6 register row in `docs/LIVE-QA-CAMPAIGN.md` for both corrections.
> ⛔ **TWO THINGS §2a GOT WRONG, AND BOTH WOULD HAVE SHIPPED:**
> ① **`getBonusSummary` IS A SECOND UNFILTERED READER.** §2a's table says the admin ledger is the
> only one. It is not — `getBonusSummary` maps `listByUser` (no status filter) through
> `toGrantView`, which spread `remainingTzs` straight through to the **player**. Suppressed at the
> source now.
> ② 🔴 **A RE-LOCK INHERITING A DEAD `expiresAt` IS A CLAWBACK.** `expireActiveGrants` selects
> `status = ACTIVE AND expiresAt < now`, so a grant fulfilled near its 30-day expiry and re-locked
> after it would have had the re-locked money **swept away** — the player left with neither the
> cash nor the bonus. The re-lock now restarts the clock.
> ⚠️ **AND ONE SMALLER CORRECTION:** §2a says the admin ledger "would render a remaining figure".
> The table **never paints `remainingTzs`** — the suppression is right, but it guards a payload
> field with no current renderer. Stated so nobody reads it as a fixed visible defect.
> 🔴 **THE INTERIM CONTROL STILL STANDS** — approve no proposal and grant no bonus to a non-fleet
> account **until the live drive runs**. Four proposals sit in `REVIEW`; two are real players.
>
> ── the pre-ship verdict, kept for the reasoning ──
> ✅ **VERDICT 2026-08-27 · KEEP — but SMALLER than this section, and this section is WRONG in
> three places. Read §0e first.** ⛔ Three of the four mechanics below **already shipped** (B1b,
> 2026-08-14). ⛔ The ruling's `IN_PROGRESS` **is not a real status** — a guard written against that
> word stays green for ever. ⛔ The "bounded by the multiplier" claim is **false**: turnover accrues
> on the full stake, uncapped. ⛔ `scripts/live-bonus-j.mjs:675` **asserts the defect** and goes RED
> when you fix it — invert it in the same commit. ⛔ **No migration, no obligation field.**
> 🔴 **INTERIM CONTROL UNTIL THIS SHIPS: approve no proposal and grant no bonus to a non-fleet
> account.** Two real players' proposals sit in `REVIEW` and both logged in on 2026-08-27.

### §2a · ⭐ THE MECHANISM, READ OFF THE CODE 2026-08-27 — start here, not at the prose below

**The prose in this section describes the DEFECT. This subsection describes the CODE, and where the
two disagree the code wins.** Every line reference was read on `2c952dd1`.

#### The root cause, exactly

`reverseWageringCore` (`src/lib/server/bonus-service.ts:365`) iterates
`db.bonusGrant.listActiveByUser(userId)`, and that DAL method
(`src/lib/server/prisma-dal.ts:2057`) is literally `where: { userId, status: "ACTIVE" }`.
⛔ **A FULFILLED grant is therefore unreachable from the reversal path — not skipped by a condition
you can see, but invisible to the query.** The doc-comment above it asserts that a fulfilled grant
*"already FULFILLED from legitimate turnover is left untouched (its cash is real)"* — **and that is
precisely the assumption that fails**, because the bet which COMPLETED the wagering may be the very
one later refunded.

#### 🔴 THE CRUX, AND IT IS NOT IN THE PROSE BELOW: FULFILMENT ERASES THE NUMBER THE FIX NEEDS

`recordWageringCore` fulfils at `bonus-service.ts:259-302`:
```
const moved = g.remainingTzs;                                   // :259
await db.wallet.adjust(g.walletId, { bonusBalance: -moved, balance: moved }, …);
await db.bonusGrant.update(g.id, { …, remainingTzs: 0, status: "FULFILLED", fulfilledAt });  // :302
```
⛔ **`moved` is written nowhere. After fulfilment `remainingTzs` is 0, so "how much cash did this
grant unlock?" is unanswerable from the grant** — and the audit ruled out a migration, so it cannot
simply be stored in a new column. `amountTzs` is NOT a substitute: `spendBonus` and `refundBonus`
move `remainingTzs` up and down before fulfilment, so the unlocked figure is generally smaller.

#### ✅ THE DECISION — stop zeroing `remainingTzs` on FULFILMENT ONLY

`remainingTzs` becomes *"the portion of this grant that is locked bonus money, or that WAS converted
to real and returns to bonus if the grant is re-locked."* ⭐ **This is safe, and it was verified by
reading every reader rather than by reasoning about it:**

| Reader | Filter | Effect of a non-zero `remainingTzs` on a FULFILLED row |
|---|---|---|
| the ledger reconciler, `ledger.ts:708` | `WHERE status = 'ACTIVE'` | **none** — this is the source of truth for `bonusBalance` and the invariant is ACTIVE-scoped |
| the invariant comment, `bonus-service.ts:8` · `ledger.ts:573,592,706` | ACTIVE-scoped in all four | **none** |
| the player wallet page, `src/app/wallet/page.tsx:92` | `.filter(status === "ACTIVE" \|\| "QUEUED")` | **none — invisible to the player** |
| ⚠️ **the ADMIN bonus ledger**, `bonus-service.ts:~751` | **NO status filter** | 🔴 **would render a "remaining" figure against a FULFILLED grant.** ⛔ **Suppress it to `—` for non-ACTIVE in the SAME commit** |

⛔ **EXPIRED (`:567`) and CANCELLED (`:602`) MUST KEEP ZEROING IT.** The asymmetry is the point and
needs a comment saying so: on expiry/cancellation the remainder is **removed**, on fulfilment it is
**converted** — and only a conversion is reversible.

#### The re-lock, precisely

Reverse turnover on ACTIVE grants first (unchanged), then on FULFILLED ones. When a FULFILLED
grant's `wageredTzs` drops below `wagerRequiredTzs`: move `moved = g.remainingTzs` back with
`db.wallet.adjust(walletId, { balance: -moved, bonusBalance: +moved })`, set
`{ status: "ACTIVE", fulfilledAt: null }` (`remainingTzs` already holds the figure), write the
reversing transaction and ledger entries, and audit it. ⛔ **The status it returns to is `ACTIVE` —
the ruling's `IN_PROGRESS` DOES NOT EXIST in `BonusGrantStatus`** (`ACTIVE|QUEUED|FULFILLED|
EXPIRED|CANCELLED|FORFEITED`), and a guard written against that word would stay green for ever.

#### ⚠️ THE SHORT RE-LOCK — do not let this be rounded away

If the player already spent or withdrew the unlocked cash, `balance < moved`. §0e's audit waved this
off as *"cannot occur — 12 confirmed withdrawals in history"*, but **that is a statement about
today's DATA, not about the CODE.** ▶ **Re-lock what exists, audit the shortfall explicitly by name,
and do NOT invent an obligation field** — the ruling says nothing is ever clawed back, so the gap
must be VISIBLE rather than silently absorbed. A re-lock that quietly moves less than it claims is
the same class of defect as the one being fixed.

#### The two instruments

⛔ **`scripts/live-bonus-j.mjs:675` ASSERTS THE DEFECT** (`g?.status === "FULFILLED"`) — it goes
**RED when the fix is correct.** Invert it in the same commit, or the drive will report the repair
as a regression. ⭐ **And the RED proof must mutate the FIX, not the defect:** re-point
`reverseWageringCore` at `listActiveByUser` again and the suite must go red — a proof that passes
with the FULFILLED branch deleted is measuring nothing.

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

> ⚠️ **VERDICT 2026-08-27 · SPLIT. Read §0e first.**
> ✅ **B1 — BUILD THIS (`E-226`, <1 session):** the support config has a **writer and no reader**.
> `/help` serves `support@50pick.tz` ×6 and `0800 11 0011` while production has held
> `msaada@50pick.tz` / `+255 769 777 877` since **2026-08-19 09:50:24**. ⛔ **This section's claim
> that "msaada@50pick.tz does not exist" is FALSE.** The fix is a **port** to
> `src/lib/server/define-config.ts`, not a design. ⛔ **Send and reply to a real message BEFORE
> publishing the address.**
> ⏸️ **B2 — DEFERRED (ticket store + inbound pipeline)** behind a named trigger: the licence-review
> date, **or** >20 inbound messages in a calendar month. There is no queue — of 16 failed
> withdrawals, **13 are one ADMIN account and 3 are fleet**.

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

> ❌ **VERDICT 2026-08-27 · DROPPED AS WRITTEN — DO NOT BUILD THIS SECTION. Read §0e first.**
> The demand premise is **false**: last 7 days the engine emitted **13,166 rounds and 22 carried a
> bet — 0.17%**; the two assets added on 2026-08-20 still have **zero chains**; **no real player has
> bet Up & Down since 2026-08-22**. ⛔ **GBP/USD and USD/JPY need NO CODE** — they are already in
> `SYMBOL_CATALOGUE` and are one operator click away. The four exotics and SPX are **deferred behind
> a named trigger**: one ISO week with ≥50 non-staff UD positions.
> ⚠️ **This section also guards the LAST lesson** — it cites SOL, which is now the *healthiest*
> board (zero source failures in 14 days). ▶ **The live failure is XRP**, and it is re-filed as its
> own correctness row in §0e — not as "new markets".

⛔ **ONE ASSET PER COMMIT**, each carrying its own measurement.
⚠️ **Watch the refund rate.** SOL/USD is already in the catalogue as exactly that lesson — see
`updown-source-pinning-and-proposals`. A market nobody takes the other side of is not a market; it
is the E-224 gap's supply line.

---

## §5 · UNIT D · JAY UNIT M — PER-BET UP & DOWN NOTIFICATIONS

> ❌ **VERDICT 2026-08-27 · DROPPED — DO NOT BUILD THIS SECTION. Read §0e first.**
> It **reverses a dated owner ruling without citing it**: `COMPLIANCE-DECISIONS.md` § **2026-08-22**
> says *"bet-placed stays push-only"*, and this section was written **four days later**. The receipt
> it asks for **already exists** — **E-178** writes a bell row for every terminal UD outcome,
> measured **34/34** on production. ⚠️ And the channel that ruling "preserved" is **dead**:
> `PushSubscription` holds **0 rows, ever**.
> ▶ **Closed by ANSWERING, not building:** one paragraph to Jay describing what E-178 delivers, one
> amendment to `COMPLIANCE-DECISIONS.md` so it stops asserting a channel with zero subscribers, and
> one line here pointing at that ruling.

Behind a switch, **default OFF**. ⚠️ The comms rules apply in full: `docs/` comms certification —
⛔ an unescaped `heading()` once put a player's name into the inbox **as markup**.

---

## §6 · THE DATED WATCH — ⏰ not a task you can finish today

> 🔴 **VERDICT 2026-08-27 · THE DATE IS FINE; THE GATE IS DEAD. Re-filed as `E-227`. Read §0e.**
> Both origin certificates are valid **49 more days** (expiry **2026-10-15 14:49:57 GMT**, verified
> by direct `node:tls` handshake). ⛔ **The real defect is that three tracked documents call
> `qa:live` §[F] "a gate and not a reminder" — and it has NEVER EXECUTED ONCE.** `predeploy` runs
> `qa:live` with no `BASE`; `BASE` defaults to `http://localhost:3009`; `LOCAL` is therefore true;
> the whole cert block sits inside `if (!LOCAL)`; and `qa:live` appears **nowhere in `.github/`**.
> Apply the house test — *would this pass with an expired certificate?* **Yes, silently, every
> time.** ▶ **~45 min:** lift §[F] into a NEW standalone cert-watch script under `scripts/` (it does not exist yet), run it weekly in CI against
> **both** hosts, prove it RED, and correct the three documents.
> ⭐ **A free risk-eliminator that costs no code:** flip `www` to DNS-only for the mid-September
> renewal window, let Railway renew on the path that has always worked, then re-proxy.

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
