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
 * bets). The old `NODE_ENV === "production"` hard-lock that used to enforce this
 * was removed 2026-07-12 at the operator's request because the live-config
 * deployment is currently used for consultant evaluation and the lock blocked
 * it; the not-for-production rule now lives in docs + audit trail instead of a
 * code gate, so re-check it is OFF before go-live. It is gated to
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
  // ⚠️ NOT FOR PRODUCTION — testing/consultant-evaluation only. When enabled,
  // relaxes the POCA §16 / GBT officer-conflict + self-countersign rules in ALL
  // environments (the old prod hard-lock was removed 2026-07-12 — see header).
  // MUST be OFF before any real-money launch. 2FA-gated toggle, default OFF,
  // every toggle and bypass audited.
  await ensureHydrated();
  return store.allowConflictedResolution;
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
