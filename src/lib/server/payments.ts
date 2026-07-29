/**
 * Payment provider abstraction — the ADAPTER pattern (mirrors `sms.ts`).
 *
 * The active adapter is chosen at RUNTIME by the operations control-plane
 * (`payment-control.ts` → `getPaymentProvider()`): an admin toggle on
 * /admin/payments, falling back to the `PAYMENT_AGGREGATOR` env, else `mock`:
 *   "mock" (default) → `mockAdapter`  — deterministic dev/test provider.
 *   "selcom"         → `selcomAdapter` — Selcom (BoT-licensed aggregator).
 *   "azampay"        → `azampayAdapter`— AzamPay (BoT-licensed aggregator).
 * This is how Selcom is "integrated but not used": the adapter ships, and Ali
 * flips the provider from admin when ready. ⛔ In LIVE money-mode the mock is
 * REFUSED at dispatch (it fabricates confirmations) — see `resolveActiveAdapter`.
 * The adapter's shape is fixed by what `wallet-service` needs, so wiring a real
 * provider never changes the calling code or the settlement state machine.
 *
 * Provider-agnostic concerns (a correlation id, the `*.dispatch` audit, and the
 * AML ≥ 1,000,000 TZS review hold — never disburse a large payout without a
 * second-officer review) live in the WRAPPER below so every adapter inherits
 * them identically. Adapters only do the raw "call the gateway, return the
 * outcome" work.
 *
 * Compliance:
 *  - Provider correlation IDs persisted on `Transaction.providerRef` for
 *    chargeback / dispute / regulator inspection.
 *  - All requests audited (WALLET category); AML holds audited (COMPLIANCE).
 */
import { audit } from "./audit";
import { randomId } from "./crypto";
import { getPaymentProvider, getDemoAsyncEnabled, type PaymentProviderId } from "./payment-control";
import { isLiveMoneyMode } from "./runtime-mode";
import { selcomEnv, selcomDisburseEnv, selcomDeposit, selcomCardCheckout, selcomPayout, selcomVerifyOrder, selcomVerifyPayout, selcomCashinNameLookup, selcomFloatBalance, selcomProbeRails, mnoToSelcomCashin, railOf, type SelcomBilling, type SelcomEnv, type PayoutRail, type RailProbe } from "./selcom";

export type PaymentProvider = "MPESA" | "TIGO_PESA" | "AIRTEL_MONEY" | "HALO_PESA" | "MIXX" | "TTCL_PESA" | "CARD" | "BANK_TRANSFER" | "INTERNAL";

export type DepositResult =
  | {
      ok: true;
      providerRef: string;
      status: "CONFIRMED" | "PENDING";
      correlationId: string;
      /** Hosted-checkout (CARD) only: the Selcom gateway URL the buyer must be
       *  sent to in order to enter their card details. Absent on the mobile-money
       *  rail, where the prompt goes to the handset instead of the browser.
       *  ⚠️ Its presence NEVER implies money moved — the deposit is still
       *  PROCESSING and is credited only by the authoritative order-status
       *  re-query, exactly as on every other rail. */
      redirectUrl?: string;
    }
  | {
      ok: false;
      reason: "INSUFFICIENT_FUNDS" | "PROVIDER_DOWN" | "TIMEOUT" | "DECLINED" | "FRAUD";
      correlationId: string;
      /** Log-safe explanation from the provider (HTTP status, result code, message).
       *  Carried into the failure audit entry so a failed real-money deposit can be
       *  explained after the fact — a live 5,000 TZS deposit failed on 2026-07-20
       *  with nothing recorded beyond "PROVIDER_DOWN". Never contains credentials. */
      detail?: string;
    };

/**
 * `detail` — what the gateway ACTUALLY said, on both arms.
 *
 * Added 2026-07-29 after two real payouts stalled in PROCESSING and the platform
 * could not say why: the adapter returned a bare ok/reason and the envelope was
 * discarded, so `Transaction.providerStatus` stayed empty and the only evidence was
 * a log line nobody had written. Present on the SUCCESS arm too — "accepted" is the
 * state that stalled, and `000 SUCCESS` vs `111 INPROGRESS` is the whole diagnosis.
 * Log-safe by construction (see describeSelcom): no credentials, payee masked.
 */
