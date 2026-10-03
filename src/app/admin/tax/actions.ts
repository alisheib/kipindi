"use server";

/**
 * GOVERNMENT TAX REPORT — the three acts on `/admin/tax` (`docs/TAX-REPORT.md` §6, §5).
 *
 *   lockTaxPeriodAction      Finance (accounting ACT) or the Owner locks a finished, balanced period.
 *                            The Owner alone may lock one OUT of balance, with a written reason.
 *   unlockTaxPeriodAction    The Owner reopens a locked period, with a written reason.
 *   recordTaxRatesAction     The Owner records a new rate version, effective from a day.
 *
 * ⛔ NOTHING THE CLIENT SENDS IS TRUSTED AS A FIGURE. A lock RECOMPUTES the period on the server and
 * stores what it computed; the form names the period, the product, the officer's words — and the
 * figures the officer was SHOWN, which are compared with the recompute so a lock can never freeze
 * figures nobody looked at (the books moved between page load and click → refused, refresh first).
 * ⭐ "THE OWNER" IS THE STORED ADMIN ROLE (`requireOwner`), never a grantable domain: reopening a filed
 * period and changing a tax rate cannot be handed to another role through the grant table.
 * ⭐ Every act is audited, awaited, and the officer is told whether the row landed (`recorded`).
 */
import { revalidatePath } from "next/cache";
import { requireOwner, requireStaff } from "@/lib/server/rbac-guard";
import { fieldError, type ActionFailure } from "@/lib/server/field-error";
import { audit } from "@/lib/server/audit";
import { buildTaxReportData } from "@/lib/server/tax-report-data";
import { activeLockFor, insertLock, releaseLock, seenFingerprint } from "@/lib/server/tax-locks";
import { recordRateVersion } from "@/lib/server/tax-config";
import { db } from "@/lib/server/store";
import {
  LOCK_GRACE_MS,
  formatCents,
  isLockable,
  parsePercentToBp,
  parseProduct,
  periodFromParams,
  type TaxPeriod,
} from "@/lib/tax-report";

const REASON_MIN = 10;
const REASON_MAX = 500;
const NOTE_MAX = 500;

function periodOf(fd: FormData, nowMs: number): TaxPeriod | null {
  const get = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" && v !== "" ? v : undefined;
  };
  const { period, fellBack } = periodFromParams({ period: get("period"), month: get("month"), week: get("week"), day: get("day"), from: get("from"), to: get("to") }, nowMs);
  return fellBack ? null : period;
}

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

/** The figures a lock form carries: what the officer was shown. Each must equal the recompute. */

export async function lockTaxPeriodAction(fd: FormData): Promise<{ ok: true; lockId: string; recorded: boolean } | ActionFailure> {
  const session = await requireStaff("accounting");
  const nowMs = Date.now();
  const period = periodOf(fd, nowMs);
  if (!period) return { ok: false, error: "The period could not be read — refresh the page and try again." };
  if (period.kind === "custom") return { ok: false, error: "A custom window can be viewed and exported, but only a day, a week or a month can be locked." };
  if (!isLockable(period, nowMs)) {
    return { ok: false, error: period.endMs > nowMs
      ? "This period is still running. It can be locked once it has closed."
      : `This period closed moments ago. It can be locked ${Math.ceil(LOCK_GRACE_MS / 60_000)} minutes after it closes, so every bet stamped inside it has settled into the books.` };
  }
  const product = parseProduct(fd.get("product"));
  const note = clean(fd.get("note"), NOTE_MAX) || null;
  const acknowledge = clean(fd.get("acknowledge"), REASON_MAX);

  // ⛔ Recomputed HERE, from the books — never taken from the page that asked.
  const built = await buildTaxReportData({ period, product, nowMs });
  if (!built.ok) return { ok: false, error: built.error };
  const data = built.data;

  // ⭐ WHAT WAS SHOWN IS WHAT IS LOCKED. The form carries the fingerprint of everything the page showed (`seenFingerprint`:
  // every line, the TRA/GBT split, the whole book, the exceptions, the rates). A form without it, or one whose books have
  // moved since — by a shilling, or by a rate re-split that keeps the total — is refused: nothing the officer did not see freezes.
  const seen = fd.get("seen");
  if (typeof seen !== "string" || seen !== seenFingerprint(data)) {
    return { ok: false, error: "The books changed after this page was loaded, so nothing was locked. Refresh the page, review the new figures, then lock." };
  }

  const balanced = data.main.reconciliation.balanced;
  const wholeOut = data.wholeBook !== null && !data.wholeBook.balanced;
  let exceptionsAcknowledged: string | null = null;
  if (!balanced || wholeOut) {
    // The Owner alone may file a period whose check does not close — on this product, or on the whole book
    // behind it — and only with the reason written down.
    const actor = await db.user.findById(session.userId);
    if (actor?.role !== "ADMIN") {
      return { ok: false, error: !balanced
        ? "This period is out of balance, so it cannot be locked. The Owner can lock it with the exceptions acknowledged."
        : `This product balances, but the whole book is out of balance by TZS ${formatCents(data.wholeBook!.differenceCents)}, so it cannot be locked. Resolve it under All products, or the Owner can lock it with the difference acknowledged.` };
    }
    if (acknowledge.length < REASON_MIN) return fieldError("tax-acknowledge", `Write why this period is being locked out of balance (at least ${REASON_MIN} characters).`);
    exceptionsAcknowledged = acknowledge;
  }
  if (await activeLockFor(period.kind, period.key, product)) return { ok: false, error: "This period is already locked." };

  const res = await insertLock({
    periodKind: period.kind,
    periodKey: period.key,
    product,
    periodStartMs: period.startMs,
    periodEndMs: period.endMs,
    snapshot: data,
    balanced,
    lockedBy: session.userId,
    note,
    exceptionsAcknowledged,
  });
  if (!res.ok) return { ok: false, error: res.error };
  const rec = await audit({
    category: "ADMIN",
    action: "tax_report.period.locked",
    actorId: session.userId,
    targetType: "TaxPeriod",
    targetId: `${period.kind}:${period.key}:${product}`,
    payload: {
      lockId: res.lock.id,
      sha256: res.lock.sha256,
      balanced,
      wholeBookBalanced: data.wholeBook ? data.wholeBook.balanced : balanced,
      differenceCents: data.main.reconciliation.differenceCents,
      salesCents: data.main.report1.salesCents,
      payoutCents: data.main.report1.payoutCents,
      onHoldCents: data.main.report1.onHoldCents,
      refundsCents: data.main.report1.refundsCents,
      commission: data.main.tax.commission,
      tra: data.main.tax.tra,
      gbt: data.main.tax.gbt,
      totalTax: data.main.tax.total,
      rateVersions: data.rateVersions.map((v) => v.id),
      note,
      exceptionsAcknowledged,
    },
  });
  revalidatePath("/admin/tax");
  return { ok: true, lockId: res.lock.id, recorded: rec.recorded };
}

