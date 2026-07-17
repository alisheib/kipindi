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
 *   2. `autoSettle` — whether the lifecycle ticker pays resolved markets on its own.
 *   3. `demoAsync`  — the mock adapter's async behaviour (TEST-only; inert on LIVE).
 *
 * Persistence & shape mirror the existing hand-rolled config modules
 * (payment-ops.ts kill-switches, test-overrides.ts): a `globalThis` cache hydrated
 * once from `SystemConfig` via config-store, an async hydration guard on every read
 * (money-path reads must be correct, not eventually-consistent), and an audited
 * `set`. A field left `null` means "inherit the deployment env" — so a brand-new
 * deployment with no DB row behaves EXACTLY as the env did before this module
 * existed. An explicit value (set by an officer) overrides the env.
 *
 * ── SAFETY MODEL (the whole point) ────────────────────────────────────────────
 * `isLiveMoneyMode()` (production && TEST_FUNDING!=="true") gates the hard-locks:
 *   • LIVE mode FORBIDS `provider=mock` — the mock fabricates confirmations, so
 *     running real money through it would mint/lose money. To STOP payments in LIVE
 *     use the kill-switch, never the mock. Both `setPaymentControls` (refuses the
 *     write) AND `resolveActiveAdapter` in payments.ts (refuses at dispatch, returns
 *     PROVIDER_DOWN + a SECURITY audit) enforce this — belt and braces.
 *   • A real provider (`selcom`/`azampay`) may only be selected once its credentials
 *     are present (`paymentProviderConfigured`).
 *   • `demoAsync` is a TEST tool — forced OFF in LIVE mode.
 * ⛔ Compliance-critical switches (`TEST_FUNDING` money-minting, POCA §16 solo-
 * resolution) are DELIBERATELY NOT here — they stay deployment-level / hard-locked
 * (see test-overrides.ts + docs/COMPLIANCE-DECISIONS.md). Controllable ≠ unsafe.
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
  autoSettle: boolean | null;
  demoAsync: boolean | null;
};
const DEFAULTS: Controls = { provider: null, autoSettle: null, demoAsync: null };

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
    if (stored.autoSettle === null || typeof stored.autoSettle === "boolean") store.autoSettle = stored.autoSettle ?? null;
    if (stored.demoAsync === null || typeof stored.demoAsync === "boolean") store.demoAsync = stored.demoAsync ?? null;
  }
}

// ── Env fallbacks (the pre-control-plane behaviour) ───────────────────────────
function envProvider(): PaymentProviderId {
  const v = (process.env.PAYMENT_AGGREGATOR ?? "").toLowerCase();
  return v === "selcom" || v === "azampay" ? v : "mock";
}
const envAutoSettle = (): boolean => process.env.AUTO_SETTLE === "true";
const envDemoAsync = (): boolean => process.env.PAYMENTS_DEMO_ASYNC === "true";

// ── Resolvers (money-path reads — DB override, else env) ──────────────────────

/** The active payment provider. DB override → `PAYMENT_AGGREGATOR` env → `mock`.
 *  NOTE: this returns the *configured* value truthfully even if it is `mock` in
 *  LIVE mode; the dispatch layer (payments.ts) is what REFUSES to move real money
 *  on the mock. Kept that way so the admin surface can show the danger honestly. */
export async function getPaymentProvider(): Promise<PaymentProviderId> {
  await ensureHydrated();
  return store.provider ?? envProvider();
}

/** Does the lifecycle ticker settle resolved markets automatically? DB override →
 *  `AUTO_SETTLE` env. Off by default (manual settlement) until the payout rail is
 *  live and reconciled. */
export async function getAutoSettleEnabled(): Promise<boolean> {
  await ensureHydrated();
  return store.autoSettle ?? envAutoSettle();
}

/** The mock adapter's async behaviour (returns PENDING; the webhook settles).
 *  TEST-only — FORCED OFF whenever real money is live: it only affects the mock,
 *  which never runs in LIVE mode, and a "demo-async ON" state must never appear on
 *  a real-money board. DB override → `PAYMENTS_DEMO_ASYNC` env when in TEST mode. */
