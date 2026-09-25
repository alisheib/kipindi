# The unpaid player invite — a tracked link that pays nothing

**Decided and built 2026-09-25.** Rule: `docs/RULES.md` §2.10a. Decision record:
`docs/COMPLIANCE-DECISIONS.md` § 2026-09-25. Guard: `npm run test:player-invite-unpaid`, control
`npm run red:player-invite-unpaid`.

> Ali, 2026-09-25: *"we have a way for people to share our links but we won't give them profit"* ·
> *"no we don't want to pay anything on affiliate"* · *"we want sometimes unpaid affiliate but i
> want to track how many people he got with this link, i'll pay him cash not through 50pick, and we
> can keep that option if needed"* · *"lets add it so users can start inviting each other."*

---

## 1 · The one idea

A referral programme is two independent facts, and 50pick needs one of them without the other:

| | |
|---|---|
| **The SURFACE** | a player holds a link, shares it, and the people who arrive on it are attributed to them and counted |
| **The MONEY** | the platform credits the player for those arrivals |

Until now these were one switch, so opening the link meant opening the payout. They are two
switches now — `invite` and `inviteRewards` in `src/lib/feature-state.ts` — and today they read
**ACTIVE** and **WITHDRAWN**.

⛔ **The money is off in CODE, not in the affiliate config, and that distinction is the whole
design.** See §4.

---

## 2 · What a player sees

`/profile/invite`, renamed **Invite friends · Alika marafiki · 邀请朋友**:

- their code, the share card and a QR of the link, in **royal** — not gilt;
- the link itself, with WhatsApp / system share / copy;
- a **dial** counting **friends joined** — and only the dial: the paid page's second stat tile is
  dropped, because unpaid it printed the same number under the same words as the dial above it;
- the list of who joined — masked name and date, newest first, capped at 50 with the cap **stated**
  when the list is shorter than the count;
- one line, in their own language, saying invites pay nothing:
  *"Inviting is sharing, not earning — 50pick pays no reward for invites. 18+."*

Entry points reappear with neutral wording (avatar menu, the profile settings row, the top bar and
the More rail). On the register page the friend sees **"Invited by &lt;name&gt;"** and **no offer**.

**Shared links — what carries a code and what does not, measured:**

| Surface | Carries `?ref=` | Does it bind? |
|---|---|---|
| The player's own link from `/profile/invite` | yes — `/auth/register?ref=CODE` | **yes**, directly |
| A market shared from the **market detail** page | yes | **yes** — the detail page's sign-up CTA now forwards `ref` into `/auth/register` (it used to rebuild the query from `next` alone and drop it, so every one of these was dead) |
| A position shared from `/positions` | yes | **yes**, via the same market landing |
| The small share icon on a market **CARD** | **no** | ⛔ it has never passed a code, for any programme — see §11 |

⚠️ `?ref=` is read in exactly ONE place, `/auth/register`. Any future surface that appends a code
to a link which does not land there must forward it, or it is decoration.

⛔ **What is NOT on the page, by construction:** the earnings ring, the "Earned" tile, the adaptive
promise rows, the bonus-requirements list, the per-friend money column, the paid programme's
Active/Paused chip, and gold anywhere (`DESIGN_AUTHORITY` §M3 — struck gold means money was
earned). Each of those is a conditional on one server-resolved flag, `rewardsLive`, threaded from
the read model so the page and the payer cannot drift apart.

## 3 · What the operator sees

`/admin/affiliate`, which is the **player referral** programme — not `/admin/invites` (SMS
campaigns) and not `/admin/agents` (the paid agent programme; both untouched):

- the header chip reads **Unpaid — tracking only**;
- **Invites by player** — the FULL roster, paginated, ranked by friends joined. ⭐ It used to be a
  top ten ranked by money earned; with the platform paying nothing that sorted on a column of
  zeros, and a top-ten cut is useless as a payables list — the eleventh person is not a rounding
  error, they are somebody who does not get paid;
