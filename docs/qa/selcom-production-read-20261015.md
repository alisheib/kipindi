# Selcom production configuration and settlement read — 2026-10-15

This is a read-only Railway and source inspection at 17:49 UTC. It does not substitute for the S14 real TZS 1,000 staff journey or an S15 security decision. No credential value was copied into this record.

## Masked production configuration

The selected production app uses `PAYMENT_AGGREGATOR=selcom`. `PAYMENT_API_URL`, `PAYMENT_API_KEY`, `PAYMENT_API_SECRET`, `PAYMENT_VENDOR_ID`, `PAYMENT_VENDOR_PIN` and `PAYMENT_WEBHOOK_URL` are set. Dedicated disbursement overrides are absent; `selcomDisburseEnv()` deliberately inherits the collection credentials and PIN. This matches the shared-account Selcom arrangement recorded in `src/lib/server/selcom.ts`.

`SELCOM_WEBHOOK_SECRET` is set, but the current Selcom callback does not read it. Its `Digest` is checked with `PAYMENT_API_SECRET`. The generic callback's `AZAMPAY_WEBHOOK_SECRET` and `MIXX_WEBHOOK_SECRET` are absent; the production aggregator is Selcom. Generic provider callbacks must remain disabled until their own secrets are configured and reviewed. `DISABLE_ADMIN_TOTP` is set, as Ali requested for staff preview. None of these observations grants the S15 public flip.

## Settlement path checked in source

- A Selcom deposit callback is correlated to a stored transaction, then `selcomVerifyOrder()` re-queries the provider with signed API credentials. The callback body's claimed status cannot by itself credit a wallet; the returned amount reaches the settlement tamper check.
- A withdrawal callback requires a verified Selcom digest and a re-query of the payout's stored rail and provider reference. An unverified or ambiguous result leaves the row pending for provider review and scheduled reconciliation.
- The generic AzamPay/Mixx HMAC receiver explicitly refuses `selcom`, so it cannot bypass the authoritative Selcom order query.

These are source and masked configuration findings, not evidence that a particular payment completed. The S14 staff operator must still record the real production deposit, return and separate bet press. Before S15, Ali must review the then-current admin access and enabled provider signing posture and give a fresh dated launch decision.
