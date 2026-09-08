# Withdrawing Invite & the bonus wallet from the player product

**Decided:** Ali, 2026-09-06. **Status:** live on branch `agent-affiliate-programme`.
**Authority for this change.** The money rules themselves stay in [`RULES.md`](RULES.md) — §2.5
and §2.6 carry the roll-out markers this programme set.

---

## 1 · What was decided, and what it is not

Normal players get **no bonus wallet and no invite**. Referral earning becomes something only a
vetted, fee-paying, compliance-approved **Agent Affiliate** does.

⛔ **This is a feature-state, not a deletion.** It follows the precedent already recorded in
`src/lib/server/bonus-config.ts` for the cashback promo (Gaming Board item #5): *"disabled/hidden
for now until further notice — A FEATURE-STATE, NOT A DELETION."* No ledger path was removed, no
table was dropped, no rule was repealed.

| | Withdrawn | Kept and still working |
|---|---|---|
| Bonus | Granting **(enforced at `creditBonus` since 2026-09-06 — see §4b; before that this row was a claim, not a fact)**, the wallet card's empty-state pitch, the cashback promo | Wagering accrual, grant fulfilment, expiry, the `BONUS_FUNDED` cash-out refusal, `house-ledger` accounting, `/admin/bonuses` **as a place to read and audit the grants that exist** |
| Invite | Every player entry point, the page itself, the code on share links | The whole affiliate engine, the admin config screen, all three reward modes |

---

## 2 · The three laws this change is built on

### Law 1 — Gate the OFFER, never the REFUSAL

A feature flag may hide something we **give**. It may never hide something we **forbid**.

- ⛔ `sellable = … && !bonusFunded` (`market-service.ts`) is **not gated**. Gating it would turn a
  laundering block into a laundering **route**: bonus stake → cash out → withdrawable cash.
  Proven by red harness — dropping the term makes a bonus-funded position report `sellable=true`.
- ⛔ Wagering, fulfilment and expiry are **not gated**. A player holding a live grant must still be
  able to play it through, or their money freezes for ever.
- ⛔ Accounting is **not gated**. The owner's book counts money that exists, not money we advertise.
- ⭐ Consequently `BonusWalletCard` hides its **empty state** (the pitch) but still renders for a
  player who holds a grant. Hiding a real balance while its wagering requirement keeps running is
  not a feature flag.

### Law 2 — A dormant path rots unless something still runs it

Re-enabling a feature months later ships broken because nothing executed the ON path in between.
So the state is **env-overridable server-side** (`FEATURE_INVITE`, `FEATURE_BONUS`) and
`withdrawn-features.test.mts` §4 drives the ON branch on every deploy.

### Law 3 — Silence is not consistency

Hiding a surface does not stop the product **saying** the thing. Three places kept talking, and
one was creating permanent liabilities — see §4.

---

## 3 · Where the switch is

**`src/lib/feature-state.ts`** — the table `invite-feature.ts` asked for in its own comment
(*"widen this into a feature-state table — NOT grow a second config beside it"*). That module is
**deleted**, not shimmed: deleting it is what forced the compiler to surface all six call sites
instead of letting the role-blind `inviteIsLive()` keep compiling at each one.

Two levels that cannot disagree:

| Level | Where | Question it answers |
|---|---|---|
| **Product state** | `feature-state.ts`, a constant | Is this feature part of the product at all? |
| **Operator config** | `bonus-config.ts`, DB-backed | Is the programme running today? |

**Product off ⇒ off, whatever the config says.** An operator cannot resurrect a withdrawn
programme by editing a row — which is the whole point of the Gaming Board precedent.

⛔ **`WITHDRAWN` is not `COMING_SOON`.** A gilt badge is a *promise*, correct while Invite was
waiting for sign-off and wrong now that players are not in a queue for it. Withdrawn surfaces
render **nothing** — no entry point, no badge, no tooltip.

⛔ **Server computes, clients receive.** Feature visibility is role-dependent and a client
component cannot know the role, so `app-shell.tsx` resolves it once and threads booleans down —
exactly how `proposalsState` already reaches the nav. Do not import `feature-state.ts` into a
`"use client"` file.

---

## 4 · What the consistency sweep found

| Finding | Why it mattered |
|---|---|
| 🔴 **Share links were recruiting.** `markets/[id]` and `positions` called `ensureAffiliateAccount` unconditionally just to hand `refCode` to `<ShareButton>`, so **every** player's shared link carried a live referral code | `bindRecruit` writes `recruitedBy` **once** and never re-attributes. It paid nothing, so nothing showed — a standing liability that would begin paying against attributions nobody chose the moment the programme returned |
| 🔴 **The AI assistant was advertising it.** `chat.ts` listed "referrals" in scope, described the *"Invite & Earn referral programme"*, and named `/profile/invite` as a key page | Live, player-facing, and pointing at a page that now returns the not-found view |
| ⚠️ **The Connector badge was unearnable.** `Connector · Mwunganishi` ladders 1 / 5 / 25 recruits on every shelf | With referral withdrawn it could never leave `locked` — a permanent award with no reachable path. Scoped to agents, who can actually earn it |
| ⚠️ **A flag worse than dead code.** A generic `comingSoon` on four nav components whose only producer was Invite — but it hard-coded the **invite** copy key | The next feature to set it would silently have worn Invite's words. Deleted from all four |
| ✅ **`legal/responsible-gambling` left alone** — *"No bonus offers tied to deposit increases"* | That is a restraint we commit to, not a feature we advertise. The withdrawal makes it **more** true |

---

## 4b · 🔴 THE WITHDRAWAL DID NOT WITHDRAW GRANTING (found 2026-09-06, cleanup audit)

**§1 above listed "Granting" as withdrawn from the day this programme shipped. Nothing enforced
it.** The table was a statement of intent that four green suites, a 110-agent adversarial audit
and this document all read straight past.

**What was actually happening.** `creditBonus` is the single funnel every incentive path routes
through, and its only master switch was `getBonusConfig().enabled` — the **operator** config,
which ships `enabled: true`. The **product** state was never consulted. So with the bonus wallet
withdrawn from the product, every grant path still minted grants: affiliate rewards, proposal
prizes, invite-campaign registration, AUTO cashback and admin grants.

⛔ **MEASURED, NOT REASONED — and the guard printed the evidence while passing.** Running
`test:withdrawn-features` at `22e96d12`:

```
[audit] WALLET bonus.credited w5e_ref BonusGrant#bg_ef1914…
[email] sending "Bonus added · TZS 10,000" → w***@t.tz (tag=bonus)
43 passed · 0 failed
```

An approved **AGENT's commission** was paid as a played-through bonus grant — carrying a wagering
requirement and an expiry — into a wallet the product says does not exist, and the agent was
emailed *"Bonus added"* about it.

**Three places asserted the opposite in prose, and none of them was a measurement:**

| Where | What it claimed |
|---|---|
| `affiliate-service.ts` §`referrerMayEarn` | *"with the bonus wallet withdrawn the reward now lands as REAL, WITHDRAWABLE CASH rather than a played-through grant"* |
| `withdrawn-features.test.mts` §5d comment | the same sentence, restated |
| `feature-state.ts` header + §3 of this doc | *"An operator cannot switch a withdrawn feature back on by editing a row"* |

⭐ **Why the guard could not see it.** §5e's control asserted `balance + bonusBalance > 0` — a sum.
It is a correct control for *"is the agent paid at all"* and it is structurally blind to *"paid
into which wallet"*. **The assertion that would have caught this is the one the section declined
to make.** That is this repo's recurring shape: a true measurement over the wrong population.

**The fix — one gate, at the funnel, no caller changed.** `creditBonus` now refuses with a new
`WITHDRAWN` code when `bonusIsLiveFor()` is false, immediately above the existing operator-config
check. Every caller already degraded correctly, which is why this is one place and not five:

| Caller | Behaviour on refusal |
|---|---|
| `affiliate-service.creditWallet` | falls through to `creditInternal` → **paid as real cash**, which is what the docs already claimed |
| `proposals-service.approveProposal` | falls through to `creditInternal` → prize paid in cash; *"never lose the promised reward"* |
| `invite-service.bindRegistration` | returns `null` → no grant, campaign entry not marked |
| `wallet-service` AUTO cashback | result ignored → no cashback (its display was already gated) |
| `admin/bonuses` grant action | surfaces the reason to the officer |

⛔ **This is Law 1, not a breach of it.** `creditBonus` is the promotional-**offer** funnel and
nothing else. Every path that owes a player money already bypasses it and says so in its own
comment — void restitution mints its grant directly *precisely* so it cannot inherit this
function's suppression; wagering, fulfilment, expiry and the `BONUS_FUNDED` refusal are separate
functions; `house-ledger` counts money that exists.

**And it turned eleven suites red** — the bonus machinery's own suites, none of whose failures
were about the thing they test (`bonus=0 · grants=0`, then `undefined.wageredTzs`). That is Law 2
arriving on schedule. They now declare the ON state in one visible line via
`scripts/lib/bonus-feature-on.mts`, exactly as `verified-fixtures.mts` did when KYC-first turned
59 suites red. ⛔ `withdrawn-features` and `cashback-hidden` must **never** import it: they
measure the OFF state, and a gate that chooses its own population cannot fail.

**Verified:** baseline re-measured at `HEAD` with the change stashed (59 · 24 · 16 · 62 · 48 · 12 ·
32 · 25 · 18, all 0 failed), then identical after. `test:withdrawn-features` 43 → **51/0**.

---

## 5 · The gates, and exactly what each one measures

| Gate | Measures | Does **not** measure |
|---|---|---|
| `npm run test:rg-cash-incentive` | The RG suppression on the **cash** incentive path, with a control that an unrestricted player IS credited | — |
| `npm run test:withdrawn-features` | The seam per role · Law 1 (bonus-funded still unsellable) · Law 2 (ON path executes) · a **source** check that no player route reads the withdrawn copy | ⛔ **Not** a rendered-page sweep. It says so in its own header |
| `node scripts/live/withdrawn-render-drive.mjs` | What a **signed-in player actually sees**, on a running server with a real session cookie | The AGENT view — see §7 |

**Red harnesses run and restored** (working tree verified byte-identical to `HEAD` after each):

| Mutation | Result |
|---|---|
| Neutralise the RG gate in `creditInternal` | 7 refusals fail; the cooling-off referrer's reward is recorded **PAID** with TZS 10,000 of real cash moved. Control still green |
| Drop `!bonusFunded` from `sellable` | §2 fails with `sellable=true`, `reason=undefined` — the laundering route, demonstrated |
| Soften `WITHDRAWN` → `COMING_SOON` | §1 fails — the product starts promising again |
| **Neutralise the granting gate** (`if (!bonusIsLiveFor())` → `if (false)` in `creditBonus`) | **6 named failures, and the detail reproduces the original defect verbatim**: `§5e2 …NOT as a bonus grant — bonus=10000`, `§5e2 …no BonusGrant row was minted — grants=1`, and §5g1 returning an ACTIVE grant with `wagerRequiredTzs: 25000`. 45 passed · 6 failed. Working tree verified byte-identical to `HEAD` after restore |

---

## 6 · One measured surprise, recorded so nobody "fixes" it

`/profile/invite` returns **HTTP 200**, not 404, for a player — while correctly rendering the
not-found view.

The segment has a `loading.tsx`, which is a Suspense boundary, so Next flushes the shell and
**commits the status** before the async page throws `notFound()`. Measured on a running server:
role `PLAYER` → gate false → `notFound()` called → body is the not-found UI, and **no code, link
or QR is rendered** — the referral read never runs.

⛔ **Do not "fix" the status by deleting `loading.tsx`.** Every async route in this app has one
(`CLAUDE.md`), and nothing leaks either way. If a true 404 is ever required, the gate must move
ahead of the render (`proxy.ts`) — it must not be bought by removing a loading state.

⚠️ The first version of the render drive asserted `status === 404` **and** that the page contained
no "coming soon" anywhere. Both were wrong: the first asserted an assumption about a framework
rather than the behaviour that matters, and the second matched the **Proposals** badge in the
shared nav — a different feature, legitimately coming soon. A true measurement over the wrong
population is the most convincing way to be wrong.

---

## 6b · What a 110-agent adversarial audit found after I called it done

I ran an 8-dimension refute-by-default audit over the finished branch: 34 claimed findings,
**17 confirmed** by a ≥2-of-3 verifier panel. It found things four green suites and my own
109-assertion visual drive had all passed over. The pattern in almost every one is the same —
**a true measurement over the wrong population.**

| # | What it found | Why nothing caught it |
|---|---|---|
| 1 | **`test:invite-coming-soon` was RED and still wired into CI**, and its three RED anchors quoted source lines this change deleted, so `red-anchors` went 1291/0 → **1288/3** | I re-ran the suites I had *touched*. This one I had *broken*. A red harness that cannot inject is a control that has silently stopped controlling |
| 2 | **The wallet's real balance rendered at half width with a 518px hole** at 1280 | Every guard looked for holes where the element had BEEN — an empty container, an orphan heading. This grid has a child and nothing is orphaned. Removing an element also re-lays-out its **surviving siblings** |
| 3 | **A cooling-off proposer blocked the OFFICER** — the whole approval was abandoned with "check the bonus/wallet setup and retry" | I introduced it with the RG gate and reasoned "refusing is correct" instead of measuring who got refused |
| 4 | **Legacy `recruitedBy` rows still paid** — gating the bind left every attribution written before the gate accruing in real cash, with an email pointing at the dead page | The bind gate looked complete. The older population is the quieter half |
| 5 | The cashback promo was gated on `/wallet` but **not** on `/wallet/deposit` | One surface of two — the classic half-on |
| 6 | The chat had a **second layer** (the offline fallback) still teaching the programme and citing `/profile/invite` | I fixed the system prompt and stopped looking |
| 7 | Two comments cited **`reenablement.test.mts` (under `scripts/`), which has never existed** | I named a guard I had planned and not written |

> ⚠️ **The path above is deliberately split across two code spans.** `test:docs` resolves every
> `scripts/…` string written anywhere in `docs/` against the disk — correctly, because a doc that
> hands out a path nobody can follow is the defect this row is *about*. Written whole, this
> sentence would fail the very gate it describes. `AGENT-STRESS-TEST-FINDINGS.md` §1299 splits it
> the same way for the same reason. ⛔ Do not "tidy" it back into one span.

⭐ **And the red harness caught my own guard being worthless.** The first version of the
legacy-attribution test (§5d) used the shipped defaults — `requireDeposit: true`,
`minBetAmountTzs: 20_000` — and never gave the recruit a deposit, so the prize could not fire
whatever the gate did. Neutralising the gate left it **green**. It was measuring the config, not
the gate. Rewritten with a config that genuinely pays, plus §5e: the same legacy row shape with
an AGENT referrer **is** paid. Without that control §5d passes whenever the reward path is broken
for any reason at all — which is exactly how its first version passed.

**Retired, not patched:** `invite-coming-soon.test.mts` guarded the rule this programme
superseded, so it failed on its own premise. Its intent outlived its subject, so §1–§3 were
**ported** into `withdrawn-features` (one home · positional coverage · gate-before-mint) and its
§4 (coming-soon copy) dropped, because there is no coming-soon copy any more. New red control:
`red:withdrawn-features`, 3/3.

---

## 7 · What is NOT yet proven

- **The AGENT render path.** `inviteIsLiveFor("AGENT") === true` is unit-tested, but no drive has
  loaded `/profile/invite` **as an agent**, because nothing assigns `UserRole.AGENT` yet — that
  arrives with the agent-application service. Until then the agent half is proven at unit level
  only, and this section is the record of that limit.
- **Production state.** Everything above was measured locally against the in-memory store. The
  live grant rows on production have **not** been re-measured in this pass.
  ⚠️ `bonus-config.ts` warns that the file's defaults are what production actually runs on when no
  `SystemConfig` row exists — *check the live state, not the file*.
  ⭐ **UPDATED 2026-09-06:** for **granting** this no longer matters, and that is the point of §4b.
  The product state is a shipped constant, so whatever `enabled` says in the live row, no new grant
  is minted. It still matters for everything the operator config governs that is not granting
  (wagering multiplier, expiry window, sequential ordering).

- 🔴 **A HELD reward is terminal, and it consumes the budget.** Measured, and left as it is
  deliberately — but it is a money decision, so it is recorded here rather than buried.

  When an accrual is RG-suppressed on the cash path, `creditWallet` returns false and the reward
  is recorded **HELD** — correctly, because "otherwise the ledger claims money was paid that never
  moved". But **nothing anywhere transitions a reward out of HELD** (`PENDING` is a schema default
  no code path writes), and the once-per-recruit and per-recruit-cap guards count rows *regardless
  of status*. So a reward suppressed while an agent is on a break can never be paid afterwards —
  the milestone is spent.

  ⚠️ Note the two routes also disagree: `creditBonus` RG-suppression writes **no row at all**,
  while the cash route writes a HELD one. Same suppression, different ledger artefact.

  ⛔ **Not changed in this pass, on purpose.** Releasing a HELD reward is a payout queue with an
  officer action behind it — a feature, not a withdrawal fix — and inventing one late in a session
  on a money path is how the next defect gets written. The audit trail exists
  (`credit_internal.suppressed.rg_lockout` plus the HELD row), so an operator can find and pay
  these by hand. ▶ If an agent ever loses commission this way in practice, the fix is a release
  action on `/admin/affiliate`, not a change to the accrual guards.

---

## 8 · Turning it back on

One word in `PRODUCT_STATE` in `src/lib/feature-state.ts`, per feature. Then:

1. `npm run test:withdrawn-features` — §4 already drives the ON branch, so this should be green
   before and after; §1 and §3 will correctly go red, because they assert the withdrawn state.
2. Re-run `scripts/live/withdrawn-render-drive.mjs` — its assertions are all absences and will
   invert.
3. ⚠️ **CORRECTED 2026-09-06 — this step used to read *"The bonus machinery needs no change: it was
   never gated."* That sentence was true, and it was the defect** (§4b): granting was listed as
   withdrawn and nothing enforced it. The machinery IS gated now, at `creditBonus`, on the product
   state. Re-enablement therefore needs nothing extra — flipping `bonus` to `ACTIVE` opens the
   funnel by construction — but the eleven suites that drive the machinery now carry
   `import "./lib/bonus-feature-on.mts"`. That import is **idempotent and non-clobbering**: it only
   fills an ABSENT `FEATURE_BONUS`, so once the product state is ACTIVE it changes nothing and can
   be removed at leisure rather than urgently. `test:bonus` (59), `test:bonus-betting` (24),
   `test:bonus-one-side` (22) and `test:cashout` (24) are green on both sides of the change.