- KPIs: **Total referrals** (summed from the SAME roster rows below it, so the headline and the
  table can never disagree — it used to count the AGENT programme's recruits too), **Players
  inviting** (how many brought ≥ 1 friend, over every account), and **Paid by 50pick**, which SUMS
  what the platform has actually paid on this programme rather than printing a constant. It reads
  TZS 0 while `inviteRewards` is WITHDRAWN, because no new accrual can be created — but if the
  switch is ever flipped on and off again, or a legacy reward was paid before 2026-09-25, the tile
  agrees with the Payout ledger on the same page instead of contradicting it;
- a compliance note stating what is live and what switching it on would make it.

⛔ **Cash paid to an inviter outside the platform is recorded nowhere in 50pick.**

## 4 · Why not just set the commission to 0%

This was the obvious alternative and it would not have held:

1. `affiliate.config` ships with **`prize.enabled: true`, TZS 10,000 a head** and commission
   already OFF. The rate is not the payer — the prize mode is. A zero rate silences a branch that
   was already silent.
2. It is a **DB row**. `defineConfig` hydrates a persisted row as `{ ...defaults, ...restored }`
   with no validation, and `/admin/affiliate` is one click from switching a mode on. This is the
   exact route by which `feeVatRatePct` reached production as **0** (COMPLIANCE-DECISIONS
   § 2026-09-09).
3. A product state outranks an operator config, by this codebase's own rule (`feature-state.ts`
   header: *"an operator cannot switch a withdrawn feature back on by editing a row"*).

So `policyFor`'s PLAYER branch refuses **above** `cfg.enabled`:

```ts
if (!playerInviteRewardsLive()) return { ok: false, refusal: "player_rewards_withdrawn" };
if (!cfg.enabled) return { ok: false, refusal: "programme_disabled" };
```

⛔ **And it is a refusal, not a zero-rate policy.** Returning `rate: 0` would have run the whole
window/cap/idempotency path and written a **TZS 0 reward row** — a payable an officer could later
be asked to settle, and a line on the player's page — while `auditRefusal`, the reason an unpaid
accrual is explainable at all, never fired.

## 5 · Who may hold a link

`playerInviteEligibleFor(user, account)` — both halves are load-bearing:

- **account status** — CLOSED, SUSPENDED and SELF_EXCLUDED are out, the same three the agent
  programme refuses on. A link is a public artefact on WhatsApp that never expires, and
  `bindRecruit` runs server-side against the referrer's stored row long after they have gone.
  ⚠️ COOLED_OFF keeps their link: that break is about their own betting, and sharing is not betting.
- **not an agent, in or out of standing** — anyone with `approvedAt` is routed down the AGENT
  branch by `mayRecruit` and a deactivated one is refused there. Without this clause every surface
  would mint them a player code that `bindRecruit` then refuses for everyone who used it — a link
  that cannot bind is worse than no link, because the sharer believes they are being counted.
  ⭐ Found by `test:agent-eligibility` 3.deactivated going red, not by reasoning about it.

## 6 · The seam, end to end

| Where | What it decides |
|---|---|
| `feature-state.ts` · `PRODUCT_STATE.invite` | is the surface part of the product |
| `feature-state.ts` · `PRODUCT_STATE.inviteRewards` | may a PLAYER-programme referral pay |
| `inviteStateFor(viewer)` | agent standing first, then product state + `playerInviteEligible` |
| `affiliate-service.ts` · `mayRecruit` | may this code create an attribution |
| `affiliate-service.ts` · `policyFor` | what, if anything, it pays |
| `getPlayerReferralSummary().rewardsLive` | whether the player's page may say a money word |
| `getAdminAffiliateStats().rewardsLive` | whether the admin page may |

One flag per question, resolved once on the server, threaded down. ⛔ No surface re-derives any of
them.

## 7 · Turning payment on later

One word: `inviteRewards: "ACTIVE"` in `feature-state.ts`, or `FEATURE_INVITEREWARDS=ACTIVE` on the
server. Everything the paid promo needs is still present and is still executed on every deploy —
`test:referral` §1–§5, `test:rg-cash-incentive` §5, `test:agent-policy` §1, `test:programme-isolation`
§2/§3, `test:concurrency` F and `test:withdrawn-features` §4 all drive the ON branch under that
override, which is why it will not have rotted.

