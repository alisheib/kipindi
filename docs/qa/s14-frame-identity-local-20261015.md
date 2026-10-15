# S14 frame identity read — local preview, 2026-10-15

This is a human read of the five agency compositions implemented in 50pick's kit. The 201-tile baseline was captured at source commit `4c7327bcdd31a556215d03a486a0d2e3a93e12e0`; the focused closure and the corrected deposit chooser were read at `e42d970ab9ead56bc44da399352bfd57f9230849`. It is a **local, flagged preview** with synthetic accounts, an in-memory store and a mock payment rail. It is not a production staff journey, an agency decision or a launch approval. The S14 checklist JSON links here only for elements actually read.

## Method and artifacts

- `npm run qa:s14-frame-matrix` against isolated `localhost:3054`, Chromium 147, with `KP_SOURCE_SHA=4c7327bcdd31a556215d03a486a0d2e3a93e12e0`. The capture script uses seeded demo markets and never submits a deposit or bet.
- 201 viewport tiles: 7 widths (320, 360, 390, 768, 1024, 1280, 1440) × sw/en/zh across the meaningful guest and signed-in home/how-to states, guest bet sheet, signed-in low-balance and editable bet sheets, and signed-in deposit. It also captures 320×640 short heights, 360×400 focused short heights and CDP 360×340 keyboard-visible slices in each locale.
- The generated `.qa-shots/s14-frame-matrix/` images and full manifest are ignored local test output. The committed [redacted digest](s14-frame-matrix-digest-20261015.json) records every tile name, SHA-256, viewport, selector-presence result and horizontal-overflow measurement. It carries no player identity, phone, cookie or token. The five [representative previews](s14-frame-shots/) contain only synthetic content. Regenerate to inspect all 201 originals at full resolution.
- I read the 16 mobile/desktop contact sheets and the short-height and keyboard images, then compared element order and copy with the five deck frames and `DESIGN_AUTHORITY.md`. Automated checks found **0 document horizontal overflows, 0 missing required selectors, 0 page errors**. The six CDP keyboard slices show the focused stake and final bet action within the 340px visible height. CDP emulation does not render an operating-system keyboard.
- A separate SELECT-only production database read, `npm run qa:short-title-fit` at 2026-10-15 17:25 UTC, confirmed a Railway public-proxy host, a read-only session, **49/49 usable short titles in each of en/sw/zh, 0 full-title fallbacks, 0 rule breaks**. It reported one already documented number warning. This proves stored title coverage, **not a rendered production card**.
- `node scripts/s14-frame-closure.mjs` on the isolated `localhost:3054` preview, with `KP_SOURCE_SHA=e42d970ab9ead56bc44da399352bfd57f9230849`, passed **24/24** focused interaction assertions. It used two-sided synthetic funded pools, a held bet action, a real local responsible-gambling limit, one paused mock wallet rail, a 360×400 viewport and CDP keyboard-height emulation. The [redacted closure digest](s14-frame-closure-digest-20261015.json) records each assertion and SHA-256 of 12 local screenshots. Full captures are at `C:\50pick-ssd\s14-frame-closure-v8\` and are not committed.
- A fresh `e2e:journey` on that corrected source passed **48/48** on the same disposable preview. It drove guest sign-up, a mock confirmed TZS 1,000 deposit, waiting, exactly-once callback and replay, return to the original bet, a separate manual bet, a declined payment and an uncredited pending payment. Its 10 local screenshots are at `C:\50pick-ssd\s14-closure-e2e-v6\` and hashed in the same digest. Neither drive touched a production account or payment rail.

`qa:bet-sheet` on the same UI source passed 84 checks in its keyboard/low/matrix/doors selection before a stale pending-deposit test clicked the legacy `Confirm deposit` control. The preview journey instead has the direct `Lipa TZS 1,000` action. This branch adapts that test to the current journey and preserves the legacy path. A focused `KP_ONLY=matrix` rerun reached the repaired real-mock pending cell: **32 passed, 0 failed, 5 explicitly not driven**; the pending screen showed no second deposit invitation. A lower-load `KP_ONLY=doors` rerun was **19 passed, 0 failed, 1 not measured**: the 2,000-call stress test admitted the bet and reached its receipt, so it did not produce the BUSY refusal it was designed to observe. These focused suites exit nonzero when any cell is not driven. The earlier loaded doors attempt timed out waiting for the receipt; that did not repeat after competing servers stopped. None of these results substitutes for `e2e:journey` or a real provider callback.

## Ordered frame checklist

`✓` means the named element and order were observed on the local preview, with a focused interaction where the claim requires one. `○` means the check still needs the stated proof. The JSON mirrors these marks; a partially read frame is not signed off.

### 1 — Home

| ID | Read | Observation / remaining proof |
| --- | --- | --- |
| H01 | ✓ | 50pick mark leads the header; 18+ remains neutral. |
| H02 | ✓ | Signed-in header shows `Salio` and mono TZS; the CashEye drive masks personal figures while preserving commitment figures. |
| H03 | ✓ | Eligible signed-in preview shows `Weka pesa` in the money slot. |
| H04 | ✓ | `Jinsi ya kucheza` card opens the how-to sheet. |
| H05 | ✓ | `Hatua 3 · dakika 1` follows the card title. |
| H06 | ✓ | At 360px the Swahili heading `Jibu swali. NDIO au HAPANA.` uses two lines. |
| H07 | ✓ | Chips start `Zote`, `Michezo`, `Hali ya hewa`, `Uchumi`; selected chip is distinct. |
| H08 | ✓ | Card metadata precedes the question, with topic and a close label. |
| H09 | ○ | Production DB has 49/49 short titles per language, but a **rendered production short-title card** has not been read. The local `seed-markets` fixture has no approved short titles and correctly exercises the two-line full-title clamp; at 320px it can ellipsize. Do not use that synthetic fallback to approve H09. |
| H10 | ✓ | The closure drive funded both sides with six synthetic ledger bets each. Both YES and NO card actions showed qualified `≈1.9×` estimates, with no fixed promise (`H10`, `funded-card-390.png`). |
| H11 | ✓ | The focused doors drive opened a newly appended `Show more` pick in place on home and live. |
| H12 | ✓ | At 390px the last card ended at document y=2869 and the footer began at y=3013, with zero horizontal overflow. I read the below-list footer tile; no decorative gold figure appeared (`H12.order`, `home-footer-390.png`). |
| H13 | ✓ | Fixed tabs read `Maswali`, `Juu/Chini`, `Tiketi zangu`, `Akaunti`; there is no centre deposit coin. |

### 2 — Bet sheet

| ID | Read | Observation / remaining proof |
| --- | --- | --- |
| B01 | ✓ | Chosen NDIO chip leads the sheet. |
| B02 | ✓ | A held placement kept the visible close button disabled; Escape did not dismiss the sheet (`B02`, `bet-placing-held-390.png`). |
| B03 | ✓ | Full chosen question titles the sheet. |
| B04 | ✓ | `Dau lako` precedes grouped TZS input; keyboard drive typed 500/1,000,000/999,500 while the real caret and field remained visible. |
| B05 | ✓ | Four quick-stake chips follow the input and are visible at 320px. |
| B06 | ✓ | The two-sided funded pool showed `≈ TZS 918` as the dominant figure above multiplier and balance (`B06`, `funded-edit-sheet-390.png`). |
| B07 | ✓ | The funded sheet showed `≈1.8× your bet`, then the approximate/final-pool and 13% commission note (`B07`, same tile). |
| B08 | ✓ | `Salio lako` follows estimate/fallback; synthetic live balance and CashEye masking were read. |
| B09 | ✓ | The guest sheet exposed sign-up/sign-in in place of the final bet action; the fresh journey drive recorded zero guest bet requests (`01-guest-sheet.png`, `e2e:journey` guest checks). The signed-in drive then showed the amount-labelled final action. |
| B10 | ✓ | Existing keyboard/desktop tiles plus the closure drive proved initial focus on the sheet title, Escape dismissal and browser Back dismissal while idle (`B10.focus`, `.escape`, `.back`). |
| B11 | ✓ | The fresh journey placed one displayed YES/TZS 500 bet on one explicit press. A held then aborted action in the closure drive sent one request, created no bet and kept its refusal visible above the retry CTA (`B11`, `bet-inline-failure-390.png`). |

### 3 — Low balance

| ID | Read | Observation / remaining proof |
| --- | --- | --- |
| L01 | ✓ | Selected side and full question remain at the top. |
| L02 | ✓ | Typed stake stays visible and editable, including 320/360 keyboard tests. |
| L03 | ✓ | The two-sided funded pool's low-balance sheet retained the compact approximate payout and `×` multiple (`L03`, `funded-low-sheet-390.png`). |
| L04 | ✓ | `Una TZS 0. Unahitaji TZS 500 zaidi` names spendable balance and shortfall; opening it makes no money action. |
| L05 | ✓ | Two-option scenario places the choice cue before deposit and bet-with-balance paths. |
| L06 | ✓ | Primary row says `Weka pesa TZS 1,000` and lists enabled wallet methods; tapping it carries the original pending bet to deposit. |
| L07 | ✓ | Bet-with-balance appears in the eligible TZS 1,200 case and disappears under real loss-limit/rail refusals. |
| L08 | ✓ | Original `Weka dau · TZS 500` is disabled with insufficient funds. |
| L09 | ✓ | Repaired focused matrix drive sent one mock deposit into PROCESSING, then opened a fresh pending sheet: no second deposit or bet-with-balance invitation appeared. |

### 4 — Deposit

| ID | Read | Observation / remaining proof |
| --- | --- | --- |
| D01 | ✓ | The focused header Back link navigated to Wallet; browser history then returned to the deposit form with the same YES/TZS 500 pending-bet strip (`D01.back`, `.choice`). The separate paid-waiting return to the original sheet is in `e2e:journey`. |
| D02 | ✓ | Strip starts with selected `NDIO` and original `TZS 500` stake. |
| D03 | ✓ | `Kiasi` is prefilled to the TZS 1,000 deposit minimum for a TZS 500 shortfall. |
| D04 | ✓ | Six baseline quick chips followed the amount. Under a real local TZS 1,500 daily limit, only the TZS 1,000 chip remained; a TZS 5,000 carried request prefilled to TZS 1,500 with a limit notice. At TZS 500 headroom, the amount was empty, no chips appeared and Pay stayed disabled (`D04.*`, full-page `deposit-ceiling-360x400.png` and `deposit-below-minimum-360x400.png`). This exposed and drove the fix at `e42d970ab`. |
| D05 | ✓ | With one synthetic rail paused, it was disabled, the other three stayed enabled, nothing was preselected and one enabled row could be selected deliberately. The rail was restored afterward (`D05.*`, `deposit-one-rail-paused-360x400.png`). |
| D06 | ✓ | `Namba ya simu ya malipo` and `+255` field follow methods; the journey form validates a nine-digit mobile number beginning 6 or 7. |
| D07 | ✓ | PIN copy says to authorize the phone prompt and explicitly says the deposit does not place a bet; no credit is claimed before confirmation. |
| D08 | ✓ | `Lipa TZS 1,000` follows phone and PIN guidance as the final payment action. The legacy confirm label does not apply to this preview journey. |
| D09 | ✓ | The mock pending screen said `Please don't pay again`, reported no credit and offered no duplicate-pay action (`08-pending-payment.png`). The declined screen said the wallet was not credited and directed the player to check with the provider (`07-declined-payment.png`); both statuses matched the local ledger. |
| D10 | ✓ | The mock callback credited TZS 1,000 once; same-key replay did not credit again or bet. Paid waiting returned to the selected sheet, and only a separate player press created one position (`e2e:journey` 48/48, `04-paid-waiting.png`, `05-returned-choice.png`, `06-one-bet-receipt.png`). This is local mock proof only; staff production money remains pending. |
| D11 | ✓ | At 360×400, ordinary scrolling brought amount, method, phone and Pay independently into the viewport with hit-testable centres, away from the fixed nav (`D11`, `deposit-pay-reached-360x400.png`). The earlier CDP keyboard slices showed the focused field and action reachable at 360×340 visible height; they emulate viewport height rather than an OS keyboard. |

