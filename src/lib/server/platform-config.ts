/**
 * Platform-level configuration — settings that affect the entire platform
 * (not per-market). Persisted to SystemConfig, admin-editable at /admin/config.
 *
 * Currently: timezone only. Add more platform-wide settings here as needed.
 */
import { loadConfig, saveConfig } from "./config-store";
import { audit } from "./audit";

export type PlatformConfig = {
  /** IANA timezone for all player-facing times, AI prompts, and displays.
   *  Default: Africa/Dar_es_Salaam (EAT, UTC+3). */
  timezone: string;
};

const CONFIG_KEY = "platform_config";
const DEFAULT: PlatformConfig = {
  timezone: process.env.PLATFORM_TIMEZONE || "Africa/Dar_es_Salaam",
};

// In-memory cache — survives HMR, hydrated from DB on first read.
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_PLATFORM_CONFIG: PlatformConfig | undefined;
}

let hydrated = false;

export async function getPlatformConfig(): Promise<PlatformConfig> {
  if (!hydrated) {
    const stored = await loadConfig<PlatformConfig>(CONFIG_KEY);
    if (stored?.timezone) {
      globalThis.__50PICK_PLATFORM_CONFIG = { ...DEFAULT, ...stored };
    } else {
      globalThis.__50PICK_PLATFORM_CONFIG = { ...DEFAULT };
    }
    hydrated = true;
  }
  return globalThis.__50PICK_PLATFORM_CONFIG ?? DEFAULT;
}

/** Update platform config. Changes take effect immediately (no redeploy). */
export async function setPlatformConfig(
  updates: Partial<PlatformConfig>,
  officerId: string,
): Promise<{ ok: true; config: PlatformConfig } | { ok: false; error: string }> {
  if (updates.timezone) {
    // Validate the timezone is a real IANA timezone
    try {
      Intl.DateTimeFormat("en-GB", { timeZone: updates.timezone });
    } catch {
      return { ok: false, error: `Invalid timezone: "${updates.timezone}". Use IANA format (e.g. Africa/Dar_es_Salaam, Asia/Dubai).` };
    }
  }

  const before = await getPlatformConfig();
  const next: PlatformConfig = { ...before, ...updates };
  globalThis.__50PICK_PLATFORM_CONFIG = next;
  hydrated = true;
  await saveConfig(CONFIG_KEY, next);

  audit({
    category: "ADMIN",
    action: "config.platform_updated",
    actorId: officerId,
    targetType: "System",
    targetId: "platform",
    payload: { before, after: next },
  });

  return { ok: true, config: next };
}

/** Synchronous read — returns the cached value (after first async hydration).
 *  Falls back to env var / default if never hydrated yet. Used by formatDate etc. */
export function getPlatformTimezone(): string {
  return globalThis.__50PICK_PLATFORM_CONFIG?.timezone
    ?? process.env.PLATFORM_TIMEZONE
    ?? "Africa/Dar_es_Salaam";
}
