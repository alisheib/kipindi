# S14 independent local visual review — 2026-10-15

This review compares the five agency frames in `docs/design-system/v5-2026-09-29-simplified-journey/frames/` with **actual local browser captures** of the integrated staff preview at 390 × 844 and 1280 × 900. The six-page draft packet is [`output/pdf/s14-local-preview-agency-comparison-20261015.pdf`](../../output/pdf/s14-local-preview-agency-comparison-20261015.pdf). Its last page shows the mock paid wait, returned choice and one-bet receipt. It is a **local preview**, not production SHA read-back, a real payment, a 52-element sign-off, or agency approval.

## Findings resolved on this branch

1. The How-to sheet's title was outside the 390px phone viewport. `.kp-howto__sheet > * { flex-shrink: 0 }` had higher specificity than `.kp-howto__scroll { flex-shrink: 1 }`; the intended scroll region could not yield height inside the capped bottom sheet. The non-scroll children now use `:not(.kp-howto__scroll)`. A browser assertion reads the heading and action bounds after the entrance animation. The source guard now rejects the blanket selector.
2. The deposit waiting page rendered a transaction ID with one trailing character on a new line at 390px. The ID row now stacks label and value below `sm`; a browser assertion checks that the ID text occupies one line on the phone. The same row serves paid, failed and pending states.
3. The journey deposit page differed from `VODACOM-PLAN.md` §3.5 and deck frame 4: it hid the chosen YES/NO side and put payment methods before the amount. The valid tab-bound bet now shows the localized side in a kit chip beside its stake, and the amount and chips precede providers. The journey loading ghost follows that order. The classic deposit path and its provider-first ghost are unchanged.
4. The welcome toast covered the short-balance sheet in a comparison capture. The drive dismisses the transient toast and waits for its exit before taking that frame.

## Five-frame read

| Frame | Local mobile and desktop observation | Interpretation |
| --- | --- | --- |
| 1 — Home | How-to card leads the question list. Both YES/NO actions stay visible on phone; desktop uses the three-column board. | Structure matches the agency intent. The presentation's Swahili examples and mock browser chrome differ from the English local fixture. |
| 2 — Selected choice | The returned sheet shows YES, the selected question, TZS 500 stake, balance and a separate Place bet action. | The local seed is one-sided, so the sheet correctly shows its refund/risk notice instead of the deck's estimated payout. |
| 3 — Short balance | TZS 0, TZS 500 shortfall and TZS 1,000 minimum-deposit action read in one sheet; Place bet remains disabled. | The minimum deposit is greater than the chosen stake and the extra TZS 500 remains in the wallet. |
| 4 — Deposit | YES and TZS 500 carry into the form. The amount and quick chips come before four mobile-money methods; the phone and PIN note precede Pay. | The deck's TZS 5,000 choice and TZS 3,000 top-up are illustrative. The local mock uses a TZS 500 choice and TZS 1,000 deposit. |
| 5 — How to play | All three steps, the TZS 1,000 estimate example, action and Set limits link are visible at both widths. | The deck's helpline is intentionally omitted under the owner's 2026-10-06 ruling, recorded in `S7-PLAN.md`. |

The six-page PDF was rendered through Poppler and every page was visually inspected. The desktop captures show the full viewport around centered sheets; the deposit capture is a full-page image because its form is longer than one viewport. Local synthetic identifiers and phone numbers in screenshots do not refer to a staff money proof.

## Browser and source proof

The local `next dev` at `http://localhost:3049` used no `DATABASE_URL`, `PAYMENT_AGGREGATOR=mock`, `PAYMENTS_DEMO_ASYNC=false`, `EMAIL_OUTBOX_CAPTURE=1`, `DISABLE_ADMIN_TOTP=true` and `NEXT_PUBLIC_APP_URL=http://localhost:3049`. `scripts/e2e-journey.mjs` checks that local-only premise before the browser drive. The mobile run passed **44/44** assertions; desktop passed **42/42**. Both included real registration in the local browser, a dev-outbox verification link, the mock TZS 1,000 payment, no automatic bet, a separate TZS 500 bet press, and declined/pending controls. It neither touched Railway nor a real provider.

`npm run typecheck`, `npm run test:deposit-return` (28/28), `npm run test:journey-home`, and `npm run test:howto` passed. The local screenshot directories are ignored by Git; the packet's source images can be regenerated:

```powershell
$env:KP_BASE = 'http://localhost:3049'
$env:KP_E2E_OUT = '.qa-shots/simple-journey/e2e-mobile-review'
npm run e2e:journey
$env:KP_E2E_OUT = '.qa-shots/simple-journey/e2e-desktop-review'
$env:KP_E2E_VIEWPORT = 'desktop'
npm run e2e:journey
python scripts/s14_preview_packet.py
```

The script creates the packet only when both `evidence.json` files contain the expected all-PASS local runs. Repeat this on the **final integrated SHA** and obtain the agency's written frame approval and real production staff money proof before treating S14 as complete.
