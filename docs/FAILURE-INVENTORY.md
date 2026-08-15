# 50pick — THE FAILURE INVENTORY

> **STATUS: 🔵 LIVE.** Workstream C's map: every server refusal a player can reach, what it
> actually means, what the player is told today, what they must be told, and at what severity.
>
> ⛔ **Nothing gets fixed before it is listed here.** This file was written and committed
> BEFORE any C-workstream change, so that "we fixed the messaging" can be checked against a
> list somebody made first rather than against the set of things that happened to get fixed.
>
> Measured 2026-08-14 against the source tree at `f70042e0`. The rule this serves is
> [`docs/RULES.md`](RULES.md) §2.9.

---

## §0 · THE STANDARD

Every player-facing refusal states **the reason** and **the next step**, at a severity that
matches what happened:

| Severity | Means | Channel | Examples |
|---|---|---|---|
| **info** | Nothing is wrong; we are telling them something | inline / factual toast | "selections closed" on a market they were only browsing |
| **warning** | **The player can fix it.** Their money did not move | inline or sticky toast, with the number they need | below minimum, above maximum, insufficient balance, rate-limited, daily limit reached, the bonus opposite-side warning |
| **error** | A genuine fault, or a hard block they cannot lift themselves | modal (must be acknowledged) or danger toast | suspended account, self-exclusion, system fault |

⛔ No screen renders a raw server string as a headline. ⛔ No screen says only "failed".
⛔ Never phrase-match English prose to decide what to show.

---

## §1 · WHAT IS ACTUALLY THERE TODAY

### 1.1 · The refusal vocabulary — 21 codes, no registry

`code:` string literals across `src/`, counted at server refusal sites only (excluding type
declarations, Selcom wire fields, KYC reject-reason codes and client-side syntheses):

| Code | Sites | |
|---|---:|---|
| `INVALID` | **108** | ~51% of everything. Covers bad input, stake bounds, RG deposit limits, daily loss limits, source-of-funds, four KYC families, "not your position", "market already resolved", the hedge block, insufficient balance… |
| `NOT_FOUND` | 33 | |
| `RATE_LIMITED` | 17 | |
| `SUSPENDED` | 15 | three distinct families: an RG break the player set, a frozen wallet, an operator pause |
| `SELECTION_CLOSED` | 5 | |
| `AUTH` | 4 | |
| `PAUSED` | 3 | |
| `EXPIRED` · `ALREADY_EXISTS` · `CONFLICT` | 2 each | |
| `BUSY` | 1 server + 2 client-synthesised | |
| `TOO_MANY_ATTEMPTS` · `EMAIL_EXISTS` · `EMAIL_UNVERIFIED` · `TOO_EARLY` · `OBJECTION_OPEN` · `UNTRUSTED_SOURCE` · `RG_LOCKED` · `DISABLED` · `AVATAR_TYPE` · `AVATAR_SIZE` | 1 each | |

Per file: `market-service.ts` 50 · `auth-service.ts` 35 · `kyc-service.ts` 27 ·
`wallet-service.ts` 26 · `objections-service.ts` 16 · `profile/actions.ts` 13 ·
`proposals-service.ts` 11 · `bonus-service.ts` 8 · `events-service.ts` 4 ·
`profile/kyc/actions.ts` 4 · `proposals/actions.ts` 4 · `markets/actions.ts` 2 ·
`profile/account/actions.ts` 2 · `responsible-gambling.ts` 1 · `user-service.ts` 1.

**There is no factory.** No `fail()`, no `refuse()`, no central enum. All ~200 sites
hand-write `{ ok: false, error: "<English sentence>", code: "<CODE>" }`. The vocabulary
exists only as scattered string literals, which is why there are 21 codes and no registry.

### 1.2 · Three different refusal SHAPES reach a player

| Shape | Where |
|---|---|
| `{ ok: false, error, code, retryAfterSec? }` | ~200 sites — the main one |
| `{ ok: false, error: "<CODE>" }` — the code is **in the error field** | `profile/actions.ts:92, :94, :95, :104, :122` |
| `NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })` | `api/positions/settled/route.ts:55` |

A caller that only knows the first shape silently mishandles the other two.

### 1.3 · Four copy mappers, and they disagree

| # | Mapper | Scope | Codes | Returns | Severity? |
|---|---|---|---:|---|---|
| 1 | `errorCopy` — `src/lib/error-copy.ts:37` | platform-wide, 11 importers | 20 + default | a bare **string** | ❌ none |
| 2 | `udBetErrorCopy` — `src/components/updown/updown-bet-errors.ts:52` | Up & Down bets, 1 importer (`use-quick-bet.ts`) | 6 + default | a **channel** union (`transient` \| `blocked`) | partial |
| 3 | `verifyErrorMessage` — `src/lib/verify-error.ts:15` | email resend only | 6, a **separate vocabulary** | a bare string | ❌ none |
| 4 | `errFor` — `src/app/profile/security/security-client.tsx:42` | local, unexported | — | a bare string | ❌ none |