export type WithdrawResult =
  | {
      ok: true;
      providerRef: string;
      status: "CONFIRMED" | "PENDING" | "AML_REVIEW";
      correlationId: string;
      detail?: string;
      /**
       * WHICH rail actually carried this payout. The caller MUST persist it on the
       * Transaction: every rail's status endpoint only knows its own transids, so a
       * re-query sent to the wrong one reads as FAILED and refunds a player whose
       * money already left. Absent on the mock adapter and on AML_REVIEW (nothing has
       * been dispatched yet), where `railOf(null)` correctly resolves to WALLET_CASHIN.
       */
      rail?: PayoutRail;
    }
  | { ok: false; reason: "INSUFFICIENT_BALANCE" | "PROVIDER_DOWN" | "ACCOUNT_NOT_VERIFIED" | "DAILY_LIMIT" | "FRAUD"; correlationId: string; detail?: string };

/** What the wrapper hands an adapter — the caller's request plus the correlation
 *  id the wrapper already minted and audited. */
export type DispatchOpts = {
  provider: PaymentProvider;
  amount: number;
  msisdn?: string;
  userId: string;
  correlationId: string;
  /** CARD only — the hosted-checkout context the mobile-money rail has no use for. */
  card?: CardCheckoutContext;
  /** Payee's registered name, when we know it. Huduma prints it on the agent's
   *  screen so the right person collects the cash; other rails ignore it. */
  payeeName?: string;
};

/** Everything the Selcom hosted card checkout needs that the wallet layer must
 *  supply: who the buyer is, the billing details they entered (Selcom rejects card
 *  orders without them), and where to send them back to. */
export type CardCheckoutContext = {
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string;
  billing: SelcomBilling;
  redirectUrl: string;
  cancelUrl: string;
};

/** Never auto-disburse a payout at/above this without a review hold. Kept equal
 *  to the AML-hold trigger in wallet-service so nothing slips through single-officer. */
export const AML_REVIEW_THRESHOLD_TZS = 1_000_000;

export type PaymentAdapter = {
  name: string;
  /** Initiate a collection (deposit). Real gateways are ASYNC: the push goes to
   *  the handset and the final result arrives later on the webhook → return
   *  `PENDING` + the provider's id as `providerRef`; the webhook settles it. */
  deposit(o: DispatchOpts): Promise<DepositResult>;
  /** Initiate a disbursement (withdrawal/payout). Async in the same way. */
  withdraw(o: DispatchOpts): Promise<WithdrawResult>;
};

// ── PUBLIC WRAPPER — the only thing wallet-service imports ────────────────────

/** Initiate a deposit collection through the active gateway. */
export async function dispatchDeposit(opts: { provider: PaymentProvider; amount: number; msisdn?: string; userId: string; card?: CardCheckoutContext; correlationId?: string }): Promise<DepositResult> {
  // The caller may mint the id and PERSIST it before calling, so a crash between
  // dispatch and the write cannot leave a paid deposit with no reference to
  // reconcile against. Fall back to minting here for callers that don't.
  const correlationId = opts.correlationId ?? `dep_${randomId(10)}`;
  audit({
    category: "WALLET",
    action: "deposit.dispatch",
    actorId: opts.userId,
    targetType: "User",
    targetId: opts.userId,
    payload: { correlationId, provider: opts.provider, amount: opts.amount, msisdn: opts.msisdn ? mask(opts.msisdn) : null },
  });
  const routed = await resolveActiveAdapter("deposit", correlationId);
  if (!routed.ok) return { ok: false, reason: "PROVIDER_DOWN", correlationId };
  return routed.adapter.deposit({ ...opts, correlationId });
}

