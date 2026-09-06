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
| Bonus | Granting, the wallet card's empty-state pitch, the cashback promo | Wagering accrual, grant fulfilment, expiry, the `BONUS_FUNDED` cash-out refusal, `house-ledger` accounting, `/admin/bonuses` |
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

## 7 · What is NOT yet proven

- **The AGENT render path.** `inviteIsLiveFor("AGENT") === true` is unit-tested, but no drive has
  loaded `/profile/invite` **as an agent**, because nothing assigns `UserRole.AGENT` yet — that
  arrives with the agent-application service. Until then the agent half is proven at unit level
  only, and this section is the record of that limit.
- **Production state.** Everything above was measured locally against the in-memory store. The
  live grant rows on production have **not** been re-measured in this pass.
  ⚠️ `bonus-config.ts` warns that the file's defaults are what production actually runs on when no
  `SystemConfig` row exists — *check the live state, not the file*.

---

## 8 · Turning it back on

One word in `PRODUCT_STATE` in `src/lib/feature-state.ts`, per feature. Then:

1. `npm run test:withdrawn-features` — §4 already drives the ON branch, so this should be green
   before and after; §1 and §3 will correctly go red, because they assert the withdrawn state.
2. Re-run `scripts/live/withdrawn-render-drive.mjs` — its assertions are all absences and will
   invert.
3. The bonus machinery needs no change: it was never gated. `test:bonus` (59), `test:bonus-betting`
   (24), `test:bonus-one-side` (22) and `test:cashout` (24) were green throughout this programme.
