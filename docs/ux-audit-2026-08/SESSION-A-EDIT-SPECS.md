# Session A — Turnkey Edit Specs (Money-safety & ops)

> **Purpose:** make Session A mechanical and resumable. Every P0 below was **re-verified against
> HEAD on 2026-08-07** (line numbers current as of that check — re-confirm before editing, the
> repo deploys live). These are exact before→after edits. Prepared by the audit session, which
> can edit files but **cannot run `test:all` / `qa:live` / deploy** — so the implementing Claude
> Code session must run the tests + live-drive + push. Nothing here has been applied yet.
>
> **Progress marks live in `MASTER-PLAN.md §5`.** Tick there as each lands.

---

## B-2 · Retry must not cancel a refused payout  *(P0, file: `src/app/admin/payments/payment-actions.ts`)*

Three functions call `db.txn.update(... "CANCELLED" ...)` **unconditionally** before checking `r.ok`. Move each cancel inside the success branch.

**`retryDepositAction` — line ~134.** Replace:
```ts
  const r = await deposit(t.userId, { provider: (t.provider ?? "MPESA") as DepositProvider, amount: Math.abs(t.amount), msisdn: t.msisdn ?? undefined });
  await db.txn.update(txnId, { status: "CANCELLED", description: `${t.description ?? "deposit failed"} · superseded by retry` });
  audit({ category: "WALLET", action: "payments.retry.deposit", actorId: g.userId, targetType: "Transaction", targetId: txnId, payload: { retried: r.ok, newStatus: r.ok ? r.data?.status : null } });
```
with:
```ts
  const r = await deposit(t.userId, { provider: (t.provider ?? "MPESA") as DepositProvider, amount: Math.abs(t.amount), msisdn: t.msisdn ?? undefined });
  if (r.ok) {
    await db.txn.update(txnId, { status: "CANCELLED", description: `${t.description ?? "deposit failed"} · superseded by retry` });
  } else {
    await db.txn.update(txnId, { description: `${t.description ?? "deposit failed"} · retry refused: ${r.error ?? "unknown"}` });
  }
  audit({ category: "WALLET", action: "payments.retry.deposit", actorId: g.userId, targetType: "Transaction", targetId: txnId, payload: { retried: r.ok, newStatus: r.ok ? r.data?.status : null } });
```

**`retryWithdrawalAction` — line ~172.** Same shape: guard the `"CANCELLED"` update with `if (r.ok)`, else append the refusal reason to `description` and leave status `FAILED`.

**`bulkRetryAction` — line ~294.** Currently:
```ts
      const r = await <retry>;
      await db.txn.update(t.id, { status: "CANCELLED", description: `${t.description ?? "failed"} · superseded by bulk retry` });
      if (r.ok) retried++; else stillFailed++;
```
Move the update inside `if (r.ok)`:
```ts
      const r = await <retry>;
      if (r.ok) {
        await db.txn.update(t.id, { status: "CANCELLED", description: `${t.description ?? "failed"} · superseded by bulk retry` });
        retried++;
      } else {
        await db.txn.update(t.id, { description: `${t.description ?? "failed"} · bulk retry refused: ${r.error ?? "unknown"}` });
        stillFailed++;
      }
```
**Verify:** seed a FAILED withdrawal, pause that MNO's withdrawals (kill-switch), Retry + Retry-all → the row must stay FAILED in the queue; audit shows `retried:false`.

---

## B-3 · 2FA removal/rotation must require step-up  *(P0, files: `src/app/admin/2fa/setup/actions.ts` + `setup-client.tsx`)*

`hasTotp`, `verifyTotp` are already imported (line 8). `removeTotpAction` (~48) and `provisionTotpAction` (~21) gate only on `requireAdmin`.