/** Initiate a withdrawal disbursement through the active gateway. Payouts whose
 *  GROSS value ≥ AML_REVIEW_THRESHOLD_TZS are held for review and NOT sent to the
 *  gateway. `amount` is what the gateway actually disburses (net of the fee);
 *  `grossAmount` (defaults to `amount`) is the full withdrawal value the AML gate
 *  is evaluated against — evaluating on `net` would let a gross withdrawal just
 *  over the threshold slip past the mandatory second-officer review. */
export async function dispatchWithdrawal(opts: { provider: PaymentProvider; amount: number; grossAmount?: number; msisdn?: string; userId: string; reviewed?: boolean; payeeName?: string }): Promise<LadderResult> {
  const correlationId = `wdr_${randomId(10)}`;
  const amlBasis = opts.grossAmount ?? opts.amount;
  audit({
    category: "WALLET",
    action: "withdraw.dispatch",
    actorId: opts.userId,
    targetType: "User",
    targetId: opts.userId,
    payload: { correlationId, provider: opts.provider, amount: opts.amount, grossAmount: amlBasis, msisdn: opts.msisdn ? mask(opts.msisdn) : null, reviewed: !!opts.reviewed },
  });
  // Compliance FIRST, before any adapter is touched — a large payout is held for
  // a second-officer AML review; we never dispatch it to the gateway on the spot.
  // Evaluated on the GROSS withdrawal value, not the net-of-fee disbursement.
  //
  // EXCEPTION: `reviewed` — this payout has ALREADY passed the two-officer AML
  // review and is being dispatched by the officer-approved path
  // (dispatchApprovedWithdrawal → admin/aml/actions.ts). Re-holding it here would
  // dead-end it back into the same queue it just cleared, so we go straight to the
  // gateway. `reviewed` is only ever set by that server-side path, never by a player.
  if (!opts.reviewed && amlBasis >= AML_REVIEW_THRESHOLD_TZS) {
    audit({ category: "COMPLIANCE", action: "withdraw.aml_review_triggered", actorId: opts.userId, targetType: "User", targetId: opts.userId, payload: { correlationId, amount: opts.amount, grossAmount: amlBasis, threshold: AML_REVIEW_THRESHOLD_TZS } });
    // The reference here used to be FABRICATED (`${provider}-${randomId(6)}`), which
    // was indistinguishable from a real gateway reference to everything downstream —
    // reconciliation, the compliance ledger and /admin/transactions all treated a
    // payout that had never been dispatched as one the gateway had accepted.
    //
    // Nothing has been sent to any provider at this point: this branch returns BEFORE
    // resolveActiveAdapter, and therefore before the float-PIN guard and before the
    // LIVE-mode mock refusal. The correlation id is OUR id and is honest about that;
    // a real providerRef is only ever minted when the gateway actually accepts the
    // payout, on approval-dispatch.
    return { ok: true, providerRef: correlationId, status: "AML_REVIEW", correlationId };
  }
  const routed = await resolveActiveAdapter("withdraw", correlationId);
  if (!routed.ok) return { ok: false, reason: "PROVIDER_DOWN", correlationId };
  return routed.adapter.withdraw({ ...opts, correlationId });
}

// ── ADAPTER SELECTION ─────────────────────────────────────────────────────────

/**
 * Resolve the adapter to use for THIS dispatch, honouring the runtime control-plane.
 * Dispatch now HONOURS whatever provider is selected in every money mode — including
 * the mock in LIVE mode, which is a deliberate SIMULATION (owner decision 2026-07-24,
 * docs/COMPLIANCE-DECISIONS.md): the mock is a self-contained bubble that does not
 * touch the real payment rail. The admin surface flags an active live-money
 * simulation loudly (persistent banner) and the switch is COMPLIANCE-audited at
 * selection time; the kill-switch remains the emergency STOP. When the mock is
 * simulating on real money, leave a breadcrumb per dispatch so the audit trail shows
 * exactly which flows ran on the simulator.
 */
