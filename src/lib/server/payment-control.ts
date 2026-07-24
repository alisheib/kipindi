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
 * Every change is audited (WALLET + a COMPLIANCE breadcrumb for the money-rail
 * switch) with a `{ before, after, changes }` payload, visible in /admin/audit.
 */
import { loadConfig, saveConfig } from "./config-store";
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
}
const store: Controls = globalThis.__50PICK_PAY_CONTROL ?? (globalThis.__50PICK_PAY_CONTROL = { ...DEFAULTS });

async function ensureHydrated(): Promise<void> {
  if (globalThis.__50PICK_PAY_CONTROL_HYDRATED) return;
  globalThis.__50PICK_PAY_CONTROL_HYDRATED = true;
  const stored = await loadConfig<Partial<Controls>>(KEY);
  if (stored) {
    if (stored.provider === null || (typeof stored.provider === "string" && ALL_PROVIDERS.includes(stored.provider))) store.provider = stored.provider ?? null;
    if (stored.demoAsync === null || typeof stored.demoAsync === "boolean") store.demoAsync = stored.demoAsync ?? null;
  }
}

// ── Env fallbacks (the pre-control-plane behaviour) ───────────────────────────
function envProvider(): PaymentProviderId {
  const v = (process.env.PAYMENT_AGGREGATOR ?? "").toLowerCase();
  return v === "selcom" || v === "azampay" ? v : "mock";
}
const envDemoAsync = (): boolean => process.env.PAYMENTS_DEMO_ASYNC === "true";

// ── Resolvers (money-path reads — DB override, else env) ──────────────────────

/** The active payment provider. DB override → `PAYMENT_AGGREGATOR` env → `mock`.
 *  Returns exactly what is selected — including `mock` in LIVE mode, which the
 *  dispatch layer (payments.ts) now HONOURS (a deliberate simulation) rather than
 *  refusing. The admin surface flags the simulation loudly via getPaymentControls. */
export async function getPaymentProvider(): Promise<PaymentProviderId> {
  await ensureHydrated();
  return store.provider ?? envProvider();
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
  provider: PaymentProviderId;
  /** true = an officer set it in the DB; false = inherited from the env. */
  providerExplicit: boolean;
  demoAsync: boolean;
  demoAsyncExplicit: boolean;
  /** Is the currently-selected provider actually configured (creds present)? */
  gatewayConfigured: boolean;
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
  /** The raw env fallbacks, for the "inherited from env" hint. */
  env: { provider: PaymentProviderId; demoAsync: boolean };
};

export async function getPaymentControls(): Promise<PaymentControlsView> {
  await ensureHydrated();
  const live = isLiveMoneyMode();
  const provider = store.provider ?? envProvider();
  const gatewayConfigured = paymentProviderConfigured(provider);
  return {
    mode: moneyMode(),
    provider,
    providerExplicit: store.provider !== null,
    demoAsync: store.demoAsync ?? envDemoAsync(),
    demoAsyncExplicit: store.demoAsync !== null,
    gatewayConfigured,
    simulationActiveOnLiveMoney: live && provider === "mock",
    locks: { demoAsyncLocked: false, mockForbidden: false },
    selectable: {
      mock: true,
      selcom: paymentProviderConfigured("selcom"),
      azampay: paymentProviderConfigured("azampay"),
    },
    env: { provider: envProvider(), demoAsync: envDemoAsync() },
  };
}

export type ControlsUpdate = Partial<{ provider: PaymentProviderId; demoAsync: boolean }>;

/** Snapshot for audit — the effective (resolved) values, so before/after read
 *  truthfully even when a field is inherited from the env. */
function effectiveSnapshot(): { provider: PaymentProviderId; demoAsync: boolean } {
  return {
    provider: store.provider ?? envProvider(),
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
    payload: { before, after, changes: updates, mode: moneyMode() },
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
 * Boot-time payment-mode sanity alarm (fail-OPEN — never throws; a real-money
 * platform must not be taken down by an alarm). In LIVE mode it warns loudly if
 * the resolved provider is the mock (a deliberate SIMULATION — it does not touch the
 * real payment rail) or a real provider whose credentials are missing (every call
 * will fail). This just surfaces the state at boot; the admin surface carries the
 * persistent simulation banner while the mock is active.
 */
export async function assertPaymentModeSane(): Promise<void> {
  if (!isLiveMoneyMode()) return;
  let provider: PaymentProviderId;
  try {
    provider = await getPaymentProvider();
  } catch (err) {
    console.error("[payments] Could not resolve the active provider at boot:", err);
    return;
  }
  if (provider === "mock") {
    console.error(
      "\n" + "!".repeat(72) + "\n" +
        "[payments] NOTICE: real money is LIVE and the active provider is the MOCK.\n" +
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
