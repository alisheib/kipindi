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
> ✅ **ALL FIVE FIXED 2026-08-15 — the ceiling is 0.** Each surface carries the reason **KEY**
> on its redirect and resolves it through `renderFailure` via `src/lib/failure-banner.ts`. ⛔ Not
> a second renderer: the pure function is imported, not forked, so a reason cannot say one thing
> in a toast and another in a banner. `test:feedback-law` §8's `CEILING` went 5 → 0 in the same
> commit, and `test:failure-reasons` §10 now counts **both** channels into **one** denominator
> with its own controls — the banner pattern must catch `{sp.error}`, must ignore
> `{banner.body}`, and must stay distinct from the toast pattern, because a refactor that
> collapsed them would silently halve the denominator while still claiming both.
>
> 🔴 **AND KEYING THE CHANNEL CLOSED A REFLECTION HOLE.** `?error=` rendered whatever the query
> string said, so any text could be put in front of a signed-in player by handing them a link —
> `/profile/account?error=Your account is suspended. Call +255…`. React escapes it, so it was
> never script injection; it was a plausible, styled, **first-party** alert box saying anything
> an attacker chose, on the operator's own domain, above a real account page. On a licensed
> money platform that is a phishing surface, and it was invisible to every guard here because
> every guard here was looking for a *translation* defect. `bannerFor` validates against the
> registry before rendering, so an unrecognised `?reason=` renders nothing at all.
>
> ⚠️ Four of the five were in the original list of twelve above and were dropped from the "real
> population of six" because the re-measurement scanned only toast props; `auth/reset-password`
> was never listed at all.

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

> 🔴 **THE "SHORTER ROUTE" BELOW WAS WRONG, AND MEASURING IT COST A TRANCHE — corrected
> 2026-08-15.** This section claimed *"19 of them already carry a distinct machine CODE … the
> services were never the problem"*, and the registry duly mapped `DOC_IMAGE`, `DOC_TOO_LARGE`,
> `DOCS_LOCKED`, `NIDA_TAKEN` and `NO_EXTRA_REQUEST`. Measured by **opening the call sites**:
>
> **No service anywhere emitted any of those five codes.** `kyc-service.ts` emits exactly three —
> `INVALID`, `NOT_FOUND`, `RATE_LIMITED`. Those five registry rows were therefore *unreachable*,
> and every KYC refusal a player actually saw arrived through `errorCopy`'s INVALID phrase tests
> and nothing else. The rows looked like coverage and were dead code.
>
> ⛔ **And where the mapped codes ARE emitted, the code is minted by phrase-matching the prose.**
> `PW_CURRENT_WRONG`, `PW_WEAK`, `VOTING_CLOSED`, `EMAIL_TAKEN` and `NAME_INVALID` are all
> produced in the **action layer**, like this:
>
> ```
>   /current password is incorrect/i.test(r.error) ? "PW_CURRENT_WRONG" : ...
>   /voting has closed/i.test(r.error)             ? "VOTING_CLOSED"    : "NOT_FOUND"
> ```
>
> So the "distinct machine code" the registry maps so exactly is itself manufactured by the
> substring-matching the registry exists to retire. The defect was **moved one layer up, not
> removed** — and mapping the code made it look solved. Still open for the auth/proposals family.
>
> ⚠️ **A third seam, found the same way:** `attachDocumentAction` forwarded `{ ok, error, code }`
> and silently dropped everything else, so a `reason` minted in the service died at the action
> boundary. Teaching a service to say why is inert until every layer between it and the player
> carries it. This is what §3 Step 1 means by *"a list built from greps is a lie — open the call
> sites"*.
>
> The paragraph below is kept as written, because what it got RIGHT — that §1.4's missing
> `Severity` was the real gap — is still true.
>
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

### 3.8 · ✅ FIXED (`690aa237`, 2026-08-15) · A RED-harness mutation reached production

`markets/[id]/page.tsx:329` — the gate deciding whether to show the §2.5 one-side bonus
warning — was **`if (true)`** on `main`, and therefore deployed on `50pick.tz` from 12:52 to
14:41. Commit `76efe614` (*"Unit B — the side word comes from the lexicon"*) carried **three**
hunks into that file: two were the real `sideWord`/`outcomeWord` work, and the third was a
debug override swept in with them.

**What a player read.** The comment three lines above the gate states the contract in as many
words — *"shown ONLY to a player who actually holds an unfulfilled grant … for everyone else
this renders nothing at all"*. Forced true, any signed-in player opening a market while holding
the **opposite** side — the hedge `RULES.md` §2.4 explicitly permits, driven with real money on
2026-08-14 — read *"…only one side counts toward the **TZS 0** you still need to bet before your
bonus can be withdrawn."* Production has had **two** grants in its entire history, so for
essentially every hedging player that was a false statement about their money, naming a nonsense
figure, on a money surface, under a rule `RULES.md` §2.5 marks ✅ live.

> ⭐ **TWO PARALLEL SESSIONS FOUND IT INDEPENDENTLY, THREE MINUTES APART, AND THAT IS THE
> FINDING.** The restore sat **on disk, uncommitted, from 13:41** — after the 12:52 commit — so
> the working tree looked correct while `main` shipped the mutation. Every local test run was
> therefore green against code production was not running. A session that trusts its own tree to
> tell it what is deployed cannot see this class of defect at all; only `git show origin/main`
> can.

⛔ **The mechanism is the `git add -A` hazard in §0 of the session prompts, realised.** A RED
harness rewrites real source and restores it when the run completes; a broad `git add` between
those two moments commits the mutation, and the later restore — being a separate, uncommitted
edit — never reaches `main`.

⭐ **The rest of the range is clean.** Every commit from 2026-08-14/15 was swept for the same
shape: no other `if (true)`/`if (false)` anywhere in `src/`, no NUL bytes, no zeroed source
files. This was the only one.

### 3.9 · 🔴 FIXED (2026-08-15) · The RED harness reported "tree restored" and had not

`red:failure-reasons` kept its restore set as a **hard-coded list of six files**:

```js
const originals = new Map([[MARKET, …], [REASONS, …], [DICT, …], [PAGE, …], [KYC, …], [COPY, …]]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };
```

