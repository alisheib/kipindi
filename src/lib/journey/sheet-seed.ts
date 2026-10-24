/** Parse the server-rendered seed before intercepting a real navigation. An unread seed leaves the link usable. */
import type { SheetSeed } from "./sheet-state";

/** The fee models a sheet can speak (FEE-TAX-2026-10, R2c: `stake-share` too, with its fee note and its below-stake warning). */
const SHEET_MODELS: readonly unknown[] = ["loser-share", "capped-commission", "stake-share"];

export function parseSheetSeed(raw: unknown): SheetSeed | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    if (raw.length > 4_000) return null;
    try { value = JSON.parse(raw); } catch { return null; }
  }
  if (!value || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  if (s.v !== 1 || typeof s.id !== "string" || !/^mkt_[A-Za-z0-9]{1,64}$/.test(s.id)) return null;
  const nonnegative = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
  if (!nonnegative(s.yesPool) || !nonnegative(s.noPool) || !nonnegative(s.serverNow)) return null;
  if (typeof s.min !== "number" || !Number.isSafeInteger(s.min) || s.min <= 0 || typeof s.max !== "number" || !Number.isSafeInteger(s.max) || s.max < s.min) return null;
  if (typeof s.bettable !== "boolean" || !(s.closesAt === null || typeof s.closesAt === "string" && Number.isFinite(Date.parse(s.closesAt)))) return null;
  if (!(s.feePct === null || nonnegative(s.feePct))) return null;
  // `{tax}` (FEE-TAX-2026-10): absent from a seed rendered before it existed (read as none), else null or a figure.
  if (!(s.taxPct === undefined || s.taxPct === null || nonnegative(s.taxPct))) return null;
  if (s.rates !== null) {
    if (!s.rates || typeof s.rates !== "object") return null;
    const r = s.rates as Record<string, unknown>;
    // ⛔ A model the sheet does not know is NOT read — the link navigates to the market page instead of opening a sheet
    // that would misstate the fee. `stake-share` is read since R2c: the sheet prices it through the engine, prints its
    // own note (the fee on every stake and the winnings tax) and warns when a win would pay back less than the stake.
    if (!SHEET_MODELS.includes(r.feeModel)) return null;
    for (const k of ["platformFeeRate", "operatorFeeRate", "commissionRate", "feeCeilingRate", "winningsTaxRate"]) {
      if (r[k] !== undefined && (!nonnegative(r[k]) || (r[k] as number) > 1)) return null;
    }
    if (r.showEstimatedWinnings !== undefined && typeof r.showEstimatedWinnings !== "boolean") return null;
  }
  return value as SheetSeed;
}
