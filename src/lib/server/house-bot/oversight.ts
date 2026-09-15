/**
 * OVERSIGHT OF STAFF-CHOSEN STAKES — records, never refusals (04 N1 §4.5, N1 §7; C4-SPEC rulings 29, 79).
 *
 * Once a minute the planner asks two questions about every market holding a PLACED staff-chosen stake from the last
 * 30 days:
 *   · was it VOIDED, or reopened after the stake? → AlertOnce `staff-stake-voided:<marketId>`;
 *   · did the officer who chose the stake also decide the market? → AlertOnce
 *     `staff-stake-self-decided:<marketId>:<action>`.
 *
 * ⛔ DISPLAY, AUDIT AND ALERT ONLY (2026-07-24 guardrail; I10). Nothing here refuses, pauses or reverses anything.
 * ⛔ ONLY THE PLANNER IMPORTS THIS MODULE (N1 §4.1): it reads the audit log, which no decision may read.
 * ⛔ NO FABRICATED TIME (ruling 79): a void time comes from the audit row that voided the market; without one the
 * alert carries no time rather than the moment the pass noticed.
 */
import { ALERT_KEY, OVERSIGHT_LOOKBACK_DAYS, type StaffSelfDecidedAction } from "@/lib/house-bot/constants";
import { getAuditByActionsDurable, getAuditForTargetsDurable, type AuditEntry } from "../audit";
import { houseBotIntentStore, houseSeamStore, targetStore, type StoredHouseBotIntent } from "../house-bot-dal";
import { alertOnce, type EngineAlerts } from "./outcomes";

const DAY_MS = 86_400_000;
const OVERSIGHT_ROW_LIMIT = 500;

/** The actions N1 §4.5 reads, by the market they name in `targetId` (targetType 'Market'). */
const MARKET_TARGET_ACTIONS = [
  "market.adjudicated",
  "market.resolve.bulk_override",
  "market.emergency_void",
  "market.reopened",
  "objection.upheld",
  "objection.rejected",
] as const;
/** `market.resolve.bulk` targets a Batch; its markets are read from the payload. */
const BULK_ACTION = "market.resolve.bulk";
/** The audit rows a VOIDED market's void time is taken from. */
const VOID_TIME_ACTIONS: ReadonlySet<string> = new Set(["market.emergency_void", "market.adjudicated", "objection.upheld", "market.resolve.bulk_override", BULK_ACTION]);

/** The markets a bulk resolution names, however its payload lists them (ids, or objects carrying an id). */
export function bulkMarketIds(payload: unknown): string[] {
  const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const out: string[] = [];
  for (const key of ["marketIds", "markets", "resolved", "items"]) {
    const list = p[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item === "string") out.push(item);
      else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const id = typeof o.marketId === "string" ? o.marketId : typeof o.id === "string" ? o.id : null;
        if (id) out.push(id);
      }
    }
  }
  return [...new Set(out)];
}

/** What a decision audit means for the self-decided key (N1 §4.5), or null when it is not one. */
export function selfDecidedAction(entry: Pick<AuditEntry, "action" | "payload">): StaffSelfDecidedAction | null {
  switch (entry.action) {
    case "market.adjudicated":
      return (entry.payload as Record<string, unknown> | undefined)?.outcome === "VOID" ? "voided" : "resolved";
    case BULK_ACTION:
    case "market.resolve.bulk_override":
      return "resolved";
    case "market.emergency_void":
      return "voided";
    case "market.reopened":
      return "reopened";
    case "objection.upheld":
      return "objection_upheld";
    case "objection.rejected":
      return "objection_rejected";
    default:
      return null;
  }
}

export type OversightResult = { markets: number; voided: number; selfDecided: number };

