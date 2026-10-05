import { audit } from "@/lib/server/audit";
import { mayReceiveMarketingSms } from "@/lib/server/marketing/consent";
import type { MarketingBasisKind, MarketingGateVerdict, MarketingSkipReason } from "@/lib/server/marketing/consent";
import type { SmsBatchOutcome, SmsOutbound } from "@/lib/server/sms";
import { parseTzNumber } from "@/lib/tz-msisdn";

/**
 * U9 · THE GATE RUNS IN THE LOOP — the one dispatch step every marketing send loop must use.
 *
 * ⚠️ RE-SCOPED BEFORE BUILDING (S6), BECAUSE THE UNIT'S PREMISE FAILED: there is no send loop to put a
 * gate in. Nothing loops over marketing recipients; the loop is U43 ("the slice", `engine.ts`), the rows
 * it walks are U35's (`SmsCampaignRecipient`, a table since U35b that nothing writes before U42), and
 * `SmsPurpose.MARKETING` has existed since U35a (D22). So U9 ships the innermost step of that loop — ask
 * the gate, per recipient, IMMEDIATELY before the one send — and the contract U43 must pass
 * (`test:marketing-consent`, the U9 section), rather than a gate wrapped round nothing.
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
 * ⛔ `send` HAS NO DEFAULT. `SmsPurpose.MARKETING` is the honest purpose (since U35a; folding marketing
 * into `INVITE` or `OPS` is D22's defect), but no caller supplies a `send` yet, so nothing in production
 * can reach the wire through this function. (No Gaming Board approval gate is needed — Ali, 2026-09-26,
 * OQ1 — so what keeps marketing off the wire today is that the engine is not built, and from U37 the ONE
 * live switch `marketing.sms.live`, absent = closed, X14.) The caller that supplies the real `send` is
 * U43, and it must first declare itself in `test:campaign-models` §3.1 (MARKETING_WRITERS).
 *
 * ⭐ THE RG AUDIT LINE LIVES HERE, NOT IN THE GATE (U10). `push.suppressed.rg_lockout` is the precedent:
 * one COMPLIANCE row per RG refusal, against the ACCOUNT, never a phone number (§5.14). It is written
 * when a refusal is ACTED ON — an audience count asks the same gate for every number in the book and
 * must not write to an unprunable chain. `actorId` is null: the system acted, not the player.
 *
 * ⭐ THE GATE'S OWN KEY GOES ON THE WIRE (vb3, 2026-10-03). The gate reads every spelling through the numbering plan —
 * `+255 0712…` and an Arabic keyboard's digits included — and keys it `255…`; the wire rewrites raw text with
 * `toMsisdn255`, which keeps that trunk zero, so a person the gate had just cleared was refused `BAD_MSISDN` and an
 * `sms.refused` row written. A cleared row is therefore sent under `parseTzNumber`'s key, the one its stop and its
 * consent were read under, never under the text the row was written in. A caller that mints the row's opt-out link
 * mints it under that same key (`campaign-test-send.ts` does). Guard: `test:marketing-consent` U9.13.
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
  /** The RG audit line for a refusal acted on — `auditRgRefusal` unless a caller says otherwise. ⛔ ONLY a typed test
   *  passes its own (a no-op, U37c · OD61): one person an officer typed in must not leave a COMPLIANCE row naming the
   *  account, which a console feed would turn into a membership oracle (D19). A campaign never passes one. */
  rgAudit?: (verdict: MarketingGateVerdict) => Promise<void>;
};

/** The DLR route's recipient arm keys on this (U46), so the reference a receipt echoes finds its row. */
export const DISPATCH_TARGET_TYPE = "SmsCampaignRecipient";
export const MARKETING_RG_SUPPRESSED_ACTION = "marketing.suppressed.rg";

/**
 * ⭐ THE ONE RG AUDIT LINE (U10), written when the send loop below ACTS on a refusal. One COMPLIANCE row against the
 * ACCOUNT, never a phone number (§5.14), `actorId` null: the system acted, not the player. Anything but an RG refusal
 * of a known account writes nothing. ⛔ A typed test writes NONE (U37c · OD61, `SliceDeps.rgAudit`): its masked
 * `marketing.campaign_test` row records the collapsed `protected` reason instead.
 */
export async function auditRgRefusal(verdict: MarketingGateVerdict): Promise<void> {
  if (verdict.ok || !verdict.skipReason.startsWith("rg_") || !verdict.userId) return;
  await audit({
    category: "COMPLIANCE",
    action: MARKETING_RG_SUPPRESSED_ACTION,
    actorId: null,
    targetType: "User",
    targetId: verdict.userId,
    payload: { reason: verdict.skipReason, detail: verdict.detail },
  });
}

export async function dispatchSlice(rows: SliceRecipient[], deps: SliceDeps): Promise<SliceOutcome[]> {
  const refs = new Set(rows.map((r) => r.ref));
  if (refs.size !== rows.length) throw new Error("dispatchSlice: every row needs a distinct ref — outcomes are settled by it");
  const ask = deps.gate ?? mayReceiveMarketingSms;
  const rgLine = deps.rgAudit ?? auditRgRefusal;
  const outcomes = new Map<string, SliceOutcome>();
  /* U33a-G · a cleared row carries the basis the gate gave it, so the outcome can name it without asking twice. */
  const cleared: (SliceRecipient & { basis: MarketingBasisKind; basisRef: string })[] = [];

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
      await rgLine(verdict);
      continue;
    }
    // ⭐ vb3 · the gate's key, not the row's spelling (see the header). Only an injected gate can clear a number the
    // plan refuses — the ONE gate never does — and nothing unkeyed is sent: it is skipped, as the gate would have it.
    const key = parseTzNumber(row.msisdn).msisdn;
    if (key === null) {
      outcomes.set(row.ref, { ref: row.ref, outcome: "skipped", skipReason: "bad_msisdn", detail: "no sendable key" });
      continue;
    }
    cleared.push({ ...row, msisdn: key, basis: verdict.basis, basisRef: verdict.basisRef });
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
