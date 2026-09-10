/**
 * Resolution policy — the ONE flag governing how many admins a market resolution
 * needs.
 *
 *   OFF (default): a SINGLE admin resolves any market in one action — even one they
 *     hold a position in. This is the platform default in ALL money modes.
 *   ON: the classic two-officer ceremony — stage-1 by officer A, stage-2 by a
 *     DIFFERENT officer B.
 *
 * Owner decision 2026-07-24 (docs/COMPLIANCE-DECISIONS.md): the mandatory two-officer
 * rule AND the officer-conflict block are retired; two-admin authorization is now an
 * optional, operator-controlled toggle with NO real-money hard-lock (consistent with
 * the 2026-07-24 auto-resolve decision). This SUPERSEDES + replaces the old
 * `allowConflictedResolution` "solo-resolution" testing override.
 *
 * ⛔ ONE control, ONE place: this flag is set ONLY by the resolver-queue header
 * toggle (resolution-policy-action.ts). Do NOT add it to RateConfig or any other
 * settings form — that would be the same thing controlled from two places.
 *
 * Persisted to SystemConfig ("resolution.policy"), globalThis-cached, hydrate-once,
 * audited — the house config pattern (mirrors payment-control.ts / ai-controls.ts).
 */
import { loadConfigResult, saveConfig } from "./config-store";
import { audit } from "./audit";

type ResolutionPolicy = { requireTwoOfficer: boolean };
const DEFAULTS: ResolutionPolicy = { requireTwoOfficer: false };
const KEY = "resolution.policy";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_RES_POLICY: ResolutionPolicy | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_RES_POLICY_HYDRATED: boolean | undefined;
}
const store: ResolutionPolicy = globalThis.__50PICK_RES_POLICY ?? (globalThis.__50PICK_RES_POLICY = { ...DEFAULTS });

async function ensureHydrated(): Promise<void> {
  // 🔴 THE FLAG LATCHES LAST, AND ONLY ON A READ THAT ANSWERED — and of the five modules that
  // had this defect, THIS ONE GATES A COMPLIANCE CONTROL. `requireTwoOfficer` is the two-admin
  // authorization switch. Latching before the await, through a `loadConfig` that reports a FAILED
  // read as `null`, meant one transient database error at boot pinned this container on the code
  // default for its whole life — silently deciding, for every resolution it then saw, whether a
  // second officer was required. `ok: false` now means we could not ask: the gate stays DOWN and
  // the next call retries.
  if (globalThis.__50PICK_RES_POLICY_HYDRATED) return;
  const res = await loadConfigResult<Partial<ResolutionPolicy>>(KEY);
  if (!res.ok) return;
  const stored = res.value;
  if (stored && typeof stored.requireTwoOfficer === "boolean") store.requireTwoOfficer = stored.requireTwoOfficer;
  globalThis.__50PICK_RES_POLICY_HYDRATED = true;
}

/** Does market resolution require two distinct officers? Default false (single admin). */
export async function getRequireTwoOfficerResolution(): Promise<boolean> {
  await ensureHydrated();
  return store.requireTwoOfficer;
}

/** Enable/disable two-admin authorization. Persisted + COMPLIANCE-audited. */
export async function setRequireTwoOfficerResolution(enabled: boolean, officerId: string): Promise<void> {
  await ensureHydrated();
  store.requireTwoOfficer = enabled;
  await saveConfig(KEY, { ...store });
  audit({
    category: "COMPLIANCE",
    action: enabled ? "resolution.two_admin_enabled" : "resolution.two_admin_disabled",
    actorId: officerId,
    targetType: "SystemFlag",
    targetId: "requireTwoOfficerResolution",
    payload: {
      requireTwoOfficer: enabled,
      note: enabled
        ? "Two-admin authorization ENABLED — market resolution now requires two DISTINCT officers (stage-1 by A, stage-2 by B). Re-imposes the two-officer ceremony."
        : "Two-admin authorization DISABLED — a single admin resolves any market in one action, even one they hold a position in (owner decision, docs/COMPLIANCE-DECISIONS.md).",
    },
  });
}
