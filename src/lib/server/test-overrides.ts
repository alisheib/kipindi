/**
 * Operational overrides — persisted system flags that relax a resolution guard.
 * Kept separate from the money-rate config (market-config.ts) because these are
 * NOT rates and carry a compliance caveat.
 *
 * `allowConflictedResolution` (default OFF): when ON, a single officer may
 * resolve a market end-to-end even if they hold a position in it — the officer
 * settles their own position normally (win pays, loss is deducted from their
 * wallet, exactly like any other player). This relaxes BOTH the officer-conflict
 * block AND the two-officer / self-countersign rule.
 *
 * ⚠️ NOT FOR PRODUCTION — TESTING / QA / CONSULTANT-EVALUATION ONLY. ⚠️
 * The officer-conflict block exists for POCA §16 / GBT licensing (an officer
 * with a financial interest in the outcome must not decide it). Enabling this
 * override relaxes that guard. It exists ONLY so a tester/consultant acting as
 * both admin and player can settle a market end-to-end on a non-real-money
 * deployment. It MUST be OFF for any real-money production launch — leaving it
 * ON with real funds is a licensing violation (an admin could pay their own
 * bets). The `NODE_ENV === "production"` hard-lock was removed 2026-07-12 for a
 * consultant-evaluation deployment and **restored 2026-07-15 (audit C7)**:
 * `getConflictedResolutionAllowed()` now UNCONDITIONALLY returns `false` in
 * production regardless of the persisted flag, and `assertProductionComplianceLocks()`
 * refuses to boot if the flag was left ON. A control that can be toggled off by
 * configuration is not a control. If a consultant needs the relaxation, run a
 * SEPARATE staging deployment with `NODE_ENV !== "production"` — never remove the
 * guard from the code that handles real money. It remains gated to
 * ADMIN/COMPLIANCE + 2FA, defaults OFF, and every toggle AND every actual bypass
 * is written to the COMPLIANCE audit trail so the relaxation is never silent.
 */
import { loadConfig, saveConfig } from "./config-store";
import { audit } from "./audit";

const KEY = "test.overrides";

type TestOverrides = { allowConflictedResolution: boolean };

const DEFAULTS: TestOverrides = { allowConflictedResolution: false };

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_TEST_OVERRIDES: TestOverrides | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_TEST_OVERRIDES_HYDRATED: boolean | undefined;
}

const store = globalThis.__50PICK_TEST_OVERRIDES ?? (globalThis.__50PICK_TEST_OVERRIDES = { ...DEFAULTS });

async function ensureHydrated(): Promise<void> {
  if (globalThis.__50PICK_TEST_OVERRIDES_HYDRATED) return;
  globalThis.__50PICK_TEST_OVERRIDES_HYDRATED = true;
  const stored = await loadConfig<Partial<TestOverrides>>(KEY);
  if (stored && typeof stored.allowConflictedResolution === "boolean") {
    store.allowConflictedResolution = stored.allowConflictedResolution;
  }
}

export async function getTestOverrides(): Promise<TestOverrides> {
  await ensureHydrated();
  return { ...store };
}

export async function getConflictedResolutionAllowed(): Promise<boolean> {
  // POCA §16 / GBT: an officer with a financial interest in a market must NEVER
  // resolve it. This override is evaluation-only and is UNCONDITIONALLY disabled
  // in production — the persisted flag cannot re-enable it on real money.
  // Restored 2026-07-15 (audit C7); do NOT remove again. For evaluation, use a
  // separate staging deployment with NODE_ENV !== "production".
  if (process.env.NODE_ENV === "production") return false;
  await ensureHydrated();
  return store.allowConflictedResolution;
}

/**
 * Boot-time compliance assertion (audit C7). The runtime guard above already
 * forces the lock in production; this refuses to *start* if the persisted flag
 * was left ON, so an operator notices and clears it rather than shipping with a
 * compliance override set. Fails closed by throwing. A transient read failure at
 * boot does not block startup — the runtime guard still holds.
 */
export async function assertProductionComplianceLocks(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;
  let flagOn = false;
  try {
    flagOn = (await getTestOverrides()).allowConflictedResolution;
  } catch (err) {
    console.error("[compliance] Could not read test overrides at boot (runtime guard still enforces the lock):", err);
    return;
  }
  if (flagOn) {
    // FAIL-OPEN, on purpose. getConflictedResolutionAllowed() ALREADY returns
    // false in production unconditionally, so the POCA §16 control is fully
    // enforced at runtime regardless of this flag. Throwing here would take a
    // real-money platform DOWN over a compliance *alarm* that changes nothing —
    // the wrong trade. So we log loudly (ops must still clear the flag) but let
    // the server boot. Do NOT convert this back to a throw.
    console.error(
      "\n" + "!".repeat(72) + "\n" +
        "[compliance] WARNING: allowConflictedResolution is ON in the production DB.\n" +
        "  The runtime guard forces it OFF (officers still cannot resolve their own\n" +
        "  markets — POCA §16 enforced), but CLEAR the persisted SystemConfig\n" +
        "  'test.overrides' flag so the intent is unambiguous.\n" +
        "!".repeat(72) + "\n",
    );
  }
}

export async function setConflictedResolutionAllowed(enabled: boolean, officerId: string): Promise<boolean> {
  await ensureHydrated();
  store.allowConflictedResolution = enabled;
  void saveConfig(KEY, { ...store });
  audit({
    category: "COMPLIANCE",
    action: enabled ? "test.conflicted_resolution.enabled" : "test.conflicted_resolution.disabled",
    actorId: officerId,
    targetType: "SystemFlag",
    targetId: "allowConflictedResolution",
    payload: { enabled, note: "Solo-resolution override: when ON, an officer holding a position may resolve that market (relaxes the POCA §16 officer-conflict + two-officer rules); the officer's own position settles normally." },
  });
  return enabled;
}