async function resolveActiveAdapter(
  flow: "deposit" | "withdraw",
  correlationId: string,
): Promise<{ ok: true; adapter: PaymentAdapter } | { ok: false }> {
  const provider = await getPaymentProvider();
  if (isLiveMoneyMode() && provider === "mock") {
    audit({
      category: "COMPLIANCE",
      action: "payments.simulation.dispatch",
      actorId: null,
      targetType: "PaymentControlPlane",
      targetId: flow,
      payload: { correlationId, note: "Real money is LIVE and the active provider is the mock — this flow ran on the simulator (deliberate), not the real payment rail." },
    });
  }
  return { ok: true, adapter: adapterFor(provider) };
}

function adapterFor(provider: PaymentProviderId): PaymentAdapter {
  switch (provider) {
    case "selcom":  return selcomAdapter;
    case "azampay": return azampayAdapter;
    case "mock":
    default:        return mockAdapter;
  }
}

// ── MOCK ADAPTER (default) — deterministic dev/test provider ──────────────────
// Behaviour is IDENTICAL to the pre-adapter stub: ~1.5s latency, a DECLINE test
// hook (amount ending in 13), and PENDING-vs-CONFIRMED gated by PAYMENTS_DEMO_ASYNC.

const mockAdapter: PaymentAdapter = {
  name: "mock",
  async deposit({ provider, amount, userId, correlationId }) {
    await new Promise((r) => setTimeout(r, 1_500));
    // Test path for failure: amount ending in 13 → DECLINED.
    if (amount % 100 === 13) {
      audit({ category: "WALLET", action: "deposit.declined", actorId: userId, targetType: "User", targetId: userId, payload: { correlationId } });
      return { ok: false, reason: "DECLINED", correlationId };
    }
    // Demo-async (control-plane toggle / `PAYMENTS_DEMO_ASYNC=true`) makes the mock
    // behave like a real async gateway (return PENDING, no auto-credit) so the
    // webhook→settle path can be demoed end-to-end. Default (unset) stays
    // synchronously CONFIRMED for local dev. Forced OFF in LIVE mode.
    if (await getDemoAsyncEnabled()) return { ok: true, providerRef: `${provider}-${randomId(6).toUpperCase()}`, status: "PENDING", correlationId };
    return { ok: true, providerRef: `${provider}-${randomId(6).toUpperCase()}`, status: "CONFIRMED", correlationId };
  },
  async withdraw({ provider, correlationId }) {
    await new Promise((r) => setTimeout(r, 1_500));
    // (AML ≥ 1M is handled by the wrapper before we get here.)
    if (await getDemoAsyncEnabled()) return { ok: true, providerRef: `${provider}-${randomId(6).toUpperCase()}`, status: "PENDING", correlationId };
    return { ok: true, providerRef: `${provider}-${randomId(6).toUpperCase()}`, status: "CONFIRMED", correlationId };
  },
};

// ── REAL ADAPTERS (stubs) ─────────────────────────────────────────────────────
// Each throws until wired. The intended implementation (auth token, collection /
// disbursement endpoints, field maps, signature) is documented step-by-step in
// docs/PAYMENT-INTEGRATION-CHECKLIST.md — fill these two bodies from the signed
// aggregator's real API docs, then set PAYMENT_AGGREGATOR + the creds. Real
// collections/disbursements are ASYNC: return PENDING + the provider id, and let
// the webhook (already built, HMAC-verified, idempotent) settle the transaction.

const NOT_WIRED = (name: string) =>
  new Error(`${name} payment adapter not wired — see docs/PAYMENT-INTEGRATION-CHECKLIST.md. Set PAYMENT_AGGREGATOR only after the deposit()/withdraw() bodies are implemented + tested.`);

