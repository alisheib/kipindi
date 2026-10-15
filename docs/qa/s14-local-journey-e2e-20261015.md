# S14 local journey browser proof — 2026-10-15

This is the **local disposable** proof for `VODACOM-PLAN.md` §5 S14 item 1. It is not the production TZS 1,000 staff transaction, the 52-element frame read, the full viewport matrix, or agency sign-off.

## Run and result

The checkout was based on integrated visual candidate `7ca33c67c`, with this proof and the neutral failed-payment copy applied. A fresh `npm ci` generated the matching Prisma client. The server ran in `next dev` on `http://localhost:3048`, with `DATABASE_URL` removed, `PAYMENT_AGGREGATOR=mock`, `PAYMENTS_DEMO_ASYNC=false`, `EMAIL_OUTBOX_CAPTURE=1`, `DISABLE_ADMIN_TOTP=true`, and `NEXT_PUBLIC_APP_URL=http://localhost:3048`. The command itself checked `/api/health.database.configured=false`, the `STAFF_PREVIEW` rollout, the actual Mock selection in the payments control plane, and a staff-minted preview pass before touching the browser. It refused any other host or configured database.

`npm run e2e:journey` passed **39/39 browser assertions** on 2026-10-15 16:13 UTC. Evidence and eight viewport screenshots were written to `.qa-shots/simple-journey/e2e/` (ignored; synthetic accounts and transaction IDs stay local). The drive used real UI registration, a message actually captured in the development email outbox, the wallet deposit form and its server action, the deposit status read, and the journey sheet's server bet action.

| Path | Observed result |
| --- | --- |
| Guest → choice → registration | Guest sheet opened in place; the signup door carried the chosen market and side. Password registration returned to that choice with zero positions and zero `BET_PLACED` rows. |
| Dev outbox | Registration's captured verification link stayed on the local host and opened the confirmation page. Account creation has used a password and email **link** since 2026-10-06; the old plan's “dev outbox code” wording describes the retired signup path. |
| Short balance → deposit → waiting | The new player had zero funds, the sheet offered the TZS 1,000 deposit minimum, and the M-Pesa mock confirmed exactly TZS 1,000. The waiting page said the money arrived and that no bet was placed automatically. |
| Replay → return → manual bet | Reopening the waiting page and replaying the captured **same funding action and key** kept the wallet at TZS 1,000, with no position. Return restored the selected choice; only a separate player press placed one TZS 500 bet and one `BET_PLACED` ledger row. |
| Declined mock payment | The mock's TZS 1,013 decline returned `FAILED`, balance TZS 0, zero positions, and an actionable payment-status screen. |
| Pending mock payment | The admin control plane switched Demo async on. A separate player's TZS 1,000 payment stayed `PENDING`, uncredited, and without a bet; refreshing waiting did not change that. The original Demo async setting was restored. |

The screenshot read found a real wording error: a **mobile-money** failure said “Nothing was taken from your card.” The journey waiting page now uses a provider-neutral failure body in English, Swahili, and Chinese. The Card-specific return page retains its existing copy. The final screenshot shows the corrected mobile-money failure wording.

Targeted source checks passed: `npm run typecheck`, `npm run test:i18n` (2,793 keys per language), `npm run test:deposit-state` (184/184), and `npm run test:s14-evidence` (structure valid, correctly reports the remaining S14 items open).

## Reproduce

Use a separate, disposable checkout with its own `node_modules` and `.next`. In one PowerShell terminal:

```powershell
$env:DISABLE_ADMIN_TOTP = 'true'
$env:EMAIL_OUTBOX_CAPTURE = '1'
$env:PAYMENT_AGGREGATOR = 'mock'
$env:PAYMENTS_DEMO_ASYNC = 'false'
$env:NEXT_PUBLIC_APP_URL = 'http://localhost:3048'
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
npm run dev -- -p 3048
```

In another terminal in that same checkout:

```powershell
$env:KP_BASE = 'http://localhost:3048'
npm run e2e:journey
```

The failed and pending controls use local mock behavior. This drive does not simulate a signed provider callback, the real Selcom/Mixx rail, a production receipt, or a real TZS 1,000 bet. The separate S14 adversarial callback audit and production staff proof remain necessary. Re-run on the **final integrated SHA** and file that exact run in `vodacom-s14-evidence.json`; this branch's local result alone does not close the S14 gate.
