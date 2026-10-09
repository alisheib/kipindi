import { audit } from "@/lib/server/audit";
import { mayReceiveMarketingSms } from "@/lib/server/marketing/consent";
import type { MarketingBasisKind, MarketingGateVerdict, MarketingSkipReason } from "@/lib/server/marketing/consent";
import type { SmsBatchOutcome, SmsOutbound } from "@/lib/server/sms";
import { parseTzNumber } from "@/lib/tz-msisdn";
import { sendWindowState, sendWindowUnreadable } from "@/lib/marketing/window";
import type { SendWindowHours, SendWindowState } from "@/lib/marketing/window";
import { reloadMarketingSmsSettings } from "@/lib/server/marketing/sms-settings";
import type { SettingsReload } from "@/lib/server/marketing/sms-settings";
import { sendWindowNow } from "@/lib/server/marketing/send-window-clock";
import type { CampaignVariant, RecipientOrigin } from "@/lib/marketing/campaign-template";

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
 *   · `held`         — NOTHING WAS ATTEMPTED, and nothing was decided about this person's consent.
 *                      Shop-wide: a refusal before the wire (balance floor, not configured), the send window
 *                      (U13: `quiet_hours`, or `window_unreadable` for hours that could not be read), or —
 *                      U43b-1 — `beforeSend`'s veto (its own reason, e.g. `not_running`) or an answer it could
 *                      not give (`before_send_unanswered`). About one person: a gate that could not answer
 *                      (`gate_unanswered`), a message that could not be made for them (`prepare:<reason>`,
 *                      `prepare:unanswered`), or a row the engine no longer holds (`claim_lost` — someone
 *                      else's now). U43 returns each to PENDING or parks it (ENGINE-SPEC §4.13's settlement
 *                      table) — ⛔ never N failed rows for one shop-wide fact, and ⛔ never a send on a question
 *                      nobody could answer.
 *   · `unconfirmed`  — handed to the wire with no result back (a thrown transport, a result missing its
 *                      key), or — U43b-1 · E3 — a result the wire itself marked `TRANSPORT`: the reply was
 *                      lost, and the gateway may hold the message and bill for it. ⛔ Never retried
 *                      automatically: a re-send is a second charge to a real person (OD23).
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
 *
 * ⭐ U13 · THE SEND WINDOW IS ASKED FIRST, ONCE PER SLICE (E2c · E9 · D13). Outside the hours the owner saved on Admin →
 * System → Marketing SMS (08:00–20:00 EAT unless changed — `SEND_WINDOW_EAT`), EVERY row is `held` with reason
 * `quiet_hours` before any gate is asked, and nothing is sent: a slice is one moment, so the window is one answer for all
 * of it (§5.6). The window never changes a campaign's status (E9) — the engine waits outside it; this step is the defence
 * in depth, and the officer's test send obeys it too (M12, `campaign-test-send.ts`). ⛔ IT FAILS CLOSED (`liveSendWindow`):
 * hours that cannot be read — a read that failed, a row this build cannot read in full, a window that throws or answers
 * anything but open — hold every row `window_unreadable`. A default standing in for the owner's hours is never obeyed: a
 * hold costs only time (the rows stay outstanding), while a message sent outside the owner's hours breaks 50pick's own
 * rule. Guards: `test:marketing-window` (W3 · W5), and `test:rg-policy` K1 holds the published promise to this very read.
 *
 * ⭐ U43b-1 · THE ENGINE'S TWO HOOKS — ADDITIVE, AND THIS STAYS THE ONE LOOP (ENGINE-SPEC §4.13 Decision 1 · E1 · E2 · E3):
 *   · `prepare` — a row may carry the way to make its message instead of the message. It runs only AFTER the gate has
 *     cleared that number, under the gate's own key and with the gate's verdict — so the engine ensures the opt-out token
 *     and renders here, and a person the gate refuses never gets a permanent link (E1). A refusal holds the row
 *     `prepare:<reason>` (with its detail); a prepare that throws, or answers anything but a refusal with a reason or a
 *     message with a body and its meta, holds it `prepare:unanswered` — that row alone, never the slice. What it learned
 *     (`meta`) rides every outcome after it. A row carries a body or a prepare, exactly one: neither or both is refused.
 *   · `beforeSend` — asked ONCE, after every gate and before the one send: the engine re-reads its campaign and its claims
 *     there (E6). It is handed COPIES, so it can change nothing that is sent or settled. A veto holds every cleared row
 *     with its reason and nothing is sent; a row it does not keep is held `claim_lost` (the row is someone else's now) and
 *     never sent; a hook that throws, or answers anything but those two shapes, holds them all `before_send_unanswered`.
 *     The window's re-check at the wire (SP-1) comes after it, as late as it can be.
 *   · E3 · a result the WIRE marks `TRANSPORT` is `unconfirmed`, with its reference and code — never `failed`, which
 *     invites a retry: decided here, once, for every caller.
 *   · every outcome after the gate cleared carries the basis the gate gave (U33a-G) and the prepare's `meta`.
 * No caller passes a hook yet. The officer's test send passes neither, so it is dispatched exactly as before — and a lost
 * reply reaches it `unconfirmed` by construction (its own mapping of `TRANSPORT` stays, as defence in depth).
 * Guards: `test:marketing-consent` U9.15–U9.24, `test:campaign-compose` §18.34.
 */

/** U43b-1 · the gate's yes — what a `prepare` is handed: the number was cleared, and on what basis (U33a-G). */
export type MarketingGateAllow = Extract<MarketingGateVerdict, { ok: true }>;

/**
 * U43b-1 · E1 · E17 · WHAT A `prepare` LEARNED MAKING ONE PERSON'S MESSAGE (the engine's — ENGINE-SPEC §4.13 Decision 2):
 * the OD42 variant that went out (the recipient's `locale` column), the size the wire was given, the opt-out token made for
 * the person (kept for the stop page — no message prints it since the owner's ruling of 2026-10-09), and whom it was
 * rendered for (E17: an account's own name, or the book's fallback). ⛔ `dispatchSlice` never reads it: it rides untouched onto every outcome after the prepare, so the settle
 * writes what was sent and the gate trail names the render without asking anything twice.
 */
export type SliceMeta = {
  locale: CampaignVariant;
  segments: number;
  bodyLen: number;
  token: string;
  origin: RecipientOrigin;
  name: "account" | "fallback";
};

/** U43b-1 · a `prepare`'s answer: the message, made — or why this person could not be prepared (held `prepare:<reason>`). */
export type SlicePrepared = { ok: true; body: string; meta: SliceMeta } | { ok: false; reason: string; detail: string };

/** One recipient of a slice: the message to send — or (U43b-1 · E2a) the way to make it, asked only once the gate has
 *  cleared the number, under the gate's own key. Exactly one of the two: a literal with both does not compile, and a row
 *  with neither, or both, that reaches here anyway (a cast, plain JavaScript) is refused at run time. */
export type SliceRecipient =
  | { ref: string; msisdn: string; body: string; prepare?: never }
  | { ref: string; msisdn: string; prepare: (key: string, verdict: MarketingGateAllow) => Promise<SlicePrepared>; body?: never };

/** U43b-1 · what every outcome AFTER the gate cleared carries: the basis the gate gave (U33a-G), and the prepare's `meta`
 *  when the row was prepared — so the settle, the trail and a receipt can say what authorised the message and what went,
 *  without asking either again. */
export type SliceCarried = { basis: MarketingBasisKind; basisRef: string; meta?: SliceMeta };

/** U43b-1 · a row the gate has just cleared, as `beforeSend` sees it: under the gate's key, with the exact text the wire
 *  will be given. */
export type SliceCleared = { ref: string; msisdn: string; body: string } & SliceCarried;

/** U43b-1 · E2b · `beforeSend`'s answer: send nothing (every cleared row held with `reason`), or only the rows it keeps. */
export type SliceSendVerdict = { proceed: false; reason: string } | { proceed: true; keep: readonly string[] };

export type SliceOutcome =
  | { ref: string; outcome: "skipped"; skipReason: MarketingSkipReason; detail: string }
  | ({ ref: string; outcome: "handed_over"; reference: string } & SliceCarried)
  | ({ ref: string; outcome: "failed"; code: string; error: string | null } & SliceCarried)
  /* held BEFORE the gate cleared (the window, a gate that could not answer) carries no basis; held after it does. */
  | ({ ref: string; outcome: "held"; reason: string; detail?: string } & Partial<SliceCarried>)
  /* `reference` and `code` are set when the wire itself answered TRANSPORT (E3); absent when no result came back. */
  | ({ ref: string; outcome: "unconfirmed"; reference?: string; code?: string } & SliceCarried);

export type SliceDeps = {
  send: (messages: SmsOutbound[]) => Promise<SmsBatchOutcome>;
  /** U13 review SP-1 · the slice's own elapsed-time clock (milliseconds) — `Date.now` unless a suite passes one: the wire
   *  re-check adds the slice's elapsed time to the instant its window was judged at, so a FIXED window in a suite and the
   *  live one in production are checked alike. */
  clock?: () => number;
  gate?: (msisdn: string) => Promise<MarketingGateVerdict>;
  /** The RG audit line for a refusal acted on — `auditRgRefusal` unless a caller says otherwise. ⛔ ONLY a typed test
   *  passes its own (a no-op, U37c · OD61): one person an officer typed in must not leave a COMPLIANCE row naming the
   *  account, which a console feed would turn into a membership oracle (D19). A campaign never passes one. */
  rgAudit?: (verdict: MarketingGateVerdict) => Promise<void>;
  /** U13 · THE SEND WINDOW, read ONCE for the slice and FIRST — `liveSendWindow` unless a caller says otherwise: the test
   *  send passes its own (`CampaignTestDeps.window`, the same live one in production), and every suite passes a FIXED one
   *  (ENGINE-SPEC §5 rule 9: a battery run at night must not see every send held). */
  window?: () => SendWindowState | Promise<SendWindowState>;
  /** U43b-1 · E2b · THE LAST WORD BEFORE THE WIRE — asked ONCE, after every gate (and prepare) and before the one send,
   *  with COPIES of the rows about to go. The engine re-reads its campaign and its claims here (E6): `{ proceed: false,
   *  reason }` (a reason that is a non-empty string) holds every cleared row with that reason and sends nothing;
   *  `{ proceed: true, keep }` (`keep` an array of refs) sends only the rows it keeps — the rest are held `claim_lost`;
   *  a hook that throws, or answers anything else, holds every cleared row `before_send_unanswered`. ⛔ The test send
   *  passes none: without it every cleared row goes, as before. */
  beforeSend?: (cleared: readonly SliceCleared[]) => Promise<SliceSendVerdict>;
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

/**
 * ⭐ U13 · THE WINDOW THE SEND PATH OBEYS — `dispatchSlice`'s default, the officer's test send's and the composer's note:
 * the owner's saved hours (E14) read FRESH, judged at this instant (`sendWindowNow`, `./send-window-clock` — where the one
 * dev-only clock pin lives; this file holds none). ⛔ IT FAILS CLOSED, as U49s requires of every caller that ACTS on a
 * setting: a read that could not answer, a row this build could not read in full (`readable: false`) or a read that throws
 * is a CLOSED window (`window_unreadable`) — the default standing in for the owner's hours is never obeyed. No row stored
 * is the default hours, `SEND_WINDOW_EAT`: OQ5's documented rule, not a stand-in for a saved one. `read` and `now` are the
 * reader's dependencies, injectable by `test:marketing-window`; production passes neither.
 */
export async function liveSendWindow(
  read: () => Promise<SettingsReload> = reloadMarketingSmsSettings,
  now: () => number = sendWindowNow,
): Promise<SendWindowState> {
  let hours: SendWindowHours | null = null;
  try {
    const r = await read();
    if (r.ok && r.readable) hours = { windowStartMinute: r.settings.windowStartMinute, windowEndMinute: r.settings.windowEndMinute };
  } catch {
    hours = null;
  }
  return hours === null ? sendWindowUnreadable() : sendWindowState(now(), hours);
}

export async function dispatchSlice(rows: SliceRecipient[], deps: SliceDeps): Promise<SliceOutcome[]> {
  const refs = new Set(rows.map((r) => r.ref));
  if (refs.size !== rows.length) throw new Error("dispatchSlice: every row needs a distinct ref — outcomes are settled by it");
  // U43b-1 · E2a · a row carries its message OR the way to make it — exactly one. Neither, or both, is a programming error,
  // refused before anything is asked: with both, which text went would be an accident of the order below.
  if (rows.some((r) => ("body" in r) === ("prepare" in r) || ("body" in r ? typeof r.body !== "string" : typeof r.prepare !== "function"))) {
    throw new Error("dispatchSlice: every row carries a body or a prepare — exactly one");
  }
  // ── U13 · THE SEND WINDOW, FIRST — read once for the slice, before any gate is asked (E2c · E9) ──────────────────────
  // ⛔ Fails closed: a window that throws, or answers anything but open, holds the whole slice — and only a plain
  // quiet-hours answer is called quiet hours; everything else is a window that could not be read.
  // Monotonic by default (a wall clock stepped back would shorten the elapsed time).
  const clock = deps.clock ?? (() => performance.now());
  const sliceStart = clock();
  let sendWindow: SendWindowState | undefined;
  try {
    sendWindow = await (deps.window ?? liveSendWindow)();
  } catch {
    sendWindow = sendWindowUnreadable();
  }
  if (sendWindow?.open !== true) {
    const reason = sendWindow?.reason === "quiet_hours" ? "quiet_hours" : "window_unreadable";
    return rows.map((r): SliceOutcome => ({ ref: r.ref, outcome: "held", reason }));
  }
  const ask = deps.gate ?? mayReceiveMarketingSms;
  const rgLine = deps.rgAudit ?? auditRgRefusal;
  const outcomes = new Map<string, SliceOutcome>();
  /* U33a-G · a cleared row carries the basis the gate gave it, so the outcome can name it without asking twice — and,
     U43b-1, the text that will go (the row's own, or the one its prepare made) with the prepare's meta. */
  const cleared: SliceCleared[] = [];

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
    const grounds = { basis: verdict.basis, basisRef: verdict.basisRef };
    if (row.prepare === undefined) {
      cleared.push({ ref: row.ref, msisdn: key, body: row.body, ...grounds });
      continue;
    }
    // ── U43b-1 · E1 · PREPARE — only now, for a number the gate has JUST cleared, under the gate's key ──────────────
    let made: unknown;
    try {
      made = await row.prepare(key, verdict);
    } catch {
      made = null;
    }
    const answer = readPrepared(made);
    if (!answer.ok) {
      // ⛔ Never a send on a message that was not made — and never a whole slice lost to one person's bad answer.
      outcomes.set(row.ref, { ref: row.ref, outcome: "held", reason: answer.reason, ...(answer.detail === undefined ? {} : { detail: answer.detail }), ...grounds });
      continue;
    }
    cleared.push({ ref: row.ref, msisdn: key, body: answer.body, ...grounds, meta: answer.meta });
  }

  if (cleared.length > 0) {
    // ── U43b-1 · E2b · THE LAST WORD BEFORE THE WIRE — `beforeSend`, once, after every gate and before the one send ─────
    // It is handed COPIES (`structuredClone`, the meta too), so it can change nothing that is sent or settled. Without the
    // hook every cleared row goes, exactly as before.
    let sending = cleared;
    if (deps.beforeSend !== undefined) {
      let said: unknown;
      try {
        said = await deps.beforeSend(structuredClone(cleared));
      } catch {
        said = null;
      }
      sending = keptBy(said, cleared, outcomes);
    }
    if (sending.length === 0) return rows.map((r) => outcomes.get(r.ref) as SliceOutcome);
    // ⛔ U13 review SP-1 · THE WINDOW AGAIN, AT THE WIRE. The gate loop takes time (up to the slice's gate budget), so a
    // slice judged open at 19:59:58 could reach the network after 20:00. The window is still read ONCE (W5): its own
    // closing instant is set against the instant it was judged at PLUS the slice's elapsed time, and a slice that has
    // crossed it holds every cleared row `quiet_hours` — nothing leaves outside the hours. An unparsable instant holds too.
    const atWire = Date.parse(sendWindow.judgedAt) + (clock() - sliceStart);
    if (!(atWire < Date.parse(sendWindow.closesAt))) {
      for (const r of sending) outcomes.set(r.ref, { ref: r.ref, outcome: "held", reason: "quiet_hours", ...carried(r) });
      return rows.map((r) => outcomes.get(r.ref) as SliceOutcome);
    }
    // ── ONE SEND FOR THE SLICE ───────────────────────────────────────────────────────────────
    let batch: SmsBatchOutcome | null = null;
    try {
      batch = await deps.send(sending.map((r) => ({ to: r.msisdn, body: r.body, targetType: DISPATCH_TARGET_TYPE, targetId: r.ref })));
    } catch {
      batch = null;
    }
    if (batch === null) {
      for (const r of sending) outcomes.set(r.ref, { ref: r.ref, outcome: "unconfirmed", ...carried(r) });
    } else if (batch.refused) {
      for (const r of sending) outcomes.set(r.ref, { ref: r.ref, outcome: "held", reason: batch.refused, ...carried(r) });
    } else {
      const byRef = new Map(batch.results.filter((x) => x.targetId).map((x) => [x.targetId as string, x]));
      for (const r of sending) {
        const res = byRef.get(r.ref);
        if (!res) outcomes.set(r.ref, { ref: r.ref, outcome: "unconfirmed", ...carried(r) });
        else if (res.ok) outcomes.set(r.ref, { ref: r.ref, outcome: "handed_over", reference: res.reference, ...carried(r) });
        // ⛔ U43b-1 · E3 · F1 · A LOST REPLY IS NOT A REFUSAL. `TRANSPORT` is the wire saying "we do not know whether the
        // gateway has it" (its row is UNKNOWN, a late receipt may still settle it) — `failed` would invite a retry, a second
        // SMS at a second charge. Decided HERE, once, for every caller; the reference is kept so a receipt can find it.
        else if (res.code === "TRANSPORT") {
          outcomes.set(r.ref, { ref: r.ref, outcome: "unconfirmed", ...(res.reference ? { reference: res.reference } : {}), code: res.code, ...carried(r) });
        // ⛔ The U43b-2 re-review · a failure that names NO code is not known to have stayed home: `UNKNOWN` now means "certainly
        // before the request" to the engine (released, sent again after a Resume), so a codeless failure is no answer instead.
        } else if (typeof res.code !== "string" || (res.code as string) === "") {
          outcomes.set(r.ref, { ref: r.ref, outcome: "unconfirmed", ...(res.reference ? { reference: res.reference } : {}), ...carried(r) });
        } else outcomes.set(r.ref, { ref: r.ref, outcome: "failed", code: res.code, error: res.error ?? null, ...carried(r) });
      }
    }
  }

  return rows.map((r) => outcomes.get(r.ref) as SliceOutcome);
}

/** U43b-1 · what an outcome after the gate cleared carries: the basis it gave — and the meta, only for a prepared row. */
function carried(r: SliceCleared): SliceCarried {
  return r.meta === undefined ? { basis: r.basis, basisRef: r.basisRef } : { basis: r.basis, basisRef: r.basisRef, meta: r.meta };
}

/**
 * U43b-1 · A `prepare`'s ANSWER, READ — never trusted (the engine's prepare is typed, but a cast or a bug must cost one
 * row, not a slice). A message needs its text, a non-empty string, and its meta, an object; a refusal needs its reason, a
 * non-empty string, and keeps its detail when that is text. ⛔ Anything else — a throw (read as null), no answer, `{ ok:
 * true }` with no body or an empty one or no meta, `{ ok: false }` with no reason — is `prepare:unanswered`: a body-less
 * message handed on would throw inside `sendBatch` before any row is written and leave EVERY row of the slice
 * `unconfirmed` (nobody sent, everybody "maybe sent"), and an empty one is refused by the gateway for the whole chunk.
 */
function readPrepared(made: unknown): { ok: true; body: string; meta: SliceMeta } | { ok: false; reason: string; detail?: string } {
  const a = made !== null && typeof made === "object" ? (made as Record<string, unknown>) : null;
  if (a?.ok === true && typeof a.body === "string" && a.body !== "" && a.meta !== null && typeof a.meta === "object") {
    return { ok: true, body: a.body, meta: a.meta as SliceMeta };
  }
  if (a?.ok === false && typeof a.reason === "string" && a.reason !== "") {
    return typeof a.detail === "string" ? { ok: false, reason: `prepare:${a.reason}`, detail: a.detail } : { ok: false, reason: `prepare:${a.reason}` };
  }
  return { ok: false, reason: "prepare:unanswered" };
}

/**
 * U43b-1 · E2b · `beforeSend`'s ANSWER, READ — never trusted. `{ proceed: true, keep }` with `keep` an array of refs sends
 * the cleared rows it names and holds every other one `claim_lost`; `{ proceed: false, reason }` with a reason that is
 * non-empty text holds every cleared row with that reason. ⛔ ANYTHING ELSE FAILS CLOSED — a throw (read as null), no
 * answer, a `keep` that is missing, null or a string (`new Set("a")` would read one as a list of letters), a veto with no
 * reason or an object for one: every cleared row is held `before_send_unanswered` and nothing is sent. A send nobody could
 * vouch for is the double send E6 exists to prevent.
 */
function keptBy(said: unknown, cleared: SliceCleared[], outcomes: Map<string, SliceOutcome>): SliceCleared[] {
  const a = said !== null && typeof said === "object" ? (said as Record<string, unknown>) : null;
  const keep = a?.proceed === true && Array.isArray(a.keep) && a.keep.every((ref) => typeof ref === "string") ? new Set<string>(a.keep) : null;
  const veto = keep !== null ? null : (a?.proceed === false && typeof a.reason === "string" && a.reason !== "" ? a.reason : "before_send_unanswered");
  const sending: SliceCleared[] = [];
  for (const r of cleared) {
    if (keep?.has(r.ref)) sending.push(r);
    else outcomes.set(r.ref, { ref: r.ref, outcome: "held", reason: veto ?? "claim_lost", ...carried(r) });
  }
  return sending;
}
