import { audit } from "@/lib/server/audit";
import { mayReceiveMarketingSms } from "@/lib/server/marketing/consent";
import type { MarketingGateVerdict, MarketingSkipReason } from "@/lib/server/marketing/consent";
import type { SmsBatchOutcome, SmsOutbound } from "@/lib/server/sms";

/**
 * U9 · THE GATE RUNS IN THE LOOP — the one dispatch step every marketing send loop must use.
 *
 * ⚠️ RE-SCOPED BEFORE BUILDING (S6), BECAUSE THE UNIT'S PREMISE FAILED: there is no send loop to put a
 * gate in. Nothing loops over marketing recipients; the loop is U43 ("the slice", `engine.ts`), the rows
 * it walks are U35, and `SmsPurpose` has no `MARKETING` yet (D22). So U9 ships the innermost step of
 * that loop — ask the gate, per recipient, IMMEDIATELY before the one send — and the contract U43 must
 * pass (`test:marketing-consent`, the U9 section), rather than a gate wrapped round nothing.
 *
 * ⭐ WHY "IMMEDIATELY BEFORE" AND NOT "WHEN THE LIST WAS BUILT" (§5.6): somebody who opts out in minute
 * two must not receive minute four's message. A gate asked once at list-build time answers for the
 * moment the list was made; this one answers for the moment the message leaves.
 *
 * THE OUTCOMES, AND WHY THERE ARE FIVE:
 *   · `skipped`      — the gate refused. ⛔ NEVER `failed`: a refusal is the system working (§5.6, OD40),
 *                      and a failure count that includes the people who said stop is a lie on the page.
 *   · `handed_over`  — the gateway ACCEPTED it. ⛔ Not "sent", not "delivered" (OD41): only a receipt is.
 *   · `failed`       — the wire refused THIS message (e.g. `BAD_MSISDN`).
 *   · `held`         — nothing was attempted for a reason that is not about this person: a shop-wide
 *                      refusal (balance floor, not configured) or a gate that could not answer. U43
 *                      returns these to PENDING (§9 U43) — ⛔ never N failed rows for one shop-wide fact,
 *                      and ⛔ never a send on a question the gate could not answer.
 *   · `unconfirmed`  — handed to the wire with no result back (a thrown transport, a result missing its
 *                      key). ⛔ Never retried automatically: a re-send is a second charge to a real
 *                      person (OD23).
 *
 * ⛔ SETTLED BY KEY, NEVER BY POSITION. Each message carries its row's `ref` as `targetId` and the result
 * is matched on it — `sendBatch` already hands the key back for exactly this reason (`SmsResult`), and a
 * zip by index credits one person's success to another the day anything reorders or drops a result.
 *
 * ⛔ `send` HAS NO DEFAULT. Until U35 adds `SmsPurpose.MARKETING` there is no honest purpose to give
 * `sendBatch` (folding marketing into `INVITE` or `OPS` is D22's defect), so nothing in production can
 * reach the wire through this function yet. (No Gaming Board approval gate is needed — Ali, 2026-09-26,
 * OQ1 — so what keeps marketing off the wire today is only that the engine is not built.) The caller
 * that supplies the real `send` is U43.
 *
 * ⭐ THE RG AUDIT LINE LIVES HERE, NOT IN THE GATE (U10). `push.suppressed.rg_lockout` is the precedent:
 * one COMPLIANCE row per RG refusal, against the ACCOUNT, never a phone number (§5.14). It is written
 * when a refusal is ACTED ON — an audience count asks the same gate for every number in the book and
 * must not write to an unprunable chain. `actorId` is null: the system acted, not the player.
 */

export type SliceRecipient = { ref: string; msisdn: string; body: string };

export type SliceOutcome =
  | { ref: string; outcome: "skipped"; skipReason: MarketingSkipReason; detail: string }
  | { ref: string; outcome: "handed_over"; reference: string }
  | { ref: string; outcome: "failed"; code: string; error: string | null }
  | { ref: string; outcome: "held"; reason: string }
  | { ref: string; outcome: "unconfirmed" };

export type SliceDeps = {
  send: (messages: SmsOutbound[]) => Promise<SmsBatchOutcome>;
  gate?: (msisdn: string) => Promise<MarketingGateVerdict>;
};

/** The DLR route's recipient arm keys on this (U46), so the reference a receipt echoes finds its row. */
export const DISPATCH_TARGET_TYPE = "SmsCampaignRecipient";
export const MARKETING_RG_SUPPRESSED_ACTION = "marketing.suppressed.rg";

export async function dispatchSlice(rows: SliceRecipient[], deps: SliceDeps): Promise<SliceOutcome[]> {
  const refs = new Set(rows.map((r) => r.ref));
  if (refs.size !== rows.length) throw new Error("dispatchSlice: every row needs a distinct ref — outcomes are settled by it");
  const ask = deps.gate ?? mayReceiveMarketingSms;
  const outcomes = new Map<string, SliceOutcome>();
  const cleared: SliceRecipient[] = [];

  for (const row of rows) {
    // ── THE GATE, PER RECIPIENT, IMMEDIATELY BEFORE DISPATCH ────────────────────────────────
    let verdict: MarketingGateVerdict;
    try {
      verdict = await ask(row.msisdn);
    } catch {
      outcomes.set(row.ref, { ref: row.ref, outcome: "held", reason: "gate_unanswered" });
      continue;
    }
    if (!verdict.ok) {
      outcomes.set(row.ref, { ref: row.ref, outcome: "skipped", skipReason: verdict.skipReason, detail: verdict.detail });
      if (verdict.skipReason.startsWith("rg_") && verdict.userId) {
        await audit({
          category: "COMPLIANCE",
          action: MARKETING_RG_SUPPRESSED_ACTION,
          actorId: null,
          targetType: "User",
          targetId: verdict.userId,
          payload: { reason: verdict.skipReason, detail: verdict.detail },
        });
      }
      continue;
    }
    cleared.push(row);
  }

  if (cleared.length > 0) {
    // ── ONE SEND FOR THE SLICE ───────────────────────────────────────────────────────────────
    let batch: SmsBatchOutcome | null = null;
    try {
      batch = await deps.send(cleared.map((r) => ({ to: r.msisdn, body: r.body, targetType: DISPATCH_TARGET_TYPE, targetId: r.ref })));
    } catch {
      batch = null;
    }
    if (batch === null) {
      for (const r of cleared) outcomes.set(r.ref, { ref: r.ref, outcome: "unconfirmed" });
    } else if (batch.refused) {
      for (const r of cleared) outcomes.set(r.ref, { ref: r.ref, outcome: "held", reason: batch.refused });
    } else {
      const byRef = new Map(batch.results.filter((x) => x.targetId).map((x) => [x.targetId as string, x]));
      for (const r of cleared) {
        const res = byRef.get(r.ref);
        if (!res) outcomes.set(r.ref, { ref: r.ref, outcome: "unconfirmed" });
        else if (res.ok) outcomes.set(r.ref, { ref: r.ref, outcome: "handed_over", reference: res.reference });
        else outcomes.set(r.ref, { ref: r.ref, outcome: "failed", code: res.code ?? "UNKNOWN", error: res.error ?? null });
      }
    }
  }

  return rows.map((r) => outcomes.get(r.ref) as SliceOutcome);
}
