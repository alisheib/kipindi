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
| …that render a **raw server string** | **12** | `comments-thread.tsx:83/:103/:118` · `objection-dialog.tsx:61` · `create-form.tsx:77` · `export-data-button.tsx:19` · `profile/account/page.tsx:75` · `profile/source-of-funds/page.tsx:71` · `profile/responsible-gambling/page.tsx:79` · `auth/otp/page.tsx:65` · `auth/2fa/page.tsx:47` · raw `Error.message` at `avatar-uploader.tsx:94`, `kyc-doc-uploader.tsx:49`, `:154` |
| …that say only that something failed | **8** | `watch-star.tsx:81` · `position-share.tsx:56` · `push-settings.tsx:58/:62/:80` · `security-client.tsx` generic branch · `password-section.tsx:47` (title is the bare word "Failed") |
| …that are **SILENT** | **1** | `auth/login/page.tsx:138` — `default: return null` |
| Nothing tests any mapper | — | grep for `error-copy` / `errorCopy` under `scripts/` returns **no matches**. `test:i18n` guards the dict KEYS; nothing guards the code→copy MAPPING, the phrase tests, or the severity choice |

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

The same treatment, driven by the phrase tests `error-copy.ts` already performs — each becomes
a reason emitted by the server instead of recovered from prose:
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
| C2 | the reason registry + servers emit it | ⏳ |
| C3 | one renderer, three severities | ⏳ |
| C4 | kill the BUSY lie | ⏳ |
| C5 | the guard, red first | ⏳ |