Add a mutation against a **seventh** file and the harness writes it, never restores it, and then
prints `tree restored · 18/18` and exits **0**. That is exactly what happened when the two banner
mutations were first added: both defects were left **on disk in a green tree** — a compliance
surface rendering `{sp.error}` again, and a `bannerFor` that no longer validates the query
string. A commit at that moment would have shipped both, with every guard passing and the
harness's own summary saying the tree was clean.

> ⭐ **THE TELL WAS NOT IN ANY OUTPUT.** Both guards passed, RED passed, `git status` showed the
> files as modified — indistinguishable from the edits I had made myself moments earlier. It was
> caught only by reading the two lines back. ⛔ **A harness's claim about the tree is not
> evidence about the tree**; §0's "scan for NUL bytes after any interrupted run" is the same
> lesson, and this run was not interrupted.

Fixed at the root rather than by extending the list: the snapshot is taken **on first touch**, so
the set restored is by construction the set mutated. A restore list maintained by hand beside a
mutation list is `RULES.md` §7's *"a number written twice"* applied to file paths — it can only
ever go stale, and it goes stale silently.

### 3.10 · 🔴 FIXED (2026-08-15) · A dead phrase test was hiding a live wrong heading

`RULES.md` §2.9 carried a ⏳ saying the `loss limit` refusal was *"the last INVALID family still
recovered from English prose, **because its service has not been taught to emit a reason yet**"*.

⛔ **That premise was false when it was written.** `checkLossLimit` has exactly ONE caller —
`buyPosition` — and it has returned `reason: "loss_limit_daily"` since `19ac78ec` (2026-08-14
17:59), *the same commit that built the registry*. Two phrase tests survived underneath it
(`error-copy.ts`, `updown-bet-errors.ts`), and because both surfaces consult the reason FIRST,
neither could fire. The ⏳ described a closed gap, and four session prompts inherited it.

> ⭐ **THE DEFECT WAS NOT THE DEAD CODE. IT WAS WHAT THE DEAD CODE CONCEALED.** With the phrase
> test removed, the Up & Down refusal takes the reason branch — which chose the acknowledge
> modal's **heading** from the refusal's **severity**:
>
> ```ts
> title: f.severity === "error" ? m.udErrSuspendedTitle : m.udErrRgLimitTitle
> ```
>
> Every `modal`-channel reason in the registry is severity `error` — `self_excluded`,
> `account_blocked`, `wallet_frozen`, `loss_limit_daily`, `break_active`, `kyc_required`,
> `nida_taken`, `account_suspended`. So the `udErrRgLimitTitle` arm was **unreachable**, and a
> player who reached the daily loss cap *they set themselves* read **"Betting unavailable"** —
> the operator-block heading — over a body explaining their own limit. The registry states the
> principle one row away, at `break_active`: *"A BREAK THE PLAYER SET THEMSELVES IS NOT A FAULT
> — it is the tool working."*
>
> ⛔ Severity answers **how loud**. It cannot also answer **whose decision this was**. The
> heading is keyed on the reason now (`MODAL_TITLE_BY_REASON`), which restores exactly what the
> phrase test achieved and nothing more.

⚠️ **`break_active` and `self_excluded` deliberately keep the neutral heading.** The only other
heading this dictionary has names the *daily loss limit*, which would be a false statement over a
cooling-off body. Two more headings is a copy decision; it is filed here rather than guessed.

⚠️ **AND THE FIRST FIX RE-ARMED THE HARNESS ON A COMMENT.** The commit deleting the phrase test
quoted the deleted `if (…) return …` line verbatim in the comment explaining the deletion.
`red:failure-reasons` anchors on exact source text, so its mutation resolved — **uniquely**, so
`red-anchor.mjs`'s ambiguity rule was satisfied — inside the comment, mutated prose, changed no
behaviour, and reported the guard as having MISSED. ⛔ **A comment that quotes deleted code is a
decoy anchor**, and no uniqueness check can tell code from prose about code. Both the comment and
the mutation were replaced; the harness is back to 18/18.

**Proof.** `test:failure-reasons` 209 (incl. §8c's new `loss_limit_daily` emitter pin and a walked
assertion that `checkLossLimit` still has exactly one caller) · `test:updown-quickbet` 53 (29.5
drives the TOKEN with a deliberately unrelated sentence, 29.5b pins the heading, 29.5c controls it)
· `red:failure-reasons` 18/18 · `test:i18n` 1846×3 after deleting the orphaned `errLossLimit`.

### 3.11 · 🔴 FIXED (2026-08-15) · The ACTION layer minted codes by reading the SERVICE's English

Three server actions recovered a machine code by matching, with a regex, the English sentence the
service they had just called had returned. `§1.6` records what that pattern cost when
`error-copy.ts` did it; these did the same thing **one layer up**, where it is harder to see
because the code that comes out *looks* like a machine token.

| Where | What it did | What went wrong |
|---|---|---|
| `profile/account/actions.ts` | `/current password is incorrect/i → PW_CURRENT_WRONG`, `/not found/i → NOT_FOUND`, **else `PW_WEAK`** | 🔴 `PW_WEAK` was the FALLBACK. `validatePasswordStrength` returns **six** different sentences and the two patterns matched none of them — they landed correctly only because the ordering left them last. Any unmatched refusal told the player *"choose a stronger password"*, which is the one answer that makes them change a field that was never the problem. |
| `proposals/actions.ts` | `/unavailable\|available right now\|coming soon/i → PAUSED`, `/voting has closed/i → VOTING_CLOSED`, else `NOT_FOUND` | 🔴 The gate arm returns `proposalsBlockedReason(cfg.state)`, whose wording an **operator configures**. The three alternatives were a guess at what someone might type; any other phrasing fell through to `NOT_FOUND` — so a paused feature told the player *"We couldn't find that. Refresh and try again."* about a proposal that exists. |
| `profile/actions.ts` | `/already linked/i → EMAIL_TAKEN`, else `NOT_FOUND` | Rewording the duplicate-address sentence would silently turn "that inbox is taken" into "we couldn't find that", on the surface that gates depositing. |

**Fixed at the source.** `changePassword`, `castVote` and `setUserEmail` each return `code` **and**
`reason` at every refusal site; the three actions now carry them, unread. ⛔ No action layer
decides a refusal by phrase-matching English.