**`removeTotpAction`** — require a valid current code when a secret exists:
```ts
export async function removeTotpAction(formData?: FormData) {
  const { session } = await requireAdmin();
  try {
    if (await hasTotp(session.userId)) {
      const code = String(formData?.get("code") ?? "").trim();
      if (!/^\d{6}$/.test(code) || !(await verifyTotp(session.userId, code))) {
        return { ok: false as const, error: "Enter a valid current 6-digit code to remove 2FA." };
      }
    }
    await removeTotp(session.userId);
    revalidatePath("/admin/2fa/setup");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Removal failed") };
  }
}
```
**`provisionTotpAction`** — if a secret already exists (rotation), require the current code the same way before provisioning a new one. (First-time enrolment, `!hasTotp`, stays open — that's the legitimate exempt case.)

**Client `setup-client.tsx`** — the "Remove 2FA" path must collect the code and use a hard confirm: wrap in `ConfirmModal tier="hard" typedWord="REMOVE"` (mirror the kill-switch pattern) with a 6-digit input, and pass it as `code` in the FormData.

**Verify:** with a valid session but no code, `removeTotpAction` refuses; UI requires code + typed REMOVE.

---

## B-4 · Balance adjust needs maker-checker + hard confirm  *(P0, files: `balance-adjust-controls.tsx` + `players/[id]/actions.ts` + wallet-service)*

Server cap is `ADJUSTMENT_CAP_TZS = 50_000_000` with one officer. Add a two-person gate at/above the platform's two-person threshold and a hard-tier typed confirm.

**Server (`adjustBalanceAction`):** for `|amount| ≥ 1_000_000` (use the existing two-person threshold constant), apply the AML `getFirstSignature`/countersign pattern already used in `admin/aml/actions.ts` — first officer records a pending adjustment; a *different* officer confirms it; block self-countersign; audit both ids. Below the threshold, behaviour is unchanged. Do **not** alter the atomic `adminAdjustBalance` money primitive.

**Client (`balance-adjust-controls.tsx`):** the file already uses `Modal` + `Button`; for large amounts, gate the submit behind a hard-tier typed confirmation. Simplest kit-faithful path: after `valid`, if `amt >= 1_000_000` require the officer to type the direction word (`CREDIT`/`DEBIT`) into a confirm field before `submit()` enables — mirror `ConfirmModal tier="hard" typedWord`. Show a "second officer required" state when the server returns the stage-1 response.

**Verify:** a 2M credit as one officer → stage-1 recorded, second officer required; audit shows both ids. A 500K credit → unchanged single-officer flow.

*(This is the one Session-A item that is more than a snippet — it needs the server maker-checker. Budget it accordingly; the AML action file is the copy-source.)*

---

## B-5 · Forgeable wallet success modal  *(P0, files: `wallet/page.tsx` + `wallet-result-modal.tsx`)*

`WalletResultModal` renders "Funds added · TZS {amount}" from raw `searchParams` (`deposited`/`withdrawal`/`amount`) with no ownership/existence check. The page already loads the user's txns at `wallet/page.tsx:75`.

**In `wallet/page.tsx`** (~line 100): resolve the referenced txn from the already-loaded `txns` before rendering, and pass verified values (or nothing):
```tsx
  const resultId = sp.deposited || sp.withdrawal || "";
  const resultTxn = resultId ? txns.find((x) => x.id === resultId) : undefined;
  // only render the modal for a txn this user actually owns
  {resultTxn && (
    <WalletResultModal
      deposited={sp.deposited && resultTxn ? sp.deposited : undefined}
      withdrawal={sp.withdrawal && resultTxn ? sp.withdrawal : undefined}
      status={resultTxn.status}                      /* trust the stored status, not sp.status */
      amount={String(Math.abs(resultTxn.amount))}    /* trust the stored amount, not sp.amount */
    />
  )}
```
Then `WalletResultModal` uses the passed (now-verified) values as today. Effect: a fabricated `?deposited=x&amount=5000000` finds no owned txn → no modal. Drop reliance on `sp.status`/`sp.amount` entirely.

**Verify:** open `/wallet?deposited=fake&amount=5000000` → no success modal; a real return still shows it with the stored amount.

---

## B-1 (money slice) · Failed reads must not render as zero/empty  *(P0, multiple files)*

Pattern: replace `try { … } catch { /* graceful */ }` (defaulting to `0`/`[]`) on a **read** with an explicit failure flag that renders a "couldn't load — retry" panel, or let the route `error.tsx` catch. Files: `wallet/page.tsx:68,75`, `wallet/withdraw/page.tsx:63`, `positions/page.tsx:38,53`, `markets/[id]/page.tsx:145,251` (pass `balance: number|null`, suppress the insufficient warning when null), and admin dashboards `admin/payments/page.tsx:45,55`, `admin/finance/page.tsx`, `admin/page.tsx` (use `AdminLoadError` / `AdminKpi unavailable` — distinguish failed from genuinely-empty). Add `wallet/withdraw/error.tsx` etc. where a catch is removed and no boundary exists.

**Verify:** throw from each read in dev → failure panel, never TZS 0 / empty / hidden alarm card.

---

## B-8 · Admin controls silent on thrown action  *(P1)*

Add a shared helper (e.g. `src/lib/client/run-admin-action.ts`):
```ts
export async function runAdminAction<T>(fn: () => Promise<T>): Promise<T | { ok: false; error: string }> {
  try { return await fn(); }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Server error — nothing may have applied. Refresh before retrying." }; }
}
```
Wire it into the ~16 controls listed in the platform report (kill-switch, control-plane×2, retry-controls, bulk-retry, reconcile, stuck-payout, payout-status, two-admin-toggle, resolve-controls, resolution-ceremony, settle-button, kyc-decision-rail, report-pack, balance-adjust, suspend, force-reverify) so a throw shows a danger toast / `ActionOverlay.fail`, never nothing.

---

## B-9 · AML stage-1 badge reads the durable store  *(P1, files: `admin/aml/page.tsx` + `admin/aml/actions.ts`)*

`page.tsx` scans `getAuditPage({ category:"ADMIN" })` for `aml.approve.stage1`, but actions write it as `category:"COMPLIANCE"` **and** store the durable signature in config-store. Export a `getFirstSignature`/`listFirstSignatures` read from the config-store layer the actions use, and drive the row badge + "awaiting second" KPI from it (delete the audit scan). Fix the two info-card sentences on `/admin/aml` and `/admin/approvals` that claim "ADMIN audit category".

**Verify:** record stage-1 on a ≥1M txn, redeploy, reload `/admin/aml` → badge + KPI persist.

---

### Session A definition of done
All seven `[x]` in `MASTER-PLAN.md §5`, each with: relevant `test:*` green → `qa:live` → live-drive on prod → committed AND pushed. Full `test:all` before the pushes that touch money files (all of B-1…B-5, B-9).