Plus a fifth, local `errorToToast` at `conviction-dial.tsx:801` — the only one that returns
a severity, and it has just two (`danger` \| `warning`).

**The split is real, not cosmetic — the same refusal gets two different severities.**
`/loss limit/i` at `error-copy.ts:87` returns a string every caller renders as a **danger
toast**; `/daily loss limit|loss limit/i` at `updown-bet-errors.ts:70` returns an
**acknowledge modal**. One player, one refusal, two presentations, decided only by which
product they were in.

### 1.4 · Five tone vocabularies, and no shared `Severity` type

`ToastVariant` (6 values, unexported) · `OperationVariant` (4, exported) · Modal `Tone` (3) ·
`NoticeBarTone` (4, no danger) · `CalloutTone` (5). A case-insensitive grep for "severity"
across `src/` finds only admin/compliance/RG-internal uses — never player refusal copy.

⛔ **`warning` may NOT be a gold toast.** `toast.tsx:236` paints the warning variant gold, and
gold on this platform means **earned money only**. A warning-severity refusal uses NoticeBar
`warning`, Callout `warning`, or toast `default` — never toast `warning`.

### 1.5 · The gaps, counted

| | Count | Where |
|---|---:|---|
| Player-facing failure toast sites | **46**, across 21 files | plus 3 modal surfaces and 12 inline `role="alert"` banners |
| …that render a **raw server string** | ✅ **0 as of 2026-08-14** — was 12 |  `comments-thread.tsx:83/:103/:118` · `objection-dialog.tsx:61` · `create-form.tsx:77` · `export-data-button.tsx:19` · `profile/account/page.tsx:75` · `profile/source-of-funds/page.tsx:71` · `profile/responsible-gambling/page.tsx:79` · `auth/otp/page.tsx:65` · `auth/2fa/page.tsx:47` · raw `Error.message` at `avatar-uploader.tsx:94`, `kyc-doc-uploader.tsx:49`, `:154` |
| …that say only that something failed | **8** | `watch-star.tsx:81` · `position-share.tsx:56` · `push-settings.tsx:58/:62/:80` · `security-client.tsx` generic branch · `password-section.tsx:47` (title is the bare word "Failed") |
| …that are **SILENT** | **1** | `auth/login/page.tsx:138` — `default: return null` |
| …rendered as a **JSX BANNER** rather than a toast prop | **5**, and §10's ratchet cannot see them | 🔴 see the note below |
| Nothing tests any mapper | ✅ **closed 2026-08-14** | `test:failure-reasons` §8 pins every phrase test against the **server's own string**, §9 pins the code→reason→severity mapping, §10 is a ratchet at **zero** on raw renders. `red:failure-reasons` catches 16/16, including a reworded server sentence and a drifted pattern |

> ⭐ **THE RAW-STRING COUNT WAS SIX, NOT TWELVE — AND MEASURING IT WRONG COST TWO WOLF-CRIES.**
> The first ratchet counted 75 and the second 73, because it swept the **admin console** (an
> English-only staff surface by design) and counted `t.error.somethingDidntWork` — the
> DICTIONARY, which is the correct thing to render. Scoped to player surfaces, with the
> dictionary excluded, the real population was six, and all six are now converted:
> `comments-thread.tsx` ×3 · `objection-dialog.tsx` ×1 · `export-data-button.tsx` ×1 ·
> `create-form.tsx` ×1. The ceiling is **0** and may only stay there.
> ⚠️ 71 raw renders remain on the **staff** console. They are excluded deliberately, counted
> and printed by §10 rather than hidden inside a filter, and are not this inventory's subject.

> 🔴 **AND THE ZERO IS TRUE OF ONE CHANNEL ONLY — measured 2026-08-15.** §10's pattern is
> `/\b(?:title|description):\s*(?!t\.)[A-Za-z_$][\w$]*\.error\b(?!\.)/` — an object
> **property**, i.e. a toast or modal argument. A **form-action page does not report that
> way**: it `redirect(...?error=<the server's English sentence>)` and the server component
> renders `{sp.error}` as JSX text in a `Callout` or a `role="alert"` div. That form matches
> nothing in §10's regex, so the entire channel sits outside its denominator. This is §5b's
> *"a check adjacent to the truth"*, and it is why the row above must not be read as "no
> player ever sees English prose".
>
> **Five do today**, and one is a **compliance** surface — a Swahili or Chinese player who
> trips `setLimits` validation reads *"Invalid value for dailyLossLimit."*:
>
> | Surface | Class |
> |---|---|
> | `profile/responsible-gambling/page.tsx:79` | 🔴 RG / compliance |
> | `profile/kyc/page.tsx:94` | KYC |
> | `profile/source-of-funds/page.tsx:71` | KYC / SOF |
> | `profile/account/page.tsx:75` | account |
> | `auth/reset-password/page.tsx:138` | auth |
>
> ⚠️ **NOT FIXED, and deliberately so.** Fixing them means teaching those services to emit a
> machine `reason` and routing it through the redirect — which is §2.3's wallet/KYC/auth
> tranche, the RULES programme's open ⏳, not this session's. What DID land is a **ratchet
> that can see the channel**: `npm run test:feedback-law` §8 pins the count at **5**, may only
> be lowered, prints the five by name, and carries a positive control; `red:feedback-law`
> proves a sixth banner goes red. Four of the five were in the original list of twelve above
> and were dropped from the "real population of six" because the re-measurement scanned only
> toast props; `auth/reset-password/page.tsx` was never listed at all.