### 3.12 · 🔴 FIXED (2026-08-15) · Six `REASON_BY_CODE` rows mapped codes NOTHING emits

`DOC_IMAGE` · `DOC_TOO_LARGE` · `DOCS_LOCKED` · `NO_EXTRA_REQUEST` · `NIDA_TAKEN` ·
`MAINTENANCE`. **Measured across `src/lib/server` and `src/app`: zero emitters, for any of them,
on the day they were added and since.** `error-copy.ts` carried five matching dead switch arms.

> ⭐ **AND THE SUITE WAS GREEN ON ALL SIX, WHICH IS THE POINT.** `test:failure-reasons` §9 proved
> each row "worked" by **synthesising the code itself** — `renderFailure({ code: "DOC_IMAGE" })` —
> a route the product cannot take. So the previous session read a passing table and concluded the
> KYC refusals were handled, while every one of them was in fact arriving through a phrase test.
> A test that manufactures its own input proves the mapper, never the wiring.

**Both ends fixed.** The five KYC families reach the registry through the `reason` that
`kyc-service.ts` emits — the better route, and the one that works; their rows are deleted rather
than left as a second, plausible, dead one. **Maintenance went the other way**: `market-service`
and `wallet-service` refuse with `code: "SUSPENDED"` (four families share it, which is why the
registry leaves `SUSPENDED` unmapped by design), and they now emit `reason: "maintenance"` — so a
stake refused mid-maintenance reads *"Betting is paused for maintenance. **Nothing has been
charged.**"* instead of the generic *"This service is temporarily paused."* That row existed and
no service had ever reached it.

⛔ **The structural fix is `test:failure-reasons` §9b**: it walks the tree from
`REASON_BY_CODE_KEYS` — exported so the guard cannot hand-list — and fails on any mapped code
with no emitter. ⚠️ **Its first draft would have passed `MAINTENANCE`**, because
`proposals-config.ts` declares `ProposalsState = … | "MAINTENANCE" | …` and a bare token search
cannot tell an unrelated enum member from a refusal. It now requires a `code:` position and
excludes type-union membership. §9c re-pins the loudness of all six on the route they really take
— found by `red:failure-reasons`, not by reading: deleting §9's rows had silently un-guarded
`nida_taken`, and the harness's demote-to-a-nudge mutation stopped being caught by anything.

**Proof.** `test:failure-reasons` 240 · `red:failure-reasons` **19/19** (a new mutation re-injects
a dead row) · `test:proposals` 48 · `test:proposals-state` 28 · `test:kyc` · `test:maintenance` 13
· `test:i18n` 1846×3 · `tsc` clean.

---

### 3.13 · 🔴 FIXED (`0e6009c5`, 2026-08-31) · §0's own standard was broken on the ADMIN side, and it cost a live operator an afternoon

⚠️ **This file scopes itself to refusals a PLAYER can reach, and that scope is why this defect
survived.** §0 already says *"⛔ No screen says only 'failed'"*. The admin console said exactly
that, for weeks, and nothing here was looking.

**What happened.** Ali reported "generation failed" on `/admin/ai-polls`. Production was healthy;
poll generation was being refused by 50pick's **own** AI spend cap — `$20.56` against a `$20.00`
top-up window — and the refusal never reached him. Three layers deleted it:

| Layer | What it did |
|---|---|
| `ai-poll-generation.ts:841` | threw the **right** sentence: `describeAiBudgetBlock()` names the cause, the numbers, and the screen that fixes it |
| `safe-error.ts` | `safeError` logged that sentence and returned `"Generation failed"` |
| `poll-actions.tsx` (Regenerate) | discarded even that, for a hardcoded **"The AI could not produce a valid poll. Try again."** |
| `poll-actions.tsx` (Generate) | blamed **"AI provider error"** — Anthropic was never called |

So the screen instructed a retry against a ceiling that can never yield, and the retries happened.

🔴 **THE LESSON IS NOT "ADD A MESSAGE", IT IS THAT PROSE DOES NOT HOLD A CONTRACT.** `ai-usage.ts`
*already* carried a paragraph above `describeAiBudgetBlock` warning that "a refusal that names the
wrong cause sends an operator to raise a limit that was never the problem", and the sentence was
*already* defined once, in one place, for exactly this reason. Both survived intact. The transport
layer deleted the sentence anyway, because nothing downstream had been told the difference between
a refusal and a crash.

**The fix.** `OperatorError` (`safe-error.ts`) marks a message deliberately **written for the
person reading the screen**; `safeError` passes those through and keeps redacting everything else.
⛔ **The discriminator is the TYPE, not how friendly the text reads** — a plain `Error` whose
message happens to look operator-facing stays redacted, or the rule becomes "nice-sounding errors
leak", which nobody can apply. Both poll budget gates (single + batch) throw it.

⛔ **The failure branch now names no cause at all when it does not know one.** "AI provider error"
was not replaced with a better guess: the obvious candidate, *"nothing was charged"*, is **also
false**, because `ai-poll-generation.ts` L961/L985 reach that state AFTER a paid call.

#### The second pass — a sentence is not an architecture

🔴 **THE FIRST REPAIR PASSED THE ENGLISH SENTENCE THROUGH, AND THAT WAS STILL WRONG.** It
unblocked the operator, and then the owner — reading that exact sentence, which NAMES the screen
that lifts the block — asked *"where do I fix it, which screen?"* **Prose that names a destination
cannot link to one.** [`src/lib/failure-reasons.ts`](../src/lib/failure-reasons.ts) had already
settled the shape for the player surface, in its own header: *"the server says why, in a machine
token, and carries the figures as data"*, and *"interpolated figures come from `detail`, NEVER
from the prose"*. A sentence with `$20.56` baked into it can only ever be printed.

⚠️ **AND THE FIRST CRITIQUE OF THAT WAS ITSELF WRONG, WHICH IS WHY THE SCOPE NOTE IS EXPLICIT.**
The i18n objection — "an English-only refusal on a translated console" — was raised on a `grep` for
`useT` that matched every `useTransition` and reported 55 admin files. Measured properly
(`grep -rlE "\buseT\(|\bgetServerT\("`) it is **4 of 195**, and the edited file uses it **zero**
times. The admin seam is English in practice, so the new contract deliberately does NOT duplicate
the player registry's three-language dictionary machinery.