export async function unlockTaxPeriodAction(fd: FormData): Promise<{ ok: true; recorded: boolean } | ActionFailure> {
  const session = await requireOwner("tax-report-reopen");
  const lockId = String(fd.get("lockId") ?? "").trim();
  if (!/^taxlock_[A-Za-z0-9]+$/.test(lockId)) return { ok: false, error: "That lock could not be read — refresh the page." };
  const reason = clean(fd.get("reason"), REASON_MAX);
  if (reason.length < REASON_MIN) return fieldError("tax-unlock-reason", `Write why this period is being reopened (at least ${REASON_MIN} characters).`);
  const res = await releaseLock(lockId, session.userId, reason);
  if (!res.ok) return { ok: false, error: res.error };
  const rec = await audit({
    category: "ADMIN",
    action: "tax_report.period.unlocked",
    actorId: session.userId,
    targetType: "TaxPeriod",
    targetId: `${res.lock.periodKind}:${res.lock.periodKey}:${res.lock.product}`,
    payload: { lockId, sha256: res.lock.sha256, lockedBy: res.lock.lockedBy, lockedAt: new Date(res.lock.lockedAtMs).toISOString(), reason },
  });
  revalidatePath("/admin/tax");
  return { ok: true, recorded: rec.recorded };
}

export async function recordTaxRatesAction(fd: FormData): Promise<{ ok: true; recorded: boolean } | ActionFailure> {
  const session = await requireOwner("tax-report-rates");
  const effectiveFrom = String(fd.get("effectiveFrom") ?? "").trim();
  const commissionBp = parsePercentToBp(String(fd.get("commission") ?? ""));
  if (commissionBp === null) return fieldError("tax-rate-commission", "Commission must be a percentage between 0 and 100, with at most two decimals (e.g. 13 or 12.5).");
  const traBp = parsePercentToBp(String(fd.get("tra") ?? ""));
  if (traBp === null) return fieldError("tax-rate-tra", "TRA must be a percentage between 0 and 100, with at most two decimals.");
  const gbtBp = parsePercentToBp(String(fd.get("gbt") ?? ""));
  if (gbtBp === null) return fieldError("tax-rate-gbt", "GBT must be a percentage between 0 and 100, with at most two decimals.");
  const note = String(fd.get("note") ?? "");
  const res = await recordRateVersion({ effectiveFrom, rates: { commissionBp, traBp, gbtBp }, note }, session.userId);
  if (!res.ok) {
    const field = res.field === "effectiveFrom" ? "tax-rate-from" : res.field === "note" ? "tax-rate-note" : res.field ? `tax-rate-${res.field}` : undefined;
    return field ? fieldError(field, res.error) : { ok: false, error: res.error };
  }
  // The store's verified save stands; this is the record of WHO changed WHICH rates and WHY, awaited and reported.
  const rec = await audit({
    category: "ADMIN",
    action: "tax_report.rates.recorded",
    actorId: session.userId,
    targetType: "TaxReportConfig",
    targetId: res.version.id,
    payload: { effectiveFrom: res.version.effectiveFrom, rates: res.version.rates, note: res.version.note },
  });
  revalidatePath("/admin/tax");
  return { ok: true, recorded: rec.recorded };
}
