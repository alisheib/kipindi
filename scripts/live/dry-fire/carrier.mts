/**
 * THE FAKE CARRIER — a stand-in for the Blackball gateway that answers the way Blackball does (`sms-blackball.ts`, measured
 * 2026-09-16), installed as `fetch` so the REAL `sendBatch` and the REAL `blackballSend` run over it (rows written before the
 * wire, chunks of 50, the verdict read from the `status` boolean, an ambiguous reply left UNKNOWN, the credit floors).
 *
 * ⛔ NO SMS CAN LEAVE FROM HERE. The endpoint is `http://dry-fire.invalid/…` — `.invalid` is reserved and never resolves — the
 * keys are dummies, and this fake REFUSES every other address (a stray request is counted and thrown, and the harness fails on
 * it). Nothing in this file imports a transport, a socket library or a server module.
 *
 * ── WHAT IT ANSWERS (one answer per REQUEST, as the real gateway: there is no per-message data in a reply) ─────────────────
 *   accept     200 `{status:true, message:"Successfully submitted to broker.", balance:<PRE-charge>}`; the batch is queued and billed.
 *   refuse     400 `{status:false, message:"Invalid credentials", balance:0}`; NOT queued, NOT billed (decided before anything is).
 *   lost       the reply never comes — `fetch` rejects with a timeout; the carrier MAY have queued (and billed) the batch.
 *   http5xx    an HTML error page (a proxy's 504); the carrier MAY have queued it.
 *   body_dead  a 200 whose body dies mid-read; the carrier queued it.
 *   die        the CALLER's process died mid-request: the request is on record and nothing is ever answered.
 * plus `delayMs` — the answer takes that long on the VIRTUAL clock (a slow gateway).
 *
 * ── WHAT IT KEEPS (the invariants read it; the engine never does) ──────────────────────────────────────────────────────────
 * Every request, with each message's wire number, its reference, and — looked up AT REQUEST TIME through the harness's own
 * `attribute` door — the campaign and recipient it belongs to and how old that recipient's claim was at that instant. A message
 * is "handed" when its request was not refused outright: an accepted batch, a lost reply and an error page all count, because the
 * engine cannot tell them apart and must never send the same person twice after any of them.
 *
 * ⛔ This file holds no backslash (an editing tool decodes them): line breaks and patterns are built from codes and classes.
 */
import { sizeSms } from "../../../src/lib/sms-compose.ts";
import { clockOf, yieldTurn } from "./kit.mts";

export const FAKE_ENDPOINT = "http://dry-fire.invalid/api/sms/send";
export const FAKE_BALANCE_ENDPOINT = "http://dry-fire.invalid/api/account/balance";
export const FAKE_CLIENT_ID = "dry-fire-not-a-key";
export const FAKE_CLIENT_SECRET = "dry-fire-not-a-key";

export type Behavior =
  | { kind: "accept" }
  | { kind: "refuse"; message?: string }
  | { kind: "lost"; carrierHasIt: boolean }
  | { kind: "http5xx"; status?: number; carrierHasIt: boolean }
  | { kind: "body_dead"; carrierHasIt?: boolean }
  | { kind: "die"; carrierHasIt: boolean };
export type Planned = Behavior & { delayMs?: number };

/** What the harness knows about a message's owner, looked up when the request arrives (the rows exist: P2 — written before the wire). */
export type Attribution = { campaignId: string | null; recipientId: string | null; claimedAt: string | null; purpose: string | null };

export type WireMessage = {
  msisdn: string;
  reference: string;
  /** The text's length and billed segments — never kept as text beyond `textSample`'s bounded sample. */
  textLen: number;
  segments: number;
  campaignId: string | null;
  recipientId: string | null;
  purpose: string | null;
  claimedAt: string | null;
  /** The age of the owner's claim when the request arrived (virtual ms), or null when the message has no claim. */
  claimAgeMs: number | null;
};

export type Answer = "accepted" | "refused" | "nothing" | "error_page" | "body_dead" | "lost";

export type RequestRecord = {
  seq: number;
  /** Virtual wall time the request arrived. */
  at: number;
  behavior: Behavior["kind"];
  /** Did the carrier queue (and bill) the batch? Only the fake knows. */
  carrierHasIt: boolean;
  answered: Answer;
  messages: WireMessage[];
};

/** What a plan is asked about a request. */
export type PlanInput = {
  seq: number;
  count: number;
  messages: readonly WireMessage[];
  campaignIds: readonly string[];
  /** How many requests (this one included) the campaign has made so far. */
  nth: (campaignId: string) => number;
};
export type Plan = (input: PlanInput) => Planned | null;

