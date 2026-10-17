/**
 * MASWALI MILLIONEA — THE OWNER'S ROLLOUT CEREMONY (MASWALI-BUILD S4; the write side of `millionea-switch.ts`).
 *
 * The Owner caps how far Millionea is visible: WITHDRAWN, STAFF_PREVIEW or ACTIVE, beneath the environment's ceiling
 * (`millionea-rollout.ts → composeMillionea`). ⛔ The caller is an `ops` control (`setMillioneaRollout`), so the stored
 * role is the Owner's and the console's 2FA step-up has passed before this runs.
 *   · the reason is cleaned and bounded (5–300), and stored as cleaned;
 *   · the post names the record it saw (`expectSeq`): a switch someone else moved a moment ago is refused, never
 *     overwritten;
 *   · the record is sealed, stored and READ BACK field by field; an unconfirmed write is never reported as done.
 * ⛔ THE SWITCH CONTROLS VISIBILITY ONLY. Selling is separately gated (the licence basis, the guarantee, an open week,
 *    the sales pause), so raising it sells nothing on its own.
 */
import { audit } from "./audit";
import { withLock } from "./locks";
import { millioneaStateNow, readMillioneaSwitchFresh, writeMillioneaSwitchVerified, MILLIONEA_REASON_MAX, MILLIONEA_REASON_MIN } from "./millionea-switch";
import { isRolloutState, type RolloutState } from "@/lib/feature-state";

const LOCK = "millionea:switch";

const cleanReason = (v: unknown) => (typeof v === "string" ? v.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim() : "");

export async function runMillioneaRolloutCeremony(input: { ownerId: string; cap: unknown; reason: unknown; expectSeq: unknown }): Promise<
  { ok: true; state: RolloutState; seq: number } | { ok: false; error: string; field?: "cap" | "reason" | "seq" }
> {
  if (!isRolloutState(input.cap)) return { ok: false, error: "Choose WITHDRAWN, STAFF_PREVIEW or ACTIVE.", field: "cap" };
  const cap = input.cap;
  const reason = cleanReason(input.reason);
  if (reason.length < MILLIONEA_REASON_MIN || reason.length > MILLIONEA_REASON_MAX) {
    return { ok: false, error: `Write why (${MILLIONEA_REASON_MIN}–${MILLIONEA_REASON_MAX} characters).`, field: "reason" };
  }
  const expectSeq = input.expectSeq;
  if (typeof expectSeq !== "number" || !Number.isSafeInteger(expectSeq) || expectSeq < 0) {
    return { ok: false, error: "Reload the page: the switch's state could not be matched.", field: "seq" };
  }
  return withLock(LOCK, async () => {
    const fresh = await readMillioneaSwitchFresh();
    if (fresh.kind === "UNREAD") return { ok: false as const, error: "The switch could not be read, so nothing was changed. Please try again." };
    const currentSeq = fresh.kind === "SET" ? fresh.seq : 0;
    if (currentSeq !== expectSeq) return { ok: false as const, error: "The switch changed a moment ago. Reload the page and read its state first.", field: "seq" as const };
    const from = await millioneaStateNow(0);
    const record = { cap, seq: currentSeq + 1, changedAt: new Date().toISOString(), changedBy: input.ownerId, reason };
    const w = await writeMillioneaSwitchVerified(record);
    if (!w.ok) {
      return { ok: false as const, error: w.code === "UNCONFIRMED"
        ? "The change could not be confirmed. Reload the page: it shows what the switch now holds."
        : "The change was not stored. Nothing changed." };
    }
    const state = await millioneaStateNow(0);
    audit({ category: "COMPLIANCE", action: "millionea.rollout.set", actorId: input.ownerId, targetType: "MillioneaRollout", targetId: "millionea",
      payload: { from, cap, effective: state, seq: record.seq, reason } });
    return { ok: true as const, state, seq: record.seq };
  });
}
