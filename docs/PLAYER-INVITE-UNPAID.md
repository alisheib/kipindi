# The unpaid player invite — a tracked link that pays nothing

**Decided and built 2026-09-25.** Rule: `docs/RULES.md` §2.10a. Decision record:
`docs/COMPLIANCE-DECISIONS.md` § 2026-09-25. Guard: `npm run test:player-invite-unpaid`, control
`npm run red:player-invite-unpaid`.

**Amended 2026-09-26: payment became the Owner's switch.** Whether invites pay is now decided by the
Owner's **Payable / Not payable** switch on `/admin/affiliate` (§3, §12). It is **Not payable by
default and in every failure mode**, so everything this file says about a link that pays nothing is
still the product as shipped. Decision records: `docs/COMPLIANCE-DECISIONS.md` § 2026-09-26 · Invite
payment becomes an Owner switch, and § 2026-09-26 · Deposit-tied invite rewards retired. Guards:
`npm run test:player-invite-unpaid` and `npm run test:invite-payable-db`, with their red controls
(§8).

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
switches now — `invite` and `inviteRewards` in `src/lib/feature-state.ts`. On 2026-09-25 they read
**ACTIVE** and **WITHDRAWN**. ⚠️ *Since 2026-09-26 both read ACTIVE*, and `inviteRewards` ACTIVE no
longer means "pays": it means the Owner **may** make invites payable. Until he does, and after any
missing, unreadable or tampered record, nothing is paid (§6).

⛔ **The money is off OUTSIDE the affiliate config, and that distinction is the whole design.** On
2026-09-25 the off switch was the code constant. Since 2026-09-26 it is the Owner's switch: a
separate HMAC-sealed row beneath the code/env ceiling, which no Save writes and which a hand edit
cannot forge without the server's `SESSION_SECRET`. (An older GENUINE record put back by someone with
database write access is another matter: see the replay note in §6.) See §4 and §6.

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
  *"50pick pays no reward for invites. 18+."* (`inviteNoRewardNote`; the longer wording was cut on
  2026-09-25 in `8a214a1a`)