// ── SELCOM ADAPTER — wired to the verified gateway client (src/lib/server/selcom.ts).
// Real collections/disbursements are ASYNCHRONOUS: we return PENDING + the provider
// reference (our own correlation id, which we send to Selcom as the order_id/transid
// and which it echoes on the callback), and the webhook — settling from the signed
// order-status re-query — is the sole authority that credits/confirms, exactly once.
const selcomAdapter: PaymentAdapter = {
  name: "selcom",
  async deposit({ provider, amount, msisdn, userId, correlationId, card }) {
    const env = selcomEnv();
    if (!env) return { ok: false, reason: "PROVIDER_DOWN", correlationId };

    // ── CARD: hosted-checkout redirect, a different rail entirely ────────────
    // The buyer enters their card on Selcom's page, so there is no MSISDN and no
    // USSD push; we hand back the gateway URL and the caller redirects. Money is
    // still credited ONLY by the authoritative order-status re-query, so this
    // rail inherits the same exactly-once settlement as every other one.
    if (provider === "CARD") {
      // Refuse rather than silently fall through to the USSD push. Before this
      // branch existed, choosing "Card" on the deposit form reached the code
      // below and pushed a MOBILE-MONEY prompt to the phone number field — a
      // player picking Card got charged over mobile money instead.
      if (!card) return { ok: false, reason: "DECLINED", correlationId };
      const r = await selcomCardCheckout(env, {
        orderId: correlationId,
        amount,
        buyerEmail: card.buyerEmail,
        buyerName: card.buyerName,
        buyerPhone: card.buyerPhone,
        billing: card.billing,
        redirectUrl: card.redirectUrl,
        cancelUrl: card.cancelUrl,
      });
      if (!r.ok) return { ok: false, reason: r.reason, correlationId };
      // PENDING: the order exists but the buyer has not paid yet — they have not
      // even seen the card form. Nothing is credited until order-status says so.
      return { ok: true, status: "PENDING", providerRef: correlationId, correlationId, redirectUrl: r.gatewayUrl };
    }

    if (!msisdn) return { ok: false, reason: "DECLINED", correlationId }; // no handset to push the USSD prompt to
    // order_id = OUR correlation id → it becomes providerRef, so the callback
    // (which echoes order_id) correlates back to this exact transaction.
    const r = await selcomDeposit(env, { orderId: correlationId, amount, msisdn, userId });
    // AMBIGUOUS (the USSD push may have reached the handset) → do NOT fail: return
    // PENDING so the deposit stays PROCESSING and the authoritative order-status
    // re-query (webhook/reconcile) credits it exactly-once IF the customer paid.
    // Only a DEFINITIVE PROVIDER_DOWN/DECLINED (customer not charged) fails.
    if (!r.ok && r.reason !== "AMBIGUOUS") return { ok: false, reason: r.reason, correlationId, detail: r.detail };
    return { ok: true, status: "PENDING", providerRef: correlationId, correlationId };
  },
  async withdraw({ provider, amount, msisdn, correlationId, payeeName }) {
    const env = selcomDisburseEnv();
    // Each refusal now says WHICH precondition failed. All three used to collapse
    // into an indistinguishable PROVIDER_DOWN, so "payouts are down" could mean a
    // missing PIN, an unconfigured gateway or an unsupported network, and an
    // operator had no way to tell which without reading the source.
    if (!env) return { ok: false, reason: "PROVIDER_DOWN", correlationId, detail: "selcom disburse env not configured (PAYMENT_API_URL/KEY/SECRET/VENDOR_ID)" };
    if (!env.pin) return { ok: false, reason: "PROVIDER_DOWN", correlationId, detail: "float PIN not set (PAYMENT_VENDOR_PIN) — wallet-cashin requires it" };
    if (!msisdn) return { ok: false, reason: "ACCOUNT_NOT_VERIFIED", correlationId, detail: "no payee msisdn on the account" };
    return runPayoutLadder(env, { provider, amount, msisdn, correlationId, payeeName });
  },
};

// ── THE PAYOUT FALLBACK LADDER ──────────────────────────────────────────────────
/**
 * Rails tried automatically, in order, when a payout is refused.
 *
 * 🔴 WHY THIS ORDER, AND WHY HUDUMA IS NOT IN IT.
 *
 * Both rails here deliver to the SAME place the player asked for — a mobile wallet on
 * their own number — so switching between them is invisible and harmless.
 * `HUDUMA_AGENT` is deliberately excluded: it does not send money to a phone at all,
 * it parks cash at a Selcom agent that the player has to physically travel to and
 * collect with `*150*50#`. Silently converting "money in my M-Pesa" into "go find an
 * agent" is not a fallback, it is a different product — and a player sitting waiting
 * for an M-Pesa SMS that will never arrive is worse off than one who simply gets their
 * balance back and retries. Huduma is fully implemented and probe-checked so an
 * operator can dispatch a stuck payout through it deliberately; it just never happens
 * behind the player's back. Add it here only alongside a consent step.
 *
 * WALLET_CASHIN leads despite riding TIPS because it is the only rail proven against
 * the live gateway, and the one whose destination the player actually chose.
 */
