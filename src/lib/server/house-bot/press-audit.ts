/**
 * THE PRESS AUDIT — one builder for the officer's decision record (04 N1 §2 press flow step 6, N1 §4.5; C4-SPEC
 * ruling 74).
 *
 * A press writes its COMPLIANCE audit after its locks. When that write is lost (a crash, a timeout), the planner's
 * audit lease repair writes it once. Both writes come from `pressAuditEntry`, so the first write and the repair can
 * never describe the same press differently.
 *
 * ⛔ AS THE OFFICER WHO PRESSED. The audit records an officer's decision; the planner only delivers a write the press
 * flow lost. The actor is `press.actorId`, never `system_house_bot` (whose A19 allowlist is for engine decisions).
 *
 * ⛔ NEVER GUESSED. A press whose record cannot be rebuilt (its intent or event missing, a payload outside the R7
 * allowlist) returns null and stays unaudited, counted by the caller.
 *
 * ⛔ AND NO OFFICER FREE TEXT, EVER — an erasure this module could not honour (C5-6's review, 2026-09-20).
 *
 * All four payloads here used to carry `reason: press.reason`, the officer's typed sentence. The audit log cannot
 * be rewritten: `audit.ts` has only `create`, `findMany` and `count` — no update and no delete anywhere in `src/` —
 * and every row is HMAC-chained (`prevHash`/`entryHash`), so redaction is STRUCTURALLY impossible rather than
 * merely unimplemented. `erasure.ts:56-58` names `AuditLog` a table it "cannot reach". So an officer who typed a
 * holder's name or number into that box put it somewhere the holder's own erasure could never follow.
 *
 * ⛔ THE R7 GUARD DID NOT CATCH IT AND COULD NOT. `isAllowedHouseAuditPayload` tests KEY NAMES; `"reason"` was on
 * the allowed list, and no string VALUE is ever inspected. The guard's own comment states the harm it was written
 * against — "a label or a holder's name written into it survives the holder's erasure" — while the key that
 * carried one was permitted.
 *
 * ⭐ THE PROGRAMME ALREADY HELD THE OPPOSITE RULE, one module away. `roster-actions.ts:101-103`: "THE OFFICER'S
 * REASON LIVES ON THE EVENT, NEVER IN THE AUDIT PAYLOAD (INT-10) — erasure rewrites one and cannot rewrite the
 * other", and pause and remove genuinely carry none. This file was the ONLY house audit payload in `src/` carrying
 * free text (measured across every HOUSE_AUDIT call site: designation, limits-save, outcomes, roster-actions,
 * switch-on — all structured). It is now consistent with the rule the programme wrote for itself.
 *
 * ⚠️ NOTHING IS LOST TO A COMPLIANCE READER. The reason lives on the press row and on the matching
 * `ENTER_NOW_REQUESTED` / `TARGET_*` event, both rewritten to `[erased]` by `pseudonymiseForUser`, and the audit
 * row joins straight to the press through `HouseBotPress.auditId`. One join away, and erasable.
 */
import { audit } from "../audit";
import { HOUSE_AUDIT, isAllowedHouseAuditPayload, type HouseAuditAction } from "@/lib/house-bot/constants";
import type { StoredHouseBotEvent, StoredHouseBotIntent, StoredHouseBotPress } from "../house-bot-dal";

export type PressAuditEntry = { action: HouseAuditAction; targetType: "HouseBot"; targetId: string; payload: Record<string, unknown> };

/** Enter now refusals that are audited (N1 §2 step 6); every other refusal is not a decision record. */
const AUDITED_ENTER_NOW_REFUSALS: ReadonlySet<string> = new Set(["INFO_BLACKOUT", "OWNER_POSITION"]);

const pick = (payload: unknown, keys: readonly string[]): Record<string, unknown> => {
  const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  return Object.fromEntries(keys.filter((k) => p[k] !== undefined).map((k) => [k, p[k]]));
};

export function pressAuditEntry(
  press: StoredHouseBotPress,
  ctx: { intent: StoredHouseBotIntent | null; events: readonly StoredHouseBotEvent[]; holderUserId: string | null },
): PressAuditEntry | null {
  const base = { targetType: "HouseBot" as const, targetId: press.houseBotId };
  const event = (kind: StoredHouseBotEvent["kind"]) => ctx.events.find((e) => e.kind === kind) ?? null;
  let entry: PressAuditEntry | null = null;
  switch (press.purpose) {
    case "ENTER_NOW": {
      if (press.state === "REFUSED" && press.code != null && AUDITED_ENTER_NOW_REFUSALS.has(press.code)) {
        entry = { ...base, action: "house_bot.enter_now_refused", payload: { botId: press.houseBotId, marketId: press.marketId, code: press.code } };
      } else if ((press.state === "QUEUED" || press.state === "DONE") && ctx.intent && ctx.holderUserId) {
        const i = ctx.intent;
        entry = {
          ...base, action: "house_bot.enter_now",
          payload: {
            botId: press.houseBotId, holderUserId: ctx.holderUserId, marketId: i.marketId, intentId: i.id, side: i.side, stakeTzs: i.stakeTzs,
            entryCondition: i.entryCondition, outcome: i.status,
          },
        };
      }
      break;
    }
    case "TARGET_ADD": {
      const e = event("TARGET_ADDED");
      if (press.state === "DONE" && e) {
        entry = { ...base, action: "house_bot.target_added", payload: { botId: press.houseBotId, marketId: e.marketId, targetId: press.targetId ?? (e.payload as Record<string, unknown> | null)?.targetId, ...pick(e.payload, ["delayMinSec", "delayMaxSec", "timingFrom", "reactTo"]) } };
      }
      break;
    }
    case "TARGET_UPDATE": {
      const e = event("TARGET_UPDATED");
      if (press.state === "DONE" && e) {
        entry = { ...base, action: "house_bot.target_updated", payload: { botId: press.houseBotId, marketId: e.marketId, targetId: press.targetId ?? (e.payload as Record<string, unknown> | null)?.targetId, ...pick(e.payload, ["changes"]) } };
      }
      break;
    }
    case "TARGET_REMOVE": {
      const e = event("TARGET_REMOVED");
      if (press.state === "DONE" && e) {
        entry = { ...base, action: "house_bot.target_removed", payload: { botId: press.houseBotId, marketId: e.marketId, targetId: press.targetId ?? (e.payload as Record<string, unknown> | null)?.targetId, ...pick(e.payload, ["outcome", "cancelled"]) } };
      }
      break;
    }
    case "STAFF_CANCEL": {
      const e = event("STAFF_INTENT_CANCELLED");
      if (press.state === "DONE" && e) {
        entry = { ...base, action: "house_bot.staff_intent_cancelled", payload: { botId: press.houseBotId, marketId: e.marketId, ...pick(e.payload, ["intentId", "side", "stakeTzs"]) } };
      }
      break;
    }
    default: {
      const never: never = press.purpose;
      throw new Error(`press-audit: unhandled purpose ${String(never)}`);
    }
  }
  return entry && isAllowedHouseAuditPayload(entry.payload) ? entry : null;
}

/** Append the entry as the officer who pressed; the audit row's id, or null when the audit store returned none. */
export async function writePressAudit(press: StoredHouseBotPress, entry: PressAuditEntry): Promise<string | null> {
  const row = (await audit({
    category: HOUSE_AUDIT[entry.action], action: entry.action, actorId: press.actorId, targetType: entry.targetType, targetId: entry.targetId, payload: entry.payload,
  })) as unknown;
  return row && typeof row === "object" && typeof (row as { id?: unknown }).id === "string" ? (row as { id: string }).id : null;
}
