# ⚠️ OPERATOR CREDIT TOOLS — REAL MONEY. REMOVE BEFORE PUBLIC LAUNCH.

> **DANGER — these scripts fabricate real wallet balances on the LIVE system.**
> They exist for operator/test funding only. **Ali's decision (2026-07-24):**
> keep during the current phase; **remove (or hard-disable) before real public
> go-live.** Do not expose, do not wire to any HTTP route, do not run for anyone
> outside the operator/test set.

## What they are

| Script | Purpose |
|--------|---------|
| `scripts/gift-admin-credit.ts` | One-off: credit 1,000,000 TZS to every ADMIN account + `+255772388888`, then email a "🎁 gift from Ali" note. |
| `scripts/credit-user.ts` | Reusable: credit ONE phone number a custom amount (+ optional gift email). |

Both go through the **audited** `wallet-service.adminAdjustBalance` path:
atomic wallet update + CONFIRMED `ADJUSTMENT_CREDIT` transaction + double-entry
ledger + **WATCHED COMPLIANCE audit** attributed to an officer. Nothing is
off-books — every credit is logged, exactly like the Admin console does it.

## The safer built-in alternative (prefer this)

The product already exposes this as a first-class, TOTP-gated feature:
**Admin console → Players → [search number] → Manual balance adjustment.**
Use it for routine top-ups; reach for the CLI only for bulk/test funding.

## Safety properties

- **PREVIEW by default.** A bare run prints the target(s) and moves nothing.
  Only `--commit` credits money and sends email.
- Single-adjustment cap: **50,000,000 TZS** (enforced by `adminAdjustBalance`).
- Serializes with the live app via the Postgres advisory lock (no double-credit).
- Email only reaches accounts that have an address on file.

## How to run (from a laptop, off-Railway)

The app service only knows the **internal** DB host, so pass the **public** proxy
URL. Get it from `railway variables --service Postgres` (`DATABASE_PUBLIC_URL`).

Windows PowerShell:
```powershell
cd F:\kipindi-main
$env:DATABASE_PUBLIC_URL="<DATABASE_PUBLIC_URL>"
railway run --service 50pick npx tsx scripts/credit-user.ts 0772388888 500000            # preview
railway run --service 50pick npx tsx scripts/credit-user.ts 0772388888 500000 --commit   # execute
```
Windows Command Prompt (cmd):
```cmd
cd /d F:\kipindi-main
set DATABASE_PUBLIC_URL=<DATABASE_PUBLIC_URL>
railway run --service 50pick npx tsx scripts/credit-user.ts 0772388888 500000 --commit
```

Phone input is flexible: `0772388888`, `772388888`, `255772388888`,
`+255772388888` all resolve to `+255772388888`.

## Removal checklist (before public launch)

1. `git rm scripts/gift-admin-credit.ts scripts/credit-user.ts`
2. Delete this file.
3. Confirm no other code imports them.
4. **Rotate the Postgres password** if it was ever pasted into a chat/log.