export type BalancePlan = "ok" | "error" | { slowMs: number };

export type Carrier = {
  fetch: typeof fetch;
  requests: RequestRecord[];
  /** Requests to any address but the two this fake serves — the harness fails on any. */
  stray: string[];
  /** Balance reads served. */
  balanceReads: number;
  balance(): number;
  setBalance(tzs: number): void;
  /** What the carrier has billed so far (TZS). */
  billed(): number;
  pricePerSegment: number;
  setPlan(plan: Plan | null): void;
  setBalancePlan(plan: BalancePlan | (() => BalancePlan)): void;
  /** Yield the event loop inside every send request, so concurrent drivers interleave. */
  setYield(on: boolean): void;
  /** Run inside every send request, after it is on record and before it is answered — an officer's Stop pressed while a group is
   *  in flight is pressed here. */
  onRequest: ((rec: RequestRecord) => Promise<void> | void) | null;
  /** A bounded sample of rendered texts by wire number (the first `SAMPLE_MAX` per run) — for the message-content claims. */
  texts: Map<string, string>;
  /** How many requests carried a number, by campaign — the invariants' table. */
  handedBy(campaignId: string): Map<string, number>;
  /** Every request that carried the number for the campaign. */
  requestsFor(campaignId: string, msisdn: string): RequestRecord[];
  /** Every request that carried at least one message of the campaign, in order. */
  requestsOf(campaignId: string): RequestRecord[];
  /** What the carrier billed for the campaign's messages (TZS): the batches it queued, a segment at a time. */
  billedFor(campaignId: string): number;
  /** The delivery-receipt lines the real gateway would post for what it queued. */
  receiptLine(msisdn: string, reference: string, status: string, description: string | null): Record<string, string>;
  reset(): void;
};

const SAMPLE_MAX = 6000;

type Body = { auth?: { clientId?: string; clientSecret?: string }; messages?: { text?: string; msisdn?: string; reference?: string }[] };