### 1.6 · The documented bug this must not repeat

`conviction-dial.tsx:791-798`, verbatim, about phrase-matching English prose:

> *"It used to substring-match English words against the server's message, which had three
> live consequences: the fallback rendered the raw server string as the TITLE of a
> money-failure dialog, so a Swahili or Chinese player got an English sentence; `RATE_LIMITED`
> never matched, because the server sends "Slow down." which contains neither "rate" nor
> "limit" — and `retryAfterSec` was discarded; and "Wallet unavailable." (a `NOT_FOUND`)
> matched the *balance* branch and told the player to top up."*

`error-copy.ts` still carries **15 phrase tests**, matched against service strings that live
in other files, with **no check anywhere asserting those strings still contain those phrases**.
That is the single largest risk any new mapper inherits.

---

## §2 · THE REASON REGISTRY — what C2 must add

A stable machine `reason` alongside the code. The **code stays** for API/audit compatibility;
the **reason drives the copy**. One row per reason: what it means, its severity, the surfaces
it reaches, and the copy in all three languages.

⛔ Interpolated figures come from **data on the refusal**, never parsed out of English prose
the way `tzsFigures` does today.

### 2.1 · Betting — `market-service.ts` → `buyPosition`

| reason | code | severity | server site | what it really means |
|---|---|---|---|---|
| `stake_below_min` | INVALID | **warning** | `:692` | the single bet is under TZS 1,000 |
| `stake_above_max` | INVALID | **warning** | `:692` | the single bet is over TZS 1,000,000 |
| `stake_not_whole` | INVALID | **warning** | `:692` | not a whole number of shillings |
| `balance_insufficient` | INVALID | **warning** | `:976`, `:772` | wallet (or bonus wallet) cannot cover it |
| `market_not_live` | INVALID | info | `:677` | draft / closed / resolved / voided |
| `market_closed` | INVALID | info | `:679` | past the resolution time |
| `selection_closed` | SELECTION_CLOSED | info | `:678` | betting window shut ahead of resolution |
| `loss_limit_daily` | INVALID | **error** | `:759` | the RG daily net-loss cap. LCCP informed consent → modal, both products |
| `rate_limited` | RATE_LIMITED | **warning** | `:637` | per-user bet bucket; carries `retryAfterSec` |
| `system_busy` | BUSY | **warning** | `:618` | admission shed it under load; the stake never moved |
| `maintenance` | SUSPENDED | **error** | `:642` | platform-wide pause on new bets |
| `account_blocked` | SUSPENDED | **error** | `:672` | SUSPENDED / CLOSED / SELF_EXCLUDED |
| `self_excluded` | SUSPENDED | **error** | `:646` | RG lockout, with an end date |
| `wallet_frozen` | **NOT_FOUND → must become its own reason** | **error** | `:721` | 🔴 see §3.1 |
| `bonus_wagering_one_side` | *(new — B2)* | **warning** | pre-confirm | the opposite side will not count toward the grant |

### 2.2 · Cash-out — `market-service.ts` → `cashOutPosition`

| reason | code | severity | server site |
|---|---|---|---|
| `not_your_position` | INVALID | **error** | `:1882, :1889, :1906` |
| `position_not_open` | INVALID | info | `:1907` |
| `bonus_funded_no_exit` | INVALID | **warning** | `:1913` |
| `market_settled` | INVALID | info | `:1918` |
| `cashout_value_zero` | INVALID | **warning** | `:1976` |
| `exit_window_closed` | INVALID | info | `:1970` — 🔴 product-specific copy, see §3.2 |

### 2.3 · Wallet, KYC, auth, proposals, objections

