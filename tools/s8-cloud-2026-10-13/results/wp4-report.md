# S8 WP4 — S8's words: report (helper session, 2026-10-13)

## Branch and commits

- Branch `vodacom-s8-wp4`, cut from `origin/vodacom-s8-wp0-draft` `bbbf2cb7`; one commit on top:
  - `bbd5648f` — "Vodacom S8 WP4: S8's words - the journey.* keys of the bet sheet, its low-balance frames and the break
    (en, sw, zh), review 8 drafted for sign-off, and the records agree".
- Pushed: `origin/vodacom-s8-wp4` = `bbd5648f4afc1710e725d5a26763c6a7599b0fb0`. No pull request.
- Machine: Linux cloud VM (`vm`), Node v24.21.0 (tarball SHA256-checked against SHASUMS256.txt), `npm ci`,
  `npx prisma generate`. No server, no browser, no production access.

## What was built, file by file

- **`src/lib/i18n-dict.ts`** — 59 new `journey.*` keys in each of en, sw, zh, after the S7 block (same order in all three;
  generated from one table so the languages cannot drift). No existing value changed (`git diff` is additions only).
  - The deck's words, §3 verbatim (13): `sheetChosen`, `stakeLabel`, `estimateLead`, `estimatePill`, `balanceRow`,
    `placeCta`, `placeCtaBare`, `estimateCompact`, `lowTitle`, `lowBody`, `lowChoose`, `lowDeposit`, `lowBetInstead`.
  - S4 canvas words approved in review 3 (13), each drawn figure a placeholder: `estimatePillOver`, `estimateUpdated`,
    `sheetEmptyPoolBody`, `sheetRefundRule`, `sheetFirstOnSide`, `sheetLegacyFee`, `lowMinNote`, `lowPendingTitle`,
    `lowPendingTrack`, `lowSofCta`, `homeBreakTitle`, `homeBreakBody`, `cardBreak`.
  - Review 2's corrected live words as journey copies (16): `sheetClosedTitle`, `sheetClosedBody`, `sheetHolds`,
    `sheetHoldAddBody`, `sheetHedgeBody`, `sheetHedgeBothBody`, `sheetLegacyBody`, `sheetBusy`, `sheetBlocked`,
    `sheetFrozen`, `sheetSessionLimit`, `sheetRateLimited`, `sheetDepositLimit`, `sheetSofRequired`, `sheetBelowMin`,
    `sheetAboveMax`.
  - S8 drafts for review 8 (17): `sheetPlacing`, `sheetPlacingSlow` (A7), `retryCta` (A20.1), `sheetNotTaking` (A20.3),
    `sheetBonusWager` (A20.2), `sheetRailsPaused`, `sheetDepositMax`, `estimateUpdatedLive` (with A20.8's "≈ "),
    `estimateNoteCompact`, `multOnly`, `lowBetInsteadEstimate`, `lowLossTitle`, `lowLossRoom` (A5.5, "kwa sasa"),
    `lowPendingWaitBody`, `lowPendingLateTitle`, `lowPendingLateBody` (A10), `ticketsHere`.
  - Not added: `pendingBet` (S9's), `sheetLossBlock` (A5: the live `error.failLossLimitDaily` is reused). No helpline key.
    A13's ✕ needs no key: it reuses `common.close` ("Funga"), as the money confirms' `CloseX` does.
  - en uses the dictionary's own ’ apostrophe, except `sheetLegacyBody`, which is the classic en byte for byte as the
    plan says ("We'll").
- **`scripts/i18n-parity.test.mts`** — `journey.multOnly` joins `IDENTICAL_OK` with a three-line reason ("≈{mult}×" is a
  figure with no words; the words around it, `estimatePill`, are translated). Nothing else in the guard changed.
- **`docs/VODACOM-PLAN.md` §3 only** — the 13 S8 deck rows marked "built (S8 WP4)", `pendingBet` marked S9's, and an
  "S8 keys" note with the 17-row drafts table (sw/en/zh), as S7's. §0, §0k, §0h untouched (the diff's two hunks are at
  §3's table and after the S7 keys table).
- **`S4-COPY-AUDIT.md`** — "S8 drafts (2026-10-13)" (after "S7 drafts"); "Swahili review" 8, written as the review the
  plan asks for and headed "drafted by the build, for Ali's or a Swahili reviewer's sign-off" — it says in its first
  lines that no human has signed it; each draft with sw/en/zh and a one-line reason, plus the confirmations A20 asks
  ("swali hili" in the hedge copies, one name for the limits page). Review 7's closing clause, the review-2 loss-limit
  line and the "Low balance variants … NO sheet strings yet" heading are annotated (⟶ notes; their text kept).
- INHERIT-MANIFEST L6: not touched (WP0's Correction 16 annotation stands).

## Gates (on the committed tree `bbd5648f`, Node 24)

| Gate | Exit | Summary line (verbatim) |
|---|---|---|
| test:i18n | 0 | `ALL PASS — en=2744 sw=2744 zh=2744 keys` (base 2685 + 59) |
| test:translation-safety | 0 | `ALL PASS — 24 passed, 0 failed` |
| test:rate-copy | 0 | `rate-copy: 40 passed, 0 failed` |
| test:labels | 0 | `ALL PASS — 3 locales × 2 products, 1483 files scanned, 11/11 private maps` |
| test:support-contact | 0 | `79 passed, 0 failed` |
| test:docs | 0 | `✅ every reference in docs/ resolves.` |
| test:vodacom-plan | 0 | `18 rows · 5 ✅ · 0 failure(s)` |
| test:guards-exist | 0 | `GUARDS EXIST: 9 passed, 0 failed` |
| test:house-bot-disclosure | 4 | `FAILURES — house-bot-disclosure: 116 passed, 2 failed` — **red by construction** |

**test:house-bot-disclosure, re-derived:** exactly 5.1 and its control 5.1.c3, as S7 WP4 recorded (116/2):
- `FAIL 5.1 · ⛔ D19a · every published word is `origin/main`'s own — … the whole dictionary, all identical to c604343b0 — {"comparedAgainst":"c604343b0","compared":16,"differs":["src/lib/i18n-dict.ts"],"missing":[]}`
- `FAIL 5.1.c3 · POSITIVE CONTROL · not one changed file is inside the pinned population … {"changedVsMain":14,"sweptIn":["src/lib/i18n-dict.ts"],"planted":["src/lib/i18n-dict.ts","src/app/legal/_components.tsx"],"pinned":16}`

They pin the dictionary to origin/main (`c604343b0`) and read green once these keys are on main. Recorded, not "fixed".

**Every suite that reads `src/lib/i18n-dict.ts`.** `grep -rl i18n-dict scripts/` finds 123 files; the `test:*` scripts
that run one of them are 101, plus test:docs, test:vodacom-plan and test:guards-exist = 104 suites, each run alone on the
committed tree: **103 exit 0, 1 red (house-bot-disclosure, above).** No key count or namespace pin moved, so no count was
updated anywhere. The full list with each suite's last summary line is at the end of this report.

Note for the coordinator: before committing, 10 suites were red on the *uncommitted* tree — test:visual-pass-r6c (15.1),
r7a (7.1), r7b (7.1), r7c (6.1), r8b (7.3), r8d (10.1), r9a (7.1), r9b (6.1), r9c (8.1), r10 (11.1) — each "src/lib/
i18n-dict.ts is the commit's own", which compares the working tree to `HEAD`. All ten are green on the commit. A package
that edits the dictionary must commit before it runs them.

## Mutation proofs (in process, each restored after; the tree was clean afterwards)

| Plant | Gate | Result |
|---|---|---|
| P1 `journey.multOnly` removed from IDENTICAL_OK | test:i18n | exit 1: `FAIL sw: no untranslated values — 1: journey.multOnly`, same for zh — caught |
| P2 sw `lowDeposit` loses `{amount}` | test:i18n | exit 1: `FAIL sw: placeholder parity — 1: journey.lowDeposit (en:{amount} vs sw:{})` — caught |
| P3 sw `sheetPlacingSlow` deleted | test:i18n | exit 1: `FAIL sw: no missing keys — journey.sheetPlacingSlow` — caught |
| P4 zh `lowLossTitle` = the English | test:i18n | exit 1: `FAIL zh: no untranslated values — 1: journey.lowLossTitle` — caught |
| R1 sw `estimateNoteCompact` with a literal "10%" | test:rate-copy | exit 1: `FAIL 1.sw · clean — journey.estimateNoteCompact (a percentage)` — caught |
| R2 `multOnly` = "≈2.5×" | test:rate-copy | exit 1: `FAIL 1.en · clean — journey.multOnly (a multiple)` (and sw) — caught |
| S1 sw `sheetBlocked` with "Piga 0800 11 0011." | test:support-contact | exit 0 — **not caught** (see below) |
| L1 sw `sheetChosen` = "Umechagua NDIYO" | test:labels | exit 0 — **not caught** (see below) |

test:i18n 4/4 caught; test:rate-copy 2/2 caught. S1 and L1 are not reds of this package's guards but limits of
existing ones, recorded rather than worked around:
- **test:support-contact §15 does not read dictionary values.** It fails a `.tsx` that RENDERS a `t.*` label whose
  English names a helpline (§15.2), so a helpline put into a journey key would be caught only once a component renders
  it (WP6 on). Held instead by inspection here: `git diff` of the dictionary contains no "0800", no "helpline", no "simu
  ya msaada", no 热线.
- **test:labels does not scan dictionary values for "NDIYO".** None of the 59 keys carries a side word: every side is
  `{side}` (read through `sideWord`), so the NDIO rule holds by construction (the diff has 0 occurrences of NDIO/HAPANA).
  Candidate (for the coordinator): a check that no `journey.*` value names the helpline or a literal side word.

## Served bytes for a classic viewer

No visible word changes: no existing value changed, and no file reads the new keys. The dictionary rides in the client
bundle (`useT`), so every page's JS grows by these keys. Measured on the serialized dictionary object (all three
languages, `JSON.stringify(dict)`), base `bbbf2cb7` → `bbd5648f`:

| | base | WP4 | delta |
|---|---|---|---|
| raw | 411,251 B | 423,961 B | **+12,710 B** |
| gzip -9 | 139,595 B | 143,199 B | **+3,604 B** |
| brotli | 103,930 B | 105,970 B | **+2,040 B** |

NOT MEASURED on a production build's chunk (no `next build` was run here); the chunk will differ from the JSON by
minifier quoting only. WP12 records the built figure.

## Calls taken under delegation (each with its overrule)

1. **`lowPendingWaitBody` and `lowPendingLateBody` keep the literal "30"** ("hadi dakika 30", "Imepita dakika 30"), as A10
   and the approved canvas sentence write them. A24's rule ("no figure is ever typed into a value") names amounts and
   multiples; a time band is neither, and the sentence is approved as drawn. Overrule: a `{minutes}` placeholder fed from
   the same constant as the band (then review 3's approval of the sentence must be re-read with the placeholder).
2. **`sheetBonusWager` changes only "soko hili" → "swali hili"** (it keeps the classic's "fedha" and every other word,
   in all three languages, en "market" → "question", zh 本市场 → 此问题). Overrule: re-word it in the journey's "pesa".
3. **`sheetLegacyBody` en is the classic en byte for byte** (straight apostrophe), as the plan says; every other en
   value uses the dictionary's ’. Overrule: ’ there too (a one-character difference from the classic).
4. **The ✕'s accessible name is `common.close`** ("Funga" / "Close" / "关闭"), reused; A13 needed no key. Overrule: a
   journey key naming what closes ("Funga dau").
5. **Review 8 is written but marked unsigned** ("drafted by the build, for Ali's or a Swahili reviewer's sign-off").
   WP4's Done-when says "review 8 is signed"; per this session's instructions no human signature is claimed. Overrule:
   Ali signs it as written, or names the reviewer.

## Where the plan and the code disagreed (candidate amendments)

1. **§0h point 77.** A5 item 2 says WP4 annotates "S4-COPY-AUDIT.md's review 7 **and §0h point 77**" to say the sheet
   reads the key itself. This session may not edit §0h; review 7 is annotated, §0h point 77 is left for the coordinator.
2. **WP4 Done-when "review 8 is signed"** — see call 5: the build cannot sign it.
3. **The helpline and side-word rules have no dictionary-value guard** (S1 and L1 above). The plan's gate list names
   test:support-contact §15 and test:labels for them, but neither reads a dictionary value; both bite only at render.
4. **The visual-pass "dictionary is the commit's own" pins** (r6c 15.1 … r10 11.1) fail on an uncommitted dictionary —
   not named in WP4's gates; harmless once committed.
5. Line numbers: the plan's journey namespace (en :2987-3144, sw :5467-5568, zh :7871-7972) still matched the base by
   text; insertion is after `hubSearchPlaceholder` in each language.

## Left undone, and why

- §0h point 77's annotation (not this session's to write; above).
- A production-build measurement of the dictionary chunk (WP12's; the JSON measure is above).
- Review 8's human sign-off (Ali's or a Swahili reviewer's).

## Every dictionary-reading suite on `bbd5648f` (exit code, last summary line)

- `test:agent-fee-wallet-path` exit 0 — ALL PASS — 63 passed, 0 failed
- `test:agent-terms-binding` exit 0 — ALL PASS — 20 passed, 0 failed
- `test:auth-email` exit 0 — auth-email-signin: 94 passed, 0 failed
- `test:betting-ink` exit 0 — ALL PASS — 35 passed, 0 failed
- `test:bonus-withdrawable` exit 0 — bonus-withdrawable: 33 passed, 0 failed
- `test:campaign-privacy` exit 0 — CAMPAIGN PRIVACY: 29 passed, 0 failed
- `test:card-close-label` exit 0 — CARD CLOSE LABEL — all checks passed
- `test:cert-d1` exit 0 — D1 · KYC SUBMISSIONS: 115 passed, 0 failed
- `test:cert-d3` exit 0 — D3 · SOURCE OF FUNDS: 27 passed, 0 failed
- `test:cert-f1` exit 0 — PAYOUT HONESTY (F1): 80 passed, 0 failed
- `test:chat-safety` exit 0 — chat-safety — all checks passed
- `test:close-account-phrase` exit 0 — ALL PASS — 11 passed, 0 failed
- `test:criterion-i18n` exit 0 — criterion-i18n: 99 passed, 0 failed
- `test:docs` exit 0 — ✅ every reference in docs/ resolves.
- `test:failure-reasons` exit 0 — failure-reasons (with §8 + §9 + §10): 387 passed, 0 failed
- `test:featured-card` exit 0 — ALL PASS — featured-card: 82 passed, 0 failed
- `test:feedback-law` exit 0 — feedback-law: 160 passed, 0 failed  (of 160)
- `test:guards-exist` exit 0 — GUARDS EXIST: 9 passed, 0 failed
- `test:hero-copy` exit 0 — hero-copy: 18 passed, 0 failed
- `test:house-bot-disclosure` exit 4 — FAILURES — house-bot-disclosure: 116 passed, 2 failed
- `test:house-bot-seam` exit 0 — ALL PASS — house-bot-seam: 102 passed, 0 failed
- `test:house-bot-surfaces` exit 0 — ALL PASS — house-bot-surfaces: 74 passed, 0 failed
- `test:i18n` exit 0 — ALL PASS — en=2744 sw=2744 zh=2744 keys
- `test:id-documents` exit 0 — FOUR IDENTITY DOCUMENTS: 218 passed, 0 failed
- `test:install-invite` exit 0 — install-invite: 51 passed, 0 failed
- `test:journey-account` exit 0 — JOURNEY ACCOUNT — all 96 checks passed
- `test:journey-home` exit 0 — JOURNEY HOME — all checks passed
- `test:journey-shell` exit 0 — JOURNEY SHELL — all 446 checks passed
- `test:journey-tickets` exit 0 — JOURNEY TICKETS — all 51 checks passed
- `test:kyc-approved-copy` exit 0 — ALL PASS — 92 passed, 0 failed
- `test:kyc-at-withdrawal` exit 0 — kyc-at-withdrawal: 165 passed, 0 failed
- `test:kyc-copy-truth` exit 0 — kyc-copy-truth: 494 passed, 0 failed
- `test:kyc-honesty` exit 0 — ALL PASS — 41 passed, 0 failed
- `test:kyc-reject-reason` exit 0 — ALL PASSED — 71 passed, 0 failed
- `test:labels` exit 0 — ALL PASS — 3 locales × 2 products, 1483 files scanned, 11/11 private maps
- `test:market-result-announce` exit 0 — market-result-announce: 26 passed, 0 failed
- `test:marketing-consent` exit 0 — marketing-consent: 237 passed, 0 failed
- `test:marketing-consent-ledger` exit 0 — marketing-consent-ledger: 44 passed, 0 failed
- `test:marketing-optout` exit 0 — marketing-optout: 121 passed, 0 failed
- `test:money-format` exit 0 — money-format: 69 passed, 0 failed
- `test:money-minimums` exit 0 — money-minimums: 41 passed, 0 failed
- `test:numeric` exit 0 — numeric-input: 98 passed, 0 failed
- `test:offline-neutral` exit 0 — OFFLINE NEUTRAL — all checks passed
- `test:one-sided` exit 0 — ALL PASS — one-sided markets
- `test:otp-delivery` exit 0 — otp-delivery: 45 passed, 0 failed
- `test:pager-reach` exit 0 — pager-reach: 39 passed, 0 failed
- `test:payout-destination` exit 0 — payout-destination: 36 passed, 0 failed
- `test:presence-class` exit 0 — presence-class: 83 passed, 0 failed  (of 83)
- `test:privacy-notice` exit 0 — ALL PASS — 105 passed, 0 failed
- `test:rate-copy` exit 0 — rate-copy: 40 passed, 0 failed
- `test:rg-doors` exit 0 — rg-doors: 113 passed, 0 failed
- `test:rg-email-end` exit 0 — rg-email-end: 28 passed, 0 failed
- `test:rule-honesty` exit 0 — PASS — 22 passed, 0 failed
- `test:sell-grace-truth` exit 0 — sell-grace-truth: 49 passed, 0 failed
- `test:sell-price-guard` exit 0 — SELL PRICE GUARD — all 54 checks passed
- `test:short-title-fit` exit 0 — SHORT-TITLE FIT — all checks passed
- `test:social-panel` exit 0 — ALL PASS — 53 passed, 0 failed
- `test:support-contact` exit 0 — 79 passed, 0 failed
- `test:ticker-honesty` exit 0 — ticker-honesty: 147 assertions passed
- `test:trilingual` exit 0 — ALL PASS — 38 passed, 0 failed
- `test:updown-bet-feedback` exit 0 — updown-bet-feedback: 24 passed, 0 failed
- `test:updown-filter-sheet` exit 0 — updown-filter-sheet: 55 passed, 0 failed
- `test:updown-handover` exit 0 — ALL PASS — 117 passed, 0 failed
- `test:updown-hedge-quote` exit 0 — ALL PASS — 28 passed, 0 failed
- `test:updown-match` exit 0 — ALL PASS — 116 passed, 0 failed
- `test:updown-positions-visible` exit 0 — updown-positions-visible: 29 passed, 0 failed
- `test:updown-pricing` exit 0 — updown-pricing: 61 passed, 0 failed
- `test:updown-result-announce` exit 0 — updown-result-announce: 39 passed, 0 failed
- `test:updown-source-class` exit 0 — E-53 · updown source class — 40 passed, 0 failed
- `test:updown-void-copy` exit 0 — ✅ updown-void-copy: 49 passed, 0 failed
- `test:visual-pass-r10` exit 0 — visual-pass-r10: 81 passed, 0 failed
- `test:visual-pass-r3c` exit 0 — visual-pass-r3c: 70 passed, 0 failed
- `test:visual-pass-r4d` exit 0 — visual-pass-r4d: 63 passed, 0 failed
- `test:visual-pass-r4e` exit 0 — visual-pass-r4e: 68 passed, 0 failed
- `test:visual-pass-r4h` exit 0 — visual-pass-r4h: 81 passed, 0 failed
- `test:visual-pass-r4i` exit 0 — visual-pass-r4i: 128 passed, 0 failed
- `test:visual-pass-r4j` exit 0 — visual-pass-r4j: 82 passed, 0 failed
- `test:visual-pass-r4k` exit 0 — visual-pass-r4k: 77 passed, 0 failed
- `test:visual-pass-r5a` exit 0 — visual-pass-r5a: 93 passed, 0 failed
- `test:visual-pass-r5b` exit 0 — 75 passed, 0 failed
- `test:visual-pass-r5d` exit 0 — visual-pass-r5d: 45 passed, 0 failed
- `test:visual-pass-r5e` exit 0 — visual-pass-r5e: 62 passed, 0 failed
- `test:visual-pass-r5g` exit 0 — visual-pass-r5g: 63 passed, 0 failed
- `test:visual-pass-r5h` exit 0 — visual-pass-r5h: 56 passed, 0 failed
- `test:visual-pass-r5j` exit 0 — visual-pass-r5j: 54 passed, 0 failed
- `test:visual-pass-r5k` exit 0 — visual-pass-r5k: 55 passed, 0 failed
- `test:visual-pass-r5l` exit 0 — visual-pass-r5l: 56 passed, 0 failed
- `test:visual-pass-r6a` exit 0 — visual-pass-r6a: 42 passed, 0 failed
- `test:visual-pass-r6b` exit 0 — visual-pass-r6b: 56 passed, 0 failed
- `test:visual-pass-r6c` exit 0 — 87 passed, 0 failed
- `test:visual-pass-r7a` exit 0 — visual-pass-r7a: 43 passed, 0 failed
- `test:visual-pass-r7b` exit 0 — 50 passed, 0 failed
- `test:visual-pass-r7c` exit 0 — 65 passed, 0 failed
- `test:visual-pass-r8b` exit 0 — 38 passed, 0 failed
- `test:visual-pass-r8c` exit 0 — visual-pass-r8c: 66 passed, 0 failed
- `test:visual-pass-r8d` exit 0 — ALL PASS — test:visual-pass-r8d: 74 passed, 0 failed
- `test:visual-pass-r9a` exit 0 — visual-pass-r9a: 52 passed, 0 failed
- `test:visual-pass-r9b` exit 0 — visual-pass-r9b: 51 passed, 0 failed
- `test:visual-pass-r9c` exit 0 — 60 passed, 0 failed
- `test:vodacom-plan` exit 0 — 18 rows · 5 ✅ · 0 failure(s)
- `test:wallet-freeze` exit 0 — wallet-freeze: 73 passed, 0 failed
- `test:wallet-reach` exit 0 — wallet-reach: 84 passed, 0 failed
- `test:wallet-receipts` exit 0 — wallet-receipts: 57 passed, 0 failed
- `test:withdraw-email-gate` exit 0 — withdraw-email-gate: 84 passed, 0 failed