### 5 — How to Play

| ID | Read | Observation / remaining proof |
| --- | --- | --- |
| P01 | ✓ | `Jinsi ya kucheza` title and close lead the sheet. |
| P02 | ✓ | Step 1 is `Chagua swali` and explains NDIO/HAPANA. |
| P03 | ✓ | Step 2 is `Bonyeza NDIO au HAPANA` and qualifies the approximate estimate. |
| P04 | ✓ | Step 3 is `Weka dau, subiri matokeo` and explains the shared pool and result. |
| P05 | ✓ | `Mfano` uses TZS 1,000 and ≈2.7× as an estimate; losing forfeits the stake. |
| P06 | ✓ | `Nimeelewa, anza` remains visible at 320×640 and dismisses the sheet. |
| P07 | ✓ | `Weka mipaka` limits link remains; the superseded helpline line is absent. |
| P08 | ✓ | With the preview's automation opt-in, a first visit opened the How-to sheet; dismissal saved its seen key, reload did not auto-open, and the card reopened it (`P08.*`, `first-visit-howto.png`). |

## Visual findings and limits

No new clipping, wrong element order or offscreen money control was seen in the 201 local tiles or 24 focused closure assertions. **51/52** local frame elements now have direct proof. The local seed lacks approved short titles and Chinese question translations, so its long Swahili fallback and English question inside Chinese chrome are fixture limitations. Production storage coverage was confirmed separately; a **rendered production preview short-title card** is still required for H09. The agency's written decision and the real staff TZS 1,000 production journey remain separate open S14 gates.

The screenshots show a local synthetic TZS balance and mock rails. No image contains a real account number, phone, payment reference or session token. The ignored full-resolution output is reproducible from the committed capture script; the digest preserves SHA-256 references to this read. Production payment status, owner go and agency sign-off remain pending in `vodacom-s14-evidence.json`.