> ✅ **LANDED 2026-08-14, and by a shorter route than this section assumed.** It reads as
> though every one of these needs a service change. Most do not: **19 of them already carry a
> distinct machine CODE** (`EMAIL_TAKEN`, `NIDA_TAKEN`, `DOC_TOO_LARGE`, `PW_WEAK`,
> `VOTING_CLOSED`, `PAUSED`, `AUTH`, …). The services were never the problem — what was missing
> is what §1.4 counts: *"five tone vocabularies, and no shared `Severity` type"*.
>
> So `reasonForCode()` maps the CODE to a registry row, and `renderFailure` consults it when a
> service has not yet learned to emit a `reason` of its own. Every one of those refusals now has
> a **severity** and a **channel** without a single service edit and without inventing copy —
> the rows point at the existing `error.*` keys, already translated and already guarded by
> `test:i18n`. Pinned by §9, with `red:failure-reasons` proving a demoted severity goes red.
>
> ⛔ **`INVALID` and `SUSPENDED` are deliberately NOT mapped.** They mean four things each, so
> picking one would be exactly the mistranslation the registry exists to retire — the
> "Wallet unavailable." → *top up your balance* defect, restored. Those keep `errorCopy`'s
> phrase disambiguation, and §8 now pins each of those phrases to the server's own sentence so
> the seam cannot rot silently while it waits for per-service reasons.

The remaining wallet/KYC reasons still recovered from prose, for whenever their services are
taught to emit a reason directly:
`deposit_limit`, `sof_required`, `kyc_required`, `nida_taken`, `nida_not_verified`,
`doc_image_type`, `doc_too_large`, `docs_locked`, `docs_required`, `extra_docs_required`,
`no_extra_request`, `withdraw_below_min`, `email_invalid`, `email_taken`, `email_unverified`,
`name_invalid`, `avatar_type`, `avatar_size`, `password_wrong`, `password_weak`,
`voting_closed`, `proposals_paused`, `objection_window_open`, `signin_required`.

### 2.4 · The copy — the four the new rules make urgent

Everything above needs copy; these four are the ones this programme's rule changes create or
worsen, so they are drafted here in full. The rest follow the same shape.

#### `stake_below_min` — **warning**

| | |
|---|---|
| **EN** | Minimum bet is **{min}**. Enter {min} or more and try again. |
| **SW** | Dau la chini kabisa ni **{min}**. Weka {min} au zaidi kisha jaribu tena. |
| **ZH** | 最低投注为 **{min}**。请输入 {min} 或以上后重试。 |

#### `stake_above_max` — **warning**

| | |
|---|---|
| **EN** | Maximum for a single bet is **{max}**. You can place more than one bet on this market. |
| **SW** | Kiwango cha juu kwa dau moja ni **{max}**. Unaweza kuweka zaidi ya dau moja kwenye soko hili. |
| **ZH** | 单笔投注上限为 **{max}**。您可以在此市场下多笔投注。 |

> ⭐ The second sentence is the rule doing work: the cap is **per bet**, and a player who hits
> it must learn that rather than conclude the market is closed to them.
> ⛔ It must never be written in a way that implies a limit on total exposure.

#### `balance_insufficient` — **warning**

| | |
|---|---|
| **EN** | Your balance is **{balance}** — this bet needs **{needed}**. Top up under Wallet → Deposit. |
| **SW** | Salio lako ni **{balance}** — dau hili linahitaji **{needed}**. Ongeza fedha kwenye Pochi → Weka. |
| **ZH** | 您的余额为 **{balance}**，本次投注需要 **{needed}**。请在钱包 → 充值中补充。 |

#### `bonus_wagering_one_side` — **warning**, shown BEFORE confirming (B2)

| | |
|---|---|
| **EN** | **This bet won't count toward your bonus.** You already have money on the other side of this market. Only one side counts toward the **{remaining}** you still need to bet before your bonus can be withdrawn. · *Place bet anyway* · *Cancel* |
| **SW** | **Dau hili halitahesabiwa kwenye bonasi yako.** Tayari una fedha upande wa pili wa soko hili. Upande mmoja tu ndio unaohesabiwa kwenye **{remaining}** unayohitaji kuweka kabla ya bonasi yako kutolewa. · *Weka dau hata hivyo* · *Ghairi* |
| **ZH** | **此注不计入您的奖金要求。** 您在本市场的另一方已有资金。仅一方计入您提取奖金前仍需投注的 **{remaining}**。· *仍然下注* · *取消* |

> Shown only to a player who actually holds an unfulfilled grant. **A warning, not a refusal**
> — the bet still goes through if they choose. ⛔ It cannot be computed inside the bet
> transaction: `getBonusSummary` (`bonus-service.ts:644`) issues its own wallet read and would
> block on the bet's own uncommitted row — the P2028 self-deadlock documented at
> `bonus-service.ts:235-243`. It belongs on the READ path, which is fine: it is a warning.

---

## §3 · DEFECTS FOUND WHILE MAKING THIS LIST

Each is a wrong thing said to a player today, not merely a vague one.

### 3.1 · 🔴 A frozen wallet is reported as "not found"

`market-service.ts:721` returns `NOT_FOUND` for two different states: **no wallet row at all**,
and **a wallet that exists but is FROZEN**. `errorCopy` renders `NOT_FOUND` as *"We couldn't
find that. Refresh and try again."* — so a player whose wallet has been frozen is told to
refresh the page. Wrong reason, wrong severity, wrong next step. → `wallet_frozen`, **error**.