export const PAYOUT_LADDER: readonly PayoutRail[] = ["WALLET_CASHIN", "SELCOM_PESA"] as const;

/** One rung of the ladder, for the audit trail. */
export type RailAttempt = { rail: PayoutRail; transid: string; outcome: "ACCEPTED" | "FAILED" | "AMBIGUOUS" | "SKIPPED"; detail: string };

export type LadderResult = WithdrawResult & { attempts?: RailAttempt[] };

/**
 * Walk the ladder. **The money-safety rule is the whole point of this function:**
 *
 *   ACCEPTED (incl. 999/111/927) → STOP. The payout may be in flight; keep the hold.
 *   AMBIGUOUS (timeout, network, any non-401/403 HTTP error) → **STOP.** We do not
 *       know whether Selcom took the request. Trying the next rail here is precisely
 *       how you pay a player twice. Keep the hold and let the per-rail re-query settle it.
 *   FAILED (401/403, or 2xx with a hard-fail resultcode) → ADVANCE. "Refused at the
 *       door" is the only state in which nothing can be in flight, which is what makes
 *       advancing safe at all.
 *   every rail exhausted → PROVIDER_DOWN, and the caller reverses the hold cleanly.
 *
 * Each attempt gets its OWN `transid`. Selcom treats `transid` as the idempotency key,
 * so reusing one across two endpoints invites a collision on the one identifier we use
 * to ask "did this pay?". `providerRef` ends up as the transid of the rung we stopped
 * on — the only one that can still be in flight.
 */
async function runPayoutLadder(
  env: NonNullable<ReturnType<typeof selcomDisburseEnv>>,
  opts: { provider: PaymentProvider; amount: number; msisdn: string; correlationId: string; payeeName?: string },
): Promise<LadderResult> {
  const { provider, amount, msisdn, correlationId } = opts;
  const attempts: RailAttempt[] = [];
  const probes = getCachedRailProbes(env); // never blocks the money path — see below

  for (const rail of PAYOUT_LADDER) {
    // WALLET_CASHIN needs a per-MNO utility code; the others carry their own. A
    // provider with no code (CARD/BANK_TRANSFER/INTERNAL) skips this rung rather
    // than failing the whole payout — that is what having a ladder buys us.
    const utilityCode = rail === "WALLET_CASHIN" ? mnoToSelcomCashin(provider) ?? undefined : undefined;
    if (rail === "WALLET_CASHIN" && !utilityCode) {
      attempts.push({ rail, transid: "-", outcome: "SKIPPED", detail: `no wallet-cashin utility code for provider ${provider}` });
      continue;
    }
    // A rail Selcom has told us is not provisioned is skipped without a request.
    // UNKNOWN is NOT skipped: a probe timeout must never disable a working rail —
    // one wasted request is cheaper than a payout that never goes out.
    if (probes?.[rail] === "NOT_ENABLED") {
      attempts.push({ rail, transid: "-", outcome: "SKIPPED", detail: "probe: not enabled for this vendor (4035)" });
      continue;
    }

    // Fresh transid per rung — see the doc comment. The first rung keeps the already
    // minted+audited correlation id so single-rail payouts read exactly as before.
    const transid = attempts.length === 0 ? correlationId : `wdr_${randomId(10)}`;
    const r = await selcomPayout(env, rail, { transid, amount, msisdn, utilityCode, name: opts.payeeName });

    if (r.ok) {
      attempts.push({ rail, transid, outcome: "ACCEPTED", detail: r.detail });
      return { ok: true, status: "PENDING", providerRef: transid, rail, correlationId, detail: r.detail, attempts };
    }
    if (r.reason === "AMBIGUOUS") {
      // ⛔ STOP. Do not try the next rail. See the rule above.
      attempts.push({ rail, transid, outcome: "AMBIGUOUS", detail: r.detail });
      return { ok: true, status: "PENDING", providerRef: transid, rail, correlationId, detail: r.detail, attempts };
    }
    attempts.push({ rail, transid, outcome: "FAILED", detail: r.detail });
    console.warn(`[payments] rail ${rail} refused (${transid}) — advancing. ${r.detail}`);
  }

  // Every rung refused definitively. Nothing is in flight, so the caller can safely
  // return the player's money — which is a far better outcome than an eternal pending.
  const summary = attempts.map((a) => `${a.rail}:${a.outcome}`).join(" → ") || "no eligible rail";
  console.error(`[payments] payout ladder exhausted (${correlationId}) — ${summary}`);
  return { ok: false, reason: "PROVIDER_DOWN", correlationId, detail: `all payout rails refused — ${summary}`, attempts };
}