export async function oversightPass(alerts: EngineAlerts, nowMs: number): Promise<OversightResult> {
  const sinceIso = new Date(nowMs - OVERSIGHT_LOOKBACK_DAYS * DAY_MS).toISOString();
  const rows = await houseBotIntentStore.staffChosenPlacedSince({ sinceIso, limit: OVERSIGHT_ROW_LIMIT });
  const byMarket = new Map<string, StoredHouseBotIntent[]>();
  for (const r of rows) byMarket.set(r.marketId, [...(byMarket.get(r.marketId) ?? []), r]);
  const result: OversightResult = { markets: byMarket.size, voided: 0, selfDecided: 0 };
  if (byMarket.size === 0) return result;

  const marketIds = [...byMarket.keys()];
  const direct = await getAuditForTargetsDurable({ targetType: "Market", targetIds: marketIds, actions: MARKET_TARGET_ACTIONS, sinceIso, limit: OVERSIGHT_ROW_LIMIT });
  const bulk = await getAuditByActionsDurable([BULK_ACTION], { limit: 200 });
  const audits: Array<{ marketId: string; entry: AuditEntry }> = direct.entries.map((entry) => ({ marketId: entry.targetId as string, entry }));
  for (const entry of bulk.entries) {
    if (Date.parse(entry.createdAt) < Date.parse(sinceIso)) continue;
    for (const id of bulkMarketIds(entry.payload)) if (byMarket.has(id)) audits.push({ marketId: id, entry });
  }

  const creatorOf = new Map<string, string | null>();
  for (const marketId of marketIds) {
    const stakes = byMarket.get(marketId)!;
    const view = await houseSeamStore.marketView(marketId);
    if (!view) continue;
    const first = stakes[0];
    const onMarket = audits.filter((a) => a.marketId === marketId).sort((a, b) => Date.parse(b.entry.createdAt) - Date.parse(a.entry.createdAt));

    // ── staff stake voided or reopened ──
    let voided: { action: "voided" | "reopened"; atIso: string | null } | null = null;
    if (view.status === "VOIDED") {
      const voidRow = onMarket.find((a) => VOID_TIME_ACTIONS.has(a.entry.action));
      voided = { action: "voided", atIso: voidRow?.entry.createdAt ?? null };
    } else if (view.reopenedAt && stakes.some((s) => s.finishedAt != null && Date.parse(view.reopenedAt as string) > Date.parse(s.finishedAt))) {
      voided = { action: "reopened", atIso: view.reopenedAt };
    }
    if (voided && await alertOnce(ALERT_KEY.staffStakeVoided(marketId), alerts, {
      code: "STAFF_STAKE_VOIDED", marketId, botId: first.houseBotId, intentId: first.id,
      detail: { action: voided.action, atIso: voided.atIso, side: first.side, stakeTzs: first.stakeTzs, titleEn: view.titleEn },
    })) result.voided++;

    // ── the choosing officer decided the market ──
    for (const { entry } of onMarket) {
      const action = selfDecidedAction(entry);
      if (!action || entry.actorId == null) continue;
      const requestedBy = new Set<string>();
      for (const s of stakes) {
        if (s.finishedAt == null || Date.parse(s.finishedAt) >= Date.parse(entry.createdAt)) continue;
        if (s.kind === "MANUAL" && s.requestedById) requestedBy.add(s.requestedById);
        if (s.targetId) {
          if (!creatorOf.has(s.targetId)) creatorOf.set(s.targetId, (await targetStore.get(s.targetId))?.createdById ?? null);
          const by = creatorOf.get(s.targetId);
          if (by) requestedBy.add(by);
        }
      }
      if (!requestedBy.has(entry.actorId)) continue;
      if (await alertOnce(ALERT_KEY.staffStakeSelfDecided(marketId, action), alerts, {
        code: "STAFF_STAKE_SELF_DECIDED", marketId, botId: first.houseBotId,
        detail: { action, actorId: entry.actorId, atIso: entry.createdAt, requestedBy: [...requestedBy], titleEn: view.titleEn },
      })) result.selfDecided++;
    }
  }
  return result;
}
