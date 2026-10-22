/**
 * MASWALI MILLIONEA — THE SALES PAUSE (MASWALI-BUILD S3; MB-62, MB-78: pause, week void and product stop are three acts).
 *
 * A pause stops SALES only. ⛔ It never blocks a settlement, a refund, a free cancel or a withdrawal: the one reader is the
 * purchase (`maswali-money-service.ts → buyMaswaliTickets`), which refuses `millionea_paused` while it stands. The week
 * keeps its close, its seals and its settlement; tickets already bought are untouched.
 *
 * ⛔ ITS OWN KEY, LIKE THE LICENCE BASIS: one writer pair (`pauseMaswaliSales` / `resumeMaswaliSales`), whose caller is a
 * compliance officer's control (S4). Validated, read back before "saved", and audited COMPLIANCE.
 * The purchase reads it FRESH and fails closed: a pause record that cannot be read refuses the sale.
 */
import { audit } from "./audit";
import { defineConfig } from "./define-config";
import { MASWALI_REASON_MIN, MASWALI_REASON_MAX } from "@/lib/maswali-ceremony-bounds";

export const MASWALI_PAUSE_KEY = "maswali.salesPause";

export type SalesPause = {
  paused: boolean;
  /** The officer's written reason; null when not paused. */
  reason: string | null;
  /** ISO 8601 of the pause; null when not paused. */
  at: string | null;
  by: string | null;
};

export const SALES_RUNNING: SalesPause = { paused: false, reason: null, at: null, by: null };
export const PAUSE_REASON_MIN = MASWALI_REASON_MIN;
export const PAUSE_REASON_MAX = MASWALI_REASON_MAX;

/** Why a pause record is refused, or null. */
export function salesPauseProblem(p: SalesPause): string | null {
  if (typeof p.paused !== "boolean") return "The pause record is not readable.";
  if (!p.paused) return p.reason === null && p.at === null && p.by === null ? null : "A running sale carries no pause reason.";
  const r = (p.reason ?? "").trim();
  if (r.length < PAUSE_REASON_MIN || r.length > PAUSE_REASON_MAX) return `Write why sales are paused (${PAUSE_REASON_MIN}–${PAUSE_REASON_MAX} characters).`;
  if (typeof p.at !== "string" || Number.isNaN(Date.parse(p.at))) return "The pause carries no time.";
  if (typeof p.by !== "string" || p.by.length === 0) return "The pause names no officer.";
  return null;
}

const migrate = (raw: Record<string, unknown>): Partial<SalesPause> => {
  const out: Partial<SalesPause> = {};
  if (typeof raw.paused === "boolean") out.paused = raw.paused;
  for (const k of ["reason", "at", "by"] as const) if (typeof raw[k] === "string" || raw[k] === null) out[k] = raw[k] as string | null;
  return out;
};

const cfg = defineConfig<SalesPause>({
  key: MASWALI_PAUSE_KEY,
  defaults: SALES_RUNNING,
  migrate,
  validate: (p) => {
    const why = salesPauseProblem(p);
    return why ? { ok: false, reason: why } : { ok: true };
  },
  audit: { action: "maswali.sales_pause.saved", targetType: "MaswaliSalesPause" },
});

/** ⭐ For the purchase: FRESH, and fail closed — an unreadable or invalid record reads as PAUSED. */
export async function readSalesPauseFresh(): Promise<SalesPause> {
  const r = await cfg.reload();
  if (!r.ok || salesPauseProblem(r.config)) return { paused: true, reason: "the pause record could not be read", at: null, by: null };
  return { ...r.config };
}

/** For screens (the hub's notice, the console). Sync; may be this container's boot value. */
export function getSalesPause(): SalesPause {
  return { ...cfg.get() };
}

/** Pause the sales (compliance, S4's control). Idempotent: pausing a paused sale changes nothing. */
export async function pauseMaswaliSales(input: { officerId: string; reason: string; now?: Date }): Promise<{ ok: true; pause: SalesPause } | { ok: false; error: string }> {
  const reason = input.reason.trim().replace(/\s+/g, " ");
  const next: SalesPause = { paused: true, reason, at: (input.now ?? new Date()).toISOString(), by: input.officerId };
  const why = salesPauseProblem(next);
  if (why) return { ok: false, error: why };
  const fresh = await cfg.reload();
  if (!fresh.ok) return { ok: false, error: "The pause record could not be read, so nothing was changed. Please try again." };
  if (fresh.config.paused) return { ok: true, pause: { ...fresh.config } };
  const res = await cfg.setVerified(next, input.officerId);
  if (!res.ok) return { ok: false, error: res.error };
  audit({ category: "COMPLIANCE", action: "maswali.sales.paused", actorId: input.officerId, targetType: "MaswaliSalesPause", targetId: MASWALI_PAUSE_KEY, payload: { reason } });
  return { ok: true, pause: { ...res.config } };
}

/** Resume the sales. The officer writes why; the record returns to running. */
export async function resumeMaswaliSales(input: { officerId: string; note: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const note = input.note.trim();
  if (note.length < PAUSE_REASON_MIN || note.length > PAUSE_REASON_MAX) return { ok: false, error: `Write why sales resume (${PAUSE_REASON_MIN}–${PAUSE_REASON_MAX} characters).` };
  const fresh = await cfg.reload();
  if (!fresh.ok) return { ok: false, error: "The pause record could not be read, so nothing was changed. Please try again." };
  if (!fresh.config.paused) return { ok: true };
  const res = await cfg.setVerified({ ...SALES_RUNNING }, input.officerId);
  if (!res.ok) return { ok: false, error: res.error };
  audit({ category: "COMPLIANCE", action: "maswali.sales.resumed", actorId: input.officerId, targetType: "MaswaliSalesPause", targetId: MASWALI_PAUSE_KEY,
    payload: { note, pausedFor: fresh.config.reason, pausedAt: fresh.config.at } });
  return { ok: true };
}
