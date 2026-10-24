"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import {
  setGlobalConfig,
  setMarketOverride,
  clearMarketOverride,
  type RateConfig,
} from "@/lib/server/market-config";
import { applyFeeProfileToEveryChain, readUpDownConfigFresh } from "@/lib/server/updown-config";
import { feeProfileFromForm } from "@/lib/updown-fee-profile";
import { requireStaff } from "@/lib/server/rbac-guard";

// RBAC: authorization is data-driven — requireStaff checks this role's canAct for the
// domain (Owner/ADMIN bypasses), audits a blocked attempt, then enforces step-up 2FA.
async function ensureAdmin() {
  return requireStaff("accounting");
}

function parseRate(raw: string | null, scale = 100): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return n / scale; // input is 0–20 (percent), stored as 0.0–0.20
}

function parseInteger(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseRatio(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * A <select> for the fee model. Only the known poll models are passed on.
 * ⭐ `stake-share` (FEE-TAX-2026-10) is passed on too, so `validate` REFUSES it in words while `fee-law-gate.ts` is shut —
 * dropping it here would turn the officer's choice into a silent no-op, the defect this file's F3 note records.
 */
function parseFeeModel(raw: string | null): RateConfig["feeModel"] | undefined {
  if (raw === "capped-commission" || raw === "loser-share" || raw === "stake-share") return raw;
  return undefined;
}

/** A checkbox. Absent (unchecked) ⇒ false; present ("on"/"true") ⇒ true.
 *  The hidden companion input guarantees the key is always posted, so an unchecked
 *  box reads as an explicit false rather than "leave unchanged". */
function parseBool(raw: string | null): boolean | undefined {
  if (raw == null) return undefined;
  return raw === "on" || raw === "true" || raw === "1";
}

/**
 * ⭐ THE VALUES THE FORM WAS DRAWN WITH — its hidden `baseline` (FEE-TAX-2026-10, R2c; the independent review of R2a). The
 * writer applies only what differs from it, and refuses a changed field whose stored value no longer equals it ("Another
 * officer changed … since this page was opened"), so a page opened on a stale container can no longer save its old values
 * back over another officer's save. ⛔ A form that posts none, or one that cannot be read, is refused — never treated as
 * "no baseline", which would be the overwrite this exists to stop.
 */
function parseBaseline(formData: FormData): { ok: true; baseline: Record<string, unknown> } | { ok: false; error: string } {
  const raw = formData.get("baseline");
  if (typeof raw !== "string" || raw === "") {
    return { ok: false, error: "This page was opened before its settings could be compared with the saved ones. Reload the page and try again." };
  }
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("not an object");
    return { ok: true, baseline: v as Record<string, unknown> };
  } catch {
    return { ok: false, error: "This page's copy of the settings could not be read back. Reload the page and try again." };
  }
}

export async function updateGlobalConfigAction(formData: FormData) {
  const s = await ensureAdmin();
  try {
    const base = parseBaseline(formData);
    if (!base.ok) return { ok: false as const, error: base.error };
    const updates: Partial<RateConfig> = {};
    const c = parseRate(String(formData.get("commissionRate") ?? ""));
    const ceil = parseRate(String(formData.get("feeCeilingRate") ?? ""));
    const co = parseRate(String(formData.get("cashOutFeeRate") ?? ""));
    // Minutes, not a rate.
    const grace = parseInteger(String(formData.get("freeExitGraceMinutes") ?? ""));
    const paidWin = parseInteger(String(formData.get("paidExitWindowMinutes") ?? ""));
    const wdr = parseRate(String(formData.get("withdrawalFeeRate") ?? ""));
    const gw = parseRate(String(formData.get("withdrawalGatewayShareRate") ?? ""));
    const min = parseInteger(String(formData.get("minStake") ?? ""));
    const max = parseInteger(String(formData.get("maxStake") ?? ""));
    const thin = parseRatio(String(formData.get("thinProfitRatio") ?? ""));
    const starter = parseInteger(String(formData.get("starterBalanceTzs") ?? ""));
    const tra = parseRate(String(formData.get("traTaxOnCommissionRate") ?? ""));
    // F11 — the settlement gate. Hours, not a rate: 0..168, 0 = no window.
    const objWindow = parseInteger(String(formData.get("objectionWindowHours") ?? ""));
    const gbt = parseRate(String(formData.get("gbtLevyOnCommissionRate") ?? ""));
    // Fee model (loser-share) — applies to FUTURE polls only.
    const feeModel = parseFeeModel(formData.get("feeModel") as string | null);
    const platform = parseRate(String(formData.get("platformFeeRate") ?? ""));
    const operator = parseRate(String(formData.get("operatorFeeRate") ?? ""));
    const estRate = parseRate(String(formData.get("estimatedWinningsRate") ?? ""));
    // FEE-TAX-2026-10 · the winnings tax, a percentage like every rate here, read only when the form posts it — and
    // `validate` refuses it while `fee-law-gate.ts` is shut. The Fees & taxes card draws the field DISABLED until then,
    // so a disabled field posts nothing; an empty one is no update (there is no default tax to fall back to).
    const winTax = formData.has("winningsTaxRate") ? parseRate(String(formData.get("winningsTaxRate") ?? "")) : undefined;
    // The display switch, read on its OWN key (FEE-TAX-2026-10, R2c): the form now posts only the fields the officer
    // changed (a stale page must not resend values it was drawn with), so the switch can arrive without the model.
    const showEst = formData.has("showEstimatedWinnings") ? parseBool(formData.get("showEstimatedWinnings") as string | null) : undefined;
    if (c !== undefined) updates.commissionRate = c;
    if (ceil !== undefined) updates.feeCeilingRate = ceil;
    if (co !== undefined) updates.cashOutFeeRate = co;
    if (grace !== undefined) updates.freeExitGraceMinutes = grace;
    if (paidWin !== undefined) updates.paidExitWindowMinutes = paidWin;
    if (wdr !== undefined) updates.withdrawalFeeRate = wdr;
    if (gw !== undefined) updates.withdrawalGatewayShareRate = gw;
    if (min !== undefined) updates.minStake = min;
    if (max !== undefined) updates.maxStake = max;
    if (thin !== undefined) updates.thinProfitRatio = thin;
    if (starter !== undefined) updates.starterBalanceTzs = starter;
    if (tra !== undefined) updates.traTaxOnCommissionRate = tra;
    if (objWindow !== undefined) updates.objectionWindowHours = objWindow;
    if (gbt !== undefined) updates.gbtLevyOnCommissionRate = gbt;
    if (feeModel !== undefined) updates.feeModel = feeModel;
    if (platform !== undefined) updates.platformFeeRate = platform;
    if (operator !== undefined) updates.operatorFeeRate = operator;
    if (estRate !== undefined) updates.estimatedWinningsRate = estRate;
    if (winTax !== undefined) updates.winningsTaxRate = winTax;
    if (showEst !== undefined) updates.showEstimatedWinnings = showEst;
    // setGlobalConfig REFUSES a config under which a winner could be paid below
    // their stake (the winner-floor guardrail in validate()), and may return a
    // `warn` for a ceiling above 50%. Both surface to the officer.
    // ⭐ …and it compares the save with the values this page was drawn with (`baseline`): a field another officer changed
    // since the page opened is refused in words, never written over.
    const r = await setGlobalConfig(updates, s.userId, { baseline: base.baseline as Partial<RateConfig> });
    revalidatePath("/admin/config");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Config update failed") };
  }
}

export async function setMarketOverrideAction(formData: FormData) {
  const s = await ensureAdmin();
  const marketId = String(formData.get("marketId") ?? "").trim();
  if (!marketId) return { ok: false as const, error: "Missing market id." };
  try {
    // 🔴 F3 · A PER-MARKET RATE OVERRIDE CANNOT REACH ANYTHING, so this action no
    // longer pretends to accept one. `createMarket` freezes rates by asking
    // `getEffectiveConfig` for an id it minted one microsecond earlier, so an
    // override stored under an existing poll's id is never the one it reads.
    // ⛔ REFUSED RATHER THAN IGNORED. Silently dropping a rate an officer typed is
    // how the four dead inputs survived so long — every signal said the write had
    // worked. A stale tab or a hand-rolled POST gets told the truth instead.
    const DEAD_RATE_KEYS = ["commissionRate", "feeCeilingRate", "cashOutFeeRate", "thinProfitRatio"] as const;
    const attempted = DEAD_RATE_KEYS.filter((k) => String(formData.get(k) ?? "").trim() !== "");
    if (attempted.length > 0) {
      return {
        ok: false as const,
        error: `Fee rates cannot be overridden per market (${attempted.join(", ")}). They are global and are frozen onto a poll at creation — set them in the global config before creating the poll.`,
      };
    }
    const updates: Partial<RateConfig> = {};
    const min = parseInteger(String(formData.get("minStake") ?? ""));
    const max = parseInteger(String(formData.get("maxStake") ?? ""));
    // ⚠️ These two DO work: read live via getEffectiveConfig(m.id) on the market page
    // and enforced server-side in buyPosition. They are why the form still exists.
    if (min !== undefined) updates.minStake = min;
    if (max !== undefined) updates.maxStake = max;
    if (Object.keys(updates).length === 0) {
      return { ok: false as const, error: "No values to update." };
    }
    // ⭐ The override this page showed for that market (`baseline`, `{}` when it showed none): another officer's override
    // made since the page opened is refused in words, never written over.
    const base = parseBaseline(formData);
    if (!base.ok) return { ok: false as const, error: base.error };
    const r = await setMarketOverride(marketId, updates, s.userId, { baseline: base.baseline as Partial<RateConfig> });
    revalidatePath("/admin/config");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Override failed") };
  }
}

/**
 * ⭐ UP & DOWN, "APPLY TO EVERY CHAIN" — the Fees & taxes card's two steps (FEE-TAX-2026-10, R2c), accounting like the
 * rest of this page: first the DRY RUN, whose counts the confirm shows, then the act. Both build the profile the same way
 * (`feeProfileFromForm`: the officer's model and two rates over the product's default as stored NOW — read fresh, never
 * this container's copy) and both go through `applyFeeProfileToEveryChain`, which is refused by `fee-law-gate.ts` while the
 * new law is not in force, validates the profile, requires the reason, and moves the default and every chain — RUNNING,
 * PAUSED, STOPPED and ARCHIVED — in one transaction with one audit row. Rounds already open keep the rates they froze.
 */
async function applyProfileStep(formData: FormData, dryRun: boolean) {
  const s = await ensureAdmin();
  try {
    const fresh = await readUpDownConfigFresh();
    if (!fresh.ok) {
      return { ok: false as const, error: "The Up & Down settings could not be read, so nothing was changed. Reload the page and try again." };
    }
    const built = feeProfileFromForm({
      feeModel: formData.get("feeModel"),
      platformFeeRate: formData.get("platformFeeRate"),
      operatorFeeRate: formData.get("operatorFeeRate"),
    }, fresh.config.defaultRateProfile as Record<string, unknown>);
    if (!built.ok) return { ok: false as const, error: built.error };
    const r = await applyFeeProfileToEveryChain(built.profile as Partial<RateConfig>, s.userId, String(formData.get("reason") ?? ""), { dryRun });
    if (!r.ok) return { ok: false as const, error: r.error };
    if (!dryRun) {
      revalidatePath("/admin/config");
      revalidatePath("/admin/updown");
    }
    return { ok: true as const, counts: r.data };
  } catch (err) {
    return { ok: false as const, error: safeError(err, dryRun ? "The preview failed" : "Applying the profile failed") };
  }
}

/** The dry run: what "Apply to every chain" would move, by chain state — nothing is written. */
export async function previewUpDownFeeProfileAction(formData: FormData) {
  return applyProfileStep(formData, true);
}

/** The act: the product default and every chain onto the profile, in one transaction. */
export async function applyUpDownFeeProfileAction(formData: FormData) {
  return applyProfileStep(formData, false);
}

export async function clearMarketOverrideAction(formData: FormData) {
  const s = await ensureAdmin();
  const marketId = String(formData.get("marketId") ?? "").trim();
  if (!marketId) return { ok: false as const, error: "Missing market id." };
  try {
    // The writer reads the row fresh and swaps it by compare-and-swap (FEE-TAX-2026-10), so it can say it failed: say so.
    const r = await clearMarketOverride(marketId, s.userId);
    revalidatePath("/admin/config");
    return r.ok ? { ok: true as const } : { ok: false as const, error: r.error };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Clear override failed") };
  }
}
