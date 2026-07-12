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
import { defineConfig } from "./define-config";

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

function validate(c: ProposalsConfig): { ok: true } | { ok: false; reason: string } {
  if (!Number.isFinite(c.prizeTzs) || c.prizeTzs < 0 || c.prizeTzs > 5_000_000) return { ok: false, reason: "Prize must be 0–5,000,000 TZS." };
  if (!Number.isInteger(c.hotThreshold) || c.hotThreshold < 1 || c.hotThreshold > 100_000) return { ok: false, reason: "Hot threshold must be 1–100,000 votes." };
  if (!Number.isInteger(c.rateLimit) || c.rateLimit < 1 || c.rateLimit > 100) return { ok: false, reason: "Rate limit must be 1–100 open proposals." };
  return { ok: true };
}

// Boilerplate (globalThis cache + eager hydrate + get/set + audit) via the
// shared factory. Behaviour identical to the prior hand-rolled version.
const _config = defineConfig<ProposalsConfig>({
  key: PROPOSALS_CONFIG_KEY,
  defaults: DEFAULT_PROPOSALS_CONFIG,
  validate,
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
