# The Selcom ask to unlock real-money CASH-OUT (withdrawals)

> 50pick has Selcom **collection (deposit)** access live and validated. What is
> still missing — and the ONLY thing blocking real withdrawals — is **disbursement
> (payout) access + the float-account PIN**. No code change on our side unlocks it;
> Selcom must enable it on the account. Send the email below to Selcom.

## Why this is needed (plain version)
- **Deposits (money IN)** run on Selcom **Checkout / Collections** — we have those creds, and they passed the live signed probe. ✅
- **Withdrawals (money OUT)** run on Selcom **Wallet Cashin** (`/v1/walletcashin/process`). That is a *separate product* that debits a **float account** you top up with Selcom, authenticated by a **float PIN**. We were only issued Collections ("Customer to Business") creds — there is **no float PIN**, so payouts cannot run.

## What to request from Selcom
Email **support@selcom.net** (and your Selcom account/onboarding contact), from the 50pick business email:

---
**Subject:** Enable Wallet Cashin (disbursement) + float account & PIN — 50pick (vendor `<YOUR_VENDOR_ID>`)

Hello Selcom team,

Our 50pick production account (vendor/till `<YOUR_VENDOR_ID>`) is live on **Collections/Checkout** and working. We now need to send payouts to customers (mobile-money withdrawals) via **Wallet Cashin** (`/v1/walletcashin/process`). Please enable and provide:

1. **Disbursement / Wallet Cashin access** on our production API credentials (same API key/secret, or new disbursement creds if separate — please confirm which).
2. A **float account** for outgoing payments and instructions to **top it up / fund** it.
3. The **float-account PIN** (the `pin` field required by Wallet Cashin) — sent through a secure channel.
4. Confirmation of the **utilitycode routing** we should use for payouts: `VMCASHIN` (M-Pesa), `AMCASHIN` (Airtel), `TPCASHIN` (Tigo/Mixx by Yas), `HPCASHIN` (HaloPesa), `TTCASHIN` (TTCL) — or whether we should use `CASHIN` (auto-route by MNP lookup).
5. Confirmation our **production egress IPs are allow-listed for disbursement** too: `162.220.232.250`, `152.55.176.240`, `152.55.177.181`.
6. Any **daily/transaction disbursement limits** or KYC/AML requirements on the float account.

Thank you.
---

## What WE do the moment Selcom replies
1. Set `PAYMENT_VENDOR_PIN` (and any disbursement-specific vendor/creds) in Railway env — **secret, never in git**.
2. Fund the float account (Ali).
3. Re-run the admin **"Test Selcom"** probe, then a small **real withdrawal** (~1,000 TZS) end-to-end and confirm the money arrives + reconciliation drift = TZS 0.
4. Then withdrawals are live. (Deposits are already ready to switch on independently.)

## Reality check on "today"
- **Mobile-money DEPOSIT** can be tested today (creds validated; needs a real handset to approve the USSD PIN).
- **CASH-OUT** cannot be tested until the float PIN above arrives — this is a Selcom turnaround, not a 50pick task.
- **CARD deposits** are a different rail (Selcom hosted Checkout page) we have not built yet; mobile money is what's wired.