export async function getDemoAsyncEnabled(): Promise<boolean> {
  if (isLiveMoneyMode()) return false;
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
  autoSettle: boolean;
  autoSettleExplicit: boolean;
  demoAsync: boolean;
  demoAsyncExplicit: boolean;
  /** Is the currently-selected provider actually configured (creds present)? */
  gatewayConfigured: boolean;
  /** LIVE mode but the resolved provider is `mock` — a dangerous misconfiguration;
   *  dispatch will refuse (PROVIDER_DOWN). Surfaced so the admin can fix it. */
  liveMockRefused: boolean;
  locks: {
    /** demo-async can't be turned on (LIVE mode). */
    demoAsyncLocked: boolean;
    /** the mock provider can't be selected (LIVE mode). */
    mockForbidden: boolean;
  };
  /** Whether each real provider can be selected right now (creds present). */
  selectable: Record<PaymentProviderId, boolean>;
  /** The raw env fallbacks, for the "inherited from env" hint. */
  env: { provider: PaymentProviderId; autoSettle: boolean; demoAsync: boolean };
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
    autoSettle: store.autoSettle ?? envAutoSettle(),
    autoSettleExplicit: store.autoSettle !== null,
    demoAsync: live ? false : (store.demoAsync ?? envDemoAsync()),
    demoAsyncExplicit: store.demoAsync !== null,
    gatewayConfigured,
    liveMockRefused: live && provider === "mock",
    locks: { demoAsyncLocked: live, mockForbidden: live },
    selectable: {
      mock: !live,
      selcom: paymentProviderConfigured("selcom"),
      azampay: paymentProviderConfigured("azampay"),
    },
    env: { provider: envProvider(), autoSettle: envAutoSettle(), demoAsync: envDemoAsync() },
  };
}

export type ControlsUpdate = Partial<{ provider: PaymentProviderId; autoSettle: boolean; demoAsync: boolean }>;

/** Snapshot for audit — the effective (resolved) values, so before/after read
 *  truthfully even when a field is inherited from the env. */
function effectiveSnapshot(): { provider: PaymentProviderId; autoSettle: boolean; demoAsync: boolean } {
  return {
    provider: store.provider ?? envProvider(),
    autoSettle: store.autoSettle ?? envAutoSettle(),
    demoAsync: isLiveMoneyMode() ? false : (store.demoAsync ?? envDemoAsync()),
  };
}

/**
 * Apply an audited change to the control-plane. Every requested change is
 * validated against the LIVE-mode hard-locks BEFORE anything is written; a single
 * invalid field rejects the whole update (no partial application). Persists +
 * audits. Returns the refreshed view.
 */
export async function setPaymentControls(
  updates: ControlsUpdate,
  officerId: string,
): Promise<{ ok: true; controls: PaymentControlsView } | { ok: false; error: string }> {
  await ensureHydrated();
  const live = isLiveMoneyMode();

  if (updates.provider !== undefined) {
    const p = updates.provider;
    if (!ALL_PROVIDERS.includes(p)) return { ok: false, error: "Unknown payment provider." };
    if (live && p === "mock") {
      return { ok: false, error: "Real money is LIVE — the mock provider is disabled. To halt payments use the kill-switch, not the mock." };
    }
    if (REAL_PROVIDERS.includes(p) && !paymentProviderConfigured(p)) {
      return { ok: false, error: `${p} is not configured. Set its API credentials (PAYMENT_API_KEY / PAYMENT_API_SECRET / PAYMENT_VENDOR_ID / PAYMENT_API_URL) in Railway before selecting it.` };
    }
  }
  if (updates.demoAsync === true && live) {
    return { ok: false, error: "Demo-async is a TEST-mode tool and cannot be enabled on a real-money deployment." };
  }

  const before = effectiveSnapshot();
  if (updates.provider !== undefined) store.provider = updates.provider;
  if (updates.autoSettle !== undefined) store.autoSettle = updates.autoSettle;
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
    audit({
      category: "COMPLIANCE",
      action: "payments.provider.switched",
      actorId: officerId,
      targetType: "PaymentProvider",
      targetId: updates.provider,
      payload: { from: before.provider, to: after.provider, mode: moneyMode(), note: "Active payment rail changed from the operations control-plane." },
    });
  }
  return { ok: true, controls: await getPaymentControls() };
}

/**
 * Boot-time payment-mode sanity alarm (fail-OPEN — never throws; a real-money
 * platform must not be taken down by an alarm). In LIVE mode it warns loudly if
 * the resolved provider is the mock (dispatch will refuse every payment) or a real
 * provider whose credentials are missing (every call will fail). The runtime guard
 * in payments.ts is the actual enforcement; this just surfaces the misconfig at
 * boot instead of in the first player's failed deposit.
 */
export async function assertPaymentModeSane(): Promise<void> {
  if (!isLiveMoneyMode()) return;
  let provider: PaymentProviderId;
  try {
    provider = await getPaymentProvider();
  } catch (err) {
    console.error("[payments] Could not resolve the active provider at boot (runtime dispatch still enforces the LIVE-mode guard):", err);
    return;
  }
  if (provider === "mock") {
    console.error(
      "\n" + "!".repeat(72) + "\n" +
        "[payments] WARNING: real money is LIVE but the active provider is the MOCK.\n" +
        "  Every deposit/withdrawal will be REFUSED (PROVIDER_DOWN) — the mock is\n" +
        "  never allowed to move real money. Set PAYMENT_AGGREGATOR=selcom (+ creds)\n" +
        "  or flip the provider in /admin/payments before customers arrive.\n" +
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