// ── Rail capability cache ───────────────────────────────────────────────────────
// Refreshed off the money path. `withdraw` reads whatever is cached and NEVER waits
// for a probe: diagnostics must not add latency to, or fail, a payout. An empty cache
// means "try everything", which is the safe direction to be wrong in.
let railProbeCache: { at: number; verdicts: Record<PayoutRail, RailProbe["verdict"]> } | null = null;
let railProbeInFlight = false;
const RAIL_PROBE_TTL_MS = 10 * 60_000;

function getCachedRailProbes(env: NonNullable<ReturnType<typeof selcomDisburseEnv>>): Record<PayoutRail, RailProbe["verdict"]> | null {
  const stale = !railProbeCache || Date.now() - railProbeCache.at > RAIL_PROBE_TTL_MS;
  if (stale && !railProbeInFlight) {
    railProbeInFlight = true;
    // Fire-and-forget: this payout uses the previous answer (or none); the next one
    // gets the fresh one.
    void refreshRailProbes(env).finally(() => { railProbeInFlight = false; });
  }
  return railProbeCache?.verdicts ?? null;
}

/** Probe every rail and cache the verdicts. Safe to call from admin on demand. */
export async function refreshRailProbes(env?: SelcomEnv | null): Promise<RailProbe[]> {
  const e = env ?? selcomDisburseEnv();
  if (!e) return [];
  const probes = await selcomProbeRails(e);
  const verdicts = Object.fromEntries(probes.map((p) => [p.rail, p.verdict])) as Record<PayoutRail, RailProbe["verdict"]>;
  railProbeCache = { at: Date.now(), verdicts };
  return probes;
}

/** Last known rail verdicts without touching the network (null = never probed). */
export function lastRailProbes(): { at: number; verdicts: Record<PayoutRail, RailProbe["verdict"]> } | null {
  return railProbeCache;
}

// ── AUTHORITATIVE STATUS RE-QUERY (for the reconcile sweep) ────────────────────
// Lets `wallet-service.reconcileStalePayments` resolve a stuck PROCESSING txn from
// the provider's own signed status endpoint instead of blindly timing it out (which
// double-pays withdrawals and strands paid deposits). Provider-agnostic: returns
// UNSUPPORTED when the active adapter has no real gateway (mock/test) or is not
// configured, PENDING while the movement is still in flight/ambiguous (leave it
// PROCESSING and re-check later), and only CONFIRMED/FAILED when Selcom is definitive.
export type VerifyStatus = "CONFIRMED" | "FAILED" | "PENDING" | "UNSUPPORTED";

export async function verifyDepositStatus(providerRef: string): Promise<{ status: VerifyStatus; amount?: number }> {
  if ((await getPaymentProvider()) !== "selcom") return { status: "UNSUPPORTED" };
  const env = selcomEnv();
  if (!env) return { status: "UNSUPPORTED" };
  const r = await selcomVerifyOrder(env, providerRef);
  if (r.status === "CONFIRMED") return { status: "CONFIRMED", amount: r.amount };
  if (r.status === "FAILED") return { status: "FAILED", amount: r.amount };
  return { status: "PENDING" };
}