### 3.2 · ✅ FIXED (B3, 2026-08-14) · A poll player was told about a "round"

`cashOutPosition`'s `TOO_SHORT` branch returned *"This poll is closing too soon to sell out ·
Kura hii…"* from a path with **no `productLine` branch**. On a 5-minute Up & Down round under
a 5-minute free-exit grace that is the ORDINARY branch, so an Up & Down player was routinely
told about a "poll". Its sibling already used the neutral "this bet".

Now: *"This bet was placed too close to the finish to be sold — it rides to settlement."*
Product vocabulary belongs where the product is known, and on this path it is not.

### 3.3 · 🔴 The BUSY lie

`conviction-dial.tsx` maps **any** thrown server action to `BUSY` — *"we're busy, your stake
hasn't moved"*. A genuine server crash therefore reads to the player as ordinary load. → C4:
separate a real `AdmissionBusy` from an unexpected throw and give the throw its own honest
copy. ⛔ Keep the idempotency-key retry exactly as it is — that part is correct, and it is
what makes retrying safe.

### 3.4 · 🔴 The stake bounds are unexplainable at the moment of refusal

The server DOES name both bounds — *"Stake must be a whole number between TZS 1,000 and TZS
1,000,000."* Neither player surface shows it:

- polls → `conviction-dial.tsx:843` falls through `errorCopy`'s INVALID phrase tests (which
  have no bounds test) to *"That didn't go through. Check the details and try again."*
- Up & Down → `updown-bet-errors.ts:73` maps INVALID to *"The bet was refused — check the
  amount and your balance"* and **discards the server string by design**.

So `docs/RULES.md` §2.3's requirement — *refused with a message naming the minimum* — is **not
met on either product today**. This is the first thing C2 fixes.

### 3.5 · ⚠️ A stake above the maximum can be labelled "insufficient balance"

`conviction-dial.tsx:837` phrase-tests `/balance|funds|salio/i` **before** reaching `errorCopy`.
Any INVALID whose server prose happens to contain "funds" is mislabelled — the exact failure
mode the file's own comment at `:791` documents.

### 3.6 · ⚠️ No surface exists to explain wagering that did not advance

There is no copy anywhere for "this bet did not count toward your bonus". Ship the one-side
rule without §2.4's warning and a player whose wagering silently stops advancing has nothing
to read. `bonus-service.ts` cannot even express it: `BonusGrant` (`schema.prisma:500-523`) has
no market, side or product column — turnover is a single scalar counter with no provenance.

### 3.7 · ✅ FIXED (B3, 2026-08-14) · Copy that was dead only because of the guard

`i18n-dict.ts` `hedgeBothBody`/`hedgeOppositeBody` (EN, SW **and** ZH) said the commission
*"applies to the pool"* — the retired model — and became reachable the instant B1 removed the
guard. Rewritten in all three languages, and the rewrite found a second, worse claim:

> 🔴 **`hedgeBothBody` also asserted *"hedging here locks in a loss"*, and that is FALSE.**
> On a lopsided market a small hedge on the thin side can pay many times both stakes:
> YES 100,000 / NO 0, bet 1,000 each way, NO wins → the NO leg alone returns ~88,870 on
> 2,000 staked. It would have been a fabricated claim on a money surface (A-5) the moment it
> could render. The new copy states the facts and draws no conclusion, and **quotes no rate
> at all** — `feeHeadlinePct` and its `fill({pct})` call site are deleted, because the fee is
> already stated by the payout projection in the same panel (RULES.md §7).
>
> ⚠️ A first draft of `test:updown-engine` 8b.12 asserted the same slogan and went **RED**:
> the hedged account finished **6,750 UP**. The test and the copy were wrong in the same way,
> written an hour apart. It now proves the honest property instead — the same two legs return
> +6,750 on one outcome and −7,170 on the other.

**A third surface, not in the original list:** `updown-board.ts`'s `myExactPayout` comment
declared the hedged state **"unreachable"** and closed UD-20 "as moot". It is reachable again.
The behaviour (suppress the figure rather than price a two-sided position as one-sided) is
unchanged and still right; **UD-20 is re-opened as a decision for Ali** — a hedged holder on a
locked round now sees no payout figure at all, on a state the product deliberately permits.

---

## §4 · WHAT C5's GUARD MUST DO

A count of mapped surfaces is not enough — that check passes by never growing. The guard must
**fail when a NEW unmapped failure path is added**:

1. Enumerate every `reason` the server can emit (from the registry, which is code).
2. Assert every one has copy in **all three** languages.
3. Assert every one has a declared severity and channel.
4. Assert no player-facing surface renders `r.error` as a headline.
5. **Prove it red** against a surface that renders a bare string today — §1.5 lists twelve.
6. **Positive control in the same run**, or fixing the defect turns the check red and nobody
   can tell the two apart.

