/**
 * Payments & settlement OPERATIONS CONTROL-PLANE (TEST-mode ↔ LIVE-mode).
 *
 * Ali controls every test/prod payment behaviour at runtime from /admin/payments —
 * but the money/compliance rails stay safe. This module is the single source of
 * truth for three admin-tunable runtime behaviours, layered over the deployment
 * env as the fallback:
 *
 *   1. `provider`   — which payment adapter moves money: `mock` | `selcom` | `azampay`.
 *                     This is how Selcom is "INTEGRATED but not used": default `mock`,
 *                     flip to `selcom` from admin the moment Ali is ready. The per-MNO
 *                     KILL-SWITCH (payment-ops.ts) remains the instant emergency stop.
 *   2. `demoAsync`  — the mock adapter's async behaviour (TEST-only; inert on LIVE).
 *
 * NOTE: the old `autoSettle` / `AUTO_SETTLE` control is GONE. Market settlement is
 * now driven by per-market timers that fire at each market's objection-window close
 * (market-scheduler.ts) — there is no global on/off for it. The objection window,
 * winner-floor and objection-freeze are the real gates; /admin/settlement remains
 * the human fallback (settle by hand, view frozen markets).
 *
 * Persistence & shape mirror the existing hand-rolled config modules
 * (payment-ops.ts kill-switches, resolution-policy.ts): a `globalThis` cache hydrated
 * once from `SystemConfig` via config-store, an async hydration guard on every read
 * (money-path reads must be correct, not eventually-consistent), and an audited
 * `set`. A field left `null` means "inherit the deployment env" — so a brand-new
 * deployment with no DB row behaves EXACTLY as the env did before this module
 * existed. An explicit value (set by an officer) overrides the env.
 *
 * ── SAFETY MODEL (guardrails, not hard-locks) ─────────────────────────────────
 * Owner decision 2026-07-24 (docs/COMPLIANCE-DECISIONS.md): admins may switch the
 * provider — INCLUDING to `mock` — in ANY money mode, LIVE or TEST, without a
 * Railway env change or redeploy. "We are admins, we control the system." The old
 * LIVE-mode hard-locks (refuse-to-select mock, refuse-at-dispatch, force demo-async
 * off) are GONE. What remains is honest surfacing, not blocking:
 *   • Selecting `mock` while `isLiveMoneyMode()` is a deliberate SIMULATION: the mock
 *     FABRICATES confirmations, so deposits credit real wallets with no real funds
 *     and withdrawals pay nobody. It is allowed, but it requires a typed confirm in
 *     the UI (control-plane.tsx), writes a COMPLIANCE audit, and raises a persistent
 *     loud banner (`simulationActiveOnLiveMoney`) for as long as it is active.
 *   • A real provider (`selcom`/`azampay`) may only be selected once its credentials
 *     are present (`paymentProviderConfigured`) — otherwise every call would fail.
 *   • The kill-switch (payment-ops.ts) remains the emergency STOP; use it to halt
 *     payments, not the mock.
 * ⛔ `TEST_FUNDING` money-minting stays deployment-level (not here). Two-admin
 * resolution moved to resolution-policy.ts. Controllable ≠ unsafe — it is audited.
 *
 * ── 🔴 AND THE ONE THING THAT IS *NOT* A CHOICE: NOBODY CHOOSING ──────────────
 * A DELIBERATE simulation is Ali's call (above) and is guardrailed. **An ACCIDENTAL
 * one is not a decision at all**, and until 2026-09-08 it resolved to the same
 * money-printing adapter by the same line of code.
 *
 * `envProvider()` folded THREE different states into `mock`: the var set to `mock`
 * (a choice), the var UNSET (nobody chose), and the var set to something
 * unrecognised — `PAYMENT_AGGREGATOR=selcomm`, a typo in a Railway variable — which
 * is a *failed* choice. On a LIVE deployment the last two both silently activated an
 * adapter whose own doc comment says it "fabricates confirmations: deposits credit
 * real wallets with no money received". No typed confirm, no COMPLIANCE audit, no
 * banner: those exist only on the path where an officer *picks* the mock. A wrong
 * Railway variable is exactly how it would happen, and the boot alarm printed
 * "NOTICE … deliberate operator choice" over it.
 *
 * So the resolution is now TRI-STATE and the money path fails CLOSED:
 *   officer  — a row an officer saved. Honoured in every mode, mock included.
 *   env      — `PAYMENT_AGGREGATOR` set to a RECOGNISED id. Honoured, mock included.
 *   none     — unset, empty or unrecognised. In TEST this is `mock`, exactly as
 *              before (local dev must boot with no configuration). ⛔ In LIVE money
 *              mode it resolves to NOTHING: `getPaymentProvider()` returns `null`
 *              and `payments.ts → resolveActiveAdapter` refuses the dispatch, so a
 *              deposit fails with `PROVIDER_DOWN` instead of crediting a real wallet
 *              from a simulator. Settlement, betting and every non-payment path are
 *              untouched — refusing the RAIL must never take the platform down.
 * ⛔ Do not "simplify" the three states back into one default. The return type is
 * nullable so the compiler makes every caller say what it does when no rail is live.
 * Guard: `npm run test:payment-control` · `npm run red:payment-control`.
 *
 * Every change is audited (WALLET + a COMPLIANCE breadcrumb for the money-rail
 * switch) with a `{ before, after, changes }` payload, visible in /admin/audit.
 */
