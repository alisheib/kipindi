import { cache } from "react";
import { db } from "@/lib/server/store";
import type { StoredSmsMessage } from "@/lib/server/store";
import { currentSession } from "@/lib/server/auth-service";
import { canView, readCell } from "@/lib/server/rbac";
import type { Role } from "@/lib/server/roles";
import {
  refreshSmsBalance, smsBalanceThresholds, smsProviderResolution, SMS_BALANCE_RENDER_BUDGET_MS,
} from "@/lib/server/sms";
import type { SmsBalanceRead } from "@/lib/server/sms";
import { BATCH_MAX } from "@/lib/server/sms-blackball";
import { COST_WALK, measureChunkPace, measureSegmentCost } from "@/lib/marketing/segment-cost";
import type { CostWalkRow, SegmentCostMeasure } from "@/lib/marketing/segment-cost";
import type { BalanceFigure, EstimateAudience, EstimateInputs } from "@/lib/marketing/campaign-estimate";
import { reloadMarketingSmsSettings } from "@/lib/server/marketing/sms-settings";

/**
 * U39 · WHAT THE CAMPAIGN ESTIMATE READS ON THE SERVER — the money decider, the balance read and the send history.
 *
 * ── THE ONE DECIDER ──────────────────────────────────────────────────────────────────────────────────────────────
 * ⭐ `campaignMoneyVisible(role)` is THE answer to "may this viewer see what a campaign costs and what credit is left?"
 * — U40's confirmation, U47, U48 and U49 import it rather than asking again. It needs BOTH axes:
 *   · the DOMAIN axis — `canView(role, "accounting")`: a campaign cost is the platform's money, read by the roles that
 *     read the books (ADMIN, COMPLIANCE, FINANCE, AUDITOR by default);
 *   · the READ axis — `readCell(role, "money.figures") === "read"`: ⛔ `masked` is NOT readable (SUPPORT's ceiling),
 *     and ADMIN resolves through the table (D3), so the Owner can witness the GROWTH branch on production by setting
 *     his own money.figures cell to `none`. A domain-only decider could not be witnessed: ADMIN bypasses domains.
 * ⚠️ money.figures was defined as "any TZS total attributable to one named player"; a campaign cost is a platform
 * aggregate. Governing it by this cell without saying so would silently WIDEN the class, so `READ_CLASS_SUMMARY`
 * now names the estimate and the credit (READ-TIERS §3.5; `test:read-tiers` §9).
 * ⛔ A .tsx may not ask this question (`test:read-tiers` 4.4) — which is why it lives in a .ts, as the transactions
 * export's `mayReveal` does.
 *
 * ── THE LOADER ───────────────────────────────────────────────────────────────────────────────────────────────────
 * ⭐ For a role without the decider's yes it makes NO balance read and computes NO cost: `money` is null, so the pure
 * view cannot produce a TZS string at all. The pace (a duration in milliseconds) is computed for everyone.
 * ⭐ The credit is ASKED, never remembered: `refreshSmsBalance` with a 60 s reuse (as Admin → System) and the render
 * budget. ⚠️ A "reused" reading can be a send reply's pre-charge figure, at most one batch high — fine for an estimate;
 * U49's Start refusal must read tighter. `balanceFigureOf` drops any figure the read could not confirm.
 * ⛔ The audience counts arrive from the CALLER — U38's campaign-audience count (the population this prices, X15/X9)
 * and its "will receive" forecast. This file imports no audience or contacts module, so it cannot count a second,
 * different audience behind the card's back.
 * ⭐ THE PRICE (U49s, E14) is the owner's, from the Marketing SMS settings record, RE-READ for every estimate
 * (`reloadMarketingSmsSettings()` — a save on another container, or during a deploy's overlap, is never priced from a stale
 * cache; TZS 6 until saved — G9); the walk still prefers a price MEASURED from our own delivered sends. ⛔ A read that could
 * not answer, or a stored record it could not read in full, gives NO configured price — never the default standing in for
 * the owner's value (the U49s review). ⛔ The `SMS_PRICE_PER_SEGMENT_TZS`
 * environment read it replaces is gone — one source of truth (`test:marketing-settings` S10 holds that nothing in
 * `src/` reads it again).
 * ⛔ Only `loadEstimateInputs` (which resolves the viewer's STORED role itself) may be called from `src/app`;
 * `loadEstimateInputsFor` takes a role and exists for the suite (`test:campaign-estimate` §6.2 holds it).
 *
 * Guard: `npm run test:campaign-estimate` §1/§2/§6 · `npm run test:read-tiers` §9.
 */

/**
 * ⭐ THE ONE DECIDER for campaign money (cost, credit, coverage). Both axes, `read` only — see the header.
 */
export async function campaignMoneyVisible(role: Role): Promise<boolean> {
  return (await canView(role, "accounting")) && (await readCell(role, "money.figures")) === "read";
}

/** The reuse window for the credit read: one minute, as Admin → System's card. ⛔ Never above it. */
export const ESTIMATE_BALANCE_MAX_AGE_MS = 60_000;

/**
 * A balance read as the estimate may show it. Live ONLY when the read confirmed a figure this render (`fresh` or
 * `reused`), it is not stale, and it has a figure and a time. ⛔ EVERYTHING ELSE IS UNREADABLE AND CARRIES NO FIGURE —
 * the kept reading a failed or unfinished read hands back is dropped here, so no "Was TZS 185" can reach the card.
 */