**Where a player finds it — five doors, every one named "Alika marafiki · Invite friends · 邀请朋友"**
(the page's own title; one name for one destination), every one behind the same server-resolved
`inviteVisible`:

| Door | Phone (< 1024px) | Laptop |
|---|---|---|
| **Zaidi / More** — the ☰ at the bottom-right of the rail | ✅ the main phone door | — (no rail) |
| **Avatar menu** — the initials circle, top-right | ✅ opens as a centred sheet | ✅ dropdown |
| **Footer** — "Uadilifu / Fairness" column, every page | ✅ | ✅ |
| **/profile** — the settings row | ✅ | ✅ |
| **More ▾** in the top bar | — | ✅ |

⚠️ Until 2026-09-26 the Zaidi row read the bare verb **"Alika" / "Invite"** while every other door
said "Alika marafiki", and there was no footer link — on a phone the owner looked for the invite and
did not recognise the one-word row as it. Both fixed; see §13.

On the register page the friend sees **"Invited by &lt;name&gt;"** and **no offer**. (Since 2026-09-26
the ribbon can carry one offer only: a sign-up bonus to the new player, shown only while invites pay
— `invitePaysPlayers`, below — and that bonus is armed. It never carries a deposit offer.)

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
the read model so the page and the payer cannot drift apart. ⚠️ Since 2026-09-26 that flag is
`invitePaysPlayers` (`src/lib/affiliate-rules.ts`), the one player-facing "paid": the Owner's switch
composes Payable, the programme is not paused at service level, AND at least one reward is actually
armed, judged on the settings as last read from their row. So after "Make payable → Nothing yet" the
page still says "Invite friends", with no earnings dial and no requirements. The shell, the invite
page, the register ribbon, the avatar menu and `/api/health`'s `paying` all ask the same question.

## 3 · What the operator sees

`/admin/affiliate`, which is the **player referral** programme — not `/admin/invites` (SMS
campaigns) and not `/admin/agents` (the paid agent programme; both untouched):

- the header chip reads **Not payable** or **Payable**: one of two words, never a third. Until
  2026-09-26 it read "Unpaid — tracking only";
- **the state card** (2026-09-26, below). It replaces the master-switch row and the "stored, not
  applied" banner;
- **the reward settings**: commission, bonus and prize. While invites are **Not payable** every one
  is locked, captioned *"Locked — Not payable"*, and the server refuses a Save outright (§12). While
  they are **Payable** they are editable behind ONE Save, which the Owner or an officer whose role may
  act on the growth section can press. It reports success only after the row reads back. The page is
  seeded from the settings re-read from their row, and the Save posts `{ baseFingerprint, changes }`:
  the fingerprint of the settings the page loaded and ONLY the fields that changed. If the stored
  settings changed meanwhile it is refused, *"These settings changed since this page loaded — reload
  to see them."*, so a stale tab cannot re-arm a reward the Owner switched off. A draft the server
  would refuse is not sent: the Save stays disabled and the reason sits at the field (the commission
  rate is a whole percent). A Save that RAISES what the invite pays (a mode switched on, a higher
  rate, amount or window, a looser cap, a wider bonus recipient, a lower minimum bet, the deposit
  precondition dropped) also writes a COMPLIANCE `affiliate.reward.terms` row; if that row cannot be
  written the Save still lands, with a warning. A throw after the write began answers *"Outcome
  unknown — reload to see the current state."* ⛔ Since 2026-09-26 no reward is tied to a deposit
  (§7): where the Trigger and Milestone choices were, the page prints fixed lines, *"Sign-up · a deposit never triggers a
  referral reward (Responsible Gambling policy)"* and *"A friend's first bet · never a deposit amount
  (Responsible Gambling policy)"*;
- **Invites by player** — the FULL roster, paginated, ranked by friends joined. ⭐ It used to be a
  top ten ranked by money earned; with the platform paying nothing that sorted on a column of
  zeros, and a top-ten cut is useless as a payables list — the eleventh person is not a rounding
  error, they are somebody who does not get paid;
- KPIs: **Total referrals** (summed from the SAME roster rows below it, so the headline and the
  table can never disagree — it used to count the AGENT programme's recruits too), **Players
  inviting** (how many brought ≥ 1 friend, over every account), and **Paid by 50pick**, which SUMS
  what the platform has actually paid on this programme rather than printing a constant. It reads
  TZS 0 while invites are Not payable and nothing has ever been paid on the programme, because no
  new accrual can be created. But once invites have been payable and then stopped, or where a legacy
  reward was paid before 2026-09-25, the tile agrees with the Payout ledger on the same page instead
  of contradicting it. While invites are Payable the second and third tiles become **Active
  affiliates** and **Commission paid**;
- a compliance note stating what is live and what switching it on would make it.

### The state card (2026-09-26)

Every sentence on it is built on the server by `invitePayableDialogs` (`invite-rewards-ceremony.ts`),
from one fresh read of the switch (`invitePayableView`):

| State | What it says | The Owner | Anyone else |
|---|---|---|---|
| **Not payable** (the default) | *"Not payable · Hazilipwi"*: *"Invites are tracked; 50pick pays nothing. Every reward setting below is locked."* Then where the state came from: *"Since ‹when› · ‹who› · “‹reason›” · record #‹N›"*, *"Never switched on."*, *"Stored switch unreadable — treated as Not payable."* or, when the read failed, *"The stored switch could not be read just now — treated as Not payable. Reload to try again."* | **Make payable…** (§12), under the Owner's ceiling | *"Only the Owner can make invites payable, after Gaming Board clearance."* |
| **Payable** | *"Payable · Zinalipwa"*: *"50pick pays the rewards switched on below, as CASH, from each qualifying event."* Then the priced list of what pays, or *"No reward is switched on — nothing is paid yet."* | **Stop paying…** (§12) | *"You can change the amounts; only the Owner can stop payment."* |

‹who› is the display name the Owner chose, or *"the Owner"* when there is none; never a generated
"Player #…" handle. ⭐ **Stop paying… is offered to the Owner whenever the STORED record says Payable,
whatever the ceiling** — under either kill, under FORCED, and while paused at service level — so a
payment waiting to resume can always be recorded as Not payable.

- **Under the server's own ceiling (§6) the card says so, and offers no Make payable:** *"Withdrawn
  in the server's environment (FEATURE_INVITEREWARDS=WITHDRAWN); this page cannot turn it on."* (or
  *"Withdrawn in the server's code; this page cannot turn it on."*), or *"Forced on by the server
  (FEATURE_INVITEREWARDS=ACTIVE); the Owner switch is not in effect."* ⚠️ It also states the STORED
  position, because that decides what lifting the override does. Under the env kill with a stored
  Payable: *"Stored: Payable — suspended by the server (FEATURE_INVITEREWARDS=WITHDRAWN). Removing that
  setting resumes payment unless you stop it here."* (the code kill says the same of "the server's
  code"). Under FORCED: *"Stored: Payable — removing the server's setting keeps invites payable."* or
  *"Stored: Not payable — removing the server's setting stops payment."*
- **A stored Payable over the service-level pause** (`affiliate.config.enabled` false) reads **Not
  payable**, with *"Paused at service level — the switch says Payable but the programme is paused,
  so nothing is paid."* The Owner's copy adds *"Make payable re-arms it."*, and the Owner is offered
  both Make payable (re-arm) and Stop paying.
- **A restored older record is FLAGGED, not blocked.** When the stored record's number is below the
  highest one confirmed in the switch's COMPLIANCE trail, the card says *"The stored switch is older
  than its last recorded change (record #‹N› is stored; #‹M› was recorded). An older copy may have
  been restored — check the database, then set the switch again."* (the replay note in §6).
- **When the settings row could not be re-read**, the card says *"The reward settings could not be
  re-read just now — this page shows this server's last copy. Reload to try again."*
- **Always:** *"Rewarding referrals is a regulated inducement — the Gaming Board of Tanzania must
  clear this reward structure before it is paid. Commission ≤ 50% of margin is enforced."*

⛔ **Cash paid to an inviter outside the platform is recorded nowhere in 50pick** — by Ali's decision
of 2026-09-26 (`COMPLIANCE-DECISIONS.md` § 2026-09-26 · Cash paid to inviters stays OFF-platform),
not an omission. Do not build a cash log without a new one. The Owner's switch does not change this:
it governs only what 50pick itself pays.

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

⚠️ *2026-09-26:* (1) still holds; the shipped defaults are unchanged. (2) is narrower now.
`defineConfig` still merges a restored row unchecked, but `affiliate-config.ts` hands it a row
repaired field by field (`sanitizePersistedAffiliateConfig`: a bad field falls back to the value
that pays LEAST, never to the shipped prize, and switches its own mode, and only that mode, OFF), and
every save is type-checked (`validateAffiliateConfig`). While invites are Not payable the reward
settings are locked and the server refuses the Save. (3) is
why the Owner's switch sits BENEATH the product state rather than beside it, in its own sealed row
rather than in `affiliate.config` (§6).

So `policyFor`'s PLAYER branch refuses **above** `cfg.enabled`. As it reads since 2026-09-26
(comments elided):

```ts
if (!playerInvitePayable()) return { ok: false, refusal: "player_rewards_withdrawn" };
if (cfg.enabled !== true) return { ok: false, refusal: "programme_disabled" };
const terms = effectivePlayerTerms(cfg);
```

- `playerInvitePayable()` is the Owner's switch composed under the code/env ceiling (§6). It is
  synchronous and answers from this container's last read. It fails closed: false until a read has
  landed, and false again once that read is older than 10 s. Every money-path caller has just
  re-read the row (`refreshInvitePayable()`), so the answer is fresh there. The refusal keeps its
  2026-09-25 name, `player_rewards_withdrawn`, for continuity with the rows already in the audit chain.
- `cfg.enabled` is a **service-level pause** now, not a page control. Making invites payable sets it
  true, and no Save ever sends it. The test is `=== true`, never truthiness: a stored `"false"` is a
  string.
- `effectivePlayerTerms` prices the player commission as the payer may pay it: at most **50%** of
  margin, a window clamped to **1–60 months** (never 0, which `commissionWindowEnd` reads as
  lifetime), and a rate, window or cap that is not a sound number pays **nothing** rather than
  reading as uncapped.

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
| `feature-state.ts` · `inviteRewardsCeiling()` | ⭐ (2026-09-26) the **ceiling** over the money: **FORCED** (`FEATURE_INVITEREWARDS=ACTIVE`), **CLOSED** (`=WITHDRAWN`, or `PRODUCT_STATE.inviteRewards` WITHDRAWN) or **OWNER** (the shipped state: the Owner's switch decides). Any other env value falls back to the code, so a typo can neither force payment nor lift the kill |
| `invite-rewards-switch.ts` · the stored switch | the Owner's position, read strictly: **ABSENT** (no row, never switched on), **UNREAD** (the read failed or has not landed), **MALFORMED** (anything short of a correctly sealed, well-formed record) or **SET** |
| `composeInvitePayable(ceiling, stored)` | the composition: CLOSED → never · FORCED → always · OWNER → only a **SET** record saying `payable: true` |
| `refreshInvitePayable()` · the money path's fresh read of the switch | `accrualContextFor` (every PLAYER attribution), `payBonus` and `payPrize` re-read the row before `policyFor`. A failed read refuses that accrual |
| `confirmInvitePayableNow()` · the last word before a credit | a read of the switch that STARTS inside the payer's own lock and never shares a read already in flight, checked right before every credit: the prize, the bonus (once per recipient) and PLAYER commission. Not payable refuses, audited as `player_rewards_withdrawn`. ⚠️ It cannot catch a Stop that lands between this read and the credit, which is exactly what the Stop dialog says: a reward already being paid at that instant can still land. Agent commission is not governed by it |
| `reloadAffiliateConfig()` · the money path's fresh read of the reward settings | only once the switch has said payable, the same three callers re-read `affiliate.config` from its row (repaired on load, like hydration) and price from that, so a container that loaded the settings at boot (an older one during a deploy's overlap) cannot pay from stale ones. A row that cannot be read, or no row at all while invites are payable, refuses, as `player_config_unreadable`. Make payable and the Save re-read it the same way, under the switch's lock |
| `playerInvitePayable()` | the synchronous snapshot `policyFor` reads (§4) |
| `playerInvitePayableNow()` | the SCREENS' read of the switch, through a ≤ 10 s cache: the register ribbon, `/api/health`'s `payable`, the admin stats, and the first half of `invitePaysPlayersNow()` |
| `invitePaysPlayersNow()` | ⭐ (2026-09-26) the one player-facing "paid" (`invitePaysPlayers`): the switch composes Payable, the service-level pause is off, and at least one reward is armed in the settings as last read from their row (≤ 10 s, `inviteScreenAffiliateConfig`; a failed read, or no row, answers Not paid). The shell (and so the avatar menu), `/profile/invite` and `/api/health`'s `paying` ask it |
| `inviteStateFor(viewer)` | agent standing first, then product state + `playerInviteEligible` |
| `affiliate-service.ts` · `mayRecruit` | may this code create an attribution |
| `affiliate-service.ts` · `policyFor` | what, if anything, it pays |
| `affiliate-service.ts` · `onRecruitDeposit` | ⛔ (2026-09-26) that a deposit pays NO referral reward: it calls no payer, whatever any config says. While invites are payable, a retired deposit-tied mode still armed (by the stored row or the config in hand) is refused out loud, `player_deposit_trigger_retired`, and `payBonus` / `payPrize` refuse anything but a SIGNUP bonus or a FIRST_BET prize the same way (§7) |
| `getPlayerReferralSummary().rewardsLive` | whether the player's page may say a money word: since 2026-09-26 it is `invitePaysPlayers`, on the settings as last read from their row, and the promise lines are built from those same settings |
| `getAdminAffiliateStats().rewardsLive` | whether the admin page's numbers may |
| `invitePayableView()` · `paying` | the admin state card: **Payable** only when the switch composes to pay AND the service-level pause is off |

One flag per question, resolved once on the server, threaded down. ⛔ No surface re-derives any of
them.

**The truth table.** "Pays" means the switch allows payment. The service-level pause and the reward
modes still decide what, if anything, is paid.

| `FEATURE_INVITEREWARDS` | `PRODUCT_STATE.inviteRewards` | Ceiling | SET, `payable: true` | SET, `payable: false` | ABSENT | MALFORMED | UNREAD |
|---|---|---|---|---|---|---|---|
| `ACTIVE` | any | FORCED | pays | pays | pays | pays | pays |
| `WITHDRAWN` | any | CLOSED | — | — | — | — | — |
| unset, or any other value | `ACTIVE` (shipped) | OWNER | **pays** | — | — | — | — |
| unset, or any other value | `WITHDRAWN` | CLOSED | — | — | — | — | — |

**MALFORMED, and every one of these is Not payable:** a row that is not exactly `{ token }`; an
unsigned token or a bad signature; a record that is not exactly its seven fields; the wrong purpose;
a version other than 1; a `payable` that is not a boolean (`"true"` and `1` are not true); a `seq`
that is not a positive integer; a reason that is not trimmed, or not 5–300 characters; a `changedAt`
that is not an ISO timestamp; an empty `changedBy`.

**Where it is stored — no schema change.** One `SystemConfig` row, key `invite.rewards.switch`,
holding `{ token }`. The token is the record `{ purpose, v, payable, seq, changedAt, changedBy,
reason }` sealed with the server's HMAC (`signSession`, keyed by `SESSION_SECRET`). The purpose
`invite.rewards.switch` is sealed inside it, so no other token that secret signs can pass for one.

- ⛔ **A record cannot be FORGED.** Without `SESSION_SECRET` nobody can write a row that parses, and
  a row that does not parse is Not payable.
- ⚠️ **But an older GENUINE record can be REPLAYED — a known, accepted limit.** The seal proves a
  record was written with the server's secret, not that it is the latest one. Someone with database
  write access who puts back an earlier genuine record (one that said Payable, say) has it read as
  stored, and it PAYS. Nothing blocks that: the admin card shows the stored record's number
  ("· record #N") and FLAGS a stored record whose number is below the highest one confirmed in the
  switch's COMPLIANCE trail (§3), and the Owner then sets the switch again. Database write access is
  the boundary.
- ⚠️ **A `SESSION_SECRET` rotation fails CLOSED, by design.** Every stored record stops verifying,
  the page says *"Stored switch unreadable — treated as Not payable."*, and the Owner makes invites
  payable again through the ceremony (§12), which seals a new record under the new secret.
- **Why not a field of `affiliate.config`:** that row is what the reward-settings Save writes, and it
  is merged at load, so a field there could be flipped by a form or by a hand edit.

**How fresh.** Config on this platform loads at container boot and is not propagated between
containers, and a deploy runs the old and new containers side by side for about a minute
(`railway.json` `overlapSeconds: 60`). So the money path reads fresh (the two rows above), the
screens read through the ≤ 10 s cache (at most one `SystemConfig` read per container per 10 s), and
`policyFor` reads the snapshot the money path has just refreshed. With no `DATABASE_URL` (local dev,
every suite) the row lives in process memory and every read is synchronous and fresh.

## 7 · Turning payment on — the Owner's ceremony

⭐ **Since 2026-09-26 it is the Owner's act on `/admin/affiliate`, not a code change and not a
deploy:** the ceremony in §12, with a written reason and the typed words `MAKE PAYABLE`, defaulting
to every reward switched off. ⚠️ *Until 2026-09-26 this section read "One word: `inviteRewards:
"ACTIVE"` … or `FEATURE_INVITEREWARDS=ACTIVE`". The code constant now reads ACTIVE and means only
that the Owner's switch decides.*

`FEATURE_INVITEREWARDS` stays as the INFRASTRUCTURE override, above the Owner's switch. `WITHDRAWN`
is the hard kill: nothing the page does can pay, and the page says so. The Owner can still Stop
paying under it, and lifting it resumes payment unless he has (§3). `ACTIVE` FORCES payment and
bypasses the ceremony. It is for tests and infrastructure, and the page says *"Forced on by the
server"* while it is set. Everything the paid promo needs is still present and still executed:
`test:referral` §1–§5, `test:rg-cash-incentive` §5, `test:agent-policy` §1, `test:programme-isolation`
§2/§3, `test:concurrency` F, `test:withdrawn-features` §4 and `test:house-bot-money` §11.6/§11.8 all
drive the ON branch under `FEATURE_INVITEREWARDS=ACTIVE` (the FORCED ceiling), which is why it will
not have rotted. Every one of them runs in `predeploy` except `test:house-bot-money`, which needs a
scratch database.

⛔ **It becomes a regulated inducement at that moment.** The Gaming Board of Tanzania must clear the
reward structure first (§2.10a); the page and the Make-payable dialog both say so. ⭐ Since 2026-09-26
referrer commission ≤ **50% of margin is a RULE, enforced** in three places: refused on save
(`validateAffiliateConfig`, in whole percent), repaired on load (a mode with any out-of-rule field,
the rate included, loads switched OFF) and clamped again at accrual (`effectivePlayerTerms`). On
2026-09-25 it was only guidance printed in the compliance note. The commission window is **1–60
months**; the player promo has no lifetime term.

⛔ **No reward is tied to a deposit: the deposit-tied modes are RETIRED (Ali, 2026-09-26).** The
published Responsible Gambling policy promises, among the operator's responsibilities (§4 of
`/legal/responsible-gambling`): *"No bonus offers tied to deposit increases"*. The `FIRST_DEPOSIT`
bonus (a bonus for depositing) and the `DEPOSIT_THRESHOLD` prize (a prize for depositing enough) were
exactly that. So the paid promo can pay three things only: the **sign-up** bonus (`BonusTrigger` is
`SIGNUP` alone), the **first-bet** prize (`PrizeMilestone` is `FIRST_BET` alone) and commission at
settlement.
- A Save naming a retired mode is refused, with a sentence that names the policy.
- A stored row naming one loads with that mode switched OFF. It is never re-pointed at another
  choice, because that would start paying a reward nobody armed.
- `depositThresholdTzs` is gone, and the price never quotes a retired mode.
- A deposit pays no referral reward (§6, `onRecruitDeposit`).
- ⚠️ `requireDeposit` on the first-bet prize STAYS. It is an anti-fraud precondition (an account that
  never funded itself cannot farm prizes with free sign-ups), not a reward for depositing: the prize
  grows with nothing deposited. A failed read of it now pays nothing on that bet, and the friend's
  next qualifying bet re-checks.

Decision record: `COMPLIANCE-DECISIONS.md` § 2026-09-26 · Deposit-tied invite rewards retired.

## 8 · The guard, and how it avoids being a suite of zeros

`scripts/player-invite-unpaid.test.mts` (`npm run test:player-invite-unpaid`). ⚠️ *No counts are
quoted in this file: re-derive them by running `npm run test:player-invite-unpaid` and
`npm run test:invite-payable-db`, and their red controls `npm run red:player-invite-unpaid` and
`npm run red:invite-payable-db`.* The lists below name what the suites cover; they are not an index,
so read the suites' own section headers. A feature whose headline promise is a NEGATIVE is the
easiest kind to ship broken, because a suite asserting zeros passes just as well when the accrual
engine is broken, the fixtures never bet, or the hooks are never called. So:

- the config is first set so the path **would** pay (all three modes on, no deposit required,
  TZS 1,000 minimum bet) — otherwise the zeros would be measuring the shipped defaults, the exact
  vacuity that shipped once in `withdrawn-features` §5d;
- **§4 is a control**: an approved agent IS paid on the identical hook, so the machine works;
- **§5 is the delta**: the same player path with `FEATURE_INVITEREWARDS=ACTIVE` DOES pay, so the
  zero in §2/§3 is caused by the switch under test and by nothing else;
- **§3** asks the resolver directly with every reward mode ON and a rate set — the assertion that
  says "0% would not have been the fix";
- **§6** proves the operator's roster is complete and ranked by people, not capped at ten;
- **§7** (2026-09-26) signs a friend up through `registerWithPassword({ referralCode })` — the ONE
  call the register form makes with its hidden `ref` — and proves they are attributed (PLAYER, with
  the code), counted on the inviter's page, and paid for by nobody; an unknown code is the control.
  Before it, every suite called `bindRecruit` directly and nothing covered the form's hand-off.
- ⭐ **§8 · the Owner's switch (2026-09-26)** is driven, not read: the default (no row: refused, no
  reward row), every row of the §6 truth table, each MALFORMED shape, an unreadable store, and a
  switch stopped in ANOTHER container behind this one's cache (the next settlement, first bet and
  sign-up each re-read the row and are refused). It also drives each refusal of the ceremony (no
  viewer, a GROWTH officer, the reason, the words, the seq, the price), "Nothing yet" switching every
  mode off and a later Save paying a prize as CASH, the COMPLIANCE row, the env kill over a stored ON,
  the forced ceiling over a stored OFF, the Owner-only stop, the locked Save, validation, load repair
  and the 50% clamp.
- ⛔ **`8.retired.*` · the retired deposit-tied modes (2026-09-26, §7).** A Save naming either is
  refused, a stored row arming them loads OFF, the price never quotes them, a REAL deposit pays
  nothing, a retired mode left armed is refused out loud (`player_deposit_trigger_retired`), and both
  payers refuse one. CONTROLS show that the sign-up bonus, the first-bet prize and `requireDeposit`
  stay, and that a failed deposit read pays nothing.

`scripts/invite-payable-db.test.mts` (`npm run test:invite-payable-db`, in `predeploy` right after
this suite) proves what only a database can break: a container that reads the switch fresh but
prices from the settings it BOOTED with. §1 drives `defineConfig.reload()` itself; §2 the money path (`accrualContextFor`, `payPrize`, `payBonus`) on a
stale container; §3 the ceremony and the Save on a stale container; §4 a stored row that still arms a
retired deposit-tied mode (it loads OFF, is refused out loud, and clears on a Save). ⛔ It can never
touch a real database: it refuses to start when `DATABASE_URL` is set to anything but its own fake,
non-routable URL, or when `NODE_ENV=production`, and it runs the config layer against a fake client.

`npm run red:withdrawn-features` holds the other half: every door to the page must sit beside its
gate (§7 of that suite), including the footer door added 2026-09-26.

**The red controls.** Their anchors are in `scripts/anchors/agent.anchors.mjs`, one entry per
planted defect, each named there. Each planted defect must turn **its own** assertion red. Among them:
- `npm run red:player-invite-unpaid`:
  - the 2026-09-25 set: the resolver stops consulting the switch, the read model claims it pays, an
    agent out of standing falls back to the player share, a self-excluded player keeps recruiting,
    the player branch opens for every viewer, and the roster is cut to a top ten. The first two were
    re-anchored onto the switch on 2026-09-26;
  - for the Owner's switch (2026-09-26): the parser coerces a non-boolean `payable`; the env kill is not
    read; a CLOSED ceiling composes to pay; the Owner check becomes "has a role"; the typed words and
    the reason floor are dropped; the Save's lock is dropped; the 50% ceiling becomes 100%; the clamp
    is dropped (in the rules and in `policyFor`); each of the three fresh reads trusts a cache; the
    seq and the price are not re-checked; "Nothing yet" leaves the prize on; the Save stops dropping
    `enabled`; and a failed store read keeps the last answer;
  - for the retired modes (2026-09-26): the trigger and the milestone rules accept a deposit again; the
    load re-points a mode instead of switching it off; the price quotes a retired bonus or prize; the
    deposit hook stays silent, or pays again; each payer pays on any trigger or milestone; and the
    `requireDeposit` read fails open.
- `npm run red:invite-payable-db`, on the reload path: `defineConfig.reload()` fails
  open, does not replace the cache, lands over a newer value, does not wait for a pending save, loses
  to a slow boot hydration, or stops sharing one read; the money path, the ceremony and the Save each
  price from, or fall back to, the boot-time cache; the settings are read before the switch; and the
  stored row is no longer noted as it is read.

⛔ A red control mutates the working tree: run it alone, never beside another session's harness.

## 9 · Files

**2026-09-25 — the unpaid invite** (rows that describe the old admin page are history; see the
2026-09-26 table below for what replaced it):

| File | Change |
|---|---|
| `src/lib/feature-state.ts` | `inviteRewards` added; `invite` → ACTIVE; `InviteViewer.playerInviteEligible`; `playerInviteRewardsLive()` (deleted 2026-09-26, below) |
| `src/lib/server/affiliate-service.ts` | `playerStandingFor`, `playerInviteEligibleFor`; the PLAYER refusal in `policyFor`; `rewardsLive` on both read models; ribbon gated; roster full + re-sorted; `referrerCount` |
| `src/app/profile/invite/page.tsx` | every money element conditional on `rewardsLive`; royal instead of gold; the no-reward line |
| `src/app/admin/affiliate/page.tsx` | unpaid chip (history: since 2026-09-26 the chip reads Payable / Not payable), swapped KPIs, paginated roster, compliance note |
| `src/app/profile/page.tsx` | the settings row stops wearing the agent dashboard's words for a player |
| `src/components/layout/{app-shell,top-app-bar,avatar-menu}.tsx` | `invitePaid` threaded; the menu row loses "& Earn" and its gilt accent |
| `src/components/layout/{bottom-nav,top-app-bar,public-footer}.tsx` | (2026-09-26) every door says "Invite friends"; the footer door, behind `inviteVisible` |
| `src/app/admin/affiliate/affiliate-admin-client.tsx` | (2026-09-26, `5a904737`) the master-switch row wraps at phone width. History: that row was removed the same day, replaced by the Owner's state card (below) |
| `scripts/live/invite-{prod,admin}-drive.mjs` · `npm run qa:invite-phone` / `qa:invite-admin` | the production drives of §13 (`invite-admin-drive.mjs` rewritten 2026-09-26, below) |
| `src/lib/i18n-dict.ts` | the unpaid page's own keys × en/sw/zh — `inviteFriends`/`inviteFriendsSub`, `friendsJoined`, `yourFriends`, `noFriendsYet`/`noFriendsBody`, `inviteNoRewardNote`, `inviteListCapped` |
| `scripts/player-invite-unpaid.test.mts` + anchors | the new guard and its control |
| `scripts/{withdrawn-features,agent-eligibility,agent-policy,programme-isolation,rg-cash-incentive,referral-signup,concurrency}.test.mts` · `scripts/lib/house-bot-money-cases.mts` | restated for the new product state — see §10 |
| `scripts/pre-deploy-live-check.mjs` | asserts the share surface is present AND no money word is. ⚠️ Since 2026-09-26 it first asks `/api/health` → `inviteRewards.payable`: the no-money-word checks run only while it is `false` and are SKIPPED, printed with the reason, while it is `true`; the share checks run in both states; a missing or malformed field FAILS |

**2026-09-26 — the Owner's switch, and the retired deposit-tied modes:**

| File | Change |
|---|---|
| `src/lib/feature-state.ts` | `inviteRewards` ACTIVE, redefined as "the Owner's switch decides"; `playerInviteRewardsLive()` DELETED, so the compiler named every caller; `InviteRewardsCeiling` + `inviteRewardsCeiling()`. Still no server imports: client bundles reach this file |
| `src/lib/server/invite-rewards-switch.ts` | NEW, the read side: the sealed row, the strict parser, the composition, `playerInvitePayable` / `refreshInvitePayable` / `confirmInvitePayableNow` (the in-lock last word) / `playerInvitePayableNow`, the player-facing `invitePaysPlayersNow` and `inviteScreenAffiliateConfig`, `invitePayableView` (with the stored position and the older-record flag), the verified write primitive and the test seam |
| `src/lib/server/invite-rewards-ceremony.ts` | NEW: the Owner's ceremony (`switchInvitePayable`: the attempt row before any write, the outcome read back, `confirmed: false` when unknown, the re-arm), the locked, fingerprinted Save (`saveInviteRewardSettings`, with the `affiliate.reward.terms` row) and every sentence of the state card and both dialogs (`invitePayableDialogs`) |
| `src/lib/affiliate-rules.ts` | NEW, pure and browser-safe: the config type and defaults, the 50% ceiling, the 1–60 month window, validation, load repair, `effectivePlayerTerms`, `priceInviteRewards`, the price fingerprint, `changedRewardFields` (the Save's post), `rewardTermsRaised`, `invitePaysPlayers` (the player-facing "paid") and `cleanReason`. The retired deposit-tied modes: `BonusTrigger` is `SIGNUP` only, `PrizeMilestone` is `FIRST_BET` only, `DEPOSIT_TRIGGER_RETIRED_REASON` / `DEPOSIT_MILESTONE_RETIRED_REASON`, `retiredDepositModes`; `depositThresholdTzs` dropped |
| `src/lib/server/define-config.ts` | `reload()`: re-reads a row and replaces the process's cache, failing closed, and says whether a row exists |
| `src/lib/server/audit.ts` | unchanged by this work — its `recorded` answer (replan ruling 543, house bots) is what the ceremony reads: `audit()` never rejects, so a compliance row that must precede its act is known to be on file only when `recorded` is true (false: `PERSIST_FAILED` or `UNSIGNED`). The ceremony's attempt and outcome rows and the `affiliate.reward.terms` row read it |
| `src/lib/server/affiliate-config.ts` | validation and load repair from the rules file; known keys only; `setAffiliateConfigVerified`; `reloadAffiliateConfig()`, the fresh read of the settings (with `stored`: whether a row exists); `armedRetiredDepositModes()` for the deposit hook's audit |
| `src/lib/server/affiliate-service.ts` | `policyFor` asks the switch, takes `cfg.enabled` only when `=== true`, and clamps the player terms; `accrualContextFor`, `payBonus` and `payPrize` read the switch and the settings fresh (`player_config_unreadable`, a missing row included); `confirmInvitePayableNow()` inside the lock before every PLAYER credit; the player read model and the ribbon use `invitePaysPlayers`. `onRecruitDeposit` pays nothing, and the payers refuse a retired mode (`player_deposit_trigger_retired`); the `requireDeposit` read fails closed |
| `src/app/admin/affiliate/actions.ts` | `setInvitePayableAction` (NEW); `saveAffiliateConfigAction` becomes the locked, verified Save of `{ baseFingerprint, changes }`, which may land with a warning |
| `src/app/admin/affiliate/{page,affiliate-admin-client,payable-switch}.tsx` | the chip, the state card, the locked settings and the two dialogs; `payable-switch.tsx` is NEW and receives its action as a prop. The page re-reads the settings row before seeding the form; a Save is disabled on an invalid draft, with the reason at the field; the commission rate is a whole percent. The Trigger and Milestone choices become fixed lines naming the RG policy |
| `src/app/auth/register/page.tsx` · `src/lib/i18n-dict.ts` | the ribbon's first-deposit offer and its `getOnFirstDeposit` key (en/sw/zh) are removed, so the ribbon carries a sign-up offer only; the bet requirement reads its amount from the stored settings (`inviteReqBet` with `{amount}`, `inviteReqBetAny`); `programPaused` removed |
| `src/app/api/health/route.ts` | `inviteRewards`: `payable`, `paying` and `ceiling`; no reason and no author |
| `src/components/layout/app-shell.tsx` · `src/app/profile/invite/page.tsx` | both read `invitePaysPlayersNow()`, the one player-facing "paid", alongside the session (the shell) and the viewer (the page), not after them |
| `src/components/layout/avatar-menu.tsx` · `src/lib/server/achievements.ts` | comments only |
| `scripts/player-invite-unpaid.test.mts` · `scripts/anchors/agent.anchors.mjs` | §8, the Owner's switch and `8.retired.*`; the gate's mutations: two of the 2026-09-25 set re-anchored onto the switch, and the switch's and the retired modes' own (§8) |
| `scripts/invite-payable-db.test.mts` · `npm run test:invite-payable-db` / `red:invite-payable-db` | NEW: the switch in database mode (§8), in `predeploy` right after `test:player-invite-unpaid`; it refuses to run against any real `DATABASE_URL` |
| `scripts/qa-invite-ceremony.mjs` · `npm run qa:invite-ceremony` | NEW, ⛔ LOCAL ONLY: it really performs Make payable → arm the prize → Save → Stop paying, reading each state from the page and from `/api/health`, and it refuses any address but `http://localhost:PORT`. Its screenshots (`.qa-invite-ceremony/`) are git-ignored |
| `scripts/live/invite-admin-drive.mjs` (`qa:invite-admin`) | REWRITTEN, production-safe: every request carrying a `next-action` header (a server action) is aborted and fails the run, the net is first proven on a decoy, and the Make-payable dialog is opened and typed into but never confirmed |
| `scripts/pre-deploy-live-check.mjs` · `scripts/live/withdrawn-render-drive.mjs` | the unpaid checks branch on `/api/health` → `inviteRewards.payable` (above) |
| `scripts/ops-prelaunch-reset.mts` | the pre-launch reset DELETES `invite.rewards.switch` along with the AuditLog that recorded it: after a reset invites read "Never switched on" until the Owner repeats the ceremony |
| `scripts/{agent-policy,concurrency,programme-isolation,referral-signup,rg-cash-incentive,withdrawn-features}.test.mts` · `scripts/lib/house-bot-money-cases.mts` · `src/app/api/dev-test/affiliate-*` | restated for the switch (`FEATURE_INVITEREWARDS=ACTIVE` is the FORCED ceiling) and for the retired modes (fixtures move to SIGNUP / FIRST_BET) |
| `scripts/unsaved-changes.test.mts` · `scripts/polish-integration-audit.mjs` | `payable-switch.tsx` is exempted under class ①: its typed fields live only inside a modal that the scrim and Escape cannot close once anything is entered. The audit's toggle check moves from the removed master switch to `/admin/system`'s "Publish banner" |

## 10 · The guards that had to change, and why none of them was weakened

Eight suites asserted the old product state. Each was **restated**, not relaxed — and two of them
found real defects while being rewritten:

- `withdrawn-features` §1/§4/§5. §5a inverts (the bind lands, stamped PLAYER);
  §5a2 is NEW and keeps the refusal half honest (a self-excluded referrer binds nobody); §4 now
  drives the rewards switch ON *and* the surface switch OFF, so neither direction rots.
- `agent-eligibility`. "A player is not live" becomes "a player is live and has no agent
  standing". ⭐ **3.deactivated caught the deactivated-agent fallback** described in §5.
- `agent-policy` §1. The shipped refusal is asserted first, with no override; the old paid
  controls survive inside one.
- `programme-isolation` §2/§3 — the money override added. ⭐ **§3's control was silently vacuous
  after the change** (it claimed the operator pause stopped the money, but the money was already
  off globally, so it would have passed with the pause removed). Proved by mutation: with the pause
  deleted it now reports `bonus=10000` and fails.
- `rg-cash-incentive` §5, `referral-signup` §1–§6, `concurrency` F — same class: a section about a
  cash incentive, a prize, or a race between three prize accruals has nothing to measure with the
  money off.
- `house-bot-money` §11.6/§11.8 (`scripts/lib/house-bot-money-cases.mts`) — drives the PLAYER prize
  through the real deposit/bet hooks and set only `FEATURE_INVITE=ACTIVE`, so after the split it
  silently read `prizes: []`; it now sets `FEATURE_INVITEREWARDS=ACTIVE` too (`1e49b3b9`). Missed by
  the first pass and caught by the audit — this section said "seven" until 2026-09-26.

⚠️ `scripts/anchors/withdrawn-features.anchors.mjs` was **re-anchored**: the profile settings row no
longer calls `inviteViewerFor` inline. An anchor that cannot inject is a control that has silently
stopped controlling.

## 11 · The card share icon carries no code — DECIDED, keep it that way

✅ **Ali, 2026-09-26: keep as is.** Asked directly ("should the small share icon on market cards
carry the player's invite code?"), with the two costs below in front of him. Do not wire it without
a new decision from him.

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

## 12 · The one control — the Owner's ceremony

⚠️ *Until 2026-09-26 this section was "Which button turns payment on (there is none)":
`/admin/affiliate` could not start payments, and the only levers were a one-word code change or the
`FEATURE_INVITEREWARDS` variable, both needing a deploy. Ali replaced that with a control of his own
on the page (`COMPLIANCE-DECISIONS.md` § 2026-09-26 · Invite payment becomes an Owner switch). What
stays true: it cannot be a misclick, it leaves a trail, and the Gaming Board must clear the reward
structure first.*

**Make payable** belongs to the Owner alone. The viewer's STORED role must be `ADMIN`; the role a
session cookie carries is never asked. Any other signed-in role is refused (*"Only the Owner can
make invites payable."*) and a SECURITY `privilege_escalation_blocked` audit row is written. No
session at all is a session that ended, not an escalation: *"Your session ended — sign in again.
Nothing changed."*, with no SECURITY row. The server (`switchInvitePayable`) checks, in this order:

1. **A session, then the Owner**, on the stored row.
2. **The console's own two-step status** for the session. ⚠️ There is **no authenticator code in
   the ceremony**: Ali's choice, 2026-09-26. The status passes while the server runs with
   `DISABLE_ADMIN_TOTP=true`, which production does (`/api/health` → `security.adminTotp:
   "DISABLED"`, read 2026-09-26).
3. **A written reason**, cleaned of invisible characters (zero-width spaces, bidi marks, controls
   and the like; `cleanReason`) and then trimmed, and only then measured: 5–300 characters. Five
   zero-width spaces are not a reason. The dialog's counter counts the same cleaned text. The reason
   is sealed into the record, shown on the card, and kept in the COMPLIANCE rows.
4. **On only:** the ceiling must be OWNER (FORCED and CLOSED each refuse with their own sentence).
   The typed words must be **`MAKE PAYABLE`**, compared exactly after trimming, with no case
   folding, so habit cannot arm it. And the Owner chooses what pays from now: **"Nothing yet — switch
   every reward off; I will set them below and Save"** (the default), or **"The settings on this
   page"**, accepted only while they are still the settings the Owner saw priced (a fingerprint of
   the reward modes, checked once, under the lock, against the settings re-read from their row).
5. **Under the switch's lock** (`invite-rewards:switch`, a Postgres advisory lock in production, so
   it holds across containers): a fresh read of the row (unreadable → refused), and the seq the page
   was rendered on (changed since → refused, "reload"). Then, ON only, the reward settings are
   re-read from their own row (unreadable → refused, nothing changes), so the write below cannot
   re-arm what a container remembers from boot. Then the no-op check (already payable, or already
   Not payable → nothing changes), and for "the settings on this page" the price check. Before any
   write, a COMPLIANCE `affiliate.payable.attempt` row naming who, which way, why and the record
   number must be DURABLY on file (`audit()` answers `recorded`); a database that refuses it changes nothing:
   *"The compliance record could not be written first, so nothing changed. Try again."* Then, ON, the reward settings are written FIRST, as a
   verified write that lifts the service-level pause and, for "Nothing yet", switches all three modes
   off; the sealed record is written SECOND, and only if the settings write landed. Then what now
   holds is RE-READ (the switch, and for ON the settings too), and the answer is what those reads
   say. If they cannot be read, or anything throws once a write has begun (a lock timeout included),
   the answer is *"Outcome unknown — reload to see the current state."*, never "Nothing changed".
6. **After the lock**, one COMPLIANCE row, `affiliate.payable.on` or `affiliate.payable.off`, carrying
   from, the stored position before (`storedFrom`), to, reason, seq, ceiling, start, the price, and
   `confirmed: true`; an unknown outcome is recorded with `confirmed: false`. If the row cannot be
   written after a change that landed, the change stands and the Owner is told so beside the result.

⭐ **The re-arm.** With the stored record already Payable but the programme paused at service level,
the settings write alone makes invites payable again. It is reported and audited as the act
(`rearmed: true`), even when the switch's own record could not be updated, and the page then says
so.

⛔ **Settings first, switch second, and that order is the safe one.** Were the switch written first
and the settings write then to fail, invites would be payable on whatever modes were already on
(the shipped TZS 10,000 prize among them), which is exactly what "Nothing yet" exists to prevent.
The settings write is also the hydration gate: a container whose `affiliate.config` never loaded
holds the shipped defaults, and the verified write refuses there.

**Stop paying** belongs to the Owner too: a reason (5–300 characters, cleaned the same way) and
nothing else. There are no typed words, and the ceiling is not consulted, because stopping is the
safe direction. It is offered whenever the STORED record says Payable, whatever the ceiling: under
either kill (so lifting the kill then resumes nothing), under FORCED (it records Not payable for
when the server's setting is removed), and while paused at service level. The reward settings are
not touched; they are kept, and locked, and the outcome is read from the switch alone, so stopping
never depends on reading the settings. It writes the attempt row first and the COMPLIANCE row
`affiliate.payable.off` after. The dialog's first paragraph says what confirming changes in the
current state; while invites are paying it is *"No new referral reward starts from the moment you
confirm; a reward already being paid at that instant can still land."* Its second paragraph is
*"Paid rewards stay paid; the settings are kept, and locked."* That first sentence promises exactly
what the code does, and no more: every PLAYER credit (the prize, the bonus for each recipient,
PLAYER commission) re-reads the switch inside its payer's lock immediately before crediting
(`confirmInvitePayableNow`), so a reward still waiting on that lock is refused. Only a credit already
past that read can land.

⛔ **A refusal is an answer, never a throw.** Every outcome comes back to the dialog in words, and
only a change that landed revalidates `/admin/affiliate` and `/profile/invite`.

PROVEN on 2026-09-25, against the code-only switch this section then described (a 39-agent
adversarial hunt, six angles, zero surviving paths):

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

⭐ The same questions, asked of the Owner's switch, are the owner-switch section of
`test:player-invite-unpaid` and its red control (§8).

### What happens the moment it IS switched on

The Make-payable dialog says this before the Owner confirms, because it is the thing an officer
would get wrong (every bullet but the fifth restates one of the dialog's own sentences, with the
code behind it):

- **Everyone already in the roster starts earning** on their friends' NEXT bet or settlement, never
  on a deposit (§7). Each friend's commission window runs from `attribution.boundAt`, the day the
  friend signed up on the link (the dialog calls it their invite date), not from the day the switch
  moved (`commissionWindowEnd`).
- Activity that has already happened is **not** back-paid: accruals fire from live hooks and
  nothing re-walks past bets.
- With **"Nothing yet"**, nothing is paid at all until a reward is switched on and saved.
- **Every reward lands as withdrawable CASH** while the bonus wallet is withdrawn
  (`referralRewardDestination()`), to the inviter and to the new player alike, with no wagering and
  no expiry. ⚠️ Not "withdrawable at once": a player's first withdrawal still needs their identity
  check (KYC is asked at withdrawal), and the dialog says so. A credit that cannot land (a
  cooling-off break, a frozen wallet) is recorded HELD, not paid.
- Behind the dialog, each accrual re-reads the switch and, while it says payable, the reward
  settings, and each credit re-reads the switch once more inside its payer's lock, so what pays is
  what is stored now, in whichever container runs the accrual.
- The dialog prices "the settings on this page" and the roster they would reach: *"Already in the
  roster: ‹inviters›, ‹friends› → one-off rewards up to ‹TZS›; commission up to ‹TZS›"*, or
  *"commission with no ceiling"* when a friend's commission is uncapped. An earlier draft of the
  2026-09-25 banner said "never retroactively to the people already in the roster". That was
  **false**, and corrected: it is the exact population that would start earning.

### The admin screen while Not payable

Every reward setting is **locked**, captioned *"Locked — Not payable"*: shown rather than hidden, so
the stored values survive and return untouched when the state flips. ⭐ And the server refuses the
Save outright: *"Locked while Not payable — the reward settings change only while invites are
payable. Nothing was saved."* It decides on a FRESH read of the switch's row, under the switch's
lock, so a Save cannot land in the gap between a Stop paying and the page noticing, in this
container or another. Once the switch pays, the Save re-reads the settings from their row and merges
onto that, never onto this container's boot-time copy; a row that cannot be read saves nothing, and
a row that says the programme is paused keeps the settings locked. And it saves only if the stored
settings are still the ones the page loaded (their fingerprint travels with the post, beside only
the fields that changed); otherwise it is refused, and the page must be reloaded. `enabled` is
dropped from every Save: the two states are the master, and no form can pause or re-arm the
programme.

⛔ Until `8a214a1a` (2026-09-25), an officer could enable commission, type 50%, press Save and get a
success toast while nothing whatsoever happened. That commit disabled the toggles and said the
values were "stored, not applied". Since 2026-09-26 the server refuses the Save itself.

## 13 · Progress, and what was verified on PRODUCTION

### 2026-09-26/27 · This release: the Owner's switch, the retired deposit modes, the fix round

LIVE: <sha> — verified on production <date>

What this release does, as the code on branch `release-final` makes it true:
- **Payment becomes the Owner's switch** on `/admin/affiliate` (§3, §12): **Not payable** by default
  and in every failure mode; Make payable is the Owner's ceremony (a cleaned reason of 5–300
  characters and the typed words `MAKE PAYABLE`, defaulting to every reward off); Stop paying is the
  Owner's, reason only, and is offered whenever the stored record says Payable. The chip, the state
  card and the locked settings replace the master switch and the "stored, not applied" banner.
- **The money path** re-reads the switch, and while it says payable the settings, before pricing (a
  missing or unreadable settings row refuses), and re-reads the switch inside the payer's lock
  right before every PLAYER credit (§6).
- **The record**: an `affiliate.payable.attempt` row before any write, the outcome read back and
  recorded (`confirmed: false` when unknown), and an `affiliate.reward.terms` row for any Save that
  raises what the invite pays (§3, §12).
- **The Save** posts `{ baseFingerprint, changes }` and is refused when the settings moved under the
  page; it is disabled on an invalid draft; commission is a whole percent, ≤ 50% of margin, over 1–60
  months (§3, §7).
- **Player-facing "paid"** is `invitePaysPlayers`: payable, not paused, and at least one reward
  armed; `/api/health` carries `inviteRewards: { payable, paying, ceiling }` (§2, §6).
- **No reward is tied to a deposit**: the `FIRST_DEPOSIT` bonus and the `DEPOSIT_THRESHOLD` prize are
  retired, and a deposit pays no referral reward (§7).
- **A restored older switch record is flagged on the card, not blocked** (§3, §6).

⚠️ The deploy by itself pays nothing: no code before this release wrote an `invite.rewards.switch`
row, so the card reads "Never switched on" (Not payable) until the Owner's first ceremony, unless
the server's environment forces payment. On 2026-09-26 production had no `FEATURE_*` variable at
all (the table below). After the deploy, read `/api/health` → `inviteRewards` and re-run the
read-only admin drive (`npm run qa:invite-admin`, which never confirms anything).

### 2026-09-26 · The unpaid invite verified on production (HISTORY for `/admin/affiliate`)

⚠️ **The `/admin/affiliate` rows below describe the page BEFORE the Owner's switch, and are history.**
The chip "Unpaid — tracking only", the master switch and the "stored, not applied" banner were
measured on production and were true of it then. The Owner's Payable / Not payable switch (§3, §12)
replaced all three. Which build is live is one curl: `/api/health` carries `inviteRewards`
(`payable`, `paying`, `ceiling`) only from the switch's build onward (it was absent when read on
2026-09-26).

Until this date the work had only ever been checked on a local dev server. Measured on
https://www.50pick.tz, read-only apart from the one write named below:

| Check | Result |
|---|---|
| Live build contains the invite work | ✅ `?dpl=` = `360935a3`, which has `46e227a1` and `8a214a1a` as ancestors |
| No Railway override turns money on | ✅ `railway variables` (service 50pick, production): **no `FEATURE_*` key at all** — neither `FEATURE_INVITEREWARDS` nor `FEATURE_INVITE` |
| `/admin/affiliate`, laptop 1440 + phone 390 (HISTORY: the retired page) | ✅ **22/22** (`npm run qa:invite-admin`, the drive as it was then): chip "Unpaid — tracking only", the three reward toggles `disabled`, "stored, not applied" banner, "Paid by 50pick TZS 0", only two enabled controls (master switch · Save), roster present |
| `/profile/invite` as a player, phone 390, sw/en/zh | ✅ code, `…/auth/register?ref=CODE`, QR, the joined dial, the no-reward line in each language, **no money word and no gilt** in `<main>` |
| The link, opened signed OUT | ✅ lands on `/auth/register?ref=CODE`, the form's hidden `ref` carries it, the page names the inviter and makes no offer (GET only — no account created) |
| Doors on a phone | ⚠️ present but hard to find: Zaidi read the bare "Alika", no footer link → **fixed in `5a904737`, verified LIVE 2026-09-26**: `qa:invite-phone` **70/70** on production (sw/en/zh — Zaidi row, avatar menu, footer tappable, /profile row, the page, the signed-out link) |
| `/admin/affiliate` at 390 (HISTORY: the retired page) | ⚠️ the master-switch sentence was squeezed to ~110px → **fixed in `5a904737`, verified LIVE 2026-09-26**: `qa:invite-admin` **22/22** on production, the sentence wraps and the "Where players find it" note shows |

⭐ The sign-up → attribution step was proven **locally, never on production** (no real account
created there): `test:player-invite-unpaid` §7 above, and `qa:live` (281/282 locally — the one red
was "at least one bettable market exists" on an unseeded in-memory board, unrelated).

**How it was measured, and the costs** — so the next run is not rediscovered:
- The QA player `mobile01`'s password in this laptop's `C:\kipindi-mobile\.env.qa.local` was
  **stale** (`error=wrong_credentials`). With Ali's approval it was **reset on production
  2026-09-26** (one row, `passwordSetVia = OFFICER_TEMP`, lock counters cleared; no SMS — the only
  SMS senders are OTP, which is off, and invite campaigns). The new value is in that file on
  ALI-BLADE15 only: ⛔ **the office PC's copy is now stale — copy the two `QA_MOBILE01_*` lines over.**
- Signing in as `admin` signs Ali out of the console everywhere once (one session per account).
- The live board never reaches `networkidle`, and a fresh browser gets the first-visit primer over
  the rail; both drives handle it (see their headers).

**Ali's decisions, asked 2026-09-26 and answered the same day:**
1. §11 — the small share icon on market **cards** stays WITHOUT `?ref=` (**keep as is**).
2. The cash Ali pays inviters **off-platform** stays **off-platform and unrecorded** in 50pick (§3).
   ⚠️ He was told, when choosing, that paying for referrals is a regulated inducement whatever the
   channel; recorded in `COMPLIANCE-DECISIONS.md` § 2026-09-26 · Cash paid to inviters stays
   OFF-platform.
3. (Later the same day.) Invite payment becomes the Owner's **Payable / Not payable** switch on
   `/admin/affiliate`, Not payable by default (§3, §12); recorded in `COMPLIANCE-DECISIONS.md`
   § 2026-09-26 · Invite payment becomes an Owner switch. Decisions 1 and 2 stand.
4. (Later the same day.) Deposit-tied invite rewards are retired, so the published Responsible
   Gambling policy's "No bonus offers tied to deposit increases" stays true (§7); recorded in
   `COMPLIANCE-DECISIONS.md` § 2026-09-26 · Deposit-tied invite rewards retired.