**The architecture.** [`src/lib/operator-refusal.ts`](../src/lib/operator-refusal.ts) — isomorphic,
so the client never reaches into `lib/server/` for a type — carries `reason` (a token, never shown,
never phrase-matched), `detail` (figures as **numbers**), and `fix` (a real `href`, so the console
renders a **button**, not a sentence about a screen). `ADMIN_REFUSALS` is the rostered catalogue;
`OperatorError` carries the payload, `refuseFrom()` builds both halves in one place. ⛔ `message`
survives beside `refusal` on purpose: a surface that has not been taught a reason still has one
correct sentence, so adding a reason can never blank a screen — §3.12 above is what that rule is
made of. The shared `ActionOverlay` was taught this, **not** the poll console, so all fourteen
admin surfaces gain it; and **the fix outranks the retry** in the single secondary slot, because
offering "Try again" against a spend ceiling is precisely what this incident did to the owner.

**Two further defects fell out of doing it, both MEASURED on production, neither guessed:**

1. 🔴 **Raising a spend limit silently disarmed its own alarms.** The live row was
   `{limitUsd:20, alertedLevel:"limit"}` at `$20.5573` spent. `setCreditLimit` carried
   `alertedLevel` across unchanged, and `checkLimitAndAlert` only ESCALATES
   (`LEVEL_ORDER[level] <= LEVEL_ORDER[cfg.alertedLevel]` → return). So against the new `$70`
   ceiling, warn (`1 ≤ 2`) and limit (`2 ≤ 2`) would **both** return early and neither alert would
   ever fire again in that window — the operator crosses `$49` of spend and hits a hard block with
   no warning, the identical silent wall, one ceiling later. Fixed by recomputing the level against
   the new ceiling with `alertLevelFor`, now shared with `checkLimitAndAlert` so the two cannot drift.
2. ⚠️ **The remedy button pushed itself out of its own card.** `.btn` is `white-space: nowrap`, so
   as a flex item its `min-width: auto` is the FULL label width and `flex-1` cannot shrink it: a
   long label does not clip, it overflows the container. `qa:refusal` measured *"Open AI usage →
   Credit budget"* at 224px spilling **68px at 320, 32px at 360, 5px at 390**. Fixed by the label
   (*"Open Credit budget"*, 150px, clears 320 with 5px to spare) **and** by the row taking
   `AdminCard`'s own post-`G-5` wrap+basis idiom, so it cannot break if a label ever grows.
   ⭐ **The shared `OperationResultModal` was already correct** — its footer stacks `w-full` — and
   the bench's first draft modelled it as a two-up row and indicted a component that was right.

**Proof.** `test:operator-error` **54/54**, auto-discovered by `test:all`. Every pass-through is
PAIRED with a crash that must stay redacted — without that pair, "the message reaches the UI" is
satisfied by deleting the sanitiser. §5 drives the **real** gate with a genuinely overspent window;
§6 walks the catalogue in BOTH directions and resolves every `fix.href` to a real route and every
`#anchor` to an `id` actually rendered on that page. ⚠️ Three of this entry's own instruments were
wrong first and are documented in place rather than quietly corrected: the §5 driver passed a
`costUsd` field that does not exist (spent `$0.09` against a `$0.50` ceiling and the gate correctly
did not fire); the §6 emitter scan read every `reason:` in `ai-usage.ts` and indicted `budget`/`cycle`,
which are an INTERNAL vocabulary sharing the field name — this file's own `E-179`; and
`qa:refusal`'s `--sheet-missing` "control" **passed identically** to the styled run, because
stripping CSS removes the constraints that make overflow possible. `--prove-red` replaces it and
replays the shipped defect. `npm run qa:refusal` **121/121** across 320–1280; `npm run red:refusal`
reports the defect and exits 0 on catching it.

**Driven on production.** `npm run qa:refusal-live` **16/16** — signs in as ADMIN and asserts what
only a real session can: both anchors exist on the live page; the limit input reads `70` and the
meter reads `$20.56 / $70.00` (**re-derived from the screen**, not from what the session wrote);
`#ai-credit-budget` genuinely **scrolls** (`scrollY=2595`, card at viewport top) rather than merely
appearing in the URL; and the poll console renders with no client exception — which doubles as a
smoke test of the new `operator-refusal` module inside the browser bundle. ⛔ It deliberately does
NOT trigger the refusal: doing so live means lowering the ceiling below current spend, which would
also refuse the Market Sentinel and the Up & Down oracle on real markets to take a screenshot.

⭐ **AND ITS §5 NEARLY "FIXED" A COMPONENT THAT WAS ALREADY RIGHT** — worth recording, because the
instinct to repair is the failure here. Run with `measureClipping` bare, it failed on eight
elements of `/admin/ai-polls`: the `AdminKpi` labels and the poll titles. Those are `truncate`
**with a `title`**, and [`admin-shell.tsx`](../src/components/admin/admin-shell.tsx)'s own DG-A-10
comment already states that as the component's deliberate answer, explicitly rejecting both obvious
repairs (wrap to two lines; drop the tracking) and concluding *"shorter labels are the real fix"*.
**Ellipsis with a reachable full string is a decision; ellipsis with no affordance is the defect.**
The check now separates the two and still COUNTS the intentional ones (23 at 360, 21 at 1280) —
a silently-ignored category is where a real regression hides inside an accepted one.

**⚠️ Left open, filed not fixed — the page still buries the control that is actually blocking.**
`/admin/ai-usage` leads with **Spend cycles** (`$63.14 / $100`, reassuring) at `page.tsx:336`, while
the **Credit budget** card holding the top-up-window limit that refuses everything sits at
`page.tsx:711`, below the fold. Reading the top of that page the owner reasonably concluded the
diagnosis was wrong. Both cards now carry `id` anchors so a refusal can link straight to the right
one, which removes the cost of the ordering — but the ordering itself is a design call, not a bug
fix's.

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

### 7.2b · What the LIVE PAGE found that the green suite did not

⭐ `test:labels` was ALL PASS, the deploy was verified, and the Chinese `/markets` page still
carried three defects. All three came out of `curl`-ing production per locale and accounting
for **every** remaining ASCII `YES` — the discipline that the count must reach zero or be
explained, not merely look small.