import { configChanges, loadConfigResult, saveConfig } from "./config-store";
import { audit } from "./audit";
import { isLiveMoneyMode, moneyMode, type MoneyMode } from "./runtime-mode";

export type PaymentProviderId = "mock" | "selcom" | "azampay";
const REAL_PROVIDERS: PaymentProviderId[] = ["selcom", "azampay"];
const ALL_PROVIDERS: PaymentProviderId[] = ["mock", "selcom", "azampay"];

/** A stored control. `null` = "not set by an officer — inherit the env fallback". */
type Controls = {
  provider: PaymentProviderId | null;
  demoAsync: boolean | null;
};
const DEFAULTS: Controls = { provider: null, demoAsync: null };

const KEY = "payments.control";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_PAY_CONTROL: Controls | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_PAY_CONTROL_HYDRATED: boolean | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_PAY_CONTROL_HYDRATING: Promise<void> | undefined;
}
const store: Controls = globalThis.__50PICK_PAY_CONTROL ?? (globalThis.__50PICK_PAY_CONTROL = { ...DEFAULTS });

/**
 * Hydrate the cache from `SystemConfig`, once.
 *
 * ⛔ THE FLAG IS SET *AFTER* THE READ LANDS, AND THE IN-FLIGHT PROMISE IS SHARED. It
 * used to be set on the line BEFORE the `await`, so a second caller arriving during
 * that one DB round-trip saw `hydrated === true`, skipped the wait and read the
 * DEFAULTS — i.e. "no officer choice" — while the officer's real row was still on the
 * wire. Every money-path read calls this first precisely so it cannot be
 * eventually-consistent, and the guard flag was defeating that.
 *
 * A failed read leaves the flag DOWN on purpose: a transient DB error at boot must
 * not pin a container on code defaults for the rest of its life, so the next caller
 * retries. `loadConfig` never throws (it logs and returns null), so a genuine error
 * and "no row stored" are indistinguishable here — which is safe in this module
 * only because "no row" now REFUSES on LIVE money rather than defaulting to the mock.
 */
