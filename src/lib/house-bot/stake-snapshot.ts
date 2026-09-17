/**
 * ONE REQUESTER RULE — who asked for a staff-chosen house stake (C5-SPEC ruling 178; 01 TGT-38).
 *
 * A stake has at most one officer: the officer who pressed Enter now for a MANUAL stake, or the officer who ADDED the
 * target a targeted reaction answered. An officer who later updated the target (`updatedById`) never becomes its
 * requester, and an automated stake (COUNTER, FILL, OPENER with no target) has none. The CHECKs make MANUAL and targeted
 * rows disjoint (a MANUAL row never carries a target), so the order of the two branches cannot be observed.
 *
 * Every reader applies THIS function. Since owner ruling D20 (2026-09-17) there is one: the oversight pass
 * (`server/house-bot/oversight.ts`), which raises the staff-stake alerts C5-D20-REPLAN ruling 264 keeps. The exposure line,
 * its audit snapshot and the book's officer column were un-built in checkpoint C5-5b with the rest of the display and the
 * R9 payloads, so no report, line or audit row names a requester any more; `test:house-bot-reports` 0.191 pins that (I10).
 * A second spelling of the rule would be a second answer to "who chose this stake".
 *
 * ⛔ DISPLAY, AUDIT AND ALERT ONLY. No refusal branch and no page condition reads a requester (TGT-38): an officer who
 * chose a stake may still decide its market; the record says so afterwards.
 * ⛔ PURE, AND IT IMPORTS NOTHING BUT TYPES — a sibling module may import it as a type only (the module law).
 */
import type { IntentKind } from "./constants";

/** The intent columns the rule reads. `kind` is an intent kind; a string is accepted so a grouped SQL row can be passed as read. */
export type RequesterInput = { kind: IntentKind | string | null; requestedById: string | null; targetId: string | null };

/**
 * The officer who asked for this stake: MANUAL → `requestedById`; a target → the target's `createdById`; otherwise null.
 * `targetCreatedById` is the target row's creator, read by the caller (null when there is no target).
 */
export function requesterOf(i: RequesterInput, targetCreatedById: string | null): string | null {
  if (i.kind === "MANUAL") return i.requestedById ?? null;
  if (i.targetId != null) return targetCreatedById ?? null;
  return null;
}

/** The requesters of a set of stakes: distinct, empty values dropped, sorted — the one order every record carries. */
export function foldRequestedBy(ids: ReadonlyArray<string | null | undefined>): string[] {
  const kept = ids.filter((id): id is string => typeof id === "string" && id.length > 0);
  return [...new Set(kept)].sort();
}
