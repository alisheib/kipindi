/**
 * Player-proposals program config — admin-controlled (Feature 2).
 *
 * One global config: a master `enabled` switch, the fixed prize paid when a
 * proposal is listed AND resolved, the net-vote threshold that flags a
 * proposal "Hot", and a per-player rate limit (max simultaneously-open
 * proposals). Mirrors `affiliate-config.ts`: HMAC-audited mutations, persists
 * across hot-reloads via `globalThis.__50PICK_PROPOSALS_CONFIG`.
 *
 * Compliance: votes only rank — an officer always makes the final call; and a
 * "get paid to propose" reward is a regulated inducement, so the operator can
 * pause the whole feature from the admin page.
 */
import { audit } from "./audit";
import { loadConfig, saveConfig } from "./config-store";

const PROPOSALS_CONFIG_KEY = "proposals.config";

export type ProposalsConfig = {
  /** Master switch. When false: board is read-only — no new submissions, no
   *  voting; players see a paused state. */
  enabled: boolean;
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
  enabled: true,
  prizeTzs: 20_000,
  hotThreshold: 200,
  rateLimit: 3,
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_PROPOSALS_CONFIG: ProposalsConfig | undefined;
}

const stored =
  globalThis.__50PICK_PROPOSALS_CONFIG ??
  (globalThis.__50PICK_PROPOSALS_CONFIG = { ...DEFAULT_PROPOSALS_CONFIG });

// Restore persisted config on boot (eager; sync getters keep zero ripple). Write
// through on set so admin changes survive deploys. No-ops without a DB.
void loadConfig<ProposalsConfig>(PROPOSALS_CONFIG_KEY)
  .then((persisted) => { if (persisted) globalThis.__50PICK_PROPOSALS_CONFIG = { ...DEFAULT_PROPOSALS_CONFIG, ...persisted }; })
  .catch(() => {});

export function getProposalsConfig(): ProposalsConfig {
  return { ...(globalThis.__50PICK_PROPOSALS_CONFIG ?? stored) };
}

function validate(c: ProposalsConfig): { ok: true } | { ok: false; reason: string } {
  if (!Number.isFinite(c.prizeTzs) || c.prizeTzs < 0 || c.prizeTzs > 5_000_000) return { ok: false, reason: "Prize must be 0–5,000,000 TZS." };
  if (!Number.isInteger(c.hotThreshold) || c.hotThreshold < 1 || c.hotThreshold > 100_000) return { ok: false, reason: "Hot threshold must be 1–100,000 votes." };
  if (!Number.isInteger(c.rateLimit) || c.rateLimit < 1 || c.rateLimit > 100) return { ok: false, reason: "Rate limit must be 1–100 open proposals." };
  return { ok: true };
}

export function setProposalsConfig(updates: Partial<ProposalsConfig>, officerId: string):
  | { ok: true; config: ProposalsConfig }
  | { ok: false; error: string } {
  const before = getProposalsConfig();
  const merged: ProposalsConfig = { ...before, ...updates };
  const v = validate(merged);
  if (!v.ok) return { ok: false, error: v.reason };
  globalThis.__50PICK_PROPOSALS_CONFIG = merged;
  void saveConfig(PROPOSALS_CONFIG_KEY, merged);
  audit({
    category: "ADMIN",
    action: "proposals.config.updated",
    actorId: officerId,
    targetType: "ProposalsConfig",
    targetId: "global",
    payload: { before, after: merged, changes: updates },
  });
  return { ok: true, config: { ...merged } };
}
