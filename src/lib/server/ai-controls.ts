/**
 * AI feature switches — the operator's on/off controls for every AI-powered feature,
 * surfaced together in the admin "AI toolkit" dropdown (one place, no redundancy).
 *
 * This module owns the two flags that had no home before — the HELP CHATBOT and AI
 * POLL GENERATION. The market-RESOLUTION controls already live where they belong
 * (the pause in market-sentinel.ts, the human/auto mode in market-config.ts); this
 * module does NOT duplicate them — `getAiToolkitStatus()` simply AGGREGATES all of
 * them so the dropdown can read one object.
 *
 * Persistence + shape mirror the other control modules: a `globalThis` cache
 * hydrated once from `SystemConfig` via config-store, and audited setters. Absent
 * config ⇒ both features ON, i.e. exactly today's behaviour. When there is no
 * `ANTHROPIC_API_KEY` at all, every AI feature is inert regardless of these flags.
 */
import { loadConfig, saveConfig } from "./config-store";
import { audit } from "./audit";

type AiControls = { chatbotEnabled: boolean; pollGenEnabled: boolean };
const DEFAULTS: AiControls = { chatbotEnabled: true, pollGenEnabled: true };
const KEY = "ai.controls";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AI_CONTROLS: AiControls | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_AI_CONTROLS_HYDRATED: boolean | undefined;
}
const store: AiControls = globalThis.__50PICK_AI_CONTROLS ?? (globalThis.__50PICK_AI_CONTROLS = { ...DEFAULTS });

async function ensureHydrated(): Promise<void> {
  if (globalThis.__50PICK_AI_CONTROLS_HYDRATED) return;
  globalThis.__50PICK_AI_CONTROLS_HYDRATED = true;
  const stored = await loadConfig<Partial<AiControls>>(KEY);
  if (stored) {
    if (typeof stored.chatbotEnabled === "boolean") store.chatbotEnabled = stored.chatbotEnabled;
    if (typeof stored.pollGenEnabled === "boolean") store.pollGenEnabled = stored.pollGenEnabled;
  }
}

/** Is the help chatbot enabled? (Default true.) */
export async function isChatbotEnabled(): Promise<boolean> {
  await ensureHydrated();
  return store.chatbotEnabled;
}

/** Is AI poll generation enabled? (Default true.) */
export async function isPollGenEnabled(): Promise<boolean> {
  await ensureHydrated();
  return store.pollGenEnabled;
}

export async function setChatbotEnabled(enabled: boolean, officerId: string): Promise<void> {
  await ensureHydrated();
  store.chatbotEnabled = enabled;
  await saveConfig(KEY, { ...store });
  audit({
    category: "ADMIN",
    action: enabled ? "ai.chatbot_enabled" : "ai.chatbot_disabled",
    actorId: officerId, targetType: "System", targetId: "ai-controls",
    payload: { chatbotEnabled: enabled },
  });
}

export async function setPollGenEnabled(enabled: boolean, officerId: string): Promise<void> {
  await ensureHydrated();
  store.pollGenEnabled = enabled;
  await saveConfig(KEY, { ...store });
  audit({
    category: "ADMIN",
    action: enabled ? "ai.pollgen_enabled" : "ai.pollgen_disabled",
    actorId: officerId, targetType: "System", targetId: "ai-controls",
    payload: { pollGenEnabled: enabled },
  });
}

export type AiToolkitStatus = {
  /** No ANTHROPIC_API_KEY ⇒ every AI feature is inert regardless of the switches. */
  hasKey: boolean;
  chatbotEnabled: boolean;
  pollGenEnabled: boolean;
  /** Market-resolution AI (the resolve-date deep check). active = key + not paused. */
  resolutionActive: boolean;
  resolutionPaused: boolean;
  /** Auto-resolve when confident (the AI seals without the two-officer ceremony). */
  autoResolve: boolean;
  /** Confidence floor below which auto ALWAYS falls back to human. */
  confidenceThreshold: number;
};

/**
 * The single read the AI-toolkit dropdown renders from. Aggregates EVERY AI switch
 * — chatbot + poll-gen (here), resolution pause + auto mode (their own modules) —
 * so there is exactly one source per control and one place that shows them.
 */
export async function getAiToolkitStatus(): Promise<AiToolkitStatus> {
  await ensureHydrated();
  const [{ getResolutionAiStatus }, { getGlobalConfig }] = await Promise.all([
    import("./market-sentinel"),
    import("./market-config"),
  ]);
  let resolutionActive = false, resolutionPaused = false;
  try {
    const r = await getResolutionAiStatus();
    resolutionActive = r.active; resolutionPaused = r.paused;
  } catch { /* degrade to inert readings */ }
  let autoResolve = false, confidenceThreshold = 90;
  try {
    const cfg = await getGlobalConfig();
    autoResolve = cfg.resolutionMode === "auto";
    confidenceThreshold = cfg.resolveConfidenceThreshold;
  } catch { /* keep defaults */ }
  return {
    hasKey: !!process.env.ANTHROPIC_API_KEY,
    chatbotEnabled: store.chatbotEnabled,
    pollGenEnabled: store.pollGenEnabled,
    resolutionActive,
    resolutionPaused,
    autoResolve,
    confidenceThreshold,
  };
}