async function ensureHydrated(): Promise<void> {
  if (globalThis.__50PICK_PAY_CONTROL_HYDRATED) return;
  if (!globalThis.__50PICK_PAY_CONTROL_HYDRATING) {
    globalThis.__50PICK_PAY_CONTROL_HYDRATING = (async () => {
      // ⛔ `loadConfigResult`, NOT `loadConfig` — see config-store.ts. The docblock above is
      // right that "no row" is SAFE here, because an unset rail now REFUSES live money rather
      // than defaulting to the mock. But a FAILED read is not "no row": it silently discards
      // the officer's chosen provider and hands the whole process to the env fallback for its
      // entire life. Only a read that actually answered may close this gate.
      const res = await loadConfigResult<Partial<Controls>>(KEY);
      if (!res.ok) return; // gate stays DOWN — the next money-path call retries
      const stored = res.value;
      if (stored) {
        if (stored.provider === null || (typeof stored.provider === "string" && ALL_PROVIDERS.includes(stored.provider))) store.provider = stored.provider ?? null;
        if (stored.demoAsync === null || typeof stored.demoAsync === "boolean") store.demoAsync = stored.demoAsync ?? null;
      }
      globalThis.__50PICK_PAY_CONTROL_HYDRATED = true;
    })().finally(() => { globalThis.__50PICK_PAY_CONTROL_HYDRATING = undefined; });
  }
  await globalThis.__50PICK_PAY_CONTROL_HYDRATING;
}

// ── Env fallbacks (the pre-control-plane behaviour) ───────────────────────────

/**
 * What `PAYMENT_AGGREGATOR` actually says — as three states, not one default.
 * `provider: null` means NOBODY CHOSE: the variable is unset, empty, or set to a
 * value this platform does not recognise (a typo). `raw` is kept so the admin
 * surface and the boot alarm can print what was really there.
 */
function envProviderChoice(): { provider: PaymentProviderId | null; raw: string } {
  const raw = (process.env.PAYMENT_AGGREGATOR ?? "").trim();
  const v = raw.toLowerCase();
  return { provider: (ALL_PROVIDERS as string[]).includes(v) ? (v as PaymentProviderId) : null, raw };
}
const envDemoAsync = (): boolean => process.env.PAYMENTS_DEMO_ASYNC === "true";

// ── Resolvers (money-path reads — DB override, else env) ──────────────────────

/** Where the active provider came from. `none` = nobody chose one. */
export type ProviderSource = "officer" | "env" | "none";

export type ProviderResolution =
  | { ok: true; provider: PaymentProviderId; source: "officer" | "env" }
  | { ok: false; provider: null; source: "none"; reason: string; envRaw: string };

/**
 * THE money-path resolver. Officer row → recognised `PAYMENT_AGGREGATOR` → in TEST
 * the `mock`, and in LIVE money mode **nothing at all**.
 *
 * ⛔ The `ok: false` arm is not an error state to be smoothed over — it is the whole
 * point. It says "real money is live and no payment rail has been chosen", and the
 * only correct response on a money path is to refuse to move money.
 */
export async function resolvePaymentProvider(): Promise<ProviderResolution> {
  await ensureHydrated();
  return resolveFromStore();
}

/** The same resolution, synchronously, for callers that have ALREADY hydrated. */
function resolveFromStore(): ProviderResolution {
  if (store.provider !== null) return { ok: true, provider: store.provider, source: "officer" };
  const env = envProviderChoice();
  if (env.provider !== null) return { ok: true, provider: env.provider, source: "env" };
  if (isLiveMoneyMode()) {
    return {
      ok: false,
      provider: null,
      source: "none",
      envRaw: env.raw,
      reason: env.raw
        ? `real money is LIVE and PAYMENT_AGGREGATOR is set to "${env.raw}", which is not a payment provider this platform knows (expected selcom | azampay | mock)`
        : "real money is LIVE and no payment provider has been chosen (PAYMENT_AGGREGATOR is unset and no officer has selected one in /admin/payments)",
    };
  }
  // TEST: unchanged — a deployment with no configuration behaves exactly as it did.
  return { ok: true, provider: "mock", source: "env" };
}

/** The active payment provider, or `null` when real money is LIVE and nobody has
 *  chosen a rail (see `resolvePaymentProvider`). Returns exactly what is selected —
 *  including `mock`, which the dispatch layer HONOURS as a deliberate simulation
 *  when it was actually CHOSEN. ⛔ Nullable on purpose: a caller that moves money
 *  must say what it does when there is no rail, and the compiler now asks. */
