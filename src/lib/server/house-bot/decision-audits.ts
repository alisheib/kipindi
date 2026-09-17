/**
 * HOW TO READ A MARKET DECISION AUDIT — the shared home of two readings (C5-SPEC ruling 186 (1)).
 *
 * `bulkMarketIds` names the markets a `market.resolve.bulk` Batch row decided, however its payload lists them;
 * `selfDecidedAction` says what a decision audit means for "the officer who chose a stake also decided its market"
 * (04 N1 §4.5). Oversight (`oversight.ts`, which re-exports both for its existing callers) and the house reports read
 * the SAME answer from here, so a report can never call a market decided that oversight did not.
 *
 * ⛔ READINGS ONLY. Nothing here refuses, pauses or reverses anything, and nothing here reads a store.
 */
import type { StaffSelfDecidedAction } from "@/lib/house-bot/constants";
import type { AuditEntry } from "../audit";

/** `market.resolve.bulk` targets a Batch; its markets are read from the payload. */
export const BULK_RESOLVE_ACTION = "market.resolve.bulk";

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
    case BULK_RESOLVE_ACTION:
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
