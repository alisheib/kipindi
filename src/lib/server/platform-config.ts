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
  /** Global maintenance switch (§9.3 #1). When true, NEW bets and NEW deposits
   *  are paused platform-wide. Withdrawals and cash-outs stay OPEN so player
   *  funds are never trapped (RG-safe, LCCP-friendly). Set from /admin/system;
   *  takes effect immediately, no redeploy. Optional so old snapshots restore. */
  maintenanceMode?: boolean;
  /** Operator note shown to players who hit a paused action while maintenance
   *  is on. Null → a sensible default message. */
  maintenanceNote?: string | null;
  /** Site-wide broadcast banner (§9.3 #5) — an operator announcement (outage,
   *  promo, new market) shown to every player until dismissed. Null = none. */
  announcement?: {
    active: boolean;
    message: string;
    tone: "info" | "warning" | "success";
  } | null;
};

/** The SystemConfig key. Exported for the house-bot engine, which reads it through `loadConfigResult` (04 F7). */
export const PLATFORM_CONFIG_KEY = "platform_config";
const CONFIG_KEY = PLATFORM_CONFIG_KEY;
const DEFAULT: PlatformConfig = {
  timezone: process.env.PLATFORM_TIMEZONE || "Africa/Dar_es_Salaam",
  maintenanceMode: false,
  maintenanceNote: null,
  announcement: null,
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

/**
 * Synchronous read — returns the cached value (after first async hydration).
 * Falls back to env var / default if never hydrated yet. Used by formatDate etc.
 *
 * ⛔ THE IMPLEMENTATION LIVES IN `@/lib/platform-timezone` NOW (L17, ruling 526), and this is a RE-EXPORT rather
 * than a second copy. `src/lib/utils.ts` imported it from here, and this module reaches `./config-store` →
 * `./prisma`; utils has 216 importers, many of them client components, so a client component's dependency graph
 * ran to the Prisma client and only the bundler's tree-shaking kept the model names out of a public chunk.
 * ⚠️ Re-exported rather than moved outright so every existing server call site keeps working unchanged and there
 * is ONE implementation. Two copies of a fallback chain is how the two answers start disagreeing.
 */
export { getPlatformTimezone, DEFAULT_PLATFORM_TIMEZONE } from "@/lib/platform-timezone";

/** Async, hydration-safe read of the global maintenance switch. Money paths
 *  (buyPosition, deposit) call this to pause NEW bets / deposits during an
 *  incident or deploy. Withdrawals + cash-outs deliberately do NOT consult it. */
export async function isMaintenanceMode(): Promise<boolean> {
  const cfg = await getPlatformConfig();
  return cfg.maintenanceMode === true;
}

/** The player-facing message for a paused action (operator note, or a default). */
export async function maintenanceMessage(): Promise<string> {
  const cfg = await getPlatformConfig();
  const note = (cfg.maintenanceNote ?? "").trim();
  return note
    || "50pick is under maintenance right now — new bets and deposits are paused. You can still withdraw. Please check back shortly.";
}