⛔ **It becomes a regulated inducement at that moment.** Clear the reward structure with the Gaming
Board of Tanzania first; then keep referrer commission ≤ 50% of margin (§2.10a).

## 8 · The guard, and how it avoids being a suite of zeros

`scripts/player-invite-unpaid.test.mts` — 44 assertions. A feature whose headline promise is a
NEGATIVE is the easiest kind to ship broken, because a suite asserting zeros passes just as well
when the accrual engine is broken, the fixtures never bet, or the hooks are never called. So:

- the config is first set so the path **would** pay (all three modes on, no deposit required,
  TZS 1,000 minimum bet) — otherwise the zeros would be measuring the shipped defaults, the exact
  vacuity that shipped once in `withdrawn-features` §5d;
- **§4 is a control**: an approved agent IS paid on the identical hook, so the machine works;
- **§5 is the delta**: the same player path with `FEATURE_INVITEREWARDS=ACTIVE` DOES pay, so the
  zero in §2/§3 is caused by the switch under test and by nothing else;
- **§3** asks the resolver directly with every reward mode ON and a rate set — the assertion that
  says "0% would not have been the fix";
- **§6** proves the operator's roster is complete and ranked by people, not capped at ten.

`npm run red:player-invite-unpaid` reintroduces six real defects — the resolver stops consulting
the product state, the read model claims it pays, an agent out of standing falls back to the player
share, a self-excluded player keeps recruiting, the player branch opens for every viewer, and the
roster is cut to a top ten — and each turns **its own** assertion red. 6/6 proven.

## 9 · Files

| File | Change |
|---|---|
| `src/lib/feature-state.ts` | `inviteRewards` added; `invite` → ACTIVE; `InviteViewer.playerInviteEligible`; `playerInviteRewardsLive()` |
| `src/lib/server/affiliate-service.ts` | `playerStandingFor`, `playerInviteEligibleFor`; the PLAYER refusal in `policyFor`; `rewardsLive` on both read models; ribbon gated; roster full + re-sorted; `referrerCount` |
| `src/app/profile/invite/page.tsx` | every money element conditional on `rewardsLive`; royal instead of gold; the unpaid ladder and the no-reward line |
| `src/app/admin/affiliate/page.tsx` | unpaid chip, swapped KPIs, paginated roster, compliance note |
| `src/app/profile/page.tsx` | the settings row stops wearing the agent dashboard's words for a player |
| `src/components/layout/{app-shell,top-app-bar,avatar-menu}.tsx` | `invitePaid` threaded; the menu row loses "& Earn" and its gilt accent |
| `src/lib/i18n-dict.ts` | 10 keys × en/sw/zh |
| `scripts/player-invite-unpaid.test.mts` + anchors | the new guard and its control |
| `scripts/{withdrawn-features,agent-eligibility,agent-policy,programme-isolation,rg-cash-incentive,referral-signup,concurrency}.test.mts` | restated for the new product state — see §10 |
| `scripts/pre-deploy-live-check.mjs` | asserts the share surface is present AND no money word is |

## 10 · The guards that had to change, and why none of them was weakened

Seven suites asserted the old product state. Each was **restated**, not relaxed — and two of them
found real defects while being rewritten:

- `withdrawn-features` §1/§4/§5 — 69→86 assertions. §5a inverts (the bind lands, stamped PLAYER);
  §5a2 is NEW and keeps the refusal half honest (a self-excluded referrer binds nobody); §4 now
  drives the rewards switch ON *and* the surface switch OFF, so neither direction rots.
- `agent-eligibility` — 30→33. "A player is not live" becomes "a player is live and has no agent
  standing". ⭐ **3.deactivated caught the deactivated-agent fallback** described in §5.
- `agent-policy` §1 — 36→39. The shipped refusal is asserted first, with no override; the old paid
  controls survive inside one.
- `programme-isolation` §2/§3 — the money override added. ⭐ **§3's control was silently vacuous
  after the change** (it claimed the operator pause stopped the money, but the money was already
  off globally, so it would have passed with the pause removed). Proved by mutation: with the pause
  deleted it now reports `bonus=10000` and fails.