export async function getPaymentProvider(): Promise<PaymentProviderId | null> {
  return (await resolvePaymentProvider()).provider;
}

/** The mock adapter's async behaviour (returns PENDING; the webhook settles).
 *  Only affects the mock adapter. No longer force-off in LIVE mode — the mock is
 *  now operator-selectable in any mode (owner decision 2026-07-24), and if an admin
 *  is deliberately simulating on a real-money deployment they may want the async
 *  path too. DB override → `PAYMENTS_DEMO_ASYNC` env. */
export async function getDemoAsyncEnabled(): Promise<boolean> {
  await ensureHydrated();
  return store.demoAsync ?? envDemoAsync();
}

/** Are the credentials for a real provider present? `mock` is never "configured".
 *  Selcom needs its API key, secret, vendor id and a base URL to sign a request —
 *  all four, or every call fails. Pure env read (safe at boot). */
export function paymentProviderConfigured(provider: PaymentProviderId): boolean {
  if (provider === "selcom") {
    return !!process.env.PAYMENT_API_KEY && !!process.env.PAYMENT_API_SECRET && !!process.env.PAYMENT_VENDOR_ID && !!process.env.PAYMENT_API_URL;
  }
  if (provider === "azampay") {
    // AzamPay is an unwired stub and is NOT contracted for 50pick. Gate it on
    // AzamPay-SPECIFIC creds (not the shared PAYMENT_* vars, which belong to
    // Selcom) so it never falsely shows as "configured"/selectable in admin.
    return !!process.env.AZAMPAY_CLIENT_ID && !!process.env.AZAMPAY_CLIENT_SECRET;
  }
  return false;
}

// ── Admin surface ─────────────────────────────────────────────────────────────

export type PaymentControlsView = {
  mode: MoneyMode;
  /** `null` = real money is LIVE and NO rail has been chosen — money-in and
   *  money-out are refused at dispatch. Not the same thing as the mock. */
  provider: PaymentProviderId | null;
  /** true = an officer set it in the DB; false = inherited from the env. */
  providerExplicit: boolean;
  demoAsync: boolean;
  demoAsyncExplicit: boolean;
  /** Is the currently-selected provider actually configured (creds present)? */
  gatewayConfigured: boolean;
  /** LIVE money mode AND nobody chose a provider (unset / typo'd
   *  `PAYMENT_AGGREGATOR`, no officer row). Deposits and withdrawals are REFUSED
   *  rather than routed to the simulator. Carries the reason for the screen. */
  moneyRailUnset: boolean;
  moneyRailUnsetReason: string | null;
  /** LIVE money mode AND the active provider is `mock` — a deliberate SIMULATION on
   *  real money (mock fabricates confirmations: deposits credit real wallets with no
   *  real funds, withdrawals pay nobody). NOT refused — flagged with a persistent
   *  loud banner so it can never be running silently. */
  simulationActiveOnLiveMoney: boolean;
  locks: {
    /** Retained for shape stability; always false — no LIVE-mode hard-locks remain
     *  (owner decision 2026-07-24). Selecting mock/demo-async is guardrailed in the
     *  UI (typed confirm + banner), not blocked. */
    demoAsyncLocked: boolean;
    mockForbidden: boolean;
  };
  /** Whether each provider can be selected right now. mock is ALWAYS selectable;
   *  real providers require their creds. */
  selectable: Record<PaymentProviderId, boolean>;
  /** The raw env fallbacks, for the "inherited from env" hint. `provider: null` =
   *  `PAYMENT_AGGREGATOR` is unset or unrecognised; `providerRaw` is what it said. */
  env: { provider: PaymentProviderId | null; providerRaw: string; demoAsync: boolean };
};