1. 🔴 `markets/page.tsx` rendered **"已结算 YES"** — the third copy of
   `${t.market.resolvedOutcome} ${m.resolvedOutcome}`, and the one on the board. ⛔ **The
   guard could not see it**: its prose test required a literal WORD outside the `${…}`
   braces, and this template is two interpolations and a space. A `t.` lookup in a template
   is now itself the proof it is copy. Red mutation #9.
2. 🔴 `brand.tsx` carried `aria-label={\`YES probability ${target}%\`}` — hardcoded English
   that never went through the dictionary, so a Chinese screen-reader user **heard** it.
3. 🔴 `conviction-dial.tsx`'s bet-placed TOAST was the notification defect one channel over.

### 7.2b-tsc · 🔴 FILED 2026-08-15 · `npx tsc --noEmit` DOES NOT TYPECHECK THE TEST SUITE

`tsconfig.json`'s `include` names `scripts/**/*.ts` — and **every test in this repo is `.mts`**.
So the definition-of-done gate that every session runs, and that this one ran clean before
pushing, covers **none of the ~226 suites**.

⭐ **Measured, not suspected.** The 2026-08-15 `LocalizedText` change (§7.2c) altered a widely
called signature. `npx tsc --noEmit` reported **clean**; `test:all` then failed **two** suites
(`test:cert-c3`, `test:updown-digest`) on fixtures still passing bare strings. The compiler had
the information and was not asked.

⚠️ **The fix is not one line, which is why it is filed rather than done.** Adding
`scripts/**/*.mts` to `include` produces **1324 errors**, and essentially all of them are
`TS5097` — *"an import path can only end with a '.ts' extension when
`allowImportingTsExtensions` is enabled"*. The suites import `../src/lib/foo.ts` **with** the
extension because that is what `tsx` wants. So closing this means enabling
`allowImportingTsExtensions` (legal here — the gate is already `--noEmit`) and then reading
whatever REAL errors remain underneath, which nobody has ever seen.

⛔ **Do not "fix" it by deleting the extensions**: that would break every suite at runtime.
⛔ And do not raise it as a small tidy-up — the value is precisely in the unknown remainder.

### 7.2c · FILED, not fixed — these need a decision, not a session's guess

- ✅ **`red:all` exits 1 before it reaches most guards** — **CLOSED 2026-08-15**, and what it was
  hiding is now measured rather than estimated. See **§8** below for the first full-fleet run.
- 🔴 **`trust-band.tsx:127` has no null arm.** `SettlementRow.outcome` is
  `"YES" | "NO" | "VOID" | null`, so an unrecorded outcome falls through and renders **"NO"
  in red** on the landing page, under a header reading *"THE OUTCOME IS READ, NEVER
  INFERRED"*. `ticker.ts` rule 5 drops null rows; `page.tsx:247` feeds trust-band from
  `stats.recentSettlements` **directly** and bypasses that filter. Latent, not observed.
  What the landing shows for an absent outcome is a product decision.
- ⚠️ **`red:updown-readiness` has FIVE stale anchors** and reports 11/16 — measured again by the
  full-fleet run and **confirmed at exactly 11/16**, the third independent measurement to agree.
  ⛔ It is no longer what starves the fleet: `red:all` is a reporting runner now (§8). See §8 for
  what it was starving.
- ✅ **Notification titles are English-only across all three languages** — **CLOSED
  2026-08-15.** It was exactly the shape change this entry predicted: `LocalizedText
  { en, sw, zh }`, built by `localizedText()` and carried by every player emitter. Nine
  callers in `market-service` and the two `alertWatchers*` entry points now pass all three
  titles. ⚠️ `notifyAdminObjectionFiled` deliberately stays a bare string — the console is
  monolingual English by design — and `test:labels` §7f pins it as the ONLY survivor, so the
  guard cannot be satisfied by quietly reverting a player emitter. Emails are untouched:
  EN+SW in one message is a recorded position, and two call sites one line apart in
  `market-service` are one notify and one email.
- ✅ **`trust-band.tsx` has no null arm** — **CLOSED 2026-08-15**, and it needed no product
  decision after all. This entry said unifying it "forces a product decision about what the
  landing shows for an unrecorded outcome". `ticker.ts` rule 5 (law 25) had already made
  that decision — *"a row whose outcome is absent is DROPPED rather than guessed"* — and the
  landing was simply bypassing it, because `page.tsx` feeds the band from
  `recentSettlements` directly. Applying an existing rule to the surface that was skipping
  it is not a new decision. Both ends are pinned by `test:outcome`.
- ✅ **UD-20 — a hedged holder is quoted BOTH outcomes on `/updown/[roundId]`.** Measured
  2026-08-15 and found **already shipped**, in `209a97da`: `getRoundDetail` returns
  `myPayoutIfUp`/`myPayoutIfDown` from the same `projectedPayout` settlement uses, the round
  page passes them, and `round-action-panel.tsx`'s locked branch renders both rows. Guarded
  at `test:updown-hedge-quote` (28) and `red:updown-hedge-quote` (8/8) — whose
  `the-panel-stops-rendering-the-pair` mutation reads the COMPONENT, because a payload
  nobody paints is not a fix. ⚠️ Recorded here because the finish-line commission listed it
  as open; no change was needed and none was invented.
  ⚠️ **One cosmetic difference is left deliberately**: the round page reads *"If it closes UP
  **you get** X"* while the board card omits *"you get"*. The card is the visual sweep's
  territory this session, and the omission is a density choice on a small card, not a
  defect — filed rather than edited across a session boundary.

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

---

## §8 · THE RED FLEET, MEASURED — the first run in which every harness actually ran

> Run 2026-08-15 on an isolated worktree, `npm run red:all` (the reporting runner, `255c1782`).
> **68 harnesses · 58 green · 10 failing · 778.5s.** ⛔ Every figure below is from that run's
> table. This section replaces four estimates that were circulating, two of which were wrong.

### 8.1 · What the `&&` chain was hiding

| | Before | Measured |
|---|---|---|
| `red:*` declared in `package.json` | — | **68** |
| Reachable from `red:all` | **41** | 68 |
| **Never ran at all** | — | **27** |
| Harnesses that fail | "some tail after segment 32" | **10** |
| Harnesses with unresolvable anchors | "~27 anchors across ~6 harnesses" (a static *lead*) | **23 anchors across 6 harnesses** |
| Harnesses that corrupt the tree | unknown — nothing looked | **1** |

