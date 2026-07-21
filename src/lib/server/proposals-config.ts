/**
 * Player-proposals program config — admin-controlled (Feature 2).
 *
 * A single global config: a 4-state `state` machine (what players see and can
 * do), the fixed prize paid when a proposal is listed AND resolved, the net-vote
 * threshold that flags a proposal "Hot", and a per-player rate limit (max
 * simultaneously-open proposals). Mirrors `affiliate-config.ts`: HMAC-audited
 * mutations, persists across hot-reloads via `defineConfig`'s globalThis cache.
 *
 * The four states (aesthetic system: gilt = aspirational · amber = temporary ·
 * hidden = gone):
 *   • ACTIVE       — feature works normally; no badge; players can propose/vote.
 *   • COMING_SOON  — gilt "coming soon" badge everywhere; propose/vote blocked;
 *                    players are guided that it opens soon.
 *   • MAINTENANCE  — amber "temporarily unavailable" treatment; propose/vote
 *                    blocked; players are guided it's back shortly.
 *   • DISABLED     — every entry point is hidden; direct nav to /proposals* is
 *                    redirected to an honest "not available" board.
 *
 * Compliance: votes only rank — an officer always makes the final call; and a
 * "get paid to propose" reward is a regulated inducement, so the operator can
 * gate the whole feature from the admin page. The gate is SERVER-enforced
 * (`isProposalsActive`) — never trust the client (see COMPLIANCE-DECISIONS.md).
 */
import { defineConfig } from "./define-config";

const PROPOSALS_CONFIG_KEY = "proposals.config";

export type ProposalsState = "ACTIVE" | "COMING_SOON" | "MAINTENANCE" | "DISABLED";

/** Canonical order — drives the admin segmented selector + validation. */
export const PROPOSALS_STATES: readonly ProposalsState[] = ["ACTIVE", "COMING_SOON", "MAINTENANCE", "DISABLED"];

export type ProposalsConfig = {
  /** The feature-state machine. Only ACTIVE lets players submit/vote; every
   *  other state blocks writes (server-enforced) and drives the player-facing
   *  treatment. DISABLED additionally hides every entry point. */
  state: ProposalsState;
  /** Fixed prize (TZS) paid to the proposer when their market is listed AND
   *  resolved. 0 disables the cash reward (the feature can still run). */
  prizeTzs: number;
  /** Net votes (up - down) at which a REVIEW proposal is flagged "Hot". */
  hotThreshold: number;
  /** Max simultaneously-open proposals (status REVIEW / CHANGES_REQUESTED)
   *  a single player may have. Anti-spam. */
  rateLimit: number;
};

export const DEFAULT_PROPOSALS_CONFIG: ProposalsConfig = {
  // Default to COMING_SOON: the inducement stays gated (compliance-safe) and the
  // gilt "coming soon" treatment the app already presents is preserved until an
  // officer deliberately flips it ACTIVE at launch.
  state: "COMING_SOON",
  prizeTzs: 20_000,
  hotThreshold: 200,
  rateLimit: 3,
};

/** True only when the feature is fully ACTIVE — the single gate every server
 *  write (create proposal, cast vote) must consult. */
export function isProposalsActive(cfg: ProposalsConfig): boolean {
  return cfg.state === "ACTIVE";
}

/** True when every entry point must be hidden and direct nav redirected. */
export function isProposalsHidden(cfg: ProposalsConfig): boolean {
  return cfg.state === "DISABLED";
}

/**
 * Backward-compat migration for older persisted snapshots. Before this feature
 * the config carried a boolean `enabled`; map it onto the new state machine so
 * hydration of a pre-existing SystemConfig row never breaks:
 *   enabled: true  → ACTIVE   ·   enabled: false → DISABLED
 * A snapshot that already carries a valid `state` is taken as-is. The numeric
 * fields are carried through untouched; anything missing falls back to defaults.
 */
export function migrateProposalsConfig(persisted: Record<string, unknown>): Partial<ProposalsConfig> {
  const out: Partial<ProposalsConfig> = {};
  const rawState = persisted.state;
  if (typeof rawState === "string" && (PROPOSALS_STATES as readonly string[]).includes(rawState)) {
    out.state = rawState as ProposalsState;
  } else if (typeof persisted.enabled === "boolean") {
    out.state = persisted.enabled ? "ACTIVE" : "DISABLED";
  }
  if (typeof persisted.prizeTzs === "number") out.prizeTzs = persisted.prizeTzs;
  if (typeof persisted.hotThreshold === "number") out.hotThreshold = persisted.hotThreshold;
  if (typeof persisted.rateLimit === "number") out.rateLimit = persisted.rateLimit;
  return out;
}

function validate(c: ProposalsConfig): { ok: true } | { ok: false; reason: string } {
  if (!(PROPOSALS_STATES as readonly string[]).includes(c.state)) return { ok: false, reason: "State must be Active, Coming soon, Maintenance, or Disabled." };
  if (!Number.isFinite(c.prizeTzs) || c.prizeTzs < 0 || c.prizeTzs > 5_000_000) return { ok: false, reason: "Prize must be 0–5,000,000 TZS." };
  if (!Number.isInteger(c.hotThreshold) || c.hotThreshold < 1 || c.hotThreshold > 100_000) return { ok: false, reason: "Hot threshold must be 1–100,000 votes." };
  if (!Number.isInteger(c.rateLimit) || c.rateLimit < 1 || c.rateLimit > 100) return { ok: false, reason: "Rate limit must be 1–100 open proposals." };
  return { ok: true };
}

// Boilerplate (globalThis cache + eager hydrate + get/set + audit) via the
// shared factory. `migrate` translates any legacy `enabled` snapshot on hydrate.
const _config = defineConfig<ProposalsConfig>({
  key: PROPOSALS_CONFIG_KEY,
  defaults: DEFAULT_PROPOSALS_CONFIG,
  validate,
  migrate: migrateProposalsConfig,
  audit: { action: "proposals.config.updated", targetType: "ProposalsConfig" },
});

export function getProposalsConfig(): ProposalsConfig {
  return _config.get();
}

export function setProposalsConfig(updates: Partial<ProposalsConfig>, officerId: string):
  | { ok: true; config: ProposalsConfig }
  | { ok: false; error: string } {
  return _config.set(updates, officerId);
}