export async function getPaymentControls(): Promise<PaymentControlsView> {
  await ensureHydrated();
  const live = isLiveMoneyMode();
  const resolved = resolveFromStore();
  const provider = resolved.provider;
  const gatewayConfigured = provider !== null && paymentProviderConfigured(provider);
  const env = envProviderChoice();
  return {
    mode: moneyMode(),
    provider,
    providerExplicit: store.provider !== null,
    demoAsync: store.demoAsync ?? envDemoAsync(),
    demoAsyncExplicit: store.demoAsync !== null,
    gatewayConfigured,
    // A CHOSEN mock on live money. ⛔ Distinct from `moneyRailUnset`: that one is
    // nobody having chosen, which is refused rather than simulated.
    simulationActiveOnLiveMoney: live && provider === "mock",
    moneyRailUnset: !resolved.ok,
    moneyRailUnsetReason: resolved.ok ? null : resolved.reason,
    locks: { demoAsyncLocked: false, mockForbidden: false },
    selectable: {
      mock: true,
      selcom: paymentProviderConfigured("selcom"),
      azampay: paymentProviderConfigured("azampay"),
    },
    env: { provider: env.provider, providerRaw: env.raw, demoAsync: envDemoAsync() },
  };
}

export type ControlsUpdate = Partial<{ provider: PaymentProviderId; demoAsync: boolean }>;

/** Snapshot for audit — the effective (resolved) values, so before/after read
 *  truthfully even when a field is inherited from the env. */
function effectiveSnapshot(): { provider: PaymentProviderId | null; demoAsync: boolean } {
  return {
    // `null` reads truthfully as "no rail was active", which is what a switch AWAY
    // from an unset LIVE deployment must record. A snapshot that said `mock` there
    // would put a simulation in the audit trail that never ran.
    provider: resolveFromStore().provider,
    demoAsync: store.demoAsync ?? envDemoAsync(),
  };
}

/**
 * Apply an audited change to the control-plane. The only remaining validation is
 * that a REAL provider must have its credentials present (otherwise every call
 * would fail) — the LIVE-mode mock/demo-async hard-locks are gone (owner decision
 * 2026-07-24); selecting the mock in LIVE is guardrailed in the UI (typed confirm +
 * persistent banner), not blocked here. A single invalid field rejects the whole
 * update (no partial application). Persists + audits. Returns the refreshed view.
 */
export async function setPaymentControls(
  updates: ControlsUpdate,
  officerId: string,
): Promise<{ ok: true; controls: PaymentControlsView } | { ok: false; error: string }> {
  await ensureHydrated();

  if (updates.provider !== undefined) {
    const p = updates.provider;
    if (!ALL_PROVIDERS.includes(p)) return { ok: false, error: "Unknown payment provider." };
    if (REAL_PROVIDERS.includes(p) && !paymentProviderConfigured(p)) {
      return { ok: false, error: `${p} is not configured. Set its API credentials (PAYMENT_API_KEY / PAYMENT_API_SECRET / PAYMENT_VENDOR_ID / PAYMENT_API_URL) in Railway before selecting it.` };
    }
  }

  const before = effectiveSnapshot();
  if (updates.provider !== undefined) store.provider = updates.provider;
  if (updates.demoAsync !== undefined) store.demoAsync = updates.demoAsync;
  void saveConfig(KEY, { ...store });

  const after = effectiveSnapshot();
  audit({
    category: "WALLET",
    action: "payments.control.updated",
    actorId: officerId,
    targetType: "PaymentControlPlane",
    targetId: "global",
    payload: { before, after, changes: configChanges(before, after), mode: moneyMode() },
  });
  // The money-rail switch is compliance-relevant — a second, category-COMPLIANCE
  // breadcrumb so it also shows in the compliance audit view.
  if (updates.provider !== undefined && before.provider !== after.provider) {
    // The mock is a simulation adapter; selecting it while real money is LIVE is the
    // compliance-notable case (the UI also demands a typed confirm + persistent
    // banner while it is active), so tag the breadcrumb distinctly.
    const liveMockSim = isLiveMoneyMode() && after.provider === "mock";
    audit({
      category: "COMPLIANCE",
      action: liveMockSim ? "payments.simulation.activated" : "payments.provider.switched",
      actorId: officerId,
      targetType: "PaymentProvider",
      targetId: updates.provider,
      payload: { from: before.provider, to: after.provider, mode: moneyMode(), liveMockSimulation: liveMockSim, note: liveMockSim ? "Simulation adapter selected while real money is LIVE — deliberate operator action; the mock does not touch the real payment rail." : "Active payment rail changed from the operations control-plane." },
    });
  }
  return { ok: true, controls: await getPaymentControls() };
}