⭐ **The lead was right about the harness count and wrong about the rest.** A static sweep had
guessed "~27 non-matching anchors across ~6 harnesses" and cautioned that CSS-targeting harnesses
were *"almost certainly false positives"* because it only scanned `src/**.{ts,tsx,mts}`. The real
six are `red:updown-readiness` (10 anchor reports · 5 mutations), `red:m1-light` (6),
`red:updown-chart` (2), `red:updown-movement` (2), `red:keyframes` (2) and
`red:updown-result-clock` (1) — and **`red:keyframes` is exactly the CSS-targeting kind the sweep
excused**. ⛔ A lead is a place to look, never a count; the 27 it produced turned out to be the
number of harnesses *outside the runner*, which it was not measuring at all.

### 8.2 · The ten, and why each fails

| Harness | Score | Why |
|---|---|---|
| `red:updown-readiness` | 11/16 | 5 stale anchors — §7.2c, now measured a third time |
| `red:m1-light` | 5/8 | 6 unresolved anchors |
| `red:updown-movement` | 10/12 | 2 unresolved anchors |
| `red:keyframes` | 6/7 | 2 unresolved anchors |
| `red:updown-chart` | 2/3 | 2 unresolved anchors |
| `red:updown-result-clock` | 3/4 | 1 unresolved anchor |
| `red:updown-playbook` | — | exits in 0.5s — it never reaches a mutation |
| `red:admin-soft-gate` | — | exits in 0.9s — same shape |
| `red:results-filter` | — | fails with no anchor complaint |
| `red:updown-bars` | 8/8 | ⭐ **caught the tree, not the guard** — see 8.3 |

### 8.3 · 🔴 `red:updown-bars` rewrote 740 lines of tracked source on every run

The runner's tree fingerprint flagged it `DIRTY` on the first full run. `updown-bars-red.mjs`
carried its own copy of the line-ending rule — normalise to `\n`, match, mutate — and then
restored with the **normalised** copy:

```js
const original = lf(originalRaw);          // 740 CRLF → LF
…
} finally { writeFileSync(FEED, original); }   // ← writes back the NORMALISED bytes
```

⛔ **The comment three lines above it stated the opposite, in as many words**: *"Restoration
writes back the ORIGINAL bytes, not the normalised copy."*

> ⭐ **AND IT WAS INVISIBLE IN EXACTLY THE WAY §3.8's `if (true)` WAS.** `git diff` normalises
> line endings, so it printed **nothing**. Only `git status` showed the file modified — which is
> indistinguishable from an edit the session made itself, and §3.8 records that ambiguity costing
> two hours of a false statement about money on production. The harness printed `7/7 caught` and
> exited **0** over it, every time, for as long as it has existed.

Fixed the way §3.9 was — by deleting the local rule, not by correcting the restore line. It uses
`red-anchor.mjs`'s `injectDefect`, which re-expresses the anchor in the FILE's own convention
instead of dragging the file into the anchor's. Verified byte-for-byte: 740 CRLF before, 740 CRLF
after, **8/8 caught** (the shared resolver found a ninth anchor the local matcher had been
silently missing — 7/7 became 8/8 without a new mutation being written).

⛔ **This is why `red:all` fingerprints the tree per harness and why it must never repair it.**
A runner that ran `git checkout` would have hidden this defect *and* destroyed the session's own
uncommitted work.

---

### §7.3 · WHAT THE LEXICON SWEEP MISSED — found by Ali's consultants, after it shipped

> 🔴 **The reported bug was still live after §7 was declared done, on three surfaces the sweep
> never opened — and `test:labels` was ALL PASS through every one of them.** Ali produced a
> photograph of the wallet's Activity tab reading *"NO won · \"Bitcoin Up or Down\""*. That is
> the surface his ORIGINAL commission named — *"in Up & Down polls, **in activity**"* — in its
> first sentence.

| # | Surface | What it rendered over an **Up** bet | Why the sweep missed it |
|---|---|---|---|
| 1 | `/positions/performance` | `YES · TZS 5,000` | the ONE player list that deliberately passes **no** product line to `listPositionsForUser` — a performance total that hid half a book would misstate the player's money — then rendered `p.side` raw |
| 2 | Wallet **Activity** · stake row | `YES on "Bitcoin Up or Down"` | `Transaction.description`, built as `${opts.side} on …` |
| 3 | Wallet **Activity** · payout row | `NO won · "Bitcoin Up or Down"` | `Transaction.description`, built as `${opts.outcome} won · …` |

⛔ **THE CAUSE THEY SHARE.** Rows 2 and 3 are inside `db.txn.create` — a **money record**, which
`perEventNotificationsSuppressed` deliberately does NOT gate, because the transaction, ledger and
audit rows are written for EVERY round. The notification fix was therefore structurally incapable
of reaching them. ⭐ **A suppression predicate marks where COMMUNICATION stops; it is not a map of
where a player reads words.** The wallet is the counter-example, and it is the one a player opens
to check their own money.

⭐ **AND THE MARKET ROW WAS IN HAND AT ALL THREE.** None of these lacked the product line —
`recentMarketMap.get(p.marketId)` on row 1, `market`/`m` in scope on rows 2 and 3. The vocabulary
was never unavailable; it was never asked for.

### §7.3a · Three green guards over one live defect — the method finding

Each guard was **correct about what it measured**, and none of them measured an **absence**:

| Guard | What it counts | Why it was blind here |
|---|---|---|
| §4 private-map ratchet | `=== "YES" ? t.…` ternaries | there was no ternary — the raw token was rendered with no decision at all |
| §3 enum-in-a-sentence | literals assigned to `titleEn/Sw/Zh`, `bodyEn/Sw/Zh` | a `description` is English-only operational prose, so §3 excluded it **deliberately and correctly** |
| §2 raw-enum-in-JSX | JSX text nodes | rows 2 and 3 are built on the SERVER and stored in the database, hours before any JSX exists |