- `rg-cash-incentive` §5, `referral-signup` §1–§6, `concurrency` F — same class: a section about a
  cash incentive, a prize, or a race between three prize accruals has nothing to measure with the
  money off.

⚠️ `scripts/anchors/withdrawn-features.anchors.mjs` was **re-anchored**: the profile settings row no
longer calls `inviteViewerFor` inline. An anchor that cannot inject is a control that has silently
stopped controlling.

## 11 · The one gap left open, and why it is a decision rather than a bug

The **compact share icon on market CARDS** (`market-card.tsx` → `<ShareButton compact>`) passes no
`refCode`. It never has, for any programme — the paid agent's card shares were equally uncounted.

It is left that way deliberately:

- wiring it needs the player's code on `/markets`, `/`, `/results` and `/watchlist` — the four
  hottest pages in the product — and `ensureAffiliateAccount` **WRITES** a row on first call, so it
  would put a database write on the busiest read path for a player who has never opened the invite;
- it would also change **agent** attribution, which nobody asked for and which has money attached.

⭐ The journeys that matter are covered without it: the player's own link from `/profile/invite`
(the surface built for sharing) and a market shared from its **detail** page both land on
`/auth/register` with the code intact — §2 measures the first, and the detail page's CTA was fixed
to stop dropping the second.

⛔ If it is ever wired, the code must reach `/auth/register` — appending `?ref=` to a link that
lands anywhere else produces a code that cannot bind, which is worse than no code at all: the
sharer believes they are being counted.

## 12 - Which button turns payment on (there is none), and what happens when it moves

**There is no button.** `/admin/affiliate` cannot start payments, and that is the design, not an
omission. The only two levers are a one-word code change (`inviteRewards: "ACTIVE"`) or the
`FEATURE_INVITEREWARDS` variable on Railway - both need a deploy, both leave a trail, neither is a
misclick. Rewarding referrals is a regulated inducement: clear it with the Gaming Board first.

PROVEN, not argued (a 39-agent adversarial hunt, six angles, zero surviving paths):

- every admin field at maximum (commission **100%**, prize **TZS 1,000,000**, bonus **1,000,000**
  to both sides) then a real recruit driven through deposit, bet and settlement -> referrer
  **cash 0, bonus 0, zero reward rows**, four `affiliate.accrual_refused` audit rows;
- a **persisted config row hydrated past `validate()`** with `rate: 9999` -> still refused;
- CONTROLS that prove the machine works: an approved AGENT on the identical hooks was paid, and
  the same PLAYER path with `FEATURE_INVITEREWARDS=ACTIVE` paid out immediately;
- the only writer of a `ReferralReward` is `recordReward`, and every money caller funnels through
  `policyFor`; the invite-CAMPAIGN system credits the NEW user, never a referrer; `creditBonus`
  refuses outright; a forced `recruitedProgramme = "AGENT"` stamp plus a `commissionPct` still
  refuses with `agent_not_approved`. Only a direct database write of `approvedAt` pays, which is
  the agent programme behaving correctly, not the player invite.

### What happens the moment it IS switched on

Stated on the admin screen itself, because it is the thing an officer would get wrong:

- **Everyone already in the roster starts paying** on their NEXT bet, deposit or settlement. Their
  commission window runs from `attribution.boundAt` - the day they were invited - not from the day
  the switch moved (`commissionWindowEnd`), and the config is read at accrual time.
- Activity that has already happened is **not** back-paid: accruals fire from live hooks and
  nothing re-walks past bets.
- The banner prices this live from the officer's own stored values, so it can never quote a stale
  figure. An earlier draft of that banner said "never retroactively to the people already in the
  roster" - **false**, and corrected: it is the exact population that would start paying.

### The admin screen while unpaid

The three reward cards are **disabled**, not hidden: their stored values survive and return
untouched when the state flips. A banner says they are stored but not applied, names the one thing
that changes it, and prices what they would pay. ⛔ Before this, an officer could enable commission,
type 50%, press Save and get a success toast while nothing whatsoever happened.