/**
 * Boot-time payment-mode sanity alarm. In LIVE mode it reports, loudly:
 *  - no rail chosen at all → **money-in and money-out are REFUSED** (the closed
 *    verdict is armed in `resolvePaymentProvider`, which is what actually enforces
 *    it; this is the announcement, not the gate);
 *  - the mock deliberately chosen → a SIMULATION;
 *  - a real provider with missing credentials → every call will fail.
 *
 * ⚠️ IT STILL DOES NOT THROW, AND THAT IS DELIBERATE. The gate that matters is on
 * the money path, where it refuses the dispatch and nothing else. Throwing here
 * would take down betting, settlement and every page over a payment-rail
 * misconfiguration — the C7 outage was exactly a boot `throw`, and a platform that
 * cannot settle a market it already owes players is not the safe direction. A guard
 * in the pipeline beats a louder alarm at the door.
 */
export async function assertPaymentModeSane(): Promise<void> {
  if (!isLiveMoneyMode()) return;
  let resolution: ProviderResolution;
  try {
    resolution = await resolvePaymentProvider();
  } catch (err) {
    console.error("[payments] Could not resolve the active provider at boot:", err);
    return;
  }
  if (!resolution.ok) {
    console.error(
      "\n" + "!".repeat(72) + "\n" +
        "[payments] REFUSING MONEY: real money is LIVE and NO payment rail is chosen.\n" +
        `  Reason: ${resolution.reason}.\n` +
        "  Deposits and withdrawals will fail with PROVIDER_DOWN until a rail is set.\n" +
        "  This is deliberate: the alternative is the MOCK adapter, which fabricates\n" +
        "  confirmations and would credit real wallets with money never received.\n" +
        "  Fix: set PAYMENT_AGGREGATOR=selcom (+ PAYMENT_API_KEY / PAYMENT_API_SECRET /\n" +
        "  PAYMENT_VENDOR_ID / PAYMENT_API_URL) in Railway, or pick a rail in\n" +
        "  /admin/payments. Betting and settlement are UNAFFECTED.\n" +
        "!".repeat(72) + "\n",
    );
    return;
  }
  const provider = resolution.provider;
  if (provider === "mock") {
    console.error(
      "\n" + "!".repeat(72) + "\n" +
        "[payments] NOTICE: real money is LIVE and the active provider is the MOCK.\n" +
        `  It was CHOSEN (source: ${resolution.source === "officer" ? "an officer, in /admin/payments" : "PAYMENT_AGGREGATOR=mock in the environment"}).\n` +
        "  This is a SIMULATION (deliberate operator choice) — the mock does not touch\n" +
        "  the real payment rail. Switch to Selcom in /admin/payments (or set\n" +
        "  PAYMENT_AGGREGATOR=selcom + creds) to process real deposits/withdrawals.\n" +
        "!".repeat(72) + "\n",
    );
    return;
  }
  if (!paymentProviderConfigured(provider)) {
    console.error(
      "\n" + "!".repeat(72) + "\n" +
        `[payments] WARNING: provider is '${provider}' but its credentials are missing.\n` +
        "  Needs PAYMENT_API_KEY / PAYMENT_API_SECRET / PAYMENT_VENDOR_ID / PAYMENT_API_URL.\n" +
        "  Every payment will fail until these are set in Railway.\n" +
        "!".repeat(72) + "\n",
    );
  }
}
