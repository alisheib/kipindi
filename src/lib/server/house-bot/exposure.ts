/**
 * THE HOUSE STAKE ON A MARKET — what the admin sees beside a decision, and what the decision's audit records
 * (C5-SPEC rulings 179, 187–190; 04 R2, R9).
 *
 * One grouped read (`houseBookStore.stakeRows`) folded with the one requester rule (`stake-snapshot.ts`):
 *   · yes / no      Σ stake of marked positions that are not CASHED_OUT, per side;
 *   · openTzs       the OPEN part; settledTzs the WIN, LOSS and VOID part — yes + no = openTzs + settledTzs, always;
 *   · staffChosen   the same restricted to MANUAL or targeted stakes, with the requesting officers (sorted) and, for the
 *                   viewer's own line only, each officer's amount (`byRequester`).
 * A marked position with no intent counts in yes / no and never in staffChosen.
 *
 * ⛔ NO TRANSACTION, EVER. Both readers run on the pool client, never a lock's `tx`: a failed statement inside a lock's
 * transaction would abort it — for an emergency void, the refunds (C5-SPEC ruling 179). The recorded cost is a second
 * pool connection for one grouped read per admin decision.
 * ⛔ A FAILED READ IS NEVER A ZERO (ruling 190): the display catches `houseStakeByMarket`'s throw and says it could not
 * read; the audit records `houseStake: null` through `houseStakeForAudit`, which never throws.
 * ⛔ DISPLAY, AUDIT AND ALERT ONLY. No refusal branch and no page condition reads what this returns (TGT-38, ruling 191).
 * ⛔ NO MODULE UNDER `server/house-bot/` IMPORTS THIS FILE (I2): the engine and oversight never see it; admin pages and
 * decision services do. `test:house-bot-reports` §0 pins both.
 */
import { houseBookStore, HOUSE_STAKE_MAX_IDS, type HouseStakeRow } from "../house-bot-dal";
import { foldRequestedBy, requesterOf } from "@/lib/house-bot/stake-snapshot";

export type HouseStakeView = {
  yes: number;
  no: number;
  openTzs: number;
  settledTzs: number;
  staffChosen: { yes: number; no: number; requestedBy: string[]; byRequester: Record<string, number> };
};

/** Exactly what an R9 decision audit records (ruling 187). `openTzs`, `settledTzs` and `byRequester` never reach an audit. */
export type HouseStakeAudit = { yes: number; no: number; staffChosen: { yes: number; no: number; requestedBy: string[] } };

/**
 * ⛔ CASES ONLY (ruling 190): a process-local switch that makes the next reads fail, so a case can prove a decision
 * records `null` and proceeds. No environment variable and no config row reaches it; `test:house-bot-rules` §0 pins that
 * no file under `src/` calls it. Kept on `globalThis` (this folder holds no module-scope state, 04 F7).
 */
const FAIL_KEY = Symbol.for("50pick.houseBot.exposure.failReadForCases");
type FailFlagHolder = { [FAIL_KEY]?: boolean };
export function failExposureReadForCases(on: boolean): void {
  (globalThis as FailFlagHolder)[FAIL_KEY] = on;
}

function zeroView(): HouseStakeView {
  return { yes: 0, no: 0, openTzs: 0, settledTzs: 0, staffChosen: { yes: 0, no: 0, requestedBy: [], byRequester: {} } };
}

/** Pure: the grouped rows folded into one view per requested market; a market with no marked position gets the zero view. */
export function foldHouseStakes(ids: readonly string[], rows: readonly HouseStakeRow[]): Map<string, HouseStakeView> {
  const out = new Map<string, HouseStakeView>(ids.map((id) => [id, zeroView()]));
  const amounts = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const v = out.get(r.marketId);
    if (!v) continue;
    const side = r.side === "YES" ? "yes" : "no";
    v[side] += r.stakeTzs;
    if (r.open) v.openTzs += r.stakeTzs;
    else v.settledTzs += r.stakeTzs;
    if (r.staffChosen !== true) continue;
    v.staffChosen[side] += r.stakeTzs;
    const who = requesterOf({ kind: r.kind, requestedById: r.requestedById, targetId: r.targetId }, r.targetCreatedById);
    if (who == null) continue;
    const byWho = amounts.get(r.marketId) ?? new Map<string, number>();
    byWho.set(who, (byWho.get(who) ?? 0) + r.stakeTzs);
    amounts.set(r.marketId, byWho);
  }
  for (const [marketId, byWho] of amounts) {
    const v = out.get(marketId);
    if (!v) continue;
    const requestedBy = foldRequestedBy([...byWho.keys()]);
    v.staffChosen.requestedBy = requestedBy;
    v.staffChosen.byRequester = Object.fromEntries(requestedBy.map((id) => [id, byWho.get(id) ?? 0]));
  }
  return out;
}

/**
 * The house stake on each market (at most HOUSE_STAKE_MAX_IDS distinct ids — callers pass a page). THROWS on any failure:
 * a display catches it and renders the unread line, never a zero.
 */
export async function houseStakeByMarket(ids: readonly string[]): Promise<Map<string, HouseStakeView>> {
  if ((globalThis as FailFlagHolder)[FAIL_KEY] === true) throw new Error("house stake read failed (cases switch)");
  const unique = [...new Set(ids)];
  if (unique.length > HOUSE_STAKE_MAX_IDS) throw new Error(`house stake read takes at most ${HOUSE_STAKE_MAX_IDS} markets (got ${unique.length})`);
  const rows = unique.length === 0 ? [] : await houseBookStore.stakeRows(unique);
  return foldHouseStakes(unique, rows);
}

/** Exactly the audit shape: `{yes, no, staffChosen: {yes, no, requestedBy}}`, in that key order. */
export function toAuditShape(v: HouseStakeView): HouseStakeAudit {
  return { yes: v.yes, no: v.no, staffChosen: { yes: v.staffChosen.yes, no: v.staffChosen.no, requestedBy: [...v.staffChosen.requestedBy] } };
}

/**
 * The snapshot a decision audit carries. NEVER THROWS: a read error or a pool timeout is logged with the market and the
 * action only, and returns null — the decision proceeds and records that the stake was not read (ruling 190).
 */
export async function houseStakeForAudit(marketId: string, action?: string): Promise<HouseStakeAudit | null> {
  try {
    const view = (await houseStakeByMarket([marketId])).get(marketId);
    return view ? toAuditShape(view) : null;
  } catch {
    console.error(`[house-stake] snapshot not read for market ${marketId}${action ? ` (${action})` : ""}`);
    return null;
  }
}