export function balanceFigureOf(r: SmsBalanceRead | null): BalanceFigure {
  if (!r) return { kind: "unreadable", why: "never", error: null };
  const confirmed = r.outcome === "fresh" || r.outcome === "reused";
  if (confirmed && !r.stale && r.tzs !== null && r.at !== null && Number.isFinite(r.tzs)) {
    return { kind: "live", tzs: r.tzs, at: r.at };
  }
  if (r.outcome === "pending") return { kind: "unreadable", why: "pending", error: null };
  if (r.outcome === "unavailable") return { kind: "unreadable", why: "unavailable", error: null };
  if (r.outcome === "failed") return { kind: "unreadable", why: "failed", error: r.error ?? "unreachable" };
  return { kind: "unreadable", why: r.stale ? "stale" : "never", error: null };
}

/** The walk sees these fields and no others — no number, no reference, no body. */
function toCostWalkRow(m: StoredSmsMessage): CostWalkRow {
  return {
    provider: m.provider, status: m.status, bodyLen: m.bodyLen, balanceTzs: m.balanceTzs,
    createdAt: m.createdAt, sentAt: m.sentAt, deliveredAt: m.deliveredAt,
  };
}

/** Every read the loader makes, injectable so the suite can drive each state. */
export type EstimateDeps = {
  moneyVisible(role: Role): Promise<boolean>;
  readBalance(): Promise<SmsBalanceRead>;
  recentSends(): Promise<CostWalkRow[]>;
  /** The owner's price per SMS from the Marketing SMS settings, read fresh (U49s); null when it cannot be read in full. */
  configuredTzs(): Promise<number | null> | number | null;
  /** The credit kept back for login codes. U49 swaps in its marketing floor. */
  reserveTzs(): number;
  /** Whose sends the walk prices — the provider that would carry the campaign. */
  provider(): string;
  now(): number;
};

const DEFAULT_DEPS: EstimateDeps = {
  moneyVisible: campaignMoneyVisible,
  readBalance: () => refreshSmsBalance({ maxAgeMs: ESTIMATE_BALANCE_MAX_AGE_MS, budgetMs: SMS_BALANCE_RENDER_BUDGET_MS }),
  recentSends: async () => (await db.smsMessage.listRecent(COST_WALK.windowRows)).map(toCostWalkRow),
  configuredTzs: async () => {
    const r = await reloadMarketingSmsSettings();
    return r.ok && r.readable ? r.settings.pricePerSegmentTzs : null;
  },
  reserveTzs: () => smsBalanceThresholds().floorTzs,
  provider: () => smsProviderResolution(),
  now: () => Date.now(),
};

/**
 * ⭐ THE ESTIMATE'S INPUTS FOR A GIVEN ROLE. ⛔ Never throws on a read: a history that cannot be read gives the
 * configured price when one is set (it is "configured, not yet measured" either way) and otherwise
 * `unknown("history-unreadable")`, plus no pace; a balance read that throws is "never read".
 * ⛔ No role, a decider that says no, or a decider that throws — no balance read and no cost (fails closed).
 */
export async function loadEstimateInputsFor(
  role: Role | null,
  audience: EstimateAudience,
  deps: Partial<EstimateDeps> = {},
): Promise<EstimateInputs> {
  const d: EstimateDeps = { ...DEFAULT_DEPS, ...deps };
  const now = d.now();
  const provider = d.provider();
  let visible = false;
  if (role) {
    try { visible = await d.moneyVisible(role); } catch { visible = false; }
  }
  // Through `.then`, so a dep that throws synchronously is caught like one that rejects.
  const history = Promise.resolve().then(() => d.recentSends()).catch((): null => null);
  const read = visible ? Promise.resolve().then(() => d.readBalance()).catch((): null => null) : Promise.resolve(null);
  const [rows, balance] = await Promise.all([history, read]);
  const pace = rows === null ? null : measureChunkPace(rows, { provider, now, batchMax: BATCH_MAX });
  if (!visible) return { audience, pace, money: null };

  const configured = await Promise.resolve().then(() => d.configuredTzs()).catch((): null => null);
  const cost: SegmentCostMeasure =
    rows !== null
      ? measureSegmentCost(rows, { provider, now, configuredTzs: configured })
      : configured !== null
        ? { kind: "configured", tzsPerSegment: configured }
        : { kind: "unknown", reason: "history-unreadable" };
  return { audience, pace, money: { cost, balance: balanceFigureOf(balance), reserveTzs: d.reserveTzs() } };
}

/** The viewer's role from the STORED user row (never the cookie's claim), once per render pass. */
const viewerRole = cache(async (): Promise<Role | null> => {
  const session = await currentSession();
  if (!session) return null;
  return (await db.user.findById(session.userId))?.role ?? null;
});

/**
 * ⭐ THE ONLY ENTRY `src/app` MAY CALL. It resolves the viewer's stored role itself — a page never hands one in — and
 * takes the audience counts from U38's ONE split promise, so the audience card and the estimate cannot disagree.
 * ⛔ Never throws, like the loader it calls: a session or user read that fails is NO role, so there is no balance read
 * and no cost (fails closed) — the way Admin → System reads its session (`currentSession().catch(() => null)`).
 */
export async function loadEstimateInputs(audience: EstimateAudience): Promise<EstimateInputs> {
  let role: Role | null = null;
  try { role = await viewerRole(); } catch { role = null; }
  return loadEstimateInputsFor(role, audience);
}