/**
 * ⚠️ PENDING here means EITHER "genuinely in progress" OR "we could not get an
 * answer" — deliberately conflated, because both must leave the payout alone. The
 * `detail` exists so a HUMAN can still tell them apart: on 2026-07-29 a stalled
 * payout and a gateway refusing our IP were indistinguishable for an hour.
 */
export async function verifyWithdrawalStatus(providerRef: string, payoutRail?: string | null): Promise<{ status: VerifyStatus; detail?: string }> {
  if ((await getPaymentProvider()) !== "selcom") return { status: "UNSUPPORTED", detail: "active provider is not selcom" };
  const env = selcomDisburseEnv();
  if (!env) return { status: "UNSUPPORTED", detail: "selcom disburse env not configured" };
  // 🔴 Ask the rail that actually carried the money. `railOf` defaults a missing rail
  // to WALLET_CASHIN, which is true for every payout written before rails existed —
  // asking the wrong endpoint here is a double payment, not a cosmetic error.
  const r = await selcomVerifyPayout(env, railOf(payoutRail), providerRef);
  if (r.status === "CONFIRMED") return { status: "CONFIRMED", detail: r.detail };
  if (r.status === "FAILED") return { status: "FAILED", detail: r.detail };
  return { status: "PENDING", detail: r.detail };
}

/**
 * Resolve the registered account-holder name for a payee mobile number, so the
 * withdraw confirm screen can show WHO is being paid before "Send funds". Best-effort
 * and provider-agnostic: returns null unless the active provider is Selcom, configured,
 * and the MNO supports look-up (M-Pesa does not). Never throws; never blocks a payout.
 */
export async function lookupPayeeName(provider: PaymentProvider, msisdn: string): Promise<string | null> {
  if ((await getPaymentProvider()) !== "selcom") return null;
  const env = selcomDisburseEnv();
  if (!env) return null;
  const utilityCode = mnoToSelcomCashin(provider);
  if (!utilityCode) return null;
  const r = await selcomCashinNameLookup(env, { utilityCode, msisdn, transid: `nl_${randomId(10)}` });
  return r?.name ?? null;
}

/**
 * The disbursement float's available balance (TZS), for the operator console. Returns
 * null unless Selcom is the active provider, configured, and the float PIN is set —
 * a dry float makes every payout fail, so this feeds the low-float warning.
 */
export async function getFloatBalance(): Promise<{ balance: number } | null> {
  if ((await getPaymentProvider()) !== "selcom") return null;
  const env = selcomDisburseEnv();
  if (!env) return null;
  return selcomFloatBalance(env, `fb_${randomId(10)}`);
}

const azampayAdapter: PaymentAdapter = {
  name: "azampay",
  async deposit() { throw NOT_WIRED("azampay"); },
  async withdraw() { throw NOT_WIRED("azampay"); },
};

function mask(msisdn: string) {
  return msisdn.length > 6 ? `${msisdn.slice(0, 4)}*****${msisdn.slice(-2)}` : "****";
}

// `computeWithdrawalTax` is DELETED.
//
// It withheld a hardcoded 15% of EVERY withdrawal — it was called as
// `computeWithdrawalTax(amount, amount)`, i.e. treating the entire withdrawal as
// taxable winnings, and its own comment at the call site admitted this was
// "naïve". A player who deposited 100,000, never placed a bet, and withdrew,
// received 85,000. We were taking 15% of a player's own untouched deposit and
// booking it as tax.
//
// Ali's decision (2026-07): taxes are only ever on OUR commission. A player pays
// the pool fee (indirectly, through the payout) and the 1% withdrawal fee, and
// nothing else. The withdrawal fee lives in RateConfig — `withdrawalFeeRate` /
// `withdrawalGatewayShareRate` — and is applied in wallet-service.ts.
//
// ⚠️ LEGAL: the 15% cited the Income Tax Act. Removing it is a legal call, not an
// engineering one. Ali has made it; it is on the record in the session summary.