⚠️ And it must assert the **phrase tests still match the live service strings**, or the 15 in
`error-copy.ts` will rot silently the first time a service reworded a sentence.

---

## §5 · ORDER

| Step | | Status |
|---|---|---|
| C1 | this inventory | ✅ committed before any C fix |
| C2 | the reason registry + servers emit it | ✅ betting + cash-out (22 reasons). ⏳ wallet/KYC/auth — §2.3 |
| C3 | one renderer, three severities | ✅ `renderFailure`, both bet surfaces |
| C4 | kill the BUSY lie | ✅ `system_busy` vs `system_error`; the same-key retry kept |
| C5 | the guard, red first | ✅ `test:failure-reasons` 48 · `red:failure-reasons` 9/9 |

---

## §6 · THE FEEDBACK MATRIX — every consequential action, and what it answers with

> Measured 2026-08-15 by opening the call sites, not by grepping names. The LAW this serves is
> [`docs/DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) **§F**; the guard is
> `npm run test:feedback-law` (113) with `npm run red:feedback-law` (15/15).
>
> ⛔ **The denominator first.** `171` exported `"use server"` functions across
> `src/app/**/actions.ts` and `src/app/_actions/**`. Of those, **41 have no client caller at
> all** (they are `<form action>` targets or server-internal), and the rest split into the
> classes below. A matrix that starts from "things I noticed" is not a matrix.

### 6.1 · How a consequential action reports, by class

| Class | Action(s) | Popup | Toast | Haptic | In-app / push / email | On FAILURE |
|---|---|---|---|---|---|---|
| **Bet — poll** | `buyPositionAction` (dial) | ✅ `OperationResultModal` `conviction-dial.tsx:1642` | ✅ secondary, deferred | ✅ `confirm` on the confirm press | ✅ `notifyBetPlaced` + email | `renderFailure` → severity-mapped; blocked → modal |
| **Bet — Up & Down** | `buyPositionAction` (quick-bet) | ✅ **`UpDownBetReceiptModal` — NEW, UD-22** | ✅ secondary, 3 s | ✅ `confirm` | ✅ `notifyBetPlaced` (push suppressed for UPDOWN by decision) | sticky `danger` toast; compliance block → `UpDownBetBlockedModal` |
| **Sell / cash-out** | `cashOutPositionAction` | ✅ `sell-button.tsx:223`, `stripTone="gold"` | ✅ secondary | ✅ via `SellConfirmModal` | ✅ `notifyCashout` | `danger` toast, reason-mapped |
| **Deposit / withdraw** | `depositAction` · `withdrawAction` | ✅ `wallet-result-modal.tsx` (redirect-driven) | — | ✅ via toast variant | ✅ in-app + **email**, per `comms-registry.ts` | modal, `variant="danger"`, stays until dismissed |
| **Settlement** | server-side (`resolveMarket`) | ✅ win → `win-celebration.tsx` | ✅ result toast (`factual` on a loss) | ✅ `success` on the win reveal | ✅ in-app + push + email | n/a (no player action) |
| **KYC** | `attachDocumentAction` · `submitNidaAction` · `submitKycForReviewAction` | ⛔ **none** — inline banner after redirect | ✅ on the two uploader actions | — | ✅ email | 🔴 raw `{sp.error}` banner (§1.5 note) |
| **RG** | `setLimitsAction` · `selfExcludeAction` · `coolOffAction` | ⛔ none — `Callout` after redirect | — | — | ✅ email | 🔴 raw `{sp.error}` banner |
| **Account / security** | `changePasswordAction` · 2FA ×4 · `closeAccountAction` | ⛔ none | ✅ `danger` / `success` | — | ✅ email | reason + next step ✅ (fixed 2026-08-15) |
| **Preference** | `toggleWatchAction` · push ×2 · `updateProfileBasicsAction` | ⛔ never (correct — §F2) | ✅ only | ⛔ **silent** (correct) | — | `factual` + next step ✅ (fixed 2026-08-15) |
| **Social** | `postCommentAction` · `reportCommentAction` · `deleteCommentAction` · `voteAction` · `fileObjectionAction` · `createProposalAction` | ✅ proposals only | ✅ | ✅ `confirm`/`warning` | — | `danger` toast, dictionary-mapped |
| **Notifications panel** | `markNotifRead` · `markAllRead` · `dismiss*` | ⛔ never | ⛔ none | ⛔ **silent** (correct — §F5) | — | silent; the row's own disappearance is the feedback |
| **Admin** | 100+ actions | ✅ shared `action-overlay.tsx` | ✅ `useDeferredToast` | ✅ `warning` on the confirm | audit chain | `variant="danger"`, English by design |

### 6.2 · What the matrix found that a gap-list would not have

1. 🔴 **A background poll was firing the money-settled haptic** — `notifications-panel.tsx`,
   `haptics.success()` = `[22, 36, 60]`, byte-identical to a WIN, on any unread arriving during
   a 5-second poll. Its baseline started at `0`, so **the first poll after every page load
   counted as an arrival**: opening the app holding one unread vibrated the handset for a
   render. And the inbox carries LOSSES, whose copy is deliberately blunt so a loss is not
   softened — the win pattern played over them. **Fixed**; §F5 and `test:feedback-law` §4.1
   hold it, `red:feedback-law` proves it red.
2. 🔴 **The push opt-OUT threw away the server's answer.** `deletePushSubscriptionAction`
   returns `{ ok: false }` on a lapsed session; the panel called it `.catch(() => {})`, never
   read `r.ok`, set the switch to OFF and toasted *"Push notifications off"* — while the row
   stayed in the database and the device kept receiving. A false statement on a **consent**
   surface. **Fixed**: the result is read, the switch stays ON, and the copy says the device
   may still receive alerts.
3. 🔴 **`red:updown-bet-feedback` had a stale anchor and was in no runner.** Its
   `toast-replaces-aria-live` mutation targeted the single-line `setLiveMessage(...)`; UD-21
   (`00a0595a`, 2026-08-07) split it over three lines, so from that day the mutation was a
   no-op — an ABSENT test. The harness said so honestly and exited 1; **nothing ran it**,
   because it was not in `red:all`. Anchor repaired (**7/7**) and both it and
   `red:feedback-law` are now in `red:all`.
4. ⚠️ **The "0 raw server strings" figure covered one channel of two** — see §1.5's note.
   Five JSX banners were outside the ratchet's denominator entirely.
5. ⚠️ **`operation-result-modal.tsx`'s own header overstates its reach.** It says it is used
   "after every consequential action: … KYC submit, self-exclusion, password change". None of
   those three uses it — they redirect to an inline banner or toast. The rows above state what
   is actually there. ⛔ Not "fixed" by adding three modals: that is a product decision about
   three flows, not a defect, and §F2 is written to describe the shipped shape.

### 6.3 · Where the matrix says the platform is already consistent

Worth recording, because the session's question was *"is it the same answer for the same kind
of action everywhere?"* and for most classes it now is: every **money** mutation ends in the
shared `OperationResultModal` (the Up & Down bet was the last exception and is closed); every
**preference** is silent-but-toasted; every **admin** action goes through one overlay; and no
surface anywhere uses a native `confirm()`/`alert()` — verified, not assumed.

---

## §7 · THE LABEL LEXICON — every enum that reaches a human, and the word it becomes

> Measured 2026-08-15 by opening the render sites, not by grepping names. The LAW this
> serves is [`docs/DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) **§L**; the guard is
> `npm run test:labels` with `npm run red:labels`.
>
> ⛔ **The denominator first.** `40` enums are declared in `prisma/schema.prisma`. Of those,
> **13 never reach a human at all** (`Locale`, `AdminDomain`, `NotificationChannel`,
> `AuditCategory`, the four DEAD `LedgerEntryType` arms, …) — they route, they do not label.
> The rest split into the families below. ⛔ A lexicon built from what a session *noticed* is
> not a lexicon; this one starts from `schema.prisma` and `store.ts`.

### 7.1 · The families, and where each becomes words

| Enum family | Values | Player EN / SW / ZH | Admin | Definition site |
|---|---|---|---|---|
| **Side** (`MarketSide`) | `YES` `NO` | poll → `common.yes/no` (YES·NDIO·是) · round → `market.udUp/udDown` (Up·Juu·涨) | raw, English by design | ⭐ **`src/lib/side-label.ts`** |
| **Outcome** (`resolvedOutcome`) | `YES` `NO` `VOID` | as Side, + `market.statusVoid` (Void·Batili·已作废) | raw | ⭐ `side-label.ts` |
| **Up & Down outcome** | `UP` `DOWN` `VOID` | `market.udUpWins/udDownWins` | raw | ⭐ `side-label.ts` |
| **Refund reason** | 6 arms | `market.udRefund*` | — | `updown-refund-reason.ts` |
| **Source class** | 5 arms | `market.udSource*` | — | `updown-source-label.ts` |
| **PositionStatus** | `OPEN` `WIN` `LOSS` `VOID` `CASHED_OUT` | `position-card.tsx`'s local map | `admin-status-lexicon.ts` | ⚠️ **two sites** — see 7.3 |
| **PredictionMarketStatus** | `DRAFT` `LIVE` `CLOSED` `RESOLVED` `VOIDED` | `market.statusLive/statusResolved/statusVoid` | `components/admin/status-badge.tsx` | `admin-status-lexicon.ts` |
| **KycStatus / TxnType / TxnStatus / FlagStatus** | — | wallet + profile surfaces | `admin-status-lexicon.ts` | `admin-status-lexicon.ts` |

### 7.2 · What the lexicon found that a gap-list would not have

0. 🔴 **ALI'S REPORTED BUG, FOUND — the Up & Down bet push spoke the POLL's vocabulary.**
   `market-service.ts` branches at `buyPosition`: the long-form arm writes an inbox row, the
   `else` arm **pushes to the phone** for Up & Down. That push read
   `Bet placed · ${opts.side}` in all three languages — and `opts.side` is the STORED token,
   which is `YES | NO` on **both** product lines. So a player who backed **Up** got a phone
   notification saying **"Bet placed · YES"**, on a product that has no Yes and no No; Swahili
   and Chinese got the English token on top of it. It is the only arm where the product line
   is genuinely `UPDOWN`, and it was the one arm never told. ⭐ Found by the §3 scanner, not by
   looking — and the guard's FIRST version could not see it, because its scope was a hardcoded
   file list naming `notification-service.ts` and `email.ts`. `red:labels` caught that at 7/8.
   The scope is now structural: a file that writes `titleSw`/`bodyZh` is a copy surface,
   wherever it sits.

1. 🔴 **Six Chinese keys carried the ASCII token `YES`/`NO` inside otherwise-Chinese strings**
   — `probOverTime`, `probChartAria`, `backYesAria`, `backNoAria`, `backYesAriaNoPrice`,
   `backNoAriaNoPrice`. **Four are `aria-label`s**, so a Chinese screen-reader user *heard*
   "YES". ⭐ **Swahili had translated all six correctly** (`NDIYO` / `HAPANA`) — the platform's
   own two translations disagreed, which is what makes this a defect and not a house style.
   ⛔ `test:i18n` cannot see it: it only compares a translation to its English source, and
   `"YES 概率随时间变化"` differs from `"YES probability over time"`, so it passed clean.
2. 🔴 **`faq6a` told the player their position becomes `CASHED_OUT` — in ALL THREE languages.**
   The raw `PositionStatus` enum in player help text, beside a dictionary that already defines
   *Cashed out · Imetolewa · 已兑现*.
3. 🔴 **`bet-confirm-modal.tsx` renders the side TWICE, one raw and one translated, on the same
   screen.** Line 267 prints `{side}` at 26px under a translated *"You are picking"*; line 307
   uses the dictionary for the pool-share sentence three rows below. On the Chinese
   money-commit dialog the headline read **YES** while the sentence beneath read **是**.
4. 🔴 **`notifySelectionClosed` hard-wrote `YES`/`NO` into its Swahili AND Chinese bodies**
   (*"若 YES 获胜您将获得 …"*), and **`notifyWatchedSettled` interpolated the raw enum** into all
   three (`resolved ${outcome}` / `matokeo: ${outcome}` / `结果：${outcome}`).
5. ⚠️ **The Up & Down half of §2a is NOT reachable today — established, not assumed.**
   `notifySelectionClosedForMarket` does **not** gate on `perEventNotificationsSuppressed()`,
   so the guard is not where it looks; what actually keeps Up & Down out is
   `nextDeadlineFor()` returning `null` for `productLine === "UPDOWN"`
   (`market-scheduler.ts:147`), so no round is ever armed for `notify-closed`. ⛔ The suppression
   predicate is therefore NOT what protects this path — anyone adding a second caller must
   re-establish that, not trust the predicate's name.
6. ⚠️ **`market.sideYesWord.toUpperCase()` and `common.yes` are the same string in all three
   locales** (EN YES · SW NDIO · ZH 是, and no/HAPANA/否). Two definition sites for one word —
   §0a. Verified by evaluating the dictionary, not by reading it.
7. ⚠️ **The eight hand-written side ternaries are NOT live bugs, and saying so would be wrong.**
   `listMarkets()` defaults to `productLine: "MARKET"`, and `/results`, `/fairness`,
   `/positions` and the ticker each filter to long-form (`platform-stats.ts:103`), so they
   render YES/NO on markets that really are YES/NO. ⭐ **The risk is structural**: the day one
   of those queries gains `productLine: "ALL"`, all eight lie at once and silently. The
   pattern is the finding, not a count.

### 7.3 · Where the lexicon says the platform is already right — ⛔ do not "fix" these

- **`/updown/history`** uses `udUpWins`/`udDownWins` and `b.side === "UP" ? "↑" : "↓"`.
- **`/positions`** filters to `"MARKET"` (`page.tsx:41`), so its YES/NO is the true vocabulary.
- **`home.heroHeadline`** (*"The wisdom of YES & NO."*) is verbatim in all three locales by
  Ali's decision (PLAN-OF-RECORD §7b) and is allowlisted in `i18n-parity.test.mts`.
- **Admin is English by design** — one language, and `admin-status-lexicon.ts` already owns it.
- ⚠️ **`PositionStatus` has two label maps** (`position-card.tsx`'s local object for players,
  `admin-status-lexicon.ts` for officers). That is *defensible* — the audiences differ and the
  admin console is monolingual — but it is two sites for one family and is recorded here so the
  next session decides deliberately rather than discovering it.
