/**
 * Operational / testing overrides — persisted system flags that relax a
 * production guard to make QA on the live app behave normally. Kept separate
 * from the money-rate config (market-config.ts) because these are NOT rates and
 * carry a compliance caveat.
 *
 * `allowConflictedResolution` (default OFF): when ON, an officer who holds a
 * position in a market may still resolve it. In production the officer-conflict
 * block (POCA §16 / GBT licensing) forbids this; the override exists so a tester
 * acting as both admin and player can settle a market and have their own
 * position pay out normally — exactly like any other player. Every toggle AND
 * every actual bypass is written to the COMPLIANCE audit trail.
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
  // Hard rule: the officer-conflict / self-countersign bypass can NEVER be
  // active in production — not even if a stored flag or leaked env says so.
  // POCA §16 / GBT licensing forbid an officer resolving a market they hold a
  // position in, or countersigning their own Stage-1. This is a TESTING-only
  // relaxation. Mirrors the ADMIN_TEST_DEPOSITS prod-lock in wallet-service.
  if (process.env.NODE_ENV === "production") return false;
  await ensureHydrated();
  return store.allowConflictedResolution;
}

export async function setConflictedResolutionAllowed(enabled: boolean, officerId: string): Promise<boolean> {
  await ensureHydrated();
  // Prod-lock: refuse to persist an ON state in production. The getter already
  // returns false in prod regardless of the stored value, but we also block the
  // toggle so the UI can never show a misleading "enabled" state — and we audit
  // the blocked attempt for the compliance trail.
  if (enabled && process.env.NODE_ENV === "production") {
    audit({
      category: "COMPLIANCE",
      action: "test.conflicted_resolution.blocked_in_prod",
      actorId: officerId,
      targetType: "SystemFlag",
      targetId: "allowConflictedResolution",
      payload: { enabled: false, note: "Attempt to enable the officer-conflict bypass in production was refused (POCA §16 / GBT). The override is testing-only." },
    });
    return false;
  }
  store.allowConflictedResolution = enabled;
  void saveConfig(KEY, { ...store });
  audit({
    category: "COMPLIANCE",
    action: enabled ? "test.conflicted_resolution.enabled" : "test.conflicted_resolution.disabled",
    actorId: officerId,
    targetType: "SystemFlag",
    targetId: "allowConflictedResolution",
    payload: { enabled, note: "TESTING override: when ON, an officer holding a position may resolve that market (bypasses the POCA §16 officer-conflict block)." },
  });
  return enabled;
}
