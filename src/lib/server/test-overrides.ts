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
 * ⚠️ REAL-MONEY HARD LOCK — PRE-LAUNCH TESTING ONLY. ⚠️
 * The officer-conflict block exists for POCA §16 / GBT licensing (an officer
 * with a financial interest in the outcome must not decide it). Enabling this
 * override relaxes that guard so a tester acting as both admin and player can
 * settle a market end-to-end. It MUST NOT be active on real money — an admin
 * paying their own bets is a licensing violation.
 *
 * HISTORY: a `NODE_ENV === "production"` hard-lock was removed 2026-07-12, restored
 * 2026-07-15 (audit C7), then — **Ali's explicit, documented decision 2026-07-17**
 * (see `docs/COMPLIANCE-DECISIONS.md`) — REPLACED with a REAL-MONEY-state lock so
 * testers can exercise solo-resolution on the production 50pick.tz deployment
 * DURING the pre-launch window, and it auto-hard-locks the instant real money is
 * enabled. `getConflictedResolutionAllowed()` now returns `false` whenever
 * `isConflictOverrideHardLocked()` — i.e. production AND `TEST_FUNDING !== "true"`.
 * So: pre-launch (TEST_FUNDING=true, test float, no real money) → the admin flag
 * governs; go-live (TEST_FUNDING unset — a required launch step) → forced OFF,
 * flag ignored. The relaxation is bound to the *no-real-money* state, not to a
 * free-floating config toggle, and every toggle AND every actual bypass is written
 * to the COMPLIANCE audit trail so it is never silent. ⛔ Do NOT weaken the
 * `isConflictOverrideHardLocked()` condition further, and do NOT re-widen it to a
 * plain persisted flag — the lock must stay coupled to real-money state.
 */
import { loadConfig, saveConfig } from "./config-store";
import { audit } from "./audit";
import { isLiveMoneyMode } from "./runtime-mode";

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
  // resolve it on REAL money. The override is HARD-LOCKED off whenever real money
  // is (or could be) live — see isConflictOverrideHardLocked(). It is permitted
  // ONLY while the platform is provably pre-launch (TEST_FUNDING=true, test float,
  // no real money) or outside production — and even then only if the admin flag is
  // on. Ali's explicit decision 2026-07-17 (see header + docs/COMPLIANCE-DECISIONS):
  // the lock keys off REAL-MONEY STATE, not NODE_ENV, so testers can exercise
  // solo-resolution on 50pick.tz before launch; unsetting TEST_FUNDING at go-live
  // auto-restores the hard lock (an admin can never resolve their own real bets).
  if (isConflictOverrideHardLocked()) return false;
  await ensureHydrated();
  return store.allowConflictedResolution;
}

/**
 * The POCA §16 hard lock. Solo-resolution is FORCIBLY disabled (persisted flag
 * ignored) whenever the platform is handling — or could handle — REAL money: a
 * production deployment NOT in the pre-launch test-float state. Unsetting
 * `TEST_FUNDING` at go-live (a required launch step, see docs/LAUNCH-GO-NO-GO §5)
 * flips this to `true` and the override dies automatically. Outside production it
 * never hard-locks (local / staging use the persisted flag directly). Pure env
 * read — safe to call anywhere, no async, no hydration.
 */
export function isConflictOverrideHardLocked(): boolean {
  // The POCA §16 lock and the payments control-plane MUST agree on "real money is
  // live", so the condition (`production && TEST_FUNDING!=="true"`) lives in ONE
  // place — runtime-mode.ts. Behaviour here is unchanged; the shared predicate just
  // stops the two from ever drifting. ⛔ Do NOT re-inline or weaken it.
  return isLiveMoneyMode();
}

/**
 * Boot-time compliance surface (audit C7, revised per Ali 2026-07-17). Two cases
 * in production: (a) REAL money live (isConflictOverrideHardLocked) + flag ON →
 * loud warning to clear the stale flag (the runtime already forces it OFF, so this
 * is unambiguity hygiene, not a live hole); (b) pre-launch (TEST_FUNDING=true) +
 * flag ON → an informational note that solo-resolution is intentionally active for
 * testing and will auto-lock at go-live. Fail-open: never block boot of a
 * real-money platform over a compliance *alarm* the runtime guard already handles.
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
  if (!flagOn) return;
  if (isConflictOverrideHardLocked()) {
    // REAL money live + flag left ON. getConflictedResolutionAllowed() already
    // returns false (hard lock), so POCA §16 is fully enforced — but the persisted
    // intent is stale. Log loudly; do NOT throw (would take a live platform down
    // over an alarm that changes nothing).
    console.error(
      "\n" + "!".repeat(72) + "\n" +
        "[compliance] WARNING: allowConflictedResolution is ON with REAL money live.\n" +
        "  The runtime guard forces it OFF (POCA §16 enforced — no admin can resolve\n" +
        "  their own market), but CLEAR the persisted 'test.overrides' flag so the\n" +
        "  intent is unambiguous.\n" +
        "!".repeat(72) + "\n",
    );
  } else {
    // Pre-launch (TEST_FUNDING=true): the override IS active by design, for testers.
    console.warn(
      "[compliance] NOTE: solo-resolution override ACTIVE (pre-launch, TEST_FUNDING=true). " +
        "One officer can resolve a market they hold a position in — TESTING ONLY. " +
        "This auto-HARD-LOCKS when TEST_FUNDING is unset at go-live (POCA §16).",
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