⛔ **ENGLISH-ONLY DOES NOT MEAN MACHINE-ONLY.** That is the mistaken premise the whole miss rests
on. A `description` may stay in one language; it may not stay in the **storage vocabulary**,
because the wallet renders it verbatim to the player.

**Closed by** `test:labels` **§8** (a surface holding EVERY product line must resolve its side
words through the lexicon — the omitted third argument is the tell) and **§9** (a money record's
description names the side in the product's vocabulary). Both proved RED against the real defect.
⚠️ §9's first draft flagged `use-quick-bet.ts`, whose ternary already resolves correctly — a guard
that fails on correct code teaches the next session to weaken it, so it now matches only a **bare**
interpolation, which is the shape that contains no decision.

⛔ **STILL OPEN, FILED NOT FIXED:** the transaction description is stored as ONE English string, so
a Swahili or Chinese player reads English in their wallet. Fixing that is a rendering/storage
change — structured metadata or a client-side re-render — not a word change, and it is out of a
labelling session's remit. The WORD is now right in every language's row; the SENTENCE is not yet.

---

### §7.4 · CLOSED — two Up & Down chains could not fire a round, and a late price bar was why

> ✅ **FIXED 2026-08-19 (session 46, register row `E-167`).** Filed 2026-08-15 as `50c3a282`,
> unfixed for four days, and **still deployed** when this session opened: production ran
> `0f1cf873`, which is the commit that filed it.
>
> 🔴 **The chains were silenced BY HAND, not fixed.** `AuditLog`:
> `updown.chain.stopped` on `udc_5820850ef13f34e5` by `usr_53406f2f9f793abe1fd0e8af` at
> **2026-08-18 08:11:36.846**, **14.09s after that chain's last error line**. Stopping a chain
> makes `fireChain` return before it does anything (it exits unless the state is `RUNNING`), so
> the log went quiet while the code stayed exactly as it was. ⛔ **A quiet log is not a fixed
> defect, and this is the shape that made it look like one.**

```
[updown] fire udc_5820850ef13f34e5 failed: Error: Cannot create a market with a past or invalid resolution date.
[updown] fire udc_f8d666a0d781b8d6 failed: Error: Cannot create a market with a past or invalid resolution date.
```

#### The mechanism, end to end

`advanceChain` reads `chain.nextBoundaryAt` and, if no round is open there, hands the instant to
`openRound`. `openRound` derives the close as `boundary + roundSpanMinutes(duration)`, and
`createMarket` refuses a resolution at or before now **by throwing, not by returning a refusal**.
The throw escapes `advanceChain` before **step 4** — the only line that moves `nextBoundaryAt` —
and `fireChain`'s `finally` re-arms on the *same* instant. The next tick makes the byte-identical
call, every `FIRE_RETRY_MS` (30s), for ever.

⛔ **The abandon branch that should have caught it could not, for two independent reasons**, and
this is why the fix is a new test rather than a widened deadline:

1. it is gated on `obs.state !== "confirmed"`, and a boundary minutes or hours old **has** a dated
   bar — so the reading comes back CONFIRMED and the branch is never entered;
2. its deadline is `abandonAfterSeconds` — **390s** on the live config — which is **longer** than
   the span of a 3-minute round (**240s**) or a 5-minute one (**360s**). Even reached
   unconditionally it would still hand `createMarket` a past close for those two lengths.

#### The trigger, measured — and it is NOT what the filing guessed

The filing suspected "a long pause, a clock offset, or a duration that no longer divides the
window", and this session's own first hypothesis was downtime. **Both are wrong**, and the
database says so:

| Fact | Value |
|---|---|
| the boundary that broke both chains | **2026-08-15 21:28:00** |
| observation created (BTC / ETH) | 21:28:00.036 / 21:28:00.024, state PENDING, `attempts` 3 |
| last attempt | 21:31:01.659 / 21:31:02.072 |
| **CONFIRMED at** | **21:33:01.787 / 21:33:02.232** — a lag of **301.8s / 302.2s** |
| the neighbouring boundaries | confirmed at **~+91s**, as every healthy boundary does |
| the loop's first error line | **21:33:10.532** — ten seconds after the confirmation |
| uptime before it | **5h43m uninterrupted**; the previous boot was 15:49:39 |
| **the dead window it landed in** | span close **21:32:00** (boundary + 240s) · abandon deadline **21:34:30** (boundary + 390s) — the reading confirmed at **21:33:01**, i.e. **inside** it |

⭐ **That last row is the whole defect in one line, and the log stream shows it independently.** The
ladder is visible climbing on both chains — staleness 0, 15, 30, 45, 61, 76, 91, 106, 121, 136, 182s,
last `boundary pending` at 21:31:01.68 — and then nothing until the permanent throw. The previous
round settled correctly in the same second (`udr_a05df24b15e8e040dae2` settled 21:33:01.912), so
**step 2 did its job and step 3 threw eight seconds later**: no money was ever at risk, and the chain
never fired again. The loop then survived **six boots** between 2026-08-16 13:24 and 14:02 and ran
**1,003** identical error lines, because the stale boundary is persisted — a restart cannot clear it.

So the bar **published — late**. Nothing paused, nothing restarted, no clock drifted. A
3-minute round spans 240s, the reading arrived at 302s, and by then the round's own close was 62
seconds in the past. ⭐ **The chain was bricked by a price it had asked for and eventually got.**

⚠️ **`setChainState` cannot cause this**, which rules out the filing's other guess by code: it
writes `nextBoundaryAt = null` for both PAUSED and STOPPED and recomputes a fresh boundary on
resume. **A pause can never leave a stale boundary — and stop→start was therefore always a
complete manual remedy, which nothing said out loud.**

> ⭐ **AND NOTHING COULD SAY IT, WHICH IS THE REST OF THIS STORY (added 2026-08-19, session 50, `E-168`).** The remedy was a manual
> console gesture with **no instrument behind it**: this repo shipped `ops-updown-pause-chains.mts` and `ops-stop-updown-chains.mts`
> and nothing that started a chain again. So the two chains stopped above stayed stopped — **BTC/USD 3m for 35.2h and ETH/USD 3m for
> 3.9 days** — and the census excluded them by design for every hour of it. `npm run ops:updown-resume-chains` is now the bottom rung:
> it goes through the same `setChainState`, pre-flights all three start refusals in a dry run, and flushes the audit queue (E-66).
> Both chains were resumed with it and each opened and settled a round within five minutes (**83.1s / 82.9s** settle lag).
>
> ⛔ **A REMEDY THAT EXISTS ONLY AS A SENTENCE IN A POST-MORTEM IS NOT A REMEDY.** The line above was written, correct, and read by at
> least one later session — and the chains were still dead four days later.

#### Why exactly those two chains, and how exposed the rest were

Exactly **two rounds platform-wide** carry `boundaryAt = 2026-08-15 21:28:00` — BTC/USD 3m #887
and ETH/USD 3m #886. No other chain's grid contained that instant, and no other length's span is
short enough for a 302s lag to overrun it.

⭐ **The observation table bounds the live risk, and this is the number worth keeping.** Of
**8,925** CONFIRMED rows: **219** with a lag over 240s, **zero** over 360s, **zero** over 390s,
**maximum 338.4s**. So the late-bar trigger has only ever been able to reach a **3-minute** chain
— and a 5-minute chain came within **22 seconds** of it.

⛔ **But do not read that as "only short chains are exposed."** The confirmed path skipped the
abandon check at *every* duration, so any boundary left stale by any other means bricked a chain
of any length. Driven in-suite: a 60-minute chain a day stale threw exactly as hard as a
3-minute one (`test:updown-rearm` §7.6). The 240s/390s arithmetic describes **which chains a
half-fix still leaves broken**, not which chains the defect could reach.

#### The fix

| Where | What |
|---|---|
| `advanceChain` (`updown-service.ts`) | **A boundary whose close is already past is ABANDONED and re-armed from `now`** — checked *before* the price question, because no price can rescue it, and derived from the round's own SPAN rather than from the observation state or the abandon deadline. One tick catches up; it never crawls a span at a time. |
| `openRound` (`updown-service.ts`) | Refuses **softly** when the close is already past, so no caller can turn the condition into an unhandled throw. Second layer, not the fix — a soft refusal alone would leave the chain crawling. |
| `updown-scheduler.ts` | **The alarm §7.4 asked for.** Consecutive fire failures are counted per chain; at **3** the log stops whispering and names the count, the window and the verdict, and `captureServerError` writes a durable record to the audit chain **and Sentry** (production reports `sink: "audit-chain + sentry"`). Re-asserted every 20th failure so a days-long stall stays visible without flooding. Exposed as `getUpDownSchedulerHealth().failing`. |

⭐ **The healer was never going to save it, and that is now stated where it matters.**
`healStuckRounds` heals **rounds**, never **chains**: `udr_eabe50800cdbfa4ea55b` was healed by
`system_updown_healer` at 2026-08-18 08:22:51.764 while the chain's `nextBoundaryAt` sat at
2026-08-18 08:21:00 — the round rescued, the chain still bricked. ⚠️ It *is* what makes the fix
money-safe, though: `healOneRound` reads `roundStore.unresolvedBefore`, filtered by neither the
grid nor the chain's state, climbs the observation ladder itself inside the deadline, and past it
performs the late **dated** re-read that settles a round properly instead of voiding it. So
moving the boundary on costs a round nothing. Asserted, not assumed: `test:updown-rearm` §7.7c.

#### Proof

`test:updown-rearm` **48** (was 27) · `red:updown-rearm` **14/14** (was 8/8) ·
`test:updown-heal` **164** (was 159) · `test:updown-tick-cadence` **29** (was 28) ·
`test:all` **225/228**.

⭐ **The mutation that matters is `span-check-uses-abandon-deadline`** — the fix a reasonable
person writes first. It judges a dead boundary by the 390s deadline instead of by the round's own
span, it makes §7.1 go **green**, and it leaves the 3-minute chain that actually stalled still
broken. Only §7.2b catches it, which is the entire reason those assertions are split.

#### ⛔ Two fixtures were asserting something impossible, and had been all along

Closing this turned two existing assertions red, and **neither was a regression** — both were
asserting a property their own fixture made unreachable:

- `test:updown-heal` **E83.5** ("the boundary is RETRIED, not consumed") ran on a **3-minute**
  chain pinned **240s** back. 240s *is* that chain's span, so the retry it demanded could never
  open a round. The 240s is not a coincidence either: the fixture derives it as the midpoint of
  `maxStalenessSeconds` (90) and `abandonAfterSeconds` (390), and on the live config that lands
  exactly on a 3-minute span.
- `test:updown-tick-cadence` **§3.3** ("the retry never sleeps past the abandon deadline") ran on
  a **5-minute** chain at `deadline − 2s` = 388s, which is 28s past that round's 360s close.

Both are re-fixtured onto **15 minutes**, where the deadline is genuinely the binding constraint,
and each gained a **fixture guard that fails on the old value** — `E83.0b` and `§0.0` — so they
cannot drift back. E83.6–E83.9 then assert the short-chain half deliberately, as the pair.

#### ⏳ Left open, filed not fixed — a manual Generate writes a schedule onto a stopped chain

`generateRoundNow` never checks `chain.state`, and `openRound` patched `nextBoundaryAt`
unconditionally — so pressing **Generate round** on a STOPPED chain wrote a live schedule onto a
chain the scheduler will never fire, defeating `setChainState`'s own invariant. Proven on
production: `updown.round.generated` at **2026-08-18 08:18:34.147** by
`usr_53406f2f9f793abe1fd0e8af` on `udc_5820850ef13f34e5`, which had been STOPPED since 08:11:36.
The same explains SOL/USD 15m `udc_653197e2a7e89b85` — created 2026-08-18 08:40:15.861, and both
rounds it has ever had were manual generates. ⚠️ **Not fixed here because it is a product
decision**: whether Generate should work at all on a stopped chain is the operator guide's call,
not a bug fix's. Nothing is stranded either way — the healer closes such a round — but the census
reads the leftover boundary as a stall.

#### ⚠️ Checked and NOT a defect, so nobody re-opens it

~150 `UpDownObservation_assetId_boundaryAt_key` unique-constraint violations appear in
production's logs per 29 hours. That is `observationStore.ensure`'s **intended** P2002 handler:
two chains sharing a boundary race to create one row, the loser catches the violation and
re-reads. It is the write-once guarantee working, logged by Prisma rather than by us.