export function makeCarrier(o: {
  /** Looks a message up by the reference `sendBatch` minted (its row exists before the request). */
  attribute: (reference: string) => Promise<Attribution | null>;
  balance?: number;
  price?: number;
  /** Yield the event loop on every send request, so concurrent drivers interleave. */
  yieldOnRequest?: boolean;
}): Carrier {
  const clock = clockOf();
  let yieldOnRequest = o.yieldOnRequest === true;
  let balance = o.balance ?? 1_000_000;
  let billed = 0;
  let plan: Plan | null = null;
  let balancePlan: BalancePlan | (() => BalancePlan) = "ok";
  let seq = 0;
  const perCampaign = new Map<string, number>();
  const carrier: Carrier = {
    fetch: null as unknown as typeof fetch,
    requests: [],
    stray: [],
    balanceReads: 0,
    balance: () => balance,
    setBalance: (tzs) => { balance = tzs; },
    billed: () => billed,
    pricePerSegment: o.price ?? 6,
    setPlan: (p) => { plan = p; },
    setBalancePlan: (p) => { balancePlan = p; },
    setYield: (on) => { yieldOnRequest = on; },
    onRequest: null,
    texts: new Map(),
    handedBy: (campaignId) => {
      const m = new Map<string, number>();
      for (const r of carrier.requests) {
        if (r.answered === "refused") continue;
        for (const w of r.messages) if (w.campaignId === campaignId) m.set(w.msisdn, (m.get(w.msisdn) ?? 0) + 1);
      }
      return m;
    },
    requestsFor: (campaignId, msisdn) => carrier.requests.filter((r) => r.messages.some((w) => w.campaignId === campaignId && w.msisdn === msisdn)),
    requestsOf: (campaignId) => carrier.requests.filter((r) => r.messages.some((w) => w.campaignId === campaignId)),
    billedFor: (campaignId) => carrier.requests.filter((r) => r.carrierHasIt).reduce((n, r) => n + r.messages.filter((w) => w.campaignId === campaignId).reduce((a, w) => a + w.segments, 0), 0) * carrier.pricePerSegment,
    receiptLine: (msisdn, reference, status, description) => ({ status, reference, description: description ?? "", msisdn }),
    reset: () => {
      carrier.requests.length = 0;
      carrier.stray.length = 0;
      carrier.balanceReads = 0;
      carrier.texts.clear();
      perCampaign.clear();
      seq = 0;
      billed = 0;
      plan = null;
      balancePlan = "ok";
      carrier.onRequest = null;
    },
  };

  const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "x-dry-fire": "1" } });

  async function send(rawBody: string): Promise<Response> {
    let body: Body = {};
    try {
      body = JSON.parse(rawBody) as Body;
    } catch {
      return json(400, { status: false, message: "malformed body", data: null, balance: 0 });
    }
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const at = clock.now();
    const wire: WireMessage[] = [];
    for (const m of messages) {
      const reference = String(m.reference ?? "");
      const text = String(m.text ?? "");
      const a = await o.attribute(reference);
      const claimMs = a?.claimedAt ? Date.parse(a.claimedAt) : Number.NaN;
      wire.push({
        msisdn: String(m.msisdn ?? ""), reference, textLen: text.length, segments: Math.max(1, sizeSms(text).segments),
        campaignId: a?.campaignId ?? null, recipientId: a?.recipientId ?? null, purpose: a?.purpose ?? null,
        claimedAt: a?.claimedAt ?? null, claimAgeMs: Number.isFinite(claimMs) ? at - claimMs : null,
      });
      if (carrier.texts.size < SAMPLE_MAX) carrier.texts.set(String(m.msisdn ?? ""), text);
    }
    seq += 1;
    const campaignIds = [...new Set(wire.map((w) => w.campaignId).filter((c): c is string => c !== null))];
    for (const c of campaignIds) perCampaign.set(c, (perCampaign.get(c) ?? 0) + 1);
    const rec: RequestRecord = { seq, at, behavior: "accept", carrierHasIt: false, answered: "nothing", messages: wire };
    carrier.requests.push(rec);
    if (carrier.onRequest) await carrier.onRequest(rec);
    const planned: Planned = plan?.({ seq, count: wire.length, messages: wire, campaignIds, nth: (c) => perCampaign.get(c) ?? 0 }) ?? { kind: "accept" };
    rec.behavior = planned.kind;
    if (planned.delayMs !== undefined) clock.advance(planned.delayMs);
    if (yieldOnRequest) await yieldTurn();
    const queue = (): void => {
      const cost = wire.reduce((n, w) => n + w.segments, 0) * carrier.pricePerSegment;
      rec.carrierHasIt = true;
      billed += cost;
      balance -= cost;
    };
    const preCharge = balance;
    switch (planned.kind) {
      case "accept":
        queue();
        rec.answered = "accepted";
        return json(200, { status: true, message: "Successfully submitted to broker.", data: null, balance: preCharge });
      case "refuse":
        rec.answered = "refused";
        return json(400, { status: false, message: planned.message ?? "Invalid credentials", data: null, balance: 0 });
      case "lost":
        if (planned.carrierHasIt) queue();
        rec.answered = "lost";
        throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
      case "http5xx":
        if (planned.carrierHasIt) queue();
        rec.answered = "error_page";
        return new Response("<html><body><h1>504 Gateway Time-out</h1></body></html>", { status: planned.status ?? 504, headers: { "content-type": "text/html" } });
      case "body_dead": {
        if (planned.carrierHasIt !== false) queue();
        rec.answered = "body_dead";
        const stream = new ReadableStream({ start(c) { c.error(new Error("socket hang up")); } });
        return new Response(stream, { status: 200, headers: { "content-type": "application/json" } });
      }
      case "die":
        if (planned.carrierHasIt) queue();
        rec.answered = "nothing";
        return new Promise<Response>(() => { /* the caller is dead: nothing is ever answered */ });
    }
  }

  async function balanceRead(): Promise<Response> {
    carrier.balanceReads += 1;
    const p = typeof balancePlan === "function" ? balancePlan() : balancePlan;
    if (p === "error") return new Response("Internal Server Error", { status: 500 });
    if (typeof p === "object") clock.advance(p.slowMs);
    return json(200, { status: true, message: "Account balance", data: { name: "dry-fire", currency: "TZS" }, balance: balance });
  }

  carrier.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input instanceof Request ? input.url : input);
    const raw = typeof init?.body === "string" ? init.body : "";
    if (url === FAKE_ENDPOINT) {
      let auth: Body = {};
      try { auth = JSON.parse(raw) as Body; } catch { /* answered below */ }
      if (auth.auth?.clientId !== FAKE_CLIENT_ID || auth.auth?.clientSecret !== FAKE_CLIENT_SECRET) {
        return json(400, { status: false, message: "Invalid credentials", data: null, balance: 0 });
      }
      return send(raw);
    }
    if (url === FAKE_BALANCE_ENDPOINT) return balanceRead();
    carrier.stray.push(url.slice(0, 80));
    throw new Error("dry-fire: a request to an address the fake carrier does not serve was refused");
  }) as typeof fetch;
  return carrier;
}
